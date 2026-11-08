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

test("a teammate's message fades a few seconds after it is spoken (2026-11-08)", async () => {
  jest.useFakeTimers();
  window.webkitSpeechRecognition = function Rec() {
    this.start = () => {};
    this.stop = () => {};
  };
  let rec;
  const Orig = window.webkitSpeechRecognition;
  window.webkitSpeechRecognition = function R() { Orig.call(this); rec = this; };
  global.fetch = jest.fn(async (url) => {
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
  act(() => {
    jest.advanceTimersByTime(500);
  });
  act(() => {
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'hey Ada are you ready' }], { isFinal: true })] });
    rec.onend();
    jest.advanceTimersByTime(800);
  });
  fireEvent.keyDown(window, { key: 'PageUp' });
  act(() => {
    jest.advanceTimersByTime(500);
  });
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });
  }
  expect(screen.getByText('Ready when you are.')).toBeInTheDocument();
  await act(async () => {
    jest.advanceTimersByTime(8000);
    await Promise.resolve();
  });
  expect(screen.queryByText('Ready when you are.')).not.toBeInTheDocument();
  delete window.webkitSpeechRecognition;
});

test('a teammate cuts in once, on their own, some seconds into a slide (2026-11-08)', async () => {
  jest.useFakeTimers();
  const withCut = {
    ...talk,
    sections: [{ ...talk.sections[0], interrupt: { after_seconds: 20, lines: [{ agent: 'reach', text: 'Go Wildcats!' }] } }, ...talk.sections.slice(1)],
  };
  global.fetch = jest.fn(async (url) => {
    if (String(url).includes('/api/ao/talk/speak')) return { ok: false, status: 500 };
    return { ok: true, status: 200, json: async () => ({ ok: true, talk: withCut }) };
  });
  render(<Talk />);
  await act(async () => {
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('Neosho Chamber of Commerce')).toBeInTheDocument());
  expect(screen.queryByText('Go Wildcats!')).not.toBeInTheDocument();
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
  }
  expect(screen.getByText('Go Wildcats!')).toBeInTheDocument();
});

test('two quick presses of Back go back a slide instead of talking (2026-11-08)', async () => {
  jest.useFakeTimers();
  const started = [];
  window.webkitSpeechRecognition = function Rec() {
    this.start = () => started.push(1);
    this.stop = () => {};
    this.abort = () => {};
  };
  render(<Talk />);
  await act(async () => {
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('Neosho Chamber of Commerce')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'PageDown' });
  expect(screen.getByText('Live from the room')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'PageUp' });
  act(() => {
    jest.advanceTimersByTime(200);
  });
  fireEvent.keyDown(window, { key: 'PageUp' });
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByText('Neosho Chamber of Commerce')).toBeInTheDocument();
  expect(started).toHaveLength(0);
  delete window.webkitSpeechRecognition;
});
