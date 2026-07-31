/**
 * Auto V2 — Chat route (Anthropic brain)
 *
 * Response shape matches what AutoV2Panel (and the quarantined V1 AutoHubPanel) expect:
 * { ok, thread, messages, attachments, assistant_message, receipts, bundle_id, idea_id, action_log_id }
 *
 * Rollback: restore chat-v1-backup.js from backups/_cleanup_quarantine/ (batch
 * 2026-07-24-auto-v1-and-broken-journal), rename this file aside, and put the backup in place as chat.js.
 */

import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { ensureAutoThread, getAutoThreadState, addAutoMessage } from '../../../lib/ao/autoHub.js';
import { runAutoChat, runAutoChatStream, findReferencedDrafts } from '../../../lib/ao/autoV2.js';
import { appendQuoteCardImagesToReplyIfNeeded } from '../../../lib/ao/appendQuoteCardImagesAfterApproval.js';
import { appendDesignImageToReplyIfNeeded } from '../../../lib/ao/appendDesignImageToReplyIfNeeded.js';
import { getScheduleContext } from '../../../lib/ao/getScheduleContext.js';
import { enforceResponseRules, KNOWN_REAL_SIGNALS } from '../../../lib/ao/enforceResponseRules.js';
import { logActivity } from '../../../lib/ao/logActivity.js';
import { enforceVoiceGuardrails } from '../../../lib/ao/voiceGuardrails.js';
import { processEpisodeResearchSignal } from '../../../lib/ao/processEpisodeResearchSignal.js';
import { getGuestsByIds } from '../../../lib/ao/guestIntakeStore.js';
import {
  buildBriefNavigationPath,
  extractGuestIdsFromMessages,
  isBriefPageRequest,
  isGuestPrepReady,
} from '../../../lib/ao/briefPageRouting.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { runReshareCycle, generateBrandedOpportunityImage } from './reshare-journal.js';
import { approveOrDiscardReshare } from './reshare-review.js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

/** Known social platform headers Auto uses in caption sets (bold markdown). */
const CAPTION_PLATFORM_NAMES =
  'LinkedIn Personal|LinkedIn Business|Instagram Business|Instagram Personal|Facebook Business|Facebook Personal|X';

/**
 * Detect a caption set from [SOCIAL_CAPTIONS] tags, or from 2+ bold platform
 * headers when the model forgot the wrapper tag (server-enforced fallback).
 * Returns { content, source: 'tag'|'fallback' } or null.
 */
function extractCaptionSetFromReply(text) {
  const raw = String(text || '');
  if (!raw.trim()) return null;

  const tagMatch = raw.match(/\[SOCIAL_CAPTIONS\]([\s\S]*?)\[\/SOCIAL_CAPTIONS\]/i);
  if (tagMatch) {
    return { content: tagMatch[1].trim(), source: 'tag' };
  }

  const headerRe = new RegExp(`\\*\\*(${CAPTION_PLATFORM_NAMES})\\*\\*:?`, 'gi');
  const matches = [...raw.matchAll(headerRe)];
  if (matches.length < 2) return null;

  const parts = [];
  for (let i = 0; i < matches.length; i++) {
    const headerEnd = matches[i].index + matches[i][0].length;
    const sectionEnd = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const platform = matches[i][1];
    const body = raw.slice(headerEnd, sectionEnd).trim();
    parts.push(`**${platform}**\n${body}`);
  }

  const content = parts.join('\n\n').trim();
  if (!content) return null;
  return { content, source: 'fallback' };
}

function extractCaptionSetFromTexts(texts = []) {
  for (const t of texts) {
    const found = extractCaptionSetFromReply(t);
    if (found) return found;
  }
  return null;
}

/**
 * Detects content in the exchange and saves it to ao_content_drafts.
 * Runs server-side after every successful response — Auto cannot reliably save drafts itself.
 *
 * Primary rule: whenever [JOURNAL_CONTENT], [DEVOTIONAL_CONTENT], or a caption set
 * ([SOCIAL_CAPTIONS] or 2+ known bold platform headers) appears in the assistant
 * reply, upsert immediately with status 'draft'. Approval language only promotes
 * an existing (or just-found) row to 'approved'. Content must never depend on
 * catching the right approval phrase or on the model remembering a bracket tag.
 *
 * Never throws. Never blocks the response. Logs failures silently.
 */
async function trySaveDraftFromExchange(userMessage, assistantReply, email, recentHistory = []) {
  if (!email || !assistantReply) return;

  const userLower = String(userMessage || '').toLowerCase();
  const isApproval =
    /\b(approved?|looks good|go ahead|publish it|that.?s it|perfect|yes|confirmed?|do it|fire it|send it|this works|i think (it'?s|this is|it) (good|works|solid)|ready|solid|nailed it|let'?s lock it|lock it in)\b/i.test(
      userLower
    );
  const isRemoval =
    /\b(cut (that|this|it)|take (that|this) out|remove the|we'?re? not using that|don'?t include|leave (that|this) out|without the|no biographical|drop the|we cut|that'?s? cut|not in (the|this))\b/i.test(
      userLower
    );

  function parseAttrs(str) {
    const attrs = {};
    const pattern = /(\w+)="([^"]*)"/g;
    let m;
    while ((m = pattern.exec(str)) !== null) attrs[m[1]] = m[2];
    return attrs;
  }

  function extractPartNumber(slug) {
    const match = (slug || '').match(/-part-(\d+)/i);
    return match ? parseInt(match[1], 10) : 1;
  }

  function deriveSeriesSlug(slug) {
    return (slug || '').replace(/-part-\d+.*$/i, '') || slug;
  }

  /**
   * Link caption drafts to the post under discussion: PUBLISH_JOURNAL attrs first,
   * then the same recent-message draft matching used for full-draft injection.
   */
  async function resolveCaptionLinkMeta(attrs, searchBlob) {
    const dateSlug = `captions-${new Date().toISOString().split('T')[0]}`;
    if (attrs?.slug) {
      return {
        series_slug: deriveSeriesSlug(attrs.slug) || 'standalone',
        part_number: extractPartNumber(attrs.slug),
        slug: attrs.slug,
        title: attrs.title || attrs.slug,
      };
    }

    // Journal publish attrs may appear in recent assistant turns even when this reply is captions-only.
    const publishInSearch = String(searchBlob || '').match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);
    if (publishInSearch) {
      const pubAttrs = parseAttrs(publishInSearch[1]);
      if (pubAttrs.slug) {
        return {
          series_slug: deriveSeriesSlug(pubAttrs.slug) || 'standalone',
          part_number: extractPartNumber(pubAttrs.slug),
          slug: pubAttrs.slug,
          title: pubAttrs.title || pubAttrs.slug,
        };
      }
    }

    const recentUserMessages = (recentHistory || [])
      .filter((m) => m.role === 'user')
      .map((m) => String(m.content || ''))
      .filter(Boolean)
      .slice(-5)
      .reverse();

    try {
      const { data: drafts, error } = await supabaseAdmin
        .from('ao_content_drafts')
        .select('kind, series_slug, part_number, title, slug, status, content')
        .eq('created_by_email', email.toLowerCase().trim())
        .neq('status', 'published')
        .neq('status', 'abandoned')
        .neq('kind', 'session_brief')
        .neq('kind', 'captions')
        .neq('kind', 'content_constraint')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[chat.js] Caption link draft lookup failed:', error.message);
      } else {
        const matched = findReferencedDrafts(drafts || [], userMessage, recentUserMessages);
        const preferred =
          matched.find((d) => d.kind === 'journal') ||
          matched.find((d) => d.kind === 'devotional') ||
          matched[0];
        if (preferred) {
          return {
            series_slug: preferred.series_slug || deriveSeriesSlug(preferred.slug) || 'standalone',
            part_number:
              preferred.part_number != null
                ? preferred.part_number
                : extractPartNumber(preferred.slug),
            slug: preferred.slug || dateSlug,
            title: preferred.title || preferred.slug || dateSlug,
          };
        }
      }
    } catch (err) {
      console.error('[chat.js] Caption link draft lookup failed:', err?.message || err);
    }

    return {
      series_slug: 'standalone',
      part_number: 1,
      slug: dateSlug,
      title: dateSlug,
    };
  }

  const searchTexts = [assistantReply];
  if (recentHistory && recentHistory.length > 0) {
    const recentAssistant = recentHistory
      .filter((m) => m.role === 'assistant')
      .slice(-3)
      .map((m) => String(m.content || ''));
    searchTexts.push(...recentAssistant);
  }
  const fullSearchText = searchTexts.join('\n\n');

  async function upsertDraft(row, label) {
    try {
      const { error } = await supabaseAdmin.from('ao_content_drafts').upsert(row, {
        onConflict: 'created_by_email,series_slug,part_number,kind',
        ignoreDuplicates: false,
      });
      if (error) {
        console.error(`[chat.js] ${label} failed (db error):`, error.message);
        return { ok: false, error: error.message };
      }
      console.log(`[chat.js] ${label}: ${row.slug || row.title} (status=${row.status})`);
      return { ok: true };
    } catch (err) {
      console.error(`[chat.js] ${label} failed:`, err?.message || err);
      return { ok: false, error: err?.message || 'Unknown error' };
    }
  }

  async function promoteDraftStatus({ kind, series_slug, part_number, slug, title }) {
    try {
      let query = supabaseAdmin
        .from('ao_content_drafts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('created_by_email', email.toLowerCase().trim())
        .eq('kind', kind)
        .neq('status', 'published')
        .neq('status', 'abandoned');

      if (series_slug) query = query.eq('series_slug', series_slug);
      if (part_number != null) query = query.eq('part_number', part_number);
      if (slug) query = query.eq('slug', slug);

      const { data, error } = await query.select('id, slug, title, status').limit(1);
      if (error) throw error;
      if (data?.length) {
        console.log(`[chat.js] Draft promoted to approved: ${data[0].slug || data[0].title || title}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[chat.js] Draft promote failed:', err?.message || err);
      return false;
    }
  }

  // --- SAVE ON PRODUCE: persist content blocks from THIS reply as draft ---
  {
    const journalContentMatch = assistantReply.match(
      /\[JOURNAL_CONTENT\]([\s\S]*?)\[\/JOURNAL_CONTENT\]/i
    );
    if (journalContentMatch) {
      const publishMatch = assistantReply.match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);
      const attrs = publishMatch ? parseAttrs(publishMatch[1]) : {};
      let slug = attrs.slug || '';
      let title = attrs.title || '';
      if (!slug) {
        const slugMatch = journalContentMatch[1].match(/^slug:\s*(.+)$/m);
        if (slugMatch) slug = slugMatch[1].trim().replace(/^["']|["']$/g, '');
      }
      if (!title) {
        const titleMatch = journalContentMatch[1].match(/^title:\s*(.+)$/m);
        if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
      }
      // Fall back: first markdown H1
      if (!title) {
        const h1 = journalContentMatch[1].match(/^#\s+(.+)$/m);
        if (h1) title = h1[1].trim();
      }
      if (!slug && title) {
        slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 80);
      }
      if (slug || title) {
        await upsertDraft(
          {
            created_by_email: email.toLowerCase().trim(),
            kind: 'journal',
            series_slug: deriveSeriesSlug(slug) || 'standalone',
            part_number: extractPartNumber(slug),
            title: title || slug,
            slug: slug || null,
            content: journalContentMatch[1].trim(),
            summary: attrs.summary || '',
            image_url: attrs.image_url || null,
            status: 'draft',
            updated_at: new Date().toISOString(),
          },
          'Journal draft saved on produce'
        );
      }
    }

    const devotionalMatch = assistantReply.match(
      /\[DEVOTIONAL_CONTENT\]([\s\S]*?)\[\/DEVOTIONAL_CONTENT\]/i
    );
    if (devotionalMatch) {
      const publishMatch = assistantReply.match(/\[PUBLISH_DEVOTIONAL([^\]]*)\]/i);
      const attrs = publishMatch ? parseAttrs(publishMatch[1]) : {};
      const slug =
        attrs.slug || `devotional-${attrs.date || new Date().toISOString().split('T')[0]}`;
      const title =
        attrs.title || `Devotional — ${attrs.date || new Date().toISOString().split('T')[0]}`;
      await upsertDraft(
        {
          created_by_email: email.toLowerCase().trim(),
          kind: 'devotional',
          series_slug: attrs.date ? attrs.date.slice(0, 7) : new Date().toISOString().slice(0, 7),
          part_number: parseInt((attrs.date || '').replace(/-/g, '').slice(-2) || '1', 10),
          title,
          slug,
          content: devotionalMatch[1].trim(),
          summary: attrs.summary || '',
          image_url: null,
          status: 'draft',
          updated_at: new Date().toISOString(),
        },
        'Devotional draft saved on produce'
      );
    }

    const captionSet = extractCaptionSetFromReply(assistantReply);
    if (captionSet) {
      const publishMatch = assistantReply.match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);
      const attrs = publishMatch ? parseAttrs(publishMatch[1]) : {};
      const meta = await resolveCaptionLinkMeta(attrs, assistantReply);
      await upsertDraft(
        {
          created_by_email: email.toLowerCase().trim(),
          kind: 'captions',
          series_slug: meta.series_slug,
          part_number: meta.part_number,
          title: `Captions — ${meta.title}`,
          slug: meta.slug,
          content: captionSet.content,
          summary: '',
          image_url: null,
          status: 'draft',
          updated_at: new Date().toISOString(),
        },
        `Caption set saved on produce (${captionSet.source})`
      );
    }
  }

  // --- REMOVAL CONSTRAINTS ---
  if (isRemoval) {
    const existingSlug = (() => {
      const recentPublish = fullSearchText.match(/\[PUBLISH_JOURNAL[^\]]*slug="([^"]+)"/i);
      return recentPublish ? recentPublish[1] : null;
    })();

    if (existingSlug || fullSearchText.includes('[JOURNAL_CONTENT]')) {
      const constraintSlug = existingSlug || 'active-draft';
      const partKey = Number(String(Date.now()).slice(-8));
      await upsertDraft(
        {
          created_by_email: email.toLowerCase().trim(),
          kind: 'content_constraint',
          series_slug: deriveSeriesSlug(constraintSlug) || constraintSlug,
          part_number: partKey,
          title: `Content constraint — ${constraintSlug}`,
          slug: `constraint-${constraintSlug}-${Date.now()}`,
          content: `REMOVAL CONSTRAINT logged ${new Date().toISOString()}:\n\nBart said: "${userMessage}"\n\nThis constraint applies to all captions, social posts, summaries, and derived content for this piece. Do not include any element that matches this removal instruction.`,
          summary: String(userMessage).slice(0, 200),
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        'Content removal constraint saved'
      );
    }
  }

  if (!isApproval) return;

  // --- APPROVAL: promote existing draft, or upsert as approved if content is in history ---
  const journalContentMatch = fullSearchText.match(
    /\[JOURNAL_CONTENT\]([\s\S]*?)\[\/JOURNAL_CONTENT\]/i
  );
  if (journalContentMatch) {
    const publishMatch = fullSearchText.match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);
    const attrs = publishMatch ? parseAttrs(publishMatch[1]) : {};
    let slug = attrs.slug || '';
    let title = attrs.title || '';
    if (!slug) {
      const slugMatch = journalContentMatch[1].match(/^slug:\s*(.+)$/m);
      if (slugMatch) slug = slugMatch[1].trim().replace(/^["']|["']$/g, '');
    }
    if (!title) {
      const titleMatch = journalContentMatch[1].match(/^title:\s*(.+)$/m);
      if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
    }
    if (!title) {
      const h1 = journalContentMatch[1].match(/^#\s+(.+)$/m);
      if (h1) title = h1[1].trim();
    }
    if (!slug && title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
    }
    if (slug || title) {
      const series_slug = deriveSeriesSlug(slug) || 'standalone';
      const part_number = extractPartNumber(slug);
      const promoted = await promoteDraftStatus({
        kind: 'journal',
        series_slug,
        part_number,
        slug,
        title,
      });
      if (!promoted) {
        await upsertDraft(
          {
            created_by_email: email.toLowerCase().trim(),
            kind: 'journal',
            series_slug,
            part_number,
            title: title || slug,
            slug: slug || null,
            content: journalContentMatch[1].trim(),
            summary: attrs.summary || '',
            image_url: attrs.image_url || null,
            status: 'approved',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          'Journal draft saved on approval'
        );
      }
    }
    return;
  }

  const devotionalMatch = fullSearchText.match(
    /\[DEVOTIONAL_CONTENT\]([\s\S]*?)\[\/DEVOTIONAL_CONTENT\]/i
  );
  if (devotionalMatch) {
    const publishMatch = fullSearchText.match(/\[PUBLISH_DEVOTIONAL([^\]]*)\]/i);
    const attrs = publishMatch ? parseAttrs(publishMatch[1]) : {};
    const slug =
      attrs.slug || `devotional-${attrs.date || new Date().toISOString().split('T')[0]}`;
    const title =
      attrs.title || `Devotional — ${attrs.date || new Date().toISOString().split('T')[0]}`;
    const series_slug = attrs.date
      ? attrs.date.slice(0, 7)
      : new Date().toISOString().slice(0, 7);
    const part_number = parseInt((attrs.date || '').replace(/-/g, '').slice(-2) || '1', 10);
    const promoted = await promoteDraftStatus({
      kind: 'devotional',
      series_slug,
      part_number,
      slug,
      title,
    });
    if (!promoted) {
      await upsertDraft(
        {
          created_by_email: email.toLowerCase().trim(),
          kind: 'devotional',
          series_slug,
          part_number,
          title,
          slug,
          content: devotionalMatch[1].trim(),
          summary: attrs.summary || '',
          image_url: null,
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        'Devotional draft saved on approval'
      );
    }
    return;
  }

  const captionSet = extractCaptionSetFromTexts(searchTexts);
  if (captionSet) {
    const publishMatch = fullSearchText.match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);
    const attrs = publishMatch ? parseAttrs(publishMatch[1]) : {};
    const meta = await resolveCaptionLinkMeta(attrs, fullSearchText);
    const promoted = await promoteDraftStatus({
      kind: 'captions',
      series_slug: meta.series_slug,
      part_number: meta.part_number,
      slug: meta.slug,
      title: `Captions — ${meta.title}`,
    });
    if (!promoted) {
      await upsertDraft(
        {
          created_by_email: email.toLowerCase().trim(),
          kind: 'captions',
          series_slug: meta.series_slug,
          part_number: meta.part_number,
          title: `Captions — ${meta.title}`,
          slug: meta.slug,
          content: captionSet.content,
          summary: '',
          image_url: null,
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        `Caption set saved on approval (${captionSet.source})`
      );
    }
  }
}

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Set streaming headers immediately — before any async work.
  // This keeps the connection alive past Vercel's 60-second function timeout
  // by sending tokens incrementally as the model generates them.
  // The client reads the stream and assembles the full reply.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Helper to send an SSE event
  const sendEvent = (event, data) => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_) {
      // Client disconnected — ignore
    }
  };

  const { message, thread_id, attachments } = req.body || {};

  if (!String(message || '').trim()) {
    sendEvent('error', { ok: false, error: 'message required' });
    res.end();
    return;
  }

  const userMessage = String(message).trim();

  try {
    const thread = await ensureAutoThread(auth.email, thread_id || '');

    // Persist user message immediately — before any model call.
    // If runAutoChat times out or fails, the message is already in the database
    // and appears in the thread on reload. The user should never lose what they
    // typed because Auto failed.
    const persistedUserMessage = await addAutoMessage({
      threadId: thread.id,
      role: 'user',
      mode: 'plan',
      content: userMessage,
      meta: { auto_v2: true },
    });

    const prior = await getAutoThreadState(auth.email, thread.id);
    // Exclude the message we just persisted so it is not sent to the model twice
    // (runAutoChat appends the current message itself) and so the downstream
    // prior-message consumers see the same history they did before.
    const priorMessages = (prior.messages || []).filter(
      (m) => m.id !== persistedUserMessage?.id
    );
    const history = priorMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: String(m.content || ''),
      }));

    // Build the current user message content — include image attachments if present.
    // The Anthropic API accepts multi-part content arrays with image blocks.
    // This allows Auto to see uploaded images rather than treating them as invisible.
    let currentMessageContent;
    if (Array.isArray(attachments) && attachments.length > 0) {
      const contentParts = [];
      for (const att of attachments) {
        if (att.type === 'image' && att.data && att.mediaType) {
          contentParts.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: att.mediaType,
              data: att.data,
            },
          });
        }
      }
      contentParts.push({ type: 'text', text: userMessage });
      currentMessageContent = contentParts;
    } else {
      currentMessageContent = userMessage;
    }

    // Load schedule context only when the request involves scheduling or publishing.
    // Queue data adds significant token weight — loading it on every revision request
    // for a journal entry is architectural waste.
    const { classifyRequest } = await import('../../../lib/ao/requestClassifier.js');
    const contextProfile = classifyRequest(userMessage, history.slice(-6));
    const scheduleContext = contextProfile.needsSchedule
      ? await getScheduleContext()
      : null;

    // Give Auto real visual memory of prior header images in a series — actual
    // image bytes, not a text description — gated the same way series text
    // context already is, so this only loads when actually relevant.
    if (contextProfile.needsSeriesContext) {
      try {
        const { loadSeriesImageReferenceBlocks } = await import('../../../lib/ao/seriesImageReferences.js');
        const recentUserMessages = history
          .filter((m) => m.role === 'user')
          .map((m) => String(m.content || ''))
          .filter(Boolean)
          .slice(-5)
          .reverse();
        const seriesImageBlocks = await loadSeriesImageReferenceBlocks(userMessage, recentUserMessages);
        if (seriesImageBlocks && seriesImageBlocks.length > 0) {
          const existingParts = Array.isArray(currentMessageContent)
            ? currentMessageContent
            : [{ type: 'text', text: currentMessageContent }];
          currentMessageContent = [...seriesImageBlocks, ...existingParts];
        }
      } catch (seriesImgErr) {
        console.error('[chat.js] Series image reference load failed (non-fatal):', seriesImgErr?.message || seriesImgErr);
      }
    }

    // Stream the model response token by token.
    // Soft-timeout at 270s so we can still send a real error event before
    // Vercel's 300s hard kill (which would leave the client in silence).
    // Combined budget covers the first stream AND any corpus-fetch synthesis call.
    const SOFT_TIMEOUT_MS = 270_000;
    const streamStartedAt = Date.now();
    let fullReply = '';
    let streamError = null;
    let streamResult = null;

    function timeoutAfter(ms, message) {
      return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
    }

    function remainingSoftBudgetMs() {
      return Math.max(0, SOFT_TIMEOUT_MS - (Date.now() - streamStartedAt));
    }

    try {
      streamResult = await Promise.race([
        runAutoChatStream(
          history,
          currentMessageContent,
          scheduleContext,
          userMessage,
          (token) => {
            // Send each token to the client as it arrives
            fullReply += token;
            sendEvent('token', { token });
          }
        ),
        timeoutAfter(
          SOFT_TIMEOUT_MS,
          'Auto took too long to respond — this usually means the conversation got too large. Try starting a new thread.'
        ),
      ]);

      if (!streamResult.ok) {
        streamError = streamResult.error || 'Auto reply failed';
      }
    } catch (streamErr) {
      streamError = streamErr?.message || 'Stream error';
    }

    if (streamError) {
      sendEvent('error', { ok: false, error: streamError });
      res.end();
      return;
    }

    // Enforce response rules in code before any further processing.
    // These rules were previously in the system prompt as suggestions to the model.
    // Here they are guaranteed regardless of model behavior.
    // Pass recent thread history so the signal isolation rule can check whether
    // [JOURNAL_CONTENT] or [DEVOTIONAL_CONTENT] appeared in a prior message.
    // This allows Auto to fire the publish signal in a dedicated response after
    // content was approved in a prior message — the correct workflow.
    const recentHistory = priorMessages.slice(-6);
    fullReply = enforceResponseRules(fullReply, recentHistory);

    // Voice / anti-AI-signature guardrails — same post-stream timing as enforceResponseRules.
    // A violation may flicker in the live token stream; it must not survive into the saved thread.
    {
      const voiceClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const voiceResult = await enforceVoiceGuardrails(fullReply, {
        anthropicClient: voiceClient,
        contextLabel: 'chat-reply',
      });
      if (voiceResult.corrected) {
        console.log(
          `[chat.js] Voice guardrails corrected chat-reply (${voiceResult.forced ? 'forced-strip' : 'self-correct'}; ${voiceResult.violations.length} hit(s))`
        );
      }
      fullReply = voiceResult.text;
    }

    // Deterministic brief-page navigation. The model often explains that the
    // page exists but forgets the exact [NAVIGATE_TO] tag the client requires.
    // Run after voice correction so no later model rewrite can drop the signal.
    // Resolve only IDs seeded into this thread; never guess by guest name.
    if (
      isBriefPageRequest(userMessage) &&
      !/\[NAVIGATE_TO\s+path="[^"]+"\]/i.test(fullReply)
    ) {
      const guestIds = extractGuestIdsFromMessages(priorMessages);
      if (guestIds.length > 0) {
        const lookup = await getGuestsByIds(guestIds);
        const guestsById = new Map((lookup.guests || []).map((guest) => [guest.id, guest]));
        const everyGuestReady =
          lookup.ok && guestIds.every((id) => isGuestPrepReady(guestsById.get(id)));

        if (everyGuestReady) {
          const navigationPath = buildBriefNavigationPath(guestIds);
          if (navigationPath) {
            fullReply =
              `${fullReply.trim()}\n\n[NAVIGATE_TO path="${navigationPath}"]`.trim();
            console.log(
              `[chat.js] Injected missing brief-page navigation signal: ${navigationPath}`
            );
          }
        }
      }
    }

    fullReply = await appendQuoteCardImagesToReplyIfNeeded({
      userMessage,
      priorMessages,
      reply: fullReply,
      threadId: thread.id,
    });

    fullReply = await appendDesignImageToReplyIfNeeded({
      userMessage,
      reply: fullReply,
      email: auth.email,
    });

    // Reshare trigger — runs the reshare cycle IN-PROCESS (no HTTP self-fetch, ever).
    // Image URL is attached as message meta (reshare_image_url) so the chat panel
    // can render it inline — not as a raw URL line in the text body.
    let reshareMeta = {};
    if (/\[TRIGGER_RESHARE\]/i.test(fullReply)) {
      try {
        const reshareResult = await runReshareCycle();
        fullReply = fullReply.replace(/\[\/?TRIGGER_RESHARE\]/gi, '').trim();

        if (reshareResult.ok && reshareResult.captions) {
          const captionBlock = Object.entries(reshareResult.captions)
            .map(([platform, text]) => `**${platform}:**\n${text}`)
            .join('\n\n');
          const opportunityBlock =
            reshareResult.signal_strength === 'strong'
              ? `⚡ OPPORTUNITY: ${reshareResult.signal_source_name || 'External signal'}${reshareResult.opportunity_id ? `\nid: ${reshareResult.opportunity_id}` : ''}\n${reshareResult.signal_summary || ''}\n\nThis is bigger than one caption line. I've logged it as an opportunity. A few ways to handle it: expand this week's captions to lean into it more, leave it as-is in LinkedIn Personal, or — if this really connects to something specific you've already written — I can write a full companion post connecting the two directly. Want me to draft that?\n\n`
              : '';
          fullReply =
            `${fullReply}\n\n[RESHARE_RESULT]\nSelected: ${reshareResult.title} (${reshareResult.journal_url})\nReason: ${reshareResult.selection_reason}\n${reshareResult.pull_quote ? `Pull quote: "${reshareResult.pull_quote}"\n` : ''}${reshareResult.photo ? `Photo used: ${reshareResult.photo}\n` : ''}\n${opportunityBlock}${captionBlock}\n\nThis is pending review — say the word and I'll schedule it, ask for a caption rewrite, ask for a different photo, or say discard and I'll drop it. No trip to Settings needed unless you want one.\n[/RESHARE_RESULT]`.trim();

          if (reshareResult.image_url && String(reshareResult.image_url).startsWith('https://')) {
            reshareMeta.reshare_image_url = reshareResult.image_url;
          }
          if (reshareResult.photo) {
            reshareMeta.photo_used = reshareResult.photo;
          }

          await logActivity({
            action_type: 'reshare_completed',
            source: 'chat.js:TRIGGER_RESHARE',
            reference_table: 'ao_scheduled_posts',
            reference_id: reshareResult.journal_url || null,
            created_by_email: auth?.email || null,
            detail: {
              title: reshareResult.title,
              journal_url: reshareResult.journal_url,
              image_url: reshareResult.image_url || null,
              photo: reshareResult.photo || null,
              signal_strength: reshareResult.signal_strength || null,
            },
          });
        } else if (reshareResult.ok && reshareResult.message) {
          fullReply = `${fullReply}\n\n${reshareResult.message}`.trim();
        } else {
          const rawDetail = reshareResult.error || reshareResult.detail || 'Unknown error';
          const detail = typeof rawDetail === 'string' ? rawDetail : JSON.stringify(rawDetail);
          fullReply = `${fullReply}\n\n[Reshare engine did not complete: ${detail}]`.trim();
          console.error('[chat.js] TRIGGER_RESHARE failed:', detail);
        }
      } catch (err) {
        const rawMessage = err?.message || err || 'unknown error';
        const safeMessage = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
        fullReply = `${fullReply.replace(/\[\/?TRIGGER_RESHARE\]/gi, '').trim()}\n\n[Reshare engine did not complete: ${safeMessage}]`.trim();
        console.error('[chat.js] TRIGGER_RESHARE handler error:', err?.message || err);
      }
    }

    // Reshare caption edit — updates a still-pending reshare row directly, in-process.
    const reshareEditMatch = fullReply.match(
      /\[RESHARE_EDIT\s+platform="([^"]+)"\s+instruction="([^"]+)"\]/i
    );
    if (reshareEditMatch) {
      const [, platformKey, instruction] = reshareEditMatch;
      try {
        const { data: pendingRow } = await supabaseAdmin
          .from('ao_scheduled_posts')
          .select('id, caption')
          .eq('source_kind', 'ao_journal_reshare')
          .eq('status', 'pending_review')
          .contains('intent', { channel_label: platformKey })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        fullReply = fullReply.replace(/\[\/?RESHARE_EDIT[^\]]*\]/gi, '').trim();

        if (!pendingRow) {
          fullReply =
            `${fullReply}\n\n[No pending reshare caption found for ${platformKey} — it may have already been approved. Edit it directly in Settings instead.]`.trim();
        } else {
          const editClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const editResponse = await editClient.messages.create({
            model: process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6',
            max_tokens: 1000,
            system:
              "You revise one social media caption per the requested instruction. Keep Bart's voice rules: no em dashes, no AI signature phrases, short declarative sentences. Return ONLY the revised caption text, nothing else.",
            messages: [
              {
                role: 'user',
                content: `Current caption:\n${pendingRow.caption}\n\nInstruction: ${instruction}`,
              },
            ],
          });
          const revisedCaptionRaw = (editResponse.content?.[0]?.text || '').trim();
          const voiceResult = await enforceVoiceGuardrails(revisedCaptionRaw, {
            anthropicClient: editClient,
            contextLabel: 'reshare-edit-caption',
          });
          const revisedCaption = voiceResult.text;
          if (revisedCaption) {
            await supabaseAdmin
              .from('ao_scheduled_posts')
              .update({ caption: revisedCaption, text: revisedCaption })
              .eq('id', pendingRow.id);
            fullReply = `${fullReply}\n\nUpdated the ${platformKey} caption:\n\n${revisedCaption}`.trim();
          }
        }
      } catch (err) {
        console.error('[chat.js] RESHARE_EDIT handler error:', err?.message || err);
        fullReply = `${fullReply.replace(/\[\/?RESHARE_EDIT[^\]]*\]/gi, '').trim()}\n\n[Could not update that caption: ${err?.message || 'unknown error'}]`.trim();
      }
    }

    // Reshare approve/discard — same logic as the Settings page buttons, called in-process.
    const reshareDecisionMatch = fullReply.match(/\[RESHARE_(APPROVE|DISCARD)\s+slug="([^"]+)"\]/i);
    if (reshareDecisionMatch) {
      const [, actionRaw, slug] = reshareDecisionMatch;
      const action = actionRaw.toLowerCase();
      try {
        const result = await approveOrDiscardReshare(action, slug);
        fullReply = fullReply.replace(/\[\/?RESHARE_(APPROVE|DISCARD)[^\]]*\]/gi, '').trim();

        if (result.ok) {
          fullReply = `${fullReply}\n\n${result.message}`.trim();
        } else {
          fullReply = `${fullReply}\n\n[Could not ${action} that reshare: ${result.error}]`.trim();
          console.error(`[chat.js] RESHARE_${actionRaw} failed:`, result.error);
        }
      } catch (err) {
        const rawMessage = err?.message || err || 'unknown error';
        const safeMessage = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
        fullReply = `${fullReply.replace(/\[\/?RESHARE_(APPROVE|DISCARD)[^\]]*\]/gi, '').trim()}\n\n[Could not ${action} that reshare: ${safeMessage}]`.trim();
        console.error('[chat.js] RESHARE_APPROVE/DISCARD handler error:', err?.message || err);
      }
    }

    // Opportunity companion post — draft the full journal body first (no captions yet).
    const opportunityWriteMatch = fullReply.match(/\[OPPORTUNITY_WRITE_POST\s+id="([^"]+)"\]/i);
    if (opportunityWriteMatch) {
      const opportunityId = opportunityWriteMatch[1];
      try {
        fullReply = fullReply.replace(/\[\/?OPPORTUNITY_WRITE_POST[^\]]*\]/gi, '').trim();

        const { data: opportunity, error: oppFetchError } = await supabaseAdmin
          .from('ao_opportunities')
          .select('*')
          .eq('id', opportunityId)
          .maybeSingle();

        if (oppFetchError || !opportunity) {
          fullReply = `${fullReply}\n\n[Could not load that opportunity: ${oppFetchError?.message || 'not found'}]`.trim();
        } else {
          const relatedSlug = Array.isArray(opportunity.topic_tags) ? opportunity.topic_tags[0] : null;
          let relatedBody = '';
          let relatedTitle = relatedSlug || 'related corpus piece';
          if (relatedSlug) {
            const journalPath = path.join(process.cwd(), 'ao-knowledge-hq-kit/journal', `${relatedSlug}.md`);
            if (fs.existsSync(journalPath)) {
              const raw = fs.readFileSync(journalPath, 'utf8');
              const titleMatch = raw.match(/^title:\s*(.+)$/m);
              if (titleMatch) relatedTitle = titleMatch[1].trim().replace(/^["']|["']$/g, '');
              const bodyStart = raw.indexOf('\n---', 3);
              relatedBody = bodyStart >= 0 ? raw.slice(bodyStart + 4).trim().slice(0, 4500) : raw.slice(0, 4500);
            }
          }

          const draftClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const draftResponse = await draftClient.messages.create({
            model: process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6',
            max_tokens: 4000,
            system: `You are Auto, Bart Paden's AI CMO writing a companion journal entry for Archetype Original.

Voice rules — non-negotiable:
- No em dashes. Ever. Rewrite the sentence instead.
- No AI signature phrases. (Full enforced list lives in lib/ao/voiceGuardrails.js — this prompt line is a first-pass nudge only, not the source of truth.)
- Short sentences. Direct. First person where it fits Bart's voice.
- Connect a SPECIFIC existing corpus piece to a SPECIFIC external signal. Do not write a generic "reports validate what I've said" essay.
- Full journal-entry length and depth. Include a clear title as the first line (# Title).
- Do NOT include social captions. Do NOT include [CARD] blocks. Post body only.`,
            messages: [
              {
                role: 'user',
                content: `Write the companion journal post.

External signal:
${opportunity.signal_source_name || opportunity.title || 'External signal'}
${opportunity.opportunity_brief || ''}

Why it matters / reshare selection reason:
${opportunity.why_it_matters || ''}

Related corpus piece: ${relatedTitle}${relatedSlug ? ` (slug: ${relatedSlug})` : ''}
${relatedBody ? `\nRelated piece excerpt:\n${relatedBody}` : ''}

Return markdown only: a # title line, then the full post body.`,
              },
            ],
          });

          const draftedPostRaw = (draftResponse.content?.[0]?.text || '').trim();
          const draftVoice = await enforceVoiceGuardrails(draftedPostRaw, {
            anthropicClient: draftClient,
            contextLabel: 'opportunity-companion-draft',
          });
          const draftedPost = draftVoice.text;

          await supabaseAdmin
            .from('ao_opportunities')
            .update({ status: 'studio', updated_at: new Date().toISOString() })
            .eq('id', opportunityId);

          if (draftedPost) {
            fullReply = `${fullReply}\n\n[JOURNAL_CONTENT]\n${draftedPost}\n[/JOURNAL_CONTENT]\n\nHere's the full companion post (opportunity id: ${opportunityId}) — writing only, no captions yet. Approve it, edit it, or tell me what to change. Once the writing is locked, I'll build the branded header image (same photo + pull-quote + logo treatment as reshare), then captions from the finished post.`.trim();
          } else {
            fullReply = `${fullReply}\n\n[Could not draft the companion post — empty model response. Opportunity marked in studio; try again.]`.trim();
          }
        }
      } catch (err) {
        const rawMessage = err?.message || err || 'unknown error';
        const safeMessage = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
        fullReply = `${fullReply.replace(/\[\/?OPPORTUNITY_WRITE_POST[^\]]*\]/gi, '').trim()}\n\n[Could not draft companion post: ${safeMessage}]`.trim();
        console.error('[chat.js] OPPORTUNITY_WRITE_POST handler error:', err?.message || err);
      }
    }

    // Branded header image for an active companion/journal draft.
    // id is optional — image is built from tagged [JOURNAL_CONTENT] / [OPPORTUNITY_DRAFT] in the thread.
    // Accept both OPPORTUNITY_GENERATE_IMAGE (canonical) and OPPORTUNITY_IMAGE (near-miss Auto
    // has already produced in production). Do NOT match OPPORTUNITY_IMAGE_RESULT (server confirmation).
    const opportunityImageTagRe = /\[OPPORTUNITY_(?:GENERATE_IMAGE|IMAGE(?!_RESULT))([^\]]*)\]/i;
    const opportunityImageStripRe = /\[\/?OPPORTUNITY_(?:GENERATE_IMAGE|IMAGE(?!_RESULT))[^\]]*\]/gi;
    const opportunityImageMatch = fullReply.match(opportunityImageTagRe);
    if (opportunityImageMatch) {
      const attrBlob = opportunityImageMatch[1] || '';
      const idMatch = attrBlob.match(/\bid="([^"]*)"/i);
      const pullQuoteMatch = attrBlob.match(/\bpull_quote="([^"]*)"/i);
      const opportunityId = (idMatch?.[1] || '').trim();
      const pullQuoteAttr = pullQuoteMatch?.[1] || '';
      try {
        fullReply = fullReply.replace(opportunityImageStripRe, '').trim();

        // Opportunity row is optional context only — never required to generate the image.
        let opportunity = null;
        const looksLikeUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            opportunityId
          );
        if (looksLikeUuid) {
          const { data: oppRow } = await supabaseAdmin
            .from('ao_opportunities')
            .select('*')
            .eq('id', opportunityId)
            .maybeSingle();
          opportunity = oppRow || null;
        }

        // Prefer post body from this reply's JOURNAL_CONTENT / OPPORTUNITY_DRAFT, else prior assistant text.
        let postBody = '';
        let postTitle = opportunity?.title || 'Companion post';
        const journalInReply = fullReply.match(/\[JOURNAL_CONTENT\]([\s\S]*?)\[\/JOURNAL_CONTENT\]/i);
        const draftInReply = fullReply.match(/\[OPPORTUNITY_DRAFT[^\]]*\]([\s\S]*?)\[\/OPPORTUNITY_DRAFT\]/i);
        if (journalInReply) postBody = journalInReply[1].trim();
        else if (draftInReply) postBody = draftInReply[1].trim();

        if (!postBody && Array.isArray(priorMessages)) {
          for (let i = priorMessages.length - 1; i >= 0; i--) {
            const c = String(priorMessages[i]?.content || '');
            const m =
              c.match(/\[JOURNAL_CONTENT\]([\s\S]*?)\[\/JOURNAL_CONTENT\]/i) ||
              c.match(/\[OPPORTUNITY_DRAFT[^\]]*\]([\s\S]*?)\[\/OPPORTUNITY_DRAFT\]/i);
            if (m) {
              postBody = m[1].trim();
              break;
            }
          }
        }

        // Strip accidental nested wrappers so pull-quote extraction sees real prose.
        if (postBody) {
          postBody = postBody
            .replace(/\[JOURNAL_CONTENT\]/gi, '')
            .replace(/\[\/JOURNAL_CONTENT\]/gi, '')
            .replace(/\[OPPORTUNITY_DRAFT[^\]]*\]/gi, '')
            .replace(/\[\/OPPORTUNITY_DRAFT\]/gi, '')
            .trim();
        }

        if (!postBody) {
          fullReply = `${fullReply}\n\n[Could not generate branded opportunity image: no tagged post found in this thread. Re-present the draft wrapped in [JOURNAL_CONTENT]...[/JOURNAL_CONTENT], then ask for the image again. Do not re-run reshare.]`.trim();
        } else {
          const titleMatch = postBody.match(/^#\s+(.+)$/m) || postBody.match(/^##\s+(.+)$/m);
          if (titleMatch) postTitle = titleMatch[1].trim();

          const imageResult = await generateBrandedOpportunityImage({
            title: postTitle,
            body: postBody,
            pullQuote: pullQuoteAttr || '',
            attribution: opportunity?.title
              ? String(opportunity.title).replace(/\s+connects to your corpus$/i, '').trim()
              : null,
          });

          if (!imageResult.ok) {
            fullReply = `${fullReply}\n\n[Could not generate branded opportunity image: ${imageResult.error}]`.trim();
          } else {
            if (imageResult.image_url && String(imageResult.image_url).startsWith('https://')) {
              reshareMeta.reshare_image_url = imageResult.image_url;
              reshareMeta.opportunity_image_url = imageResult.image_url;
            }
            const idLine = opportunityId ? ` id="${opportunityId}"` : '';
            fullReply = `${fullReply}\n\n[OPPORTUNITY_IMAGE_RESULT${idLine}]\nPull quote: "${imageResult.pull_quote}"\nMood: ${imageResult.mood || 'n/a'}\nImage: ${imageResult.image_url}\n[/OPPORTUNITY_IMAGE_RESULT]\n\nHere's the branded header image (real photo + pull quote + logo — same treatment as reshare). Approve it, ask for a different photo/quote, or say what to change. Captions come only after this image is approved — derived from the finished post, not before.`.trim();

            await logActivity({
              action_type: 'image_generated',
              source: 'chat.js:OPPORTUNITY_GENERATE_IMAGE',
              reference_table: opportunityId ? 'ao_opportunities' : null,
              reference_id: opportunityId || null,
              created_by_email: auth?.email || null,
              detail: {
                image_url: imageResult.image_url,
                pull_quote: imageResult.pull_quote,
                mood: imageResult.mood || null,
              },
            });
          }
        }
      } catch (err) {
        const rawMessage = err?.message || err || 'unknown error';
        const safeMessage = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
        fullReply = `${fullReply.replace(opportunityImageStripRe, '').trim()}\n\n[Could not generate opportunity image: ${safeMessage}]`.trim();
        console.error('[chat.js] OPPORTUNITY_GENERATE_IMAGE handler error:', err?.message || err);
      }
    }

    // Opportunity fully approved (post + image + captions path complete) → publisher.
    const opportunityCompleteMatch = fullReply.match(/\[OPPORTUNITY_COMPLETE\s+id="([^"]+)"\]/i);
    if (opportunityCompleteMatch) {
      const opportunityId = opportunityCompleteMatch[1];
      try {
        fullReply = fullReply.replace(/\[\/?OPPORTUNITY_COMPLETE[^\]]*\]/gi, '').trim();
        const { error: completeError } = await supabaseAdmin
          .from('ao_opportunities')
          .update({ status: 'publisher', updated_at: new Date().toISOString() })
          .eq('id', opportunityId);
        if (completeError) {
          fullReply = `${fullReply}\n\n[Could not mark opportunity complete: ${completeError.message}]`.trim();
        } else {
          fullReply = `${fullReply}\n\nOpportunity marked ready for publish.`.trim();
        }
      } catch (err) {
        fullReply = `${fullReply.replace(/\[\/?OPPORTUNITY_COMPLETE[^\]]*\]/gi, '').trim()}\n\n[Could not complete opportunity: ${err?.message || 'unknown error'}]`.trim();
        console.error('[chat.js] OPPORTUNITY_COMPLETE handler error:', err?.message || err);
      }
    }

    // Real, complete, untruncated full-text fetch by slug or title — no similarity gating,
    // no preview truncation. Resolves ALL CORPUS_FETCH_FULL_TEXT signals in this turn
    // (not just the first). Fetched bodies are injected into a synthesis call — never
    // dumped raw into the visible/stored reply.
    const corpusFetchMatches = [...fullReply.matchAll(/\[CORPUS_FETCH_FULL_TEXT([^\]]*)\]/gi)];
    if (corpusFetchMatches.length > 0) {
      try {
        fullReply = fullReply.replace(/\[\/?CORPUS_FETCH_FULL_TEXT[^\]]*\]/gi, '').trim();

        let knowledgeDocs = null;
        const loadKnowledgeDocs = () => {
          if (knowledgeDocs) return knowledgeDocs;
          try {
            const knowledgeRaw = fs.readFileSync(
              path.join(process.cwd(), 'public/knowledge.json'),
              'utf8'
            );
            knowledgeDocs = JSON.parse(knowledgeRaw)?.docs || [];
          } catch (_) {
            knowledgeDocs = [];
          }
          return knowledgeDocs;
        };

        const candidatePathsForSlug = (slug) => {
          if (!slug) return [];
          const root = process.cwd();
          return [
            path.join(root, 'ao-knowledge-hq-kit/journal', `${slug}.md`),
            path.join(root, 'ao-knowledge-hq-kit/journal/devotionals', `${slug}.md`),
            path.join(root, 'ao-knowledge-hq-kit/faqs', `${slug}.md`),
          ];
        };

        const findMarkdownPath = (slug) => {
          for (const p of candidatePathsForSlug(slug)) {
            if (fs.existsSync(p)) return p;
          }
          const kitRoot = path.join(process.cwd(), 'ao-knowledge-hq-kit');
          const stack = [kitRoot];
          while (stack.length) {
            const dir = stack.pop();
            let entries = [];
            try {
              entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch (_) {
              continue;
            }
            for (const ent of entries) {
              const full = path.join(dir, ent.name);
              if (ent.isDirectory()) {
                if (ent.name === 'node_modules' || ent.name === '.git') continue;
                stack.push(full);
              } else if (ent.isFile() && ent.name === `${slug}.md`) {
                return full;
              }
            }
          }
          return null;
        };

        const parseFrontmatterMeta = (raw) => {
          const titleLine = ((raw.match(/^title:\s*(.+)$/m) || [])[1] || '')
            .trim()
            .replace(/^['"]|['"]$/g, '');
          const publishDateLine = (
            (raw.match(/^publish_date:\s*'?([^'\n]+)'?$/m) || [])[1] || 'unknown'
          ).trim();
          let summaryLine = '';
          const folded = raw.match(/^summary:\s*>-?\s*\n((?:[ \t].*\n?)*)/m);
          if (folded) {
            summaryLine = folded[1]
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
              .join(' ')
              .trim();
          } else {
            summaryLine = ((raw.match(/^summary:\s*(.+)$/m) || [])[1] || '')
              .trim()
              .replace(/^['"]|['"]$/g, '');
          }
          return { titleLine, publishDateLine, summaryLine };
        };

        const resolvedDocs = [];
        const failures = [];

        for (const match of corpusFetchMatches) {
          const attrBlob = match[1] || '';
          const slugMatch = attrBlob.match(/\bslug="([^"]*)"/i);
          const titleMatch = attrBlob.match(/\btitle="([^"]*)"/i);
          const requestedSlug = (slugMatch?.[1] || '').trim();
          const requestedTitle = (titleMatch?.[1] || '').trim();

          let resolvedSlug = requestedSlug;
          let filePath = resolvedSlug ? findMarkdownPath(resolvedSlug) : null;

          if (!filePath && requestedTitle) {
            const byTitle = loadKnowledgeDocs().find(
              (d) => String(d.title || '').trim().toLowerCase() === requestedTitle.toLowerCase()
            );
            if (byTitle?.slug) {
              resolvedSlug = byTitle.slug;
              filePath = findMarkdownPath(resolvedSlug);
            }
          }

          if (filePath) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const fmEnd = raw.indexOf('\n---', 3);
            const fullBody = fmEnd >= 0 ? raw.slice(fmEnd + 4).trim() : raw.trim();
            const meta = parseFrontmatterMeta(raw);
            resolvedDocs.push({
              slug: resolvedSlug,
              title: meta.titleLine || resolvedSlug,
              publishDate: meta.publishDateLine,
              summary: meta.summaryLine,
              body: fullBody,
            });
            continue;
          }

          const docs = loadKnowledgeDocs();
          const kjMatch =
            (resolvedSlug && docs.find((d) => d.slug === resolvedSlug)) ||
            (requestedTitle &&
              docs.find(
                (d) => String(d.title || '').trim().toLowerCase() === requestedTitle.toLowerCase()
              )) ||
            null;
          if (kjMatch?.body && String(kjMatch.body).trim()) {
            resolvedSlug = kjMatch.slug || resolvedSlug || 'unknown';
            resolvedDocs.push({
              slug: resolvedSlug,
              title: kjMatch.title || resolvedSlug,
              publishDate: kjMatch.publish_date || kjMatch.date || 'unknown',
              summary: kjMatch.summary || kjMatch.email_summary || '',
              body: String(kjMatch.body).trim(),
            });
          } else {
            failures.push({ requestedSlug, requestedTitle });
            fullReply =
              `${fullReply}\n\n[CORPUS_FETCH_FAILED slug="${requestedSlug || 'unknown'}"]\nCould not find a document matching slug "${requestedSlug}" or title "${requestedTitle}". Confirm the exact slug from the FULL CORPUS INDEX and try again.\n[/CORPUS_FETCH_FAILED]`.trim();
          }
        }

        if (resolvedDocs.length > 0) {
          const remainingMs = remainingSoftBudgetMs();
          if (remainingMs < 8_000) {
            sendEvent('error', {
              ok: false,
              error:
                'Auto took too long to respond — this usually means the conversation got too large. Try starting a new thread.',
            });
            res.end();
            return;
          }

          const retrievedBlock = resolvedDocs
            .map(
              (d) => `### ${d.title} (slug: ${d.slug})
Published: ${d.publishDate}
Summary: ${d.summary || '(none)'}

${d.body}`
            )
            .join('\n\n---\n\n');

          const synthesisSystem = `${streamResult.systemPrompt || ''}

## RETRIEVED DOCUMENT(S) — FOR YOUR USE, DO NOT QUOTE IN FULL UNLESS BART EXPLICITLY ASKS FOR THE VERBATIM TEXT

The documents below were fetched server-side for this turn. Use them to answer Bart. Do not dump the raw file text into the chat. Synthesize, cite, and compare as needed. Include publish dates and series ordering when relevant.

${retrievedBlock}
`.trim();

          const synthesisMessages =
            Array.isArray(streamResult.messages) && streamResult.messages.length > 0
              ? streamResult.messages
              : [{ role: 'user', content: userMessage }];

          // Replace the preamble/signal reply — synthesis becomes the stored/visible answer.
          // Tell the client to wipe its live streaming buffer FIRST. Without this, the
          // client keeps appending new tokens onto the same message bubble as the
          // discarded first-pass reply, producing one garbled message that looks like
          // Auto contradicting itself mid-sentence (two separate model generations
          // glued together with no boundary).
          sendEvent('reset', { reset: true });
          fullReply = '';
          const synthesisClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const synthesisModel =
            process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-5';

          try {
            await Promise.race([
              (async () => {
                const synthStream = synthesisClient.messages.stream({
                  model: synthesisModel,
                  max_tokens: 8000,
                  system: synthesisSystem,
                  messages: synthesisMessages,
                });
                synthStream.on('error', (err) => {
                  console.error(
                    '[chat.js] Corpus synthesis stream error:',
                    err?.message || err
                  );
                });
                synthStream.on('text', (text) => {
                  if (!text) return;
                  fullReply += text;
                  sendEvent('token', { token: text });
                });
                await synthStream.finalMessage();
              })(),
              timeoutAfter(
                remainingMs,
                'Auto took too long to respond — this usually means the conversation got too large. Try starting a new thread.'
              ),
            ]);
          } catch (synthErr) {
            console.error('[chat.js] Corpus synthesis failed:', synthErr?.message || synthErr);
            sendEvent('error', {
              ok: false,
              error:
                synthErr?.message ||
                'Auto retrieved the documents but could not finish synthesizing a reply. Try again.',
            });
            res.end();
            return;
          }

          if (!String(fullReply || '').trim()) {
            sendEvent('error', {
              ok: false,
              error:
                'Auto retrieved the documents but returned an empty synthesis. Try again.',
            });
            res.end();
            return;
          }

          // The synthesis call above generates brand-new prose that never passed through
          // enforceResponseRules/enforceVoiceGuardrails (those ran earlier, on the original
          // reply, before this block replaced fullReply entirely). Without this, any reply
          // that touches the corpus silently skips voice/quality enforcement. Re-apply both
          // here so synthesized replies get the same guarantees as every other reply.
          fullReply = enforceResponseRules(fullReply, recentHistory);
          {
            const synthVoiceClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            const synthVoiceResult = await enforceVoiceGuardrails(fullReply, {
              anthropicClient: synthVoiceClient,
              contextLabel: 'corpus-synthesis-reply',
            });
            if (synthVoiceResult.corrected) {
              console.log(
                `[chat.js] Voice guardrails corrected corpus-synthesis reply (${synthVoiceResult.forced ? 'forced-strip' : 'self-correct'}; ${synthVoiceResult.violations.length} hit(s))`
              );
            }
            fullReply = synthVoiceResult.text;
          }

          console.log(
            `[chat.js] Corpus synthesis complete for: ${resolvedDocs.map((d) => d.slug).join(', ')}` +
              (failures.length ? ` (${failures.length} failed)` : '')
          );
        }
      } catch (err) {
        const safeMessage = err?.message || String(err);
        fullReply = `${fullReply.replace(/\[\/?CORPUS_FETCH_FULL_TEXT[^\]]*\]/gi, '').trim()}\n\n[Could not fetch full text: ${safeMessage}]`.trim();
        console.error('[chat.js] CORPUS_FETCH_FULL_TEXT handler error:', err?.message || err);
      }
    }

    // Defensive backstop: if any all-caps bracket signal still looks unknown after
    // every handler has run, log loudly. Do not strip — leave visible for Bart.
    // Known content/result tags (JOURNAL_CONTENT, CARD, OPPORTUNITY_IMAGE_RESULT, etc.)
    // are in KNOWN_REAL_SIGNALS and will not warn.
    {
      const leftoverTagRe = /\[([A-Z_]{3,})(?:\s[^\]]*)?\]/g;
      let leftoverMatch;
      while ((leftoverMatch = leftoverTagRe.exec(fullReply)) !== null) {
        const tagName = leftoverMatch[1];
        if (!KNOWN_REAL_SIGNALS.has(tagName)) {
          console.warn(
            '[chat.js] Unrecognized signal tag survived to reply:',
            leftoverMatch[0]
          );
        }
      }
    }

    // User message was already persisted at the top of the handler (before the
    // model call). Only the assistant reply is written here.
    await addAutoMessage({
      threadId: thread.id,
      role: 'assistant',
      mode: 'plan',
      content: fullReply,
      meta: { auto_v2: true, ...reshareMeta },
    });

    // Save draft to ao_content_drafts if this exchange contains an approved journal draft.
    // This runs server-side regardless of Auto's behavior — Auto cannot save drafts itself.
    //
    // IMPORTANT: this and the signal processors below are awaited, not fire-and-forget.
    // On Vercel, once the response ends the function execution can be frozen or torn
    // down before a dangling unawaited promise completes. Each of these does real work
    // (database writes, in some cases additional Anthropic API calls) that takes real
    // time. Firing them without awaiting caused writes to silently disappear —
    // specifically, research briefs generated live in conversation were never saved
    // because the response closed before the write finished. Every signal processor
    // that performs a write must complete before res.end() is called.
    try {
      await trySaveDraftFromExchange(userMessage, fullReply, auth.email, recentHistory);
    } catch (err) {
      console.error('[chat.js] trySaveDraftFromExchange error:', err?.message || err);
    }

    // Episode publish/process is client-driven via AutoV2Panel → episode-process →
    // EpisodeDraftReview → episode-publish (GitHub commit). Do not also run
    // processEpisodeSignal here — that path only writes local disk and races the
    // real deploy pipeline. Research signal below still runs server-side.

    // Process episode research signal — saves research brief and questions back to guest record.
    // This one is especially time-sensitive to get right: it makes two sequential
    // Anthropic calls before writing to Supabase, so it takes the longest of any
    // signal processor in this file. It must fully complete before the response ends.
    if (fullReply.includes('[EPISODE_RESEARCH_COMPLETE')) {
      try {
        const researchResult = await processEpisodeResearchSignal(fullReply, auth.email);
        if (!researchResult.ok) {
          console.error('[chat.js] processEpisodeResearchSignal did not succeed:', researchResult.error);
        } else {
          const savedFor = researchResult.guest_ids
            ? researchResult.guest_ids.join(', ')
            : researchResult.guest_id || 'unknown';
          console.log('[chat.js] Research signal(s) processed and saved for guest(s):', savedFor);
          if (researchResult.partial) {
            console.warn('[chat.js] Some research signals failed:', researchResult.failures);
          }
        }
      } catch (err) {
        console.error('[chat.js] processEpisodeResearchSignal error:', err?.message || err);
      }
    }

    const finalState = await getAutoThreadState(auth.email, thread.id);

    // Send the complete processed reply and thread state as the final SSE event
    sendEvent('done', {
      ok: true,
      thread: finalState.thread,
      messages: finalState.messages,
      attachments: finalState.attachments,
      assistant_message: fullReply,
      receipts: [],
      bundle_id: null,
      idea_id: null,
      action_log_id: null,
    });
    res.end();
    return;
  } catch (err) {
    console.error('[Auto V2 chat]', err?.message || err);
    try {
      sendEvent('error', {
        ok: false,
        error: err?.message || 'Server error',
        persisted_user_message: userMessage,
      });
      res.end();
    } catch (_) {
      // Headers already sent or client disconnected
    }
  }
}
