/**
 * The talk view for the Neosho Chamber (2026-10-28): the clicker moves the
 * screens, and holding Back listens instead of going back.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Talk from '../Talk.jsx';

const talk = {
  slug: 'neosho-chamber-2026',
  title: 'AI and Leadership',
  sections: [
    { id: 'open', kind: 'slide', title: 'AI and Leadership', lines: ['Neosho Chamber of Commerce'] },
    { id: 'demo', kind: 'demo', title: 'Live from the room', lines: ['One photo. One request. A real post.'] },
    { id: 'trust', kind: 'slide', title: "I don't trust it", lines: ['You have to own it.'] },
  ],
};

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, talk }) }));
});
afterEach(() => {
  delete global.fetch;
  jest.useRealTimers();
});

test('Page Down moves forward; Back no longer moves back (it talks)', async () => {
  render(<Talk />);
  await waitFor(() => expect(screen.getByText('Neosho Chamber of Commerce')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'PageDown' });
  expect(screen.getByText('Live from the room')).toBeInTheDocument();
  expect(screen.getByText('Live')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'PageUp' });
  fireEvent.keyUp(window, { key: 'PageUp' });
  expect(screen.getByText('Live from the room')).toBeInTheDocument();
});

// 2026-11-08: on Bart's first run Chrome stopped listening on its own while he
// held Back. Letting go must still send what it heard to the team.
test('the second press sends what was heard even when listening already ended', async () => {
  jest.useFakeTimers();
  let rec;
  window.webkitSpeechRecognition = function Rec() {
    rec = this;
    this.start = () => {};
    this.stop = () => {}; // an ended recognizer never fires onend again
  };
  const calls = [];
  global.fetch = jest.fn(async (url, opts) => {
    calls.push(String(url));
    if (String(url).includes('/api/ao/talk/ask')) return { ok: true, status: 200, json: async () => ({ ok: true, agent: 'auto', reply: 'Ready when you are.' }) };
    if (String(url).includes('/api/ao/talk/speak')) return { ok: false, status: 500 };
    return { ok: true, status: 200, json: async () => ({ ok: true, talk }) };
  });
  render(<Talk />);
  await act(async () => {
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('Neosho Chamber of Commerce')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'PageUp' });
  fireEvent.keyUp(window, { key: 'PageUp' });
  act(() => {
    jest.advanceTimersByTime(800);
  });
  act(() => {
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'hey Ada are you ready' }], { isFinal: true })] });
    rec.onend(); // Chrome ends it before the second press
  });
  fireEvent.keyDown(window, { key: 'PageUp' });
  await act(async () => {
    jest.advanceTimersByTime(2500);
    await Promise.resolve();
  });
  await waitFor(() => expect(calls.some((u) => u.includes('/api/ao/talk/ask'))).toBe(true));
  delete window.webkitSpeechRecognition;
});

describe('the iPad script screen (2026-11-08)', () => {
  test('script markdown becomes things to say, stage cues and his own story spots', () => {
    const { scriptBlocks } = require('../Remote.jsx');
    const b = scriptBlocks('I don\'t trust it.\n\n*(Hold Back.)*\n\n- **Jot:** the false alarm\n- **Des:** the graphic\n\n*[your story: the tattoos]*\n\n---');
    expect(b.map((x) => x.kind)).toEqual(['say', 'cue', 'list', 'yours']);
    expect(b[2].items).toHaveLength(2);
  });
});

test('a clicker that repeats its press while held does not flip listening on and off', async () => {
  jest.useFakeTimers();
  const started = [];
  window.webkitSpeechRecognition = function Rec() {
    this.start = () => started.push(1);
    this.stop = () => {};
  };
  render(<Talk />);
  await act(async () => {
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('Neosho Chamber of Commerce')).toBeInTheDocument());
  for (let i = 0; i < 3; i++) {
    fireEvent.keyDown(window, { key: 'PageUp' });
    fireEvent.keyUp(window, { key: 'PageUp' });
    act(() => {
      jest.advanceTimersByTime(100);
    });
  }
  expect(started).toHaveLength(1);
  expect(screen.getByText(/press Back again to send/)).toBeInTheDocument();
  delete window.webkitSpeechRecognition;
});
