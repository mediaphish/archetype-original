import { parseTalkCommand } from '../talkCommands.js';

// 2026-10-28: Bart's examples for the Neosho talk.
test('slide moves are understood without asking anyone', () => {
  expect(parseTalkCommand('Great, @ada, give me the first slide...')).toEqual({ type: 'goto', index: 0, agent: 'auto' });
  expect(parseTalkCommand('Next slide').type).toBe('next');
  expect(parseTalkCommand('go back').type).toBe('back');
  expect(parseTalkCommand('Ada, go to slide four')).toMatchObject({ type: 'goto', index: 3 });
  expect(parseTalkCommand('slide 7')).toMatchObject({ type: 'goto', index: 6 });
  expect(parseTalkCommand('Okay Ada, start the demo').type).toBe('demo');
});

test('anything else said to a teammate goes to that teammate', () => {
  expect(parseTalkCommand('Hey @ada, are you ready to start our talk with the Neosho Chamber?')).toEqual({
    type: 'ask',
    agent: 'auto',
    text: 'Hey @ada, are you ready to start our talk with the Neosho Chamber?',
  });
  expect(parseTalkCommand('Bit, is everything connected?')).toMatchObject({ type: 'ask', agent: 'it' });
});

test('talk to the room is left alone', () => {
  expect(parseTalkCommand('so what does that mean for your business').type).toBe('none');
  expect(parseTalkCommand('').type).toBe('none');
});

test('the whole team says hi on cue', () => {
  expect(parseTalkCommand('Team, say hi to Neosho.').type).toBe('team');
  expect(parseTalkCommand('Okay everybody, introduce yourselves').type).toBe('team');
});

test('the call on stage posts the demo', () => {
  expect(parseTalkCommand('Looks good, post it.').type).toBe('post');
  expect(parseTalkCommand('Ada, ship it').type).toBe('post');
});

describe('section 6: the team owns its mistakes (2026-11-08)', () => {
  test('asking the team about getting it wrong starts the mistakes round', () => {
    expect(parseTalkCommand('Team, tell them about a time you got it wrong').type).toBe('mistakes');
    expect(parseTalkCommand('Okay everybody, what mistakes have you made?').type).toBe('mistakes');
    expect(parseTalkCommand('Team, say hi to Neosho').type).toBe('team');
  });
});

test("Bart's cue sends Bit his how-it-was-built rundown (2026-11-08)", () => {
  expect(parseTalkCommand('Hey Bit, give them a run down on what it took to get here today.')).toMatchObject({ type: 'ask', agent: 'it', topic: 'built' });
  expect(parseTalkCommand('Hey Bit, give them a rundown on what it took to get here today')).toMatchObject({ topic: 'built' });
  expect(parseTalkCommand('Bit, is everything connected?').topic).toBeUndefined();
});

test('an intro request said any common way reaches the whole team (2026-11-08)', () => {
  for (const said of ['Team, say hi to Neosho', 'Can you all introduce yourselves', 'Guys, introduce yourselves to the room', 'Everybody, tell them who you are', 'Crew, quick intros please']) {
    expect(parseTalkCommand(said).type).toBe('team');
  }
});

