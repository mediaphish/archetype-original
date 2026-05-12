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

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { message, thread_id } = req.body || {};

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

    const result = await runAutoChat(history, userMessage);

    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error || 'Auto reply failed' });
    }

    result.reply = await appendQuoteCardImagesToReplyIfNeeded({
      userMessage,
      priorMessages: prior.messages,
      reply: result.reply,
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
