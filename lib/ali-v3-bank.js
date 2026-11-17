/**
 * ALI v3 question bank. Single source of truth for the v3 instrument.
 *
 * Core wording is copied exactly from notes/ali-conditions-v3.md (approved by Bart
 * 2026-11-16). Do not edit core wording here without his approval.
 *
 * The SQL seed (database/ALI_V3_BANK_SEED.sql) is generated from this file by
 *   node scripts/ali/build-v3-seed.mjs
 * so the database and the code never disagree.
 *
 * Shape:
 *   idea = { id, condition, kind: 'condition' | 'result', label, trial, versions }
 *   versions = { A: { team, leader, reversed }, B: ..., C: ..., D: ... }
 *
 * Stable item id: `v3.<idea id>.<version>`, for example `v3.clarity.1.A` or
 * `v3.voice.t1.C`. Trial ideas carry a `t` in their number, are flagged trial,
 * and are never scored.
 */

import { CONDITION_KEYS, RESULT_KEYS } from './ali-conditions.js';

export const V3_INSTRUMENT_VERSION = 'v3.0';
export const V3_VERSIONS = Object.freeze(['A', 'B', 'C', 'D']);

/** Five labeled answers, the same for every question. */
export const V3_ANSWER_LABELS = Object.freeze([
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neither' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
]);

// [team, leader] pairs for A, B, C, D. C is the reversed version for every idea.
function idea(id, condition, label, rows, { trial = false, note = null } = {}) {
  const kind = RESULT_KEYS.includes(condition) ? 'result' : 'condition';
  const versions = {};
  V3_VERSIONS.forEach((v, i) => {
    const [team, leader, reversed] = rows[i];
    versions[v] = { team, leader, reversed: reversed === true };
  });
  return Object.freeze({ id, condition, kind, label, trial, note, versions: Object.freeze(versions) });
}

const R = true; // marks the reversed version

// ---------------------------------------------------------------------------
// Core ideas (approved). 7 conditions x 2, Trust x 2, Commitment x 1 = 17.
// ---------------------------------------------------------------------------
const CORE = [
  idea('clarity.1', 'clarity', "I know what's expected", [
    ['I know what my leader expects of me.', 'Everyone on my team knows what I expect of them.'],
    ['My leader has made it clear what success looks like in my role.', 'I have made it clear to each person what success looks like in their role.'],
    ['I often have to guess what my leader wants from me.', 'My team often has to guess what I want from them.', R],
    ['If someone asked what my leader expects of me, I could answer plainly.', 'If someone asked my team what I expect of them, they could answer plainly.'],
  ]),
  idea('clarity.2', 'clarity', 'clear when things change', [
    ['When priorities change, my leader explains what it means for my work.', "When priorities change, I explain what it means for each person's work."],
    ['When plans shift, my leader tells me what to stop, start, or keep doing.', 'When plans shift, I tell each person what to stop, start, or keep doing.'],
    ["When things change, I'm often left unsure what to work on.", 'When things change, my team is often left unsure what to work on.', R],
    ['Even when things change quickly, my leader keeps my priorities clear.', "Even when things change quickly, I keep my team's priorities clear."],
  ]),
  idea('consistency.1', 'consistency', 'word matches deed', [
    ['My leader does what they say they will do.', 'When I tell my team I will do something, I do it.'],
    ['When my leader makes a commitment, I can count on it happening.', 'When I make a commitment to my team, they can count on it happening.'],
    ["My leader often promises things that don't happen.", "I often promise my team things that don't happen.", R],
    ["My leader's actions match what they say matters.", 'My actions match what I say matters.'],
  ]),
  idea('consistency.2', 'consistency', 'the same person every day', [
    ['My leader treats people the same way on a good day and a bad day.', 'I treat people the same way on a good day and a bad day.'],
    ["I don't have to check my leader's mood before bringing something up.", "My team doesn't have to check my mood before bringing something up."],
    ["How my leader reacts depends on what kind of day they're having.", "How I react depends on what kind of day I'm having.", R],
    ['My leader is the same person under pressure as when things are easy.', 'I am the same person under pressure as when things are easy.'],
  ], { note: 'B: watch, may move with Voice.' }),
  idea('accountability.1', 'accountability', 'standards hold', [
    ["When someone isn't meeting expectations, my leader addresses it directly.", "When someone isn't meeting expectations, I address it directly."],
    ['My leader holds everyone on the team to the same standards.', 'I hold everyone on my team to the same standards.'],
    ['My leader lets problems slide to avoid an uncomfortable conversation.', 'I let problems slide to avoid an uncomfortable conversation.', R],
    ['My leader deals with problems early, before they grow.', 'I deal with problems early, before they grow.'],
  ], { note: 'B: watch, fairness may need its own idea. C: toxic empathy signal; read with Support.' }),
  idea('accountability.2', 'accountability', 'the leader answers too', [
    ['My leader admits it when they get something wrong.', 'I admit it to my team when I get something wrong.'],
    ['My leader holds themselves to the standards they set for us.', 'I hold myself to the standards I set for my team.'],
    ['When things go wrong, my leader looks first at what others did.', 'When things go wrong, I look first at what others did.', R],
    ['When my leader is wrong, they change course.', 'When I am wrong, I change course.'],
  ]),
  idea('voice.1', 'voice', 'safe to disagree', [
    ['I can disagree with my leader without it being held against me.', 'My team can disagree with me without it being held against them.'],
    ['I feel safe telling my leader what I really think.', 'My team feels safe telling me what they really think.'],
    ['People on my team keep their real opinions to themselves around my leader.', 'People on my team keep their real opinions to themselves around me.', R],
    ['When I push back, my leader listens.', 'When my team pushes back, I listen.'],
  ]),
  idea('voice.2', 'voice', 'bad news travels up early', [
    ['I can bring my leader bad news without paying a price for it.', 'My team can bring me bad news without paying a price for it.'],
    ['If I saw a problem coming, I would tell my leader right away.', 'If my team saw a problem coming, they would tell me right away.'],
    ["Problems reach my leader late, after they've grown.", "Problems reach me late, after they've grown.", R],
    ['When I raise a concern, my leader tries to understand it before responding.', 'When someone raises a concern, I try to understand it before I respond.'],
  ]),
  idea('growth.1', 'growth', "I'm getting better here", [
    ['My leader helps me get better at my work.', 'I help each person on my team get better at their work.'],
    ['I get honest feedback from my leader that helps me improve.', 'I give each person honest feedback that helps them improve.'],
    ["My leader doesn't put much into helping me grow.", "I don't put much into helping my team grow.", R],
    ['My leader takes an interest in where I want to go in my career.', 'I take an interest in where each person wants to go in their career.'],
  ]),
  idea('growth.2', 'growth', 'power is shared', [
    ['My leader trusts me to make decisions in my area.', 'I trust my team to make decisions in their own areas.'],
    ['My leader gives credit to the people who did the work.', 'I give credit to the people who did the work.'],
    ['Decisions wait on my leader, even small ones.', 'Decisions wait on me, even small ones.', R],
    ['My leader gives me real responsibility, not just tasks.', 'I give my team real responsibility, not just tasks.'],
  ], { note: 'B: watch, may belong with idea 1.' }),
  idea('support.1', 'support', 'cared for as a person', [
    ['My leader cares about me as a person, not just as a worker.', 'Each person on my team knows I care about them as a person.'],
    ["My leader notices when I'm struggling.", 'I notice when someone on my team is struggling.'],
    ['My leader sees me mainly for the work I produce.', 'I see my team mainly for the work they produce.', R],
    ['If I had something hard going on outside work, I could tell my leader.', 'If someone on my team had something hard going on outside work, they could tell me.'],
  ]),
  idea('support.2', 'support', 'pressure carried fairly', [
    ['I have what I need to be successful.', 'My team has what it needs to be successful.'],
    ['My leader spreads the workload fairly.', 'I spread the workload on my team fairly.'],
    ["I don't have what I need to be successful.", "My team doesn't have what it needs to be successful.", R],
    ['When the pressure is on, my leader steps in to help carry it.', 'When the pressure is on, I step in to help my team carry it.'],
  ], { note: 'A: Bart\'s original pair; deliberately not "my leader", since resources are partly the company\'s.' }),
  idea('alignment.1', 'alignment', 'I can see how it connects', [
    ['My leader explains how our work connects to the bigger purpose.', 'I explain to my team how our work connects to the bigger purpose.'],
    ['When my leader makes a tough call, I understand why.', 'When I make a tough call, my team understands why.'],
    ["I often can't see how my leader's decisions connect to what we say matters.", "My team often can't see how my decisions connect to what we say matters.", R],
    ['My leader is open about the tradeoffs behind big decisions.', 'I am open with my team about the tradeoffs behind big decisions.'],
  ]),
  idea('alignment.2', 'alignment', 'together, without sameness', [
    ['My leader keeps our team pulling in the same direction.', 'I keep my team pulling in the same direction.'],
    ['Once my leader makes a decision, the team gets behind it, even people who disagreed.', 'Once I make a decision, my team gets behind it, even people who disagreed.'],
    ['People on my team are working toward different goals.', 'People on my team are working toward different goals.', R],
    ['My leader uses our differences to make better decisions.', "I use my team's differences to make better decisions."],
  ]),
  idea('trust.1', 'trust', 'I trust my leader', [
    ['I trust my leader.', 'My team trusts me.'],
    ['My leader has my best interests at heart.', 'My team believes I have their best interests at heart.'],
    ["I'm not sure my leader would have my back.", "My team isn't sure I would have their back.", R],
    ['I would follow my leader through a hard season.', 'My team would follow me through a hard season.'],
  ]),
  idea('trust.2', 'trust', 'confidence in their judgment', [
    ["I have confidence in my leader's judgment.", 'My team has confidence in my judgment.'],
    ["My leader knows what they're doing.", "My team believes I know what I'm doing."],
    ["I often second-guess my leader's decisions.", 'My team often second-guesses my decisions.', R],
    ['When things get hard, I trust my leader to make the right call.', 'When things get hard, my team trusts me to make the right call.'],
  ]),
  idea('commitment.1', 'commitment', 'choosing to stay', [
    ['I see myself working here a year from now.', 'I expect everyone on my team to still be here a year from now.'],
    ['If I were offered a similar job elsewhere, I would stay.', 'If my team were offered similar jobs elsewhere, they would stay.'],
    ['I have thought about leaving in the last few months.', 'I expect some of my team have thought about leaving in the last few months.', R],
    ['I plan to keep building my career here.', 'My team plans to keep building their careers here.'],
  ]),
];

// ---------------------------------------------------------------------------
// Trial pool (unscored). Two ideas per condition. The first idea of each
// condition is the topic Bart listed; the second was written to fit the
// definition. One trial idea is asked per round, in rotation.
// ---------------------------------------------------------------------------
const TRIAL = [
  idea('clarity.t1', 'clarity', 'what good work looks like', [
    ['My leader has shown me what good work looks like in my role.', 'I have shown each person what good work looks like in their role.'],
    ['I know how my leader judges whether my work is good.', 'Each person on my team knows how I judge whether their work is good.'],
    ['I often find out my work missed the mark only after it is done.', 'My team often finds out their work missed the mark only after it is done.', R],
    ['Before I start a task, my leader makes clear what finished looks like.', 'Before my team starts a task, I make clear what finished looks like.'],
  ], { trial: true }),
  idea('clarity.t2', 'clarity', 'what matters most right now', [
    ['My leader has made clear which of my tasks matter most.', 'I have made clear to each person which of their tasks matter most.'],
    ['When I have too much to do, I know what my leader wants done first.', 'When my team has too much to do, they know what I want done first.'],
    ['My leader treats everything as the top priority.', 'I treat everything as the top priority.', R],
    ['I could name my top three priorities the way my leader would.', 'Each person on my team could name their top three priorities the way I would.'],
  ], { trial: true }),
  idea('consistency.t1', 'consistency', "priorities don't flip-flop", [
    ["My leader's priorities stay steady from week to week.", 'My priorities for the team stay steady from week to week.'],
    ['When my leader sets a direction, it holds long enough for us to finish the work.', 'When I set a direction, it holds long enough for my team to finish the work.'],
    ['My leader changes direction so often that our work gets thrown away.', "I change direction so often that my team's work gets thrown away.", R],
    ['I can plan my week around what my leader says matters.', 'My team can plan their week around what I say matters.'],
  ], { trial: true }),
  idea('consistency.t2', 'consistency', 'the rules stay the same', [
    ['My leader applies the rules the same way each time.', 'I apply the rules the same way each time.'],
    ['What my leader accepts today, they will still accept next week.', 'What I accept today, I will still accept next week.'],
    ['Something my leader allowed last week could get me in trouble this week.', 'Something I allowed last week could get someone in trouble this week.', R],
    ["My leader's expectations stay the same no matter who is watching.", 'My expectations stay the same no matter who is watching.'],
  ], { trial: true }),
  idea('accountability.t1', 'accountability', 'fairness', [
    ['My leader is fair when someone falls short.', 'I am fair when someone on my team falls short.'],
    ["My leader judges my work by the same measure as everyone else's.", "I judge each person's work by the same measure."],
    ['My leader lets some people get away with things others would be called out for.', 'I let some people get away with things others would be called out for.', R],
    ['On my team, the same mistake gets the same response from my leader, no matter who made it.', 'On my team, the same mistake gets the same response from me, no matter who made it.'],
  ], { trial: true }),
  idea('accountability.t2', 'accountability', 'follow-through is checked', [
    ['My leader follows up on what we agreed to do.', 'I follow up on what my team agreed to do.'],
    ['When we set a goal, my leader checks how we did against it.', 'When my team sets a goal, I check how we did against it.'],
    ['My leader lets missed deadlines pass without a word.', 'I let missed deadlines pass without a word.', R],
    ['My leader makes sure the work we promise actually gets done.', 'I make sure the work my team promises actually gets done.'],
  ], { trial: true }),
  idea('voice.t1', 'voice', 'asked for input before deciding', [
    ['My leader asks for my input before making decisions that affect my work.', "I ask for my team's input before making decisions that affect their work."],
    ['My leader wants to hear from the people closest to the work before deciding.', 'I want to hear from the people closest to the work before I decide.'],
    ['I usually hear about decisions that affect me after they have been made.', 'My team usually hears about decisions that affect them after they have been made.', R],
    ["My leader's decisions show they listened to what we said.", 'My decisions show my team that I listened to what they said.'],
  ], { trial: true }),
  idea('voice.t2', 'voice', 'ideas get a real hearing', [
    ['My leader takes my ideas seriously.', "I take my team's ideas seriously."],
    ['When I suggest a better way to do something, my leader gives it a real look.', 'When someone suggests a better way to do something, I give it a real look.'],
    ['Suggesting a new idea to my leader feels like a waste of time.', 'My team feels that suggesting a new idea to me is a waste of time.', R],
    ['My leader has acted on ideas that came from me or my coworkers.', 'I have acted on ideas that came from my team.'],
  ], { trial: true }),
  idea('growth.t1', 'growth', 'recognition', [
    ['My leader notices when I do good work.', 'I notice when someone on my team does good work.'],
    ['My leader tells me specifically what I did well.', 'I tell each person specifically what they did well.'],
    ['Good work on my team mostly goes unnoticed by my leader.', 'Good work on my team mostly goes unnoticed by me.', R],
    ["My leader recognizes effort that others don't see.", "I recognize effort on my team that others don't see."],
  ], { trial: true }),
  idea('growth.t2', 'growth', 'room to learn', [
    ['My leader gives me chances to learn new skills.', 'I give each person chances to learn new skills.'],
    ['My leader trusts me with work that stretches me.', 'I trust my team with work that stretches them.'],
    ['My leader keeps me doing only what I already know.', 'I keep each person doing only what they already know.', R],
    ['When I make a mistake while learning, my leader treats it as part of growing.', 'When someone makes a mistake while learning, I treat it as part of growing.'],
  ], { trial: true }),
  idea('support.t1', 'support', 'a sustainable pace', [
    ['I can keep up my current pace of work without burning out.', 'My team can keep up their current pace of work without burning out.'],
    ['My leader keeps our workload at a level we can sustain.', "I keep my team's workload at a level they can sustain."],
    ['The pace my leader expects is wearing me down.', 'The pace I expect is wearing my team down.', R],
    ['My leader makes sure we recover after a hard stretch.', 'I make sure my team recovers after a hard stretch.'],
  ], { trial: true }),
  idea('support.t2', 'support', 'help when stuck', [
    ["When I'm stuck, my leader helps me get unstuck.", 'When someone on my team is stuck, I help them get unstuck.'],
    ['I can ask my leader for help without feeling judged.', 'My team can ask me for help without feeling judged.'],
    ["When I'm in over my head, my leader leaves me to figure it out alone.", 'When someone on my team is in over their head, I leave them to figure it out alone.', R],
    ['My leader removes obstacles that get in the way of my work.', "I remove obstacles that get in the way of my team's work."],
  ], { trial: true }),
  idea('alignment.t1', 'alignment', 'living the stated values', [
    ['My leader lives by the values we say we hold.', 'I live by the values we say we hold.'],
    ['When a decision is hard, my leader uses our values to make it.', 'When a decision is hard, I use our values to make it.'],
    ["My leader's choices often don't match the values we say we hold.", "My choices often don't match the values we say we hold.", R],
    ['My leader would give up a short-term win to stay true to our values.', 'I would give up a short-term win to stay true to our values.'],
  ], { trial: true }),
  idea('alignment.t2', 'alignment', 'one shared goal', [
    ['I know what my team is trying to achieve this year.', 'Everyone on my team knows what we are trying to achieve this year.'],
    ['My leader keeps our team goals in front of us.', 'I keep our team goals in front of my team.'],
    ['People on my team would describe our main goal in different ways.', 'People on my team would describe our main goal in different ways.', R],
    ['My leader checks that our daily work still points at our main goal.', "I check that my team's daily work still points at our main goal."],
  ], { trial: true }),
];

export const V3_CORE_IDEAS = Object.freeze(CORE);
export const V3_TRIAL_IDEAS = Object.freeze(TRIAL);
export const V3_ALL_IDEAS = Object.freeze([...CORE, ...TRIAL]);

export function v3StableId(ideaId, version) {
  return `v3.${ideaId}.${version}`;
}

/** Flat list of every item (one row per idea version), in bank order. */
export function listV3Items() {
  const out = [];
  for (const i of V3_ALL_IDEAS) {
    for (const v of V3_VERSIONS) {
      const ver = i.versions[v];
      out.push({
        stable_id: v3StableId(i.id, v),
        idea_id: i.id,
        idea_label: i.label,
        condition: i.condition,
        kind: i.kind,
        version: v,
        team_text: ver.team,
        leader_text: ver.leader,
        is_reversed: ver.reversed,
        is_trial: i.trial,
        note: i.note,
      });
    }
  }
  return out;
}

/**
 * Check the bank against the question rules that a machine can check.
 * Returns a list of problems (empty when the bank is sound).
 */
export function validateV3Bank(ideas = V3_ALL_IDEAS) {
  const problems = [];
  const seen = new Set();
  const allowed = new Set([...CONDITION_KEYS, ...RESULT_KEYS]);
  for (const i of ideas) {
    if (seen.has(i.id)) problems.push(`duplicate idea id ${i.id}`);
    seen.add(i.id);
    if (!allowed.has(i.condition)) problems.push(`${i.id}: unknown condition ${i.condition}`);
    const reversed = V3_VERSIONS.filter((v) => i.versions[v]?.reversed);
    if (reversed.length !== 1) problems.push(`${i.id}: needs exactly one reversed version, has ${reversed.length}`);
    for (const v of V3_VERSIONS) {
      const ver = i.versions[v];
      if (!ver || !ver.team || !ver.leader) {
        problems.push(`${i.id}.${v}: missing team or leader text`);
        continue;
      }
      for (const text of [ver.team, ver.leader]) {
        if (/[—–]/.test(text)) problems.push(`${i.id}.${v}: contains a long dash`);
        if (/[‘’“”]/.test(text)) problems.push(`${i.id}.${v}: contains curly quotes`);
        if (!/[.?]$/.test(text)) problems.push(`${i.id}.${v}: should end with a full stop`);
      }
    }
  }
  const core = ideas.filter((i) => !i.trial);
  for (const c of CONDITION_KEYS) {
    const n = core.filter((i) => i.condition === c).length;
    if (n !== 2) problems.push(`condition ${c} needs 2 core ideas, has ${n}`);
  }
  if (core.filter((i) => i.condition === 'trust').length !== 2) problems.push('trust needs 2 core ideas');
  if (core.filter((i) => i.condition === 'commitment').length !== 1) problems.push('commitment needs 1 core idea');
  return problems;
}
