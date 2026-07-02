/**
 * Auto V2 — Chat route (Anthropic brain)
 *
 * Response shape matches what `AutoHubPanel.jsx` expects (same as V1):
 * { ok, thread, messages, attachments, assistant_message, receipts, bundle_id, idea_id, action_log_id }
 *
 * Rollback: rename this file to `chat-v2.js` and restore `chat-v1-backup.js` as `chat.js`.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { ensureAutoThread, getAutoThreadState, addAutoMessage } from '../../../lib/ao/autoHub.js';
import { runAutoChat } from '../../../lib/ao/autoV2.js';
import { appendQuoteCardImagesToReplyIfNeeded } from '../../../lib/ao/appendQuoteCardImagesAfterApproval.js';
import { appendDesignImageToReplyIfNeeded } from '../../../lib/ao/appendDesignImageToReplyIfNeeded.js';
import { getScheduleContext } from '../../../lib/ao/getScheduleContext.js';
import { enforceResponseRules } from '../../../lib/ao/enforceResponseRules.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

/**
 * Detect if Bart approved a journal draft, devotional draft, or caption set
 * in this exchange, and save it to ao_content_drafts automatically.
 * Auto has been claiming to save drafts but was never actually writing to the table.
 * This wires the save at the server level so it happens regardless of Auto's behavior.
 */
async function trySaveDraftFromExchange(userMessage, assistantReply, email) {
  if (!email || !assistantReply) return;

  const userLower = String(userMessage || '').toLowerCase();
  const isApproval = /\b(approved?|looks good|go ahead|publish it|that.s it|perfect|yes)\b/i.test(userLower);
  if (!isApproval) return;

  // Check if the assistant reply or recent context contains journal content
  const journalMatch = assistantReply.match(/\[JOURNAL_CONTENT\]([\s\S]*?)\[\/JOURNAL_CONTENT\]/i);
  const publishMatch = assistantReply.match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);

  if (journalMatch && publishMatch) {
    const attrs = {};
    const attrPattern = /(\w+)="([^"]*)"/g;
    let m;
    while ((m = attrPattern.exec(publishMatch[1])) !== null) {
      attrs[m[1]] = m[2];
    }

    if (attrs.slug && attrs.title) {
      try {
        await supabaseAdmin
          .from('ao_content_drafts')
          .upsert({
            created_by_email: email.toLowerCase().trim(),
            kind: 'journal',
            series_slug: attrs.slug.replace(/-part-\d+.*$/, '') || attrs.slug,
            part_number: parseInt((attrs.slug.match(/-part-(\d+)/i) || [])[1] || '1', 10),
            title: attrs.title,
            slug: attrs.slug,
            content: journalMatch[1].trim(),
            summary: attrs.summary || '',
            image_url: attrs.image_url || null,
            status: 'approved',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'created_by_email,series_slug,part_number,kind',
            ignoreDuplicates: false,
          });
        console.log(`[chat.js] Draft saved: ${attrs.slug}`);
      } catch (err) {
        console.error('[chat.js] Draft save failed:', err?.message || err);
      }
    }
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { message, thread_id, attachments } = req.body || {};

  if (!String(message || '').trim()) {
    return res.status(400).json({ ok: false, error: 'message required' });
  }

  const userMessage = String(message).trim();

  try {
    const thread = await ensureAutoThread(auth.email, thread_id || '');

    const prior = await getAutoThreadState(auth.email, thread.id);
    const history = (prior.messages || [])
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

    // Always inject live queue data into Auto's context.
    // A CMO always knows the queue state — gating this behind intent detection
    // caused Auto to ask Bart for queue information it should already have.
    const scheduleContext = await getScheduleContext();

    const result = await runAutoChat(history, currentMessageContent, scheduleContext, userMessage);

    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error || 'Auto reply failed' });
    }

    // Enforce response rules in code before any further processing.
    // These rules were previously in the system prompt as suggestions to the model.
    // Here they are guaranteed regardless of model behavior.
    result.reply = enforceResponseRules(result.reply);

    result.reply = await appendQuoteCardImagesToReplyIfNeeded({
      userMessage,
      priorMessages: prior.messages,
      reply: result.reply,
      threadId: thread.id,
    });

    result.reply = await appendDesignImageToReplyIfNeeded({
      userMessage,
      reply: result.reply,
      email: auth.email,
    });

    await addAutoMessage({
      threadId: thread.id,
      role: 'user',
      mode: 'plan',
      content: userMessage,
      meta: { auto_v2: true },
    });

    await addAutoMessage({
      threadId: thread.id,
      role: 'assistant',
      mode: 'plan',
      content: result.reply,
      meta: { auto_v2: true },
    });

    // Save draft to ao_content_drafts if this exchange contains an approved journal draft.
    // This runs server-side regardless of Auto's behavior — Auto cannot save drafts itself.
    trySaveDraftFromExchange(userMessage, result.reply, auth.email).catch((err) => {
      console.error('[chat.js] trySaveDraftFromExchange error:', err?.message || err);
    });

    const finalState = await getAutoThreadState(auth.email, thread.id);

    return res.status(200).json({
      ok: true,
      thread: finalState.thread,
      messages: finalState.messages,
      attachments: finalState.attachments,
      assistant_message: result.reply,
      receipts: [],
      bundle_id: null,
      idea_id: null,
      action_log_id: null,
    });
  } catch (err) {
    console.error('[Auto V2 chat]', err?.message || err);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Server error',
    });
  }
}
