/**
 * Bart, 2026-11-09: pitch in brief form, then (on his OK) research and the
 * outline, then (on his OK) the post. An @mention inside an "if you say yes"
 * sentence set Jot off on a full outline before he had chosen the angle.
 */
import { handoffMentions, mentionedAgents } from '../../src/lib/teamMentions.js';
import { teamRosterBlock, personaPreamble } from '../ao/team/agents.js';

describe('a name in a sentence that waits on Bart is not a hand-off', () => {
  test('the sentence that set Jot off early', () => {
    const reply = 'Three angles for the series. My pick is The Dashboard Is Green. If you say yes, @Jot builds the outline.';
    expect(mentionedAgents(reply)).toEqual(['jot']);
    expect(handoffMentions(reply)).toEqual([]);
  });
  test('other ways of waiting on him', () => {
    expect(handoffMentions('Once you approve the brief, @Jot starts research.')).toEqual([]);
    expect(handoffMentions('Say the word and @Jot drafts it.')).toEqual([]);
    expect(handoffMentions('With your OK, @Red gives it a pass.')).toEqual([]);
    expect(handoffMentions('If that works for you, @Vox will plan the week.')).toEqual([]);
  });
  test('a real hand-off still goes through', () => {
    expect(handoffMentions('Bart approved the outline. @Jot, write the post.')).toEqual(['jot']);
    expect(handoffMentions('Jot, take the outline from here.')).toEqual(['jot']);
    expect(handoffMentions('@Des, make the header. If you want changes after, tell me.')).toEqual(['designer']);
  });
  test('a name opening a later sentence without @ is not a hand-off', () => {
    expect(handoffMentions('Here is the plan. Jot, you would write it.')).toEqual([]);
  });
});

describe('the stage order is in every teammate\'s instructions', () => {
  test('Ada, through the team section', () => {
    expect(teamRosterBlock()).toMatch(/a pitch in brief form, never a mapped-out post/);
    expect(teamRosterBlock()).toMatch(/do not @mention anyone in that reply/);
  });
  test('every other teammate', () => {
    for (const k of ['jot', 'producer', 'editor', 'reach', 'designer', 'it']) {
      expect(personaPreamble(k)).toMatch(/Once I approve the outline, then you can write the post/);
    }
  });
  test('Cam no longer lines up the next step early', () => {
    expect(personaPreamble('producer')).not.toMatch(/line up the next step while he reviews/);
  });
});
