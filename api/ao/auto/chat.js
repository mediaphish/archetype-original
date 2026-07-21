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

/**
 * Generate and save a session brief when the thread is wrapping up.
 * Detects wrap signals from Bart ("we're done", "wrap this up", "that's it for today",
 * "good night", "talk tomorrow") or fires automatically when a thread reaches 20+ messages.
 *
 * The brief captures:
 * - What was being worked on (series, post type, topic)
 * - What decisions were made (approved drafts, rejected angles)
 * - What was published or scheduled
 * - What is next (the explicit next step or open thread)
 * - Any open flags or concerns raised
 *
 * Saves to ao_content_drafts with kind='session_brief' so it loads
 * into the next session automatically via loadApprovedDraftsContext.
 *
 * This function calls Anthropic directly with a small focused prompt
 * so the brief is Auto's own synthesis, not a dump of raw messages.
 */
async function tryGenerateSessionBrief(threadId, messages, email, userMessage) {
  if (!email || !threadId || !messages || messages.length < 6) return;

  const wrapSignals = /\b(we're done|wrap this up|that'?s? it for (today|now|tonight)|good night|talk tomorrow|see you|bye|done for now|logging off|heading out)\b/i;
  const isWrapSignal = wrapSignals.test(String(userMessage || ''));

  if (!isWrapSignal) return;

  try {
    // Check if we already saved a brief for this thread recently
    const { data: existing } = await supabaseAdmin
      .from('ao_content_drafts')
      .select('id, updated_at')
      .eq('created_by_email', email.toLowerCase().trim())
      .eq('kind', 'session_brief')
      .eq('series_slug', threadId)
      .order('updated_at', { ascending: false })
      .limit(1);

    // Don't regenerate if we saved one in the last 30 minutes
    if (existing && existing.length > 0) {
      const lastSaved = new Date(existing[0].updated_at);
      const minutesAgo = (Date.now() - lastSaved.getTime()) / (1000 * 60);
      if (minutesAgo < 30) return;
    }

    // Build a concise message history for the brief generator
    // Only use the last 30 messages to keep it focused
    const recentMessages = messages.slice(-30);
    const historyText = recentMessages
      .map(m => `${m.role === 'user' ? 'Bart' : 'Auto'}: ${String(m.content || '').slice(0, 500)}`)
      .join('\n\n');

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are summarizing a working session between Bart Paden and his AI CMO (Auto) at Archetype Original.

Read this conversation and write a session brief in Bart's voice that captures:

1. WORKING ON: What content was being worked on (be specific — series name, part number, topic, post type)
2. DECISIONS MADE: What was approved, what was rejected, what angles were chosen
3. PUBLISHED OR SCHEDULED: Anything that went live or got scheduled, with slugs/dates if mentioned
4. WHAT IS NEXT: The exact next step — specific enough that a new session can pick up without asking
5. OPEN FLAGS: Any unresolved issues, pending approvals, or things Bart flagged as concerns

Write in plain, direct language. No filler. No AI phrasing. Short sentences. This brief will be the first thing Auto reads in the next session.

CONVERSATION:
${historyText}

Write the brief now. Format it with the 5 section headers above. Keep it under 400 words total.`
      }]
    });

    const briefText = response.content?.[0]?.text || '';
    if (!briefText || briefText.length < 50) return;

    // Save as a session brief
    await supabaseAdmin
      .from('ao_content_drafts')
      .upsert({
        created_by_email: email.toLowerCase().trim(),
        kind: 'session_brief',
        series_slug: threadId,
        part_number: 1,
        title: `Session Brief — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        slug: `session-brief-${threadId.slice(0, 8)}`,
        content: briefText,
        summary: briefText.slice(0, 200),
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { thread_id: threadId, message_count: messages.length }
      }, {
        onConflict: 'created_by_email,series_slug,part_number,kind',
        ignoreDuplicates: false,
      });

    console.log(`[chat.js] Session brief saved for thread ${threadId}`);
  } catch (err) {
    console.error('[chat.js] Session brief generation failed:', err?.message || err);
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

    // Handle [TRIGGER_RESHARE] — run the reshare engine and inject the result
    // into the reply as a [RESHARE_RESULT] block, same append pattern as
    // [DALLE_GENERATE] → [IMAGE_GENERATED].
    if (/\[TRIGGER_RESHARE\]/i.test(fullReply)) {
      try {
        const selfBase = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';
        const reshareRes = await fetch(`${selfBase}/api/ao/auto/reshare-journal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({}),
        });
        const reshareJson = await reshareRes.json().catch(() => ({}));

        // Strip the trigger tags from the reply regardless of outcome
        fullReply = fullReply.replace(/\[\/?TRIGGER_RESHARE\]/gi, '').trim();

        if (reshareRes.ok && reshareJson.ok && reshareJson.captions) {
          const c = reshareJson.captions;
          const resultBlock = `[RESHARE_RESULT]
slug: ${reshareJson.slug || ''}
title: ${reshareJson.title || ''}
journal_url: ${reshareJson.journal_url || ''}
selection_reason: ${reshareJson.selection_reason || ''}
pull_quote: ${reshareJson.pull_quote || ''}
image_url: ${reshareJson.image_url || ''}
photo: ${reshareJson.photo || ''}
status: ${reshareJson.status || ''}

LINKEDIN:
${c.linkedin_personal || ''}

INSTAGRAM:
${c.instagram_business || ''}

FACEBOOK:
${c.facebook_business || ''}

X:
${c.twitter || ''}
[/RESHARE_RESULT]`;
          fullReply = `${fullReply}\n\n${resultBlock}`;
          console.log(`[chat.js] TRIGGER_RESHARE succeeded: ${reshareJson.slug} (${reshareJson.status})`);
        } else {
          const detail = reshareJson.error || reshareJson.message || `HTTP ${reshareRes.status}`;
          fullReply = `${fullReply}\n\n[Reshare engine did not complete: ${detail}]`;
          console.error('[chat.js] TRIGGER_RESHARE failed:', detail);
        }
      } catch (err) {
        fullReply = `${fullReply.replace(/\[\/?TRIGGER_RESHARE\]/gi, '').trim()}\n\n[Reshare engine did not complete: ${err?.message || 'unknown error'}]`;
        console.error('[chat.js] TRIGGER_RESHARE handler error:', err?.message || err);
      }
    }

    // User message was already persisted at the top of the handler (before the
    // model call). Only the assistant reply is written here.
    await addAutoMessage({
      threadId: thread.id,
      role: 'assistant',
      mode: 'plan',
      content: fullReply,
      meta: { auto_v2: true },
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

    // Handle [RESHARE_EDIT] signals — update a pending reshare caption by platform
    const reshareEditPattern = /\[RESHARE_EDIT\s+platform="([^"]+)"\s+slug="([^"]+)"\]([\s\S]*?)\[\/RESHARE_EDIT\]/gi;
    let reshareEditMatch;
    while ((reshareEditMatch = reshareEditPattern.exec(fullReply)) !== null) {
      const platform = reshareEditMatch[1]?.trim();
      const slug = reshareEditMatch[2]?.trim();
      const newCaption = reshareEditMatch[3]?.trim();

      if (!platform || !slug || !newCaption) continue;

      // Normalize platform key to match what is stored in ao_scheduled_posts
      const platformMap = {
        linkedin_personal: 'linkedin',
        instagram_business: 'instagram',
        facebook_business: 'facebook',
        twitter: 'twitter',
      };
      const dbPlatform = platformMap[platform] || platform;

      try {
        // Find the pending reshare row for this slug and platform
        const { data: pendingRows } = await supabaseAdmin
          .from('ao_scheduled_posts')
          .select('id, platform, account_id, intent')
          .eq('status', 'pending_review')
          .eq('source_kind', 'ao_journal_reshare')
          .eq('platform', dbPlatform)
          .filter('intent->>slug', 'eq', slug)
          .limit(1);

        if (pendingRows && pendingRows.length > 0) {
          const row = pendingRows[0];
          await supabaseAdmin
            .from('ao_scheduled_posts')
            .update({
              caption: newCaption,
              text: newCaption,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id);

          console.log(`[chat.js] Reshare caption updated for ${slug} on ${platform}`);
        } else {
          console.warn(`[chat.js] No pending reshare found for slug="${slug}" platform="${dbPlatform}"`);
        }
      } catch (err) {
        console.error('[chat.js] RESHARE_EDIT signal handler error:', err?.message || err);
      }
    }

    // Generate session brief if this is a wrap signal or long thread.
    // This one can stay fire-and-forget deliberately — it is not something the user
    // is watching for confirmation of in the same turn, and losing an occasional
    // session brief is a much lower-cost failure than losing research content
    // generated live in conversation. Uses claude-haiku for speed.
    tryGenerateSessionBrief(thread.id, priorMessages, auth.email, userMessage).catch((err) => {
      console.error('[chat.js] tryGenerateSessionBrief error:', err?.message || err);
    });

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
