/**
 * Auto V2 — Chat route (Anthropic brain)
 *
 * Response shape matches what `AutoHubPanel.jsx` expects (same as V1):
 * { ok, thread, messages, attachments, assistant_message, receipts, bundle_id, idea_id, action_log_id }
 *
 * Rollback: rename this file to `chat-v2.js` and restore `chat-v1-backup.js` as `chat.js`.
 */

import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { ensureAutoThread, getAutoThreadState, addAutoMessage } from '../../../lib/ao/autoHub.js';
import { runAutoChat, runAutoChatStream } from '../../../lib/ao/autoV2.js';
import { appendQuoteCardImagesToReplyIfNeeded } from '../../../lib/ao/appendQuoteCardImagesAfterApproval.js';
import { appendDesignImageToReplyIfNeeded } from '../../../lib/ao/appendDesignImageToReplyIfNeeded.js';
import { getScheduleContext } from '../../../lib/ao/getScheduleContext.js';
import { enforceResponseRules } from '../../../lib/ao/enforceResponseRules.js';
import { processEpisodeSignal } from '../../../lib/ao/processEpisodeSignal.js';
import { processEpisodeResearchSignal } from '../../../lib/ao/processEpisodeResearchSignal.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { runReshareCycle, generateBrandedOpportunityImage } from './reshare-journal.js';
import { approveOrDiscardReshare } from './reshare-review.js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

/**
 * Detects approved content in the current exchange and saves it to ao_content_drafts.
 * Runs server-side after every response — Auto cannot reliably save drafts itself.
 *
 * Detects four content types:
 * 1. Journal draft — [JOURNAL_CONTENT] block with or without [PUBLISH_JOURNAL] signal
 * 2. Devotional draft — [DEVOTIONAL_CONTENT] block
 * 3. Caption set — [SOCIAL_CAPTIONS] block with multiple [CAPTION] blocks
 * 4. Standalone prose — substantial assistant prose approved without a signal block
 *
 * When the approval message arrives without content in the same response,
 * looks back at recentHistory to find the content in the prior assistant message.
 *
 * Never throws. Never blocks the response. Logs failures silently.
 */
async function trySaveDraftFromExchange(userMessage, assistantReply, email, recentHistory = []) {
  if (!email || !assistantReply) return;

  const userLower = String(userMessage || '').toLowerCase();
  const isApproval = /\b(approved?|looks good|go ahead|publish it|that.?s it|perfect|yes|confirmed?|do it|fire it|send it)\b/i.test(userLower);
  const isRemoval = /\b(cut (that|this|it)|take (that|this) out|remove the|we'?re? not using that|don'?t include|leave (that|this) out|without the|no biographical|drop the|we cut|that'?s? cut|not in (the|this))\b/i.test(userLower);
  if (!isApproval && !isRemoval) return;

  // Helper: parse attributes from a signal tag string
  function parseAttrs(str) {
    const attrs = {};
    const pattern = /(\w+)="([^"]*)"/g;
    let m;
    while ((m = pattern.exec(str)) !== null) attrs[m[1]] = m[2];
    return attrs;
  }

  // Helper: extract part number from slug
  function extractPartNumber(slug) {
    const match = (slug || '').match(/-part-(\d+)/i);
    return match ? parseInt(match[1], 10) : 1;
  }

  // Helper: derive series slug from a full slug (strip part suffix)
  function deriveSeriesSlug(slug) {
    return (slug || '').replace(/-part-\d+.*$/i, '') || slug;
  }

  // Search current reply and recent history for content blocks
  // Content may be in the prior assistant message when approval is in the current user message
  const searchTexts = [assistantReply];
  if (recentHistory && recentHistory.length > 0) {
    const recentAssistant = recentHistory
      .filter(m => m.role === 'assistant')
      .slice(-3)
      .map(m => String(m.content || ''));
    searchTexts.push(...recentAssistant);
  }
  const fullSearchText = searchTexts.join('\n\n');

  // --- REMOVAL CONSTRAINTS ---
  // When Bart removes content from a draft, save it as a constraint that applies
  // to all downstream content in this and future sessions for the same piece.
  // Runs independently of approval — "cut this" is not an approval word.
  if (isRemoval) {
    const existingSlug = (() => {
      const recentPublish = fullSearchText.match(/\[PUBLISH_JOURNAL[^\]]*slug="([^"]+)"/i);
      return recentPublish ? recentPublish[1] : null;
    })();

    if (existingSlug || fullSearchText.includes('[JOURNAL_CONTENT]')) {
      const constraintSlug = existingSlug || 'active-draft';
      const partKey = Number(String(Date.now()).slice(-8));
      try {
        await supabaseAdmin
          .from('ao_content_drafts')
          .upsert({
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
          }, {
            onConflict: 'created_by_email,series_slug,part_number,kind',
            ignoreDuplicates: false,
          });
        console.log(`[chat.js] Content removal constraint saved for: ${constraintSlug}`);
      } catch (err) {
        console.error('[chat.js] Content constraint save failed:', err?.message || err);
      }
    }
  }

  if (!isApproval) return;

  // --- JOURNAL DRAFT ---
  const journalContentMatch = fullSearchText.match(/\[JOURNAL_CONTENT\]([\s\S]*?)\[\/JOURNAL_CONTENT\]/i);
  if (journalContentMatch) {
    const publishMatch = fullSearchText.match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);
    const attrs = publishMatch ? parseAttrs(publishMatch[1]) : {};

    // Try to extract slug and title from the publish signal or from the content frontmatter
    let slug = attrs.slug || '';
    let title = attrs.title || '';

    if (!slug) {
      // Try to find slug in frontmatter of the content block
      const slugMatch = journalContentMatch[1].match(/^slug:\s*(.+)$/m);
      if (slugMatch) slug = slugMatch[1].trim().replace(/^["']|["']$/g, '');
    }
    if (!title) {
      const titleMatch = journalContentMatch[1].match(/^title:\s*(.+)$/m);
      if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
    }

    if (slug || title) {
      try {
        await supabaseAdmin
          .from('ao_content_drafts')
          .upsert({
            created_by_email: email.toLowerCase().trim(),
            kind: 'journal',
            series_slug: deriveSeriesSlug(slug) || 'standalone',
            part_number: extractPartNumber(slug),
            title: title || slug,
            slug: slug || null,
            content: journalContentMatch[1].trim(),
            summary: attrs.summary || '',
            image_url: attrs.image_url || null,
            status: 'approved',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'created_by_email,series_slug,part_number,kind',
            ignoreDuplicates: false,
          });
        console.log(`[chat.js] Journal draft saved: ${slug || title}`);
      } catch (err) {
        console.error('[chat.js] Journal draft save failed:', err?.message || err);
      }
    }
    return; // Journal save handled — do not attempt other content types
  }

  // --- DEVOTIONAL DRAFT ---
  const devotionalMatch = fullSearchText.match(/\[DEVOTIONAL_CONTENT\]([\s\S]*?)\[\/DEVOTIONAL_CONTENT\]/i);
  if (devotionalMatch) {
    const publishMatch = fullSearchText.match(/\[PUBLISH_DEVOTIONAL([^\]]*)\]/i);
    const attrs = publishMatch ? parseAttrs(publishMatch[1]) : {};

    const slug = attrs.slug || `devotional-${attrs.date || new Date().toISOString().split('T')[0]}`;
    const title = attrs.title || `Devotional — ${attrs.date || new Date().toISOString().split('T')[0]}`;

    try {
      await supabaseAdmin
        .from('ao_content_drafts')
        .upsert({
          created_by_email: email.toLowerCase().trim(),
          kind: 'devotional',
          series_slug: attrs.date ? attrs.date.slice(0, 7) : new Date().toISOString().slice(0, 7),
          part_number: parseInt((attrs.date || '').replace(/-/g, '').slice(-2) || '1', 10),
          title,
          slug,
          content: devotionalMatch[1].trim(),
          summary: attrs.summary || '',
          image_url: null,
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'created_by_email,series_slug,part_number,kind',
          ignoreDuplicates: false,
        });
      console.log(`[chat.js] Devotional draft saved: ${slug}`);
    } catch (err) {
      console.error('[chat.js] Devotional draft save failed:', err?.message || err);
    }
    return;
  }

  // --- CAPTION SET ---
  const captionsMatch = fullSearchText.match(/\[SOCIAL_CAPTIONS\]([\s\S]*?)\[\/SOCIAL_CAPTIONS\]/i);
  if (captionsMatch) {
    // Extract the slug context from nearby publish signal or thread context
    const publishMatch = fullSearchText.match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);
    const attrs = publishMatch ? parseAttrs(publishMatch[1]) : {};
    const slug = attrs.slug || 'captions-' + new Date().toISOString().split('T')[0];

    try {
      await supabaseAdmin
        .from('ao_content_drafts')
        .upsert({
          created_by_email: email.toLowerCase().trim(),
          kind: 'captions',
          series_slug: deriveSeriesSlug(attrs.slug) || 'standalone',
          part_number: extractPartNumber(attrs.slug),
          title: `Captions — ${attrs.title || slug}`,
          slug,
          content: captionsMatch[1].trim(),
          summary: '',
          image_url: null,
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'created_by_email,series_slug,part_number,kind',
          ignoreDuplicates: false,
        });
      console.log(`[chat.js] Caption set saved: ${slug}`);
    } catch (err) {
      console.error('[chat.js] Caption set save failed:', err?.message || err);
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

    // Stream the model response token by token
    let fullReply = '';
    let streamError = null;

    try {
      const streamResult = await runAutoChatStream(
        history,
        currentMessageContent,
        scheduleContext,
        userMessage,
        (token) => {
          // Send each token to the client as it arrives
          fullReply += token;
          sendEvent('token', { token });
        }
      );

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
          const revisedCaption = (editResponse.content?.[0]?.text || '').trim();
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
- No AI signature phrases: "it's worth noting", "at its core", "furthermore", "moreover", "this highlights", "not only X but also Y", "in many ways", "navigate"
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

          const draftedPost = (draftResponse.content?.[0]?.text || '').trim();

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
    const opportunityImageMatch = fullReply.match(/\[OPPORTUNITY_GENERATE_IMAGE([^\]]*)\]/i);
    if (opportunityImageMatch) {
      const attrBlob = opportunityImageMatch[1] || '';
      const idMatch = attrBlob.match(/\bid="([^"]*)"/i);
      const pullQuoteMatch = attrBlob.match(/\bpull_quote="([^"]*)"/i);
      const opportunityId = (idMatch?.[1] || '').trim();
      const pullQuoteAttr = pullQuoteMatch?.[1] || '';
      try {
        fullReply = fullReply.replace(/\[\/?OPPORTUNITY_GENERATE_IMAGE[^\]]*\]/gi, '').trim();

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
          });

          if (!imageResult.ok) {
            fullReply = `${fullReply}\n\n[Could not generate branded opportunity image: ${imageResult.error}]`.trim();
          } else {
            if (imageResult.image_url && String(imageResult.image_url).startsWith('https://')) {
              reshareMeta.reshare_image_url = imageResult.image_url;
              reshareMeta.opportunity_image_url = imageResult.image_url;
            }
            const idLine = opportunityId ? ` id="${opportunityId}"` : '';
            fullReply = `${fullReply}\n\n[OPPORTUNITY_IMAGE${idLine}]\nPull quote: "${imageResult.pull_quote}"\nMood: ${imageResult.mood || 'n/a'}\nImage: ${imageResult.image_url}\n[/OPPORTUNITY_IMAGE]\n\nHere's the branded header image (real photo + pull quote + logo — same treatment as reshare). Approve it, ask for a different photo/quote, or say what to change. Captions come only after this image is approved — derived from the finished post, not before.`.trim();
          }
        }
      } catch (err) {
        const rawMessage = err?.message || err || 'unknown error';
        const safeMessage = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
        fullReply = `${fullReply.replace(/\[\/?OPPORTUNITY_GENERATE_IMAGE[^\]]*\]/gi, '').trim()}\n\n[Could not generate opportunity image: ${safeMessage}]`.trim();
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
    // no preview truncation. This is the actual fix for a repeated, confirmed failure: every
    // prior corpus system (vector DB, Library browser) only ever returned truncated previews
    // while being described as "full text." This reads the real file, in full, every time.
    const corpusFetchMatch = fullReply.match(/\[CORPUS_FETCH_FULL_TEXT([^\]]*)\]/i);
    if (corpusFetchMatch) {
      const attrBlob = corpusFetchMatch[1] || '';
      const slugMatch = attrBlob.match(/\bslug="([^"]*)"/i);
      const titleMatch = attrBlob.match(/\btitle="([^"]*)"/i);
      const requestedSlug = (slugMatch?.[1] || '').trim();
      const requestedTitle = (titleMatch?.[1] || '').trim();

      try {
        fullReply = fullReply.replace(/\[\/?CORPUS_FETCH_FULL_TEXT[^\]]*\]/gi, '').trim();

        let resolvedSlug = requestedSlug;
        let knowledgeDocs = null;

        const loadKnowledgeDocs = () => {
          if (knowledgeDocs) return knowledgeDocs;
          try {
            const knowledgeRaw = fs.readFileSync(path.join(process.cwd(), 'public/knowledge.json'), 'utf8');
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
          // Chapters and other kit docs: shallow search under ao-knowledge-hq-kit/
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

        let filePath = resolvedSlug ? findMarkdownPath(resolvedSlug) : null;

        // Fall back to title match against knowledge.json if no slug was given or the slug doesn't resolve.
        if (!filePath && requestedTitle) {
          const match = loadKnowledgeDocs().find(
            (d) => String(d.title || '').trim().toLowerCase() === requestedTitle.toLowerCase()
          );
          if (match?.slug) {
            resolvedSlug = match.slug;
            filePath = findMarkdownPath(resolvedSlug);
          }
        }

        if (filePath) {
          const raw = fs.readFileSync(filePath, 'utf8');
          const fmEnd = raw.indexOf('\n---', 3);
          const fullBody = fmEnd >= 0 ? raw.slice(fmEnd + 4).trim() : raw.trim();
          const titleLine = (raw.match(/^title:\s*(.+)$/m) || [])[1] || resolvedSlug;
          fullReply = `${fullReply}\n\n[CORPUS_FULL_TEXT slug="${resolvedSlug}"]\nTitle: ${titleLine}\n\n${fullBody}\n[/CORPUS_FULL_TEXT]`.trim();
        } else {
          // Last resort: full body already stored in knowledge.json (same bytes as source for journal posts).
          const docs = loadKnowledgeDocs();
          const match =
            (resolvedSlug && docs.find((d) => d.slug === resolvedSlug)) ||
            (requestedTitle &&
              docs.find((d) => String(d.title || '').trim().toLowerCase() === requestedTitle.toLowerCase())) ||
            null;
          if (match?.body && String(match.body).trim()) {
            resolvedSlug = match.slug || resolvedSlug || 'unknown';
            fullReply = `${fullReply}\n\n[CORPUS_FULL_TEXT slug="${resolvedSlug}"]\nTitle: ${match.title || resolvedSlug}\n\n${String(match.body).trim()}\n[/CORPUS_FULL_TEXT]`.trim();
          } else {
            fullReply = `${fullReply}\n\n[CORPUS_FETCH_FAILED slug="${requestedSlug || 'unknown'}"]\nCould not find a document matching slug "${requestedSlug}" or title "${requestedTitle}". Confirm the exact slug from the FULL CORPUS INDEX and try again.\n[/CORPUS_FETCH_FAILED]`.trim();
          }
        }
      } catch (err) {
        const safeMessage = err?.message || String(err);
        fullReply = `${fullReply.replace(/\[\/?CORPUS_FETCH_FULL_TEXT[^\]]*\]/gi, '').trim()}\n\n[Could not fetch full text: ${safeMessage}]`.trim();
        console.error('[chat.js] CORPUS_FETCH_FULL_TEXT handler error:', err?.message || err);
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

    // Process episode signal if present — commits corpus markdown and updates episode draft
    if (fullReply.includes('[EPISODE_PROCESS')) {
      try {
        await processEpisodeSignal(fullReply, auth.email);
      } catch (err) {
        console.error('[chat.js] processEpisodeSignal error:', err?.message || err);
      }
    }

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
