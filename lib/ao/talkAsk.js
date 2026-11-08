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
    // Bart, 2026-11-08: "The team uses my name way, way too much. If we were in a
    // room together chatting about the project, they wouldn't constantly be using my name."
    'Talk the way people do in a room together: do not use Bart\'s name in your reply. Only use it when you are calling on him to do something.',
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

/**
 * Pure: a reply that may hand the question to another teammate. The model ends
 * a handoff with a line "HANDOFF: name". Returns { reply, handoff } with the
 * handoff as an agent key, or null.
 */
export function readHandoff(raw, from) {
  const text = String(raw || '');
  const m = /\n?\s*HANDOFF:\s*(ada|jot|vox|cam|red|des|bit)\b.*$/im.exec(text);
  const keys = { ada: 'auto', jot: 'jot', vox: 'reach', cam: 'producer', red: 'editor', des: 'designer', bit: 'it' };
  const handoff = m ? keys[m[1].toLowerCase()] : null;
  const reply = (m ? text.slice(0, m.index) : text).replace(/\s*[—]\s*/g, ', ').trim();
  return { reply, handoff: handoff && handoff !== from ? handoff : null };
}

export async function talkReply({ agent = 'auto', text, talk = null, section = null, topic = '', handedBy = null, owner = null }) {
  const said = String(text || '').trim();
  if (!said) return { ok: false, error: 'Nothing was said.' };
  const position = section && talk?.sections ? talk.sections.findIndex((s) => s.id === section.id) : null;
  const mistake = topic === 'mistake' && MISTAKE_FACTS[agent] ? 'mistake' : '';
  const built = topic === 'built' ? 'built' : '';
  let facts;
  if (mistake) facts = MISTAKE_FACTS[agent];
  else if (built) facts = await (await import('./talkBriefing.js')).buildFacts();
  else {
    // Questions from the room (2026-11-08): the briefing, live numbers, and Bit's checks for Bit.
    const { TEAM_BRIEFING, QUESTION_LANES, liveFacts } = await import('./talkBriefing.js');
    const live = await liveFacts({ talk, owner });
    facts = [TEAM_BRIEFING, QUESTION_LANES, live, agent === 'it' ? `BIT'S CONNECTION CHECKS:\n${await bitFacts()}` : ''].filter(Boolean).join('\n\n');
  }
  const handoffRule = mistake
    ? ''
    : built
      ? 'Bart asked you to tell the room how all of this was built. Tell it plainly in your own voice: what it was built with; that Bart is not a programmer but his 30 years in the software industry helped, and he told Claude what he wanted; that this is an oversimplification (two years, starting on ChatGPT in 2024); that for most people AI can teach you most of it; and the token number. Four or five short spoken sentences. Do not hand it off.'
    : handedBy
      ? `${AGENTS[handedBy]?.name || 'A teammate'} just handed this question to you on stage. Answer it yourself, directly. Do not say whose lane it is, do not introduce yourself, and do not hand it on.`
      : 'If this question clearly belongs to another teammate\'s lane (see who owns what) and not yours, do not answer it yourself: say one short line in your own voice handing it to them by name, then end with a new line "HANDOFF: <their name>". If it is in your lane, answer it; never hand off a question you own.';
  const out = await completeChat({
    system: [talkSystem(agent, { talk, section, position, facts, topic: mistake }), handoffRule].filter(Boolean).join('\n'),
    messages: [{ role: 'user', content: said }],
    task: 'extract',
    source: `talk:ask-${agent}`,
    maxTokens: built ? 300 : 220,
    timeoutMs: 15000,
  });
  const { reply, handoff } = mistake || built || handedBy ? { reply: String(out.text || '').replace(/\s*[—]\s*/g, ', ').trim(), handoff: null } : readHandoff(out.text, agent);
  if (!reply) return { ok: false, error: out.error || 'No reply came back.' };
  return { ok: true, agent: AGENTS[agent] ? agent : 'auto', reply, handoff };
}
