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
import { TEAM_VOICES } from './talkVoice.js';

/**
 * Section 6, "I don't trust it" (Bart, 2026-11-08): "Let a few of them talk
 * about the potential mistakes they have or could make ... presenting them
 * showing accountability is a good thing." Each one owns a real mistake, from
 * these facts only, approved by Bart. Then Bart tells his own.
 */
export const MISTAKE_ORDER = ['jot', 'designer', 'it'];
export const MISTAKE_FACTS = Object.freeze({
  jot: [
    'Your mistake: on October 28 you told the team that four of Bart\'s quote cards put words in his mouth, that none of the quoted lines were his.',
    'You were wrong. You had mixed up a caption with a quote, and the cards were fine. If Bart had believed you, good work would have been pulled for nothing.',
    'What changed: every card is now checked word for word against what Bart actually wrote before anyone raises a flag.',
  ].join('\n'),
  designer: [
    'Your mistake: this week Bart was reviewing one of your infographics, the iceberg for Power vs. Authority, Part 1. You could not find it, told Bart it was missing, and asked him to send it to you again.',
    'It was sitting in his Queue the whole time. The team just could not see that list. Bart never had to send it or dig it up; it was found right where it was.',
    'What changed: the team can now see everything waiting in Bart\'s Queue, and looks there before saying anything is lost.',
  ].join('\n'),
  it: [
    'The mistake: one afternoon the team spent about fifty dollars handing work back and forth and reviewing each other\'s reviews. Nobody asked them to. Bart found it.',
    'What changed: there is now a hard daily spending line, and you stop background team work the moment it is reached.',
  ].join('\n'),
});

/** Pure: the instructions for one spoken reply. */
export function talkSystem(agent, { talk, section, position = null, facts = '', topic = '' } = {}) {
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
    `How you talk: ${(TEAM_VOICES[agent] || TEAM_VOICES.auto).talks} Bart is casual and never formal, so neither are you.`,
    topic === 'mistake'
      ? 'Bart asked the team, in front of the room, to tell about a time they got it wrong. Own your mistake plainly, in the first person, then say what changed. No excuses and no blaming anyone. Two or three short spoken sentences, as yourself.'
      : 'Answer in one or two short spoken sentences, as yourself.',
    'Do not open with "Honestly". No lists, no markdown, no emoji, no stage directions. Never an em dash.',
    'Say only what is true. Never make up a detail you were not given: no colors, channels, numbers, names or plans. If you do not know, keep it general or say you will check. If he asks you to do something you cannot do from here, say so in a few words.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Bit's latest real checks, so what he says on stage is what he found. */
export async function bitFacts({ connectionsOnly = false } = {}) {
  try {
    const { supabaseAdmin } = await import('../supabase-admin.js');
    let q = supabaseAdmin.from('ao_bit_reports').select('label, status, detail, last_checked_at').order('key');
    // On stage Bit reports the connections, not the budget.
    if (connectionsOnly) q = q.in('key', ['linkedin', 'meta', 'instagram_personal', 'x']);
    const { data } = await q;
    return (data || []).map((r) => `- ${r.label}: ${r.status}. ${r.detail}`).join('\n');
  } catch {
    return '';
  }
}

export async function talkReply({ agent = 'auto', text, talk = null, section = null, topic = '' }) {
  const said = String(text || '').trim();
  if (!said) return { ok: false, error: 'Nothing was said.' };
  const position = section && talk?.sections ? talk.sections.findIndex((s) => s.id === section.id) : null;
  const mistake = topic === 'mistake' && MISTAKE_FACTS[agent] ? 'mistake' : '';
  const facts = mistake ? MISTAKE_FACTS[agent] : agent === 'it' ? await bitFacts() : '';
  const out = await completeChat({
    system: talkSystem(agent, { talk, section, position, facts, topic: mistake }),
    messages: [{ role: 'user', content: said }],
    task: 'extract',
    maxTokens: 160,
    timeoutMs: 12000,
  });
  const reply = String(out.text || '').replace(/\s*[—]\s*/g, ', ').trim();
  if (!reply) return { ok: false, error: out.error || 'No reply came back.' };
  return { ok: true, agent: AGENTS[agent] ? agent : 'auto', reply };
}
