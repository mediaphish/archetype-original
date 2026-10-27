/**
 * Red's pass on every draft (Bart, 2026-10-26: "Add an Editor teammate whose
 * pass runs automatically on every draft").
 *
 * When anyone but Red saves a full journal draft, Red edits it next, in the
 * same conversation, as a short piece of team work. When Red is done, Ada's
 * review follows (lib/ao/team/runTask.js), so a draft reaches Bart written,
 * edited and checked against the goals.
 */
import { supabaseAdmin } from '../../supabase-admin.js';

/** A draft long enough to be a draft, not an outline or a note. */
export const MIN_DRAFT_WORDS = 600;
/** One pass per draft at a time; a save soon after a pass is the fix, not a new draft. */
export const QUIET_MINUTES = 20;

export const editTitle = (slug) => `Edit: ${slug}`;

/** Pure: an outline saved as text ("1. THE SCROLL (about 250 words)", "Point:", "Hand-off:"), not prose. */
export function looksLikeOutline(content = '') {
  const text = String(content || '');
  if (/\(about [\d,]+ words\)/i.test(text)) return true;
  const markers = text.match(/^\s*(Point|Turn|Hand-off|How it lands|Closing turn):/gim) || [];
  return markers.length >= 3;
}

/** Pure: whether this save should get Red's pass. */
export function wantsEditorPass({ input = {}, ctx = {}, result = {} } = {}) {
  if (!result?.ok) return false;
  if (String(input.kind || 'journal') !== 'journal') return false;
  if (String(input.stage || '').toLowerCase() === 'outline') return false;
  if (ctx.agent === 'editor') return false;
  if (!ctx.threadId || !input.slug) return false;
  // Bart's approval is the last word on a post (2026-10-27).
  if (String(input.status || '').toLowerCase() === 'approved') return false;
  if (looksLikeOutline(input.content)) return false;
  const words = String(input.content || '').trim().split(/\s+/).filter(Boolean).length;
  return words >= MIN_DRAFT_WORDS;
}

export async function queueEditorPass({ input, ctx, result }) {
  if (!wantsEditorPass({ input, ctx, result })) return null;
  const slug = String(input.slug);
  const since = new Date(Date.now() - QUIET_MINUTES * 60 * 1000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from('ao_team_tasks')
    .select('id, status, created_at')
    .eq('agent', 'editor')
    .eq('title', editTitle(slug))
    .or(`status.in.(queued,running,needs_bart),created_at.gte.${since}`)
    .limit(1);
  if (recent && recent.length) return null;
  const { createTask } = await import('./tasks.js');
  const { kickTask } = await import('./runTask.js');
  const out = await createTask({
    agent: 'editor',
    title: editTitle(slug),
    brief: [
      `The draft "${input.title || slug}" (slug ${slug}) was just saved above in this conversation. Give it your editor's pass before Bart reads it.`,
      'Read the saved version in full, fix the line-level problems yourself and save it, and send anything structural back to Jot with assign_task. Then report in a few lines: what you changed, what you sent back, and the saved word count.',
      'Finish with task_update "done" and a one-line summary.',
    ].join('\n\n'),
    assignedBy: ctx.agent || 'auto',
    parentThreadId: ctx.threadId,
    maxPasses: 3,
    email: ctx.email,
  });
  if (out.ok) await kickTask(out.task.id);
  return out.ok ? out.task.id : null;
}
