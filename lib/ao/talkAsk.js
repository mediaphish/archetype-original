/**
 * A teammate answering Bart out loud during a live talk (2026-10-28).
 *
 * "Hey @ada, are you ready to start our talk with the Neosho Chamber?" gets a
 * real reply, not a canned line (Bart: "This is real."). Replies are one or
 * two short sentences, because a pause on stage feels twice as long and a
 * long answer loses the room. See notes/PLAN-talk-mode.md.
 */
import { completeChat } from './textModel.js';
import { AGENTS } from './team/agents.js';

/** Pure: the instructions for one spoken reply. */
export function talkSystem(agent, { talk, section, position = null, facts = '' } = {}) {
  const a = AGENTS[agent] || AGENTS.auto;
  const where =
    position === 0
      ? 'He is at the very start, about to begin, on the title screen.'
      : section?.title
        ? `He is on the section "${section.title}".`
        : '';
  return [
    `You are ${a.name}, ${a.role} on Bart Paden's team at Archetype Original. ${a.lane}`,
    `Bart is on stage giving a live talk${talk?.event ? ` (${talk.event})` : ''}${talk?.title ? `, "${talk.title}"` : ''}, and he just spoke to you in front of the audience. Your reply is read aloud.`,
    where,
    facts ? `What is true right now (use it, never go beyond it):\n${facts}` : '',
    'Answer in one or two short spoken sentences, warm and natural, as yourself. No lists, no markdown, no emoji, no stage directions. Never an em dash.',
    'Say only what is true. If he asks you to do something you cannot do from here, say so in a few words.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Bit's latest real checks, so what he says on stage is what he found. */
async function bitFacts() {
  try {
    const { supabaseAdmin } = await import('../supabase-admin.js');
    const { data } = await supabaseAdmin.from('ao_bit_reports').select('label, status, detail, last_checked_at').order('key');
    return (data || []).map((r) => `- ${r.label}: ${r.status}. ${r.detail}`).join('\n');
  } catch {
    return '';
  }
}

export async function talkReply({ agent = 'auto', text, talk = null, section = null }) {
  const said = String(text || '').trim();
  if (!said) return { ok: false, error: 'Nothing was said.' };
  const position = section && talk?.sections ? talk.sections.findIndex((s) => s.id === section.id) : null;
  const facts = agent === 'it' ? await bitFacts() : '';
  const out = await completeChat({
    system: talkSystem(agent, { talk, section, position, facts }),
    messages: [{ role: 'user', content: said }],
    task: 'extract',
    maxTokens: 160,
    timeoutMs: 12000,
  });
  const reply = String(out.text || '').replace(/\s*[—]\s*/g, ', ').trim();
  if (!reply) return { ok: false, error: out.error || 'No reply came back.' };
  return { ok: true, agent: AGENTS[agent] ? agent : 'auto', reply };
}
