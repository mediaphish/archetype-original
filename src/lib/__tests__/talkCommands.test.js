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
