import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('../teamAvatars.js', () => ({ avatarFor: () => 'x.png' }));
import { PinnedQuestions } from '../AutoV2Panel.jsx';

const qs = [
  { id: '1', agent: 'jot', name: 'Jot', question: 'Does this match?', yesNo: true },
  { id: '2', agent: 'reach', name: 'Vox', question: 'Which day works?', yesNo: false },
];

test('shows one question at a time with a count, Yes only for yes-or-no', () => {
  const onYes = jest.fn();
  const onAnswer = jest.fn();
  render(<PinnedQuestions questions={qs} onYes={onYes} onAnswer={onAnswer} />);
  expect(screen.getByText('Jot is waiting on you')).toBeTruthy();
  expect(screen.getByText(/1 of 2/)).toBeTruthy();
  fireEvent.click(screen.getByText('Yes'));
  expect(onYes).toHaveBeenCalledWith(qs[0]);
  fireEvent.click(screen.getByLabelText('Next question'));
  expect(screen.getByText('Which day works?')).toBeTruthy();
  expect(screen.queryByText('Yes')).toBeNull();
  fireEvent.click(screen.getByText('Answer'));
  expect(onAnswer).toHaveBeenCalledWith(qs[1]);
});

test('shows nothing when no question is open', () => {
  const { container } = render(<PinnedQuestions questions={[]} onYes={() => {}} onAnswer={() => {}} />);
  expect(container.innerHTML).toBe('');
});

// 2026-10-27: tapping Yes erased the comment Bart was in the middle of typing.
test('a message sent by a button never clears what Bart is typing', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../AutoV2Panel.jsx'), 'utf8');
  expect(src).toMatch(/if \(messageText === undefined\) setInput\(''\);/);
  expect(src).not.toMatch(/\n\s+setInput\(''\);\n\s+setMessages\(\(prev\) => \[\.\.\.prev, optimisticMsg\]\)/);
});

// 2026-10-27: approving captions told the team "the schedule is the next approval",
// so Bart was asked to approve a schedule he had already approved.
test('approving captions never asks for the schedule again', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../AutoV2Panel.jsx'), 'utf8');
  expect(src).not.toMatch(/sendMessage\('Captions approved\. Do not schedule anything yet/);
  expect(src).toMatch(/The schedule is already approved, so queue the automatic captions/);
  const team = require('fs').readFileSync(require('path').join(__dirname, '../../../../lib/ao/team/agents.js'), 'utf8');
  expect(team).toMatch(/An approval on record stands/);
});

// 2026-10-27: "I closed the artifact panel because it was tied to Josiah. It re-opened on its own."
test('a closed panel reopens only for something new', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../AutoV2Panel.jsx'), 'utf8');
  expect(src).toMatch(/if \(artifactKey && !dismissedPanelRef\.current\.artifacts\.has\(artifactKey\)\) signalNewArtifact\(\);/);
  // Every closed item is remembered, so two items trading places never reopen one (2026-10-28).
  expect(src).toMatch(/dismissedPanelRef\.current\.artifacts\.add\(artifactKey\)/);
  expect(src).toMatch(/onClose=\{closeArtifactPanel\}/);
});
