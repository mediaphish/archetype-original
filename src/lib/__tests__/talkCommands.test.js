import { parseTalkCommand } from '../talkCommands.js';

// 2026-10-28: Bart's examples for the chamber talk.
test('slide moves are understood without asking anyone', () => {
  expect(parseTalkCommand('Great, @ada, give me the first slide...')).toEqual({ type: 'goto', index: 0, agent: 'auto' });
  expect(parseTalkCommand('Next slide').type).toBe('next');
  expect(parseTalkCommand('go back').type).toBe('back');
  expect(parseTalkCommand('Ada, go to slide four')).toMatchObject({ type: 'goto', index: 3 });
  expect(parseTalkCommand('slide 7')).toMatchObject({ type: 'goto', index: 6 });
  expect(parseTalkCommand('Okay Ada, start the demo').type).toBe('demo');
});

test('anything else said to a teammate goes to that teammate', () => {
  expect(parseTalkCommand('Hey @ada, are you ready to start our talk with the McDonald County Chamber?')).toEqual({
    type: 'ask',
    agent: 'auto',
    text: 'Hey @ada, are you ready to start our talk with the McDonald County Chamber?',
  });
  expect(parseTalkCommand('Bit, is everything connected?')).toMatchObject({ type: 'ask', agent: 'it' });
});

test('talk to the room is left alone', () => {
  expect(parseTalkCommand('so what does that mean for your business').type).toBe('none');
  expect(parseTalkCommand('').type).toBe('none');
});

test('the whole team says hi on cue', () => {
  expect(parseTalkCommand('Team, say hi to McDonald County.').type).toBe('team');
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
    expect(parseTalkCommand('Team, say hi to McDonald County').type).toBe('team');
  });
});

test("Bart's cue sends Bit his how-it-was-built rundown (2026-11-08)", () => {
  expect(parseTalkCommand('Hey Bit, give them a run down on what it took to get here today.')).toMatchObject({ type: 'ask', agent: 'it', topic: 'built' });
  expect(parseTalkCommand('Hey Bit, give them a rundown on what it took to get here today')).toMatchObject({ topic: 'built' });
  expect(parseTalkCommand('Bit, is everything connected?').topic).toBeUndefined();
});

test('an intro request said any common way reaches the whole team (2026-11-08)', () => {
  for (const said of ['Team, say hi to McDonald County', 'Can you all introduce yourselves', 'Guys, introduce yourselves to the room', 'Everybody, tell them who you are', 'Crew, quick intros please']) {
    expect(parseTalkCommand(said).type).toBe('team');
  }
});


// 2026-11-09: two asks for Bit's rundown from the clicker got no answer.
describe('Bit\'s cue survives a misheard name', () => {
  it('routes the cue to Bit with no name', () => {
    expect(parseTalkCommand('give them a rundown on what it took to build you all')).toMatchObject({ type: 'ask', agent: 'it', topic: 'built' });
  });
  it('hears "hey bet" as Bit, and a hyphenated run-down', () => {
    expect(parseTalkCommand('Hey bet, give them a run-down')).toMatchObject({ agent: 'it', topic: 'built' });
  });
  it('still sends other names where they belong', () => {
    expect(parseTalkCommand('Hey Ada, what did we spend today')).toMatchObject({ agent: 'auto' });
  });
});

describe('long replies show in screen-sized pieces', () => {
  const { captionChunks, chunkAt } = require('../talkCommands.js');
  const text = 'Yeah, totally, so dude, all of this was built with Claude Code. Bart is not a programmer, but thirty years in software taught him what good looks like, so he told Claude what he wanted and it built it. That is a simplified version though, it was really about two years of back and forth and mistakes, starting with ChatGPT back in 2024. The cool part is you do not need his background to start.';
  const chunks = captionChunks(text);
  it('keeps every piece short and loses no words', () => {
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 150)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(text);
  });
  it('follows the voice from first piece to last', () => {
    expect(chunkAt(chunks, 0)).toBe(0);
    expect(chunkAt(chunks, 0.999)).toBe(chunks.length - 1);
  });
});
