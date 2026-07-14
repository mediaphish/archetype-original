import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import {
  startNewAutoThread,
  getAutoThreadState,
  addAutoMessage,
} from '../../../../lib/ao/autoHub.js';
import { runAutoChat } from '../../../../lib/ao/autoV2.js';
import { getScheduleContext } from '../../../../lib/ao/getScheduleContext.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const thread = await startNewAutoThread(auth.email);

    // Auto-orientation: run Auto immediately after thread creation so the
    // first message in every new thread is Auto's opening, not a blank screen.
    // This is where the proactive performance insight surfaces.
    // If it fails, the thread still opens normally.
    try {
      const scheduleContext = await getScheduleContext().catch(() => null);

      // Internal orientation message — never shown to Bart, just triggers Auto's opening
      const orientationMessage = `[SYSTEM_ORIENTATION] New session started. Open with your session orientation. If performance data shows a post outperforming the average by 50% or more, lead with that one observation in one sentence. If no task has been stated, ask what Bart wants to work on today. Do not ask multiple questions. One sentence observation (if data supports it), then one question. Maximum two sentences total.`;

      const result = await runAutoChat(
        [],
        orientationMessage,
        scheduleContext || null,
        orientationMessage
      );

      if (result?.ok && result.reply) {
        const cleanReply = String(result.reply)
          .replace(/\[SYSTEM_ORIENTATION\]/gi, '')
          .trim();

        if (cleanReply) {
          await addAutoMessage({
            threadId: thread.id,
            role: 'assistant',
            mode: 'plan',
            content: cleanReply,
            meta: { auto_v2: true, orientation: true },
          });
        }
      }
    } catch (orientationErr) {
      // Non-fatal — thread still opens, just without the orientation message
      console.error(
        '[thread/new] Auto orientation failed (non-blocking):',
        orientationErr?.message || orientationErr
      );
    }

    const state = await getAutoThreadState(auth.email, thread.id);
    return res.status(200).json({
      ok: true,
      thread: state.thread,
      messages: state.messages,
      attachments: state.attachments,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
