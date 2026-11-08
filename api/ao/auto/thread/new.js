import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import {
  startNewAutoThread,
  getAutoThreadState,
  addAutoMessage,
} from '../../../../lib/ao/autoHub.js';
import { runAutoChat } from '../../../../lib/ao/autoV2.js';
import { getScheduleContext } from '../../../../lib/ao/getScheduleContext.js';
import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { AGENTS, normalizeAgent } from '../../../../lib/ao/team/agents.js';
import { getChannel } from '../../../../lib/ao/team/channels.js';
import { loadQueueContext } from '../../../../lib/ao/queueContext.js';

/**
 * The Queue item's picture and words, as the chat's first message (2026-11-06).
 * Added again only when the image changed since the last card, so a redrawn
 * graphic shows up and an unchanged one is not repeated.
 */
async function addQueueContext(threadId, ref) {
  const card = await loadQueueContext(ref).catch(() => null);
  if (!card) return;
  const { data: last } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('meta')
    .eq('thread_id', threadId)
    .eq('role', 'assistant')
    .not('meta->queue_context', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last?.meta?.queue_context && (last.meta.image_url || null) === (card.imageUrl || null)) return;
  await addAutoMessage({
    threadId,
    role: 'assistant',
    mode: 'plan',
    content: card.text,
    meta: { auto_v2: true, agent: 'producer', queue_context: String(ref), ...(card.imageUrl ? { image_url: card.imageUrl } : {}) },
  });
}

// A conversation opened directly with a teammate starts with them, in their
// own voice, instead of Auto's orientation.
const TEAM_OPENERS = {
  jot: 'Jot: What are we writing? Give me the idea, the angle or the series, and I will research it and come back with a brief.',
  reach: 'Vox: Want the lineup for the week, or is there something you want placed?',
  producer: 'Cam: Who are we recording next? I can tell you who is prepared, who is waiting, and get show notes ready.',
};

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const title0 = String(req.body?.title || '').trim().slice(0, 120);
    const ref = req.body?.ref ? String(req.body.ref) : '';
    // One conversation per Queue item: opening it again goes back to the same
    // chat instead of starting a second one (two Hunger chats, 2026-11-06).
    if (title0 && ref) {
      const { data: existing } = await supabaseAdmin
        .from('ao_auto_threads')
        .select('id')
        .eq('created_by_email', String(auth.email).toLowerCase())
        .eq('title', title0)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        await addQueueContext(existing.id, ref);
        const opened = await getAutoThreadState(auth.email, existing.id);
        return res.status(200).json({ ok: true, thread: opened.thread, messages: opened.messages, attachments: opened.attachments });
      }
    }

    const thread = await startNewAutoThread(auth.email);
    // A thread started in a channel belongs to it, and the channel's lead
    // answers by default (notes/PLAN-auto-chat-first.md, Phase 1).
    const channel = req.body?.channel ? await getChannel(auth.email, String(req.body.channel)) : null;
    const agent = normalizeAgent(req.body?.agent || channel?.lead);
    if (channel) {
      thread.state = { ...(thread.state || {}), channel: channel.key };
      await supabaseAdmin.from('ao_auto_threads').update({ state: thread.state }).eq('id', thread.id);
    }
    // A conversation about one thing gets that thing's name (2026-10-27: a Queue
    // item opened from "Talk it over" gets its own conversation).
    const title = String(req.body?.title || '').trim().slice(0, 120);

    if (title && agent === 'auto') await supabaseAdmin.from('ao_auto_threads').update({ title }).eq('id', thread.id);

    if (agent !== 'auto') {
      await supabaseAdmin
        .from('ao_auto_threads')
        .update({ title: title || (channel ? `#${channel.name}` : AGENTS[agent].name), state: { ...(thread.state || {}), agent } })
        .eq('id', thread.id);
      // A post opened from the Queue is already written (2026-11-08: Jot opened
      // The Eli Archetype with "What are we writing?").
      const postTitle = ref.startsWith('post:') ? title : '';
      await addAutoMessage({
        threadId: thread.id,
        role: 'assistant',
        mode: 'plan',
        content: postTitle && agent === 'jot'
          ? `Jot: Here's "${postTitle}", hot off the press and ready for your read. It's open on the right. Tell me what to change, or approve it when it's right.`
          : TEAM_OPENERS[agent],
        meta: { auto_v2: true, orientation: true, agent },
      });
      if (ref) await addQueueContext(thread.id, ref);
      const opened = await getAutoThreadState(auth.email, thread.id);
      return res.status(200).json({ ok: true, thread: opened.thread, messages: opened.messages, attachments: opened.attachments });
    }

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

    if (ref) await addQueueContext(thread.id, ref);
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
