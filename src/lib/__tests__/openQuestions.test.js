import { openQuestions, questionOf, quotedReply } from '../openQuestions.js';

const jot = { id: 'j', role: 'assistant', meta: { agent: 'jot' }, content: 'Jot: Everything else stays.\n\nDoes "own the answer" match how you\'d say it? If so, I\'ll mark it settled.' };
const red = { id: 'r', role: 'assistant', meta: { agent: 'editor' }, content: "Red: Two more spots.\n\nI'll give you my view on note 2 when Jot gets to it." };
const vox = { id: 'v', role: 'assistant', meta: { agent: 'reach' }, content: 'Want Tuesday at 9?' };

test('a question stays pinned when another teammate speaks after it', () => {
  const open = openQuestions([{ role: 'user', content: 'Fix that line.' }, jot, { role: 'user', content: '[TEAM] Red, add your part.', meta: { team_note: true } }, red]);
  expect(open).toEqual([expect.objectContaining({ name: 'Jot', question: 'Does "own the answer" match how you\'d say it?', yesNo: true })]);
});

test('any reply from Bart closes every question asked before it', () => {
  expect(openQuestions([jot, vox, { role: 'user', content: quotedReply(vox.content, 'Yes.') }])).toEqual([]);
  // A question asked after his reply stays open.
  expect(openQuestions([jot, { role: 'user', content: 'Yes.' }, vox]).map((q) => q.name)).toEqual(['Vox']);
});

test('team hand-offs are not Bart, and quoted post lines and drafts are not questions', () => {
  expect(openQuestions([jot, { role: 'user', content: '[TEAM TASK from Jot] Edit: who-signs-for-it' }]).map((q) => q.name)).toEqual(['Jot']);
  expect(questionOf('The line now reads: "Put the question to the manager first: why is the number what it is? If not, wait."')).toBeNull();
  expect(questionOf('Saved.\n\n[ARTIFACT title="Post"]\nWhy does it matter?\n[/ARTIFACT]')).toBeNull();
  expect(questionOf('**Is "Who Signs for It?" approved?** Once you say yes, Vox books it.')).toBe('Is "Who Signs for It?" approved?');
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

// 2026-10-27: a status note ending in a post title was pinned as Des's question.
test('a status note that ends in a title is not a question to Bart', () => {
  expect(questionOf('The Nov 5 card is waiting on Jot to pick its line from *Who Signs for It?*.')).toBeNull();
  expect(questionOf('The Nov 5 card is waiting on Jot to pick its line from Who Signs for It?')).toBeNull();
  expect(questionOf('**Is "Who Signs for It?" approved?** Once you say yes, Vox books it.')).toBe('Is "Who Signs for It?" approved?');
  expect(questionOf('Bart, which day works?')).toBe('Bart, which day works?');
  expect(questionOf('Here it is. Want me to move it to Friday?')).toBe('Want me to move it to Friday?');
});
