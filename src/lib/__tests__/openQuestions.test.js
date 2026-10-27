import { openQuestions, questionOf, quotedReply } from '../openQuestions.js';

const jot = { id: 'j', role: 'assistant', meta: { agent: 'jot' }, content: 'Jot: Everything else stays.\n\nDoes "own the answer" match how you\'d say it? If so, I\'ll mark it settled.' };
const red = { id: 'r', role: 'assistant', meta: { agent: 'editor' }, content: "Red: Two more spots.\n\nI'll give you my view on note 2 when Jot gets to it." };
const vox = { id: 'v', role: 'assistant', meta: { agent: 'reach' }, content: 'Want Tuesday at 9?' };

test('a question stays pinned when another teammate speaks after it', () => {
  const open = openQuestions([{ role: 'user', content: 'Fix that line.' }, jot, { role: 'user', content: '[TEAM] Red, add your part.', meta: { team_note: true } }, red]);
  expect(open).toEqual([expect.objectContaining({ name: 'Jot', question: 'Does "own the answer" match how you\'d say it?', yesNo: true })]);
});

test('two stacked questions can be answered one at a time by quoting', () => {
  const both = openQuestions([jot, vox]);
  expect(both.map((q) => q.name)).toEqual(['Jot', 'Vox']);
  const afterOne = openQuestions([jot, vox, { role: 'user', content: quotedReply(both[1].question, 'Yes.') }]);
  expect(afterOne.map((q) => q.name)).toEqual(['Jot']);
});

test('a plain reply from Bart answers everything open', () => {
  expect(openQuestions([jot, vox, { role: 'user', content: 'Yes to both.' }])).toEqual([]);
});

test('only the last paragraph counts, and quotes are not questions', () => {
  expect(questionOf('Why does this matter?\n\nHere is the plan.')).toBeNull();
  expect(questionOf('> Who signs?')).toBeNull();
  expect(questionOf('Which of these fits?')).toBe('Which of these fits?');
  expect(openQuestions([{ role: 'assistant', meta: { agent: 'jot' }, content: 'Which of these fits?' }])[0].yesNo).toBe(false);
});
