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
