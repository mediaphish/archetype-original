/**
 * The talk view for the McDonald County Chamber (2026-10-28). Since 2026-11-09
 * there is no clicker: the arrows only change slides, the iPad's Talk button
 * runs the mic, and holding V on the laptop still listens.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Talk from '../Talk.jsx';

const talk = {
  slug: 'mcdonald-county-chamber-2026',
  title: 'AI and Leadership',
  sections: [
    { id: 'open', kind: 'slide', title: 'AI and Leadership', lines: ['McDonald County Chamber'] },
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

test('the arrows only change slides (2026-11-09)', async () => {
  render(<Talk />);
  await waitFor(() => expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(screen.getByText('Live from the room')).toBeInTheDocument();
  expect(screen.getByText('Live')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument();
});

// 2026-11-08: on Bart's first run Chrome stopped listening on its own while he
// held Back. Letting go must still send what it heard to the team.
test('letting go of V sends what was heard even when listening already ended', async () => {
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
  await waitFor(() => expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'v' });
  act(() => {
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'hey Ada are you ready' }], { isFinal: true })] });
    rec.onend(); // Chrome ends it before letting go
  });
  fireEvent.keyUp(window, { key: 'v' });
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
  await waitFor(() => expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'v' });
  act(() => {
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'hey Ada are you ready' }], { isFinal: true })] });
    rec.onend();
    jest.advanceTimersByTime(800);
  });
  fireEvent.keyUp(window, { key: 'v' });
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
  // A line whose voice failed stays up about as long as it takes to say, then fades.
  for (let i = 0; i < 12; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
  }
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
  await waitFor(() => expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument());
  expect(screen.queryByText('Go Wildcats!')).not.toBeInTheDocument();
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
  }
  expect(screen.getByText(/Go Wildcats!/)).toBeInTheDocument();
  // 2026-11-09: a cut-in always hands back out loud.
  expect(screen.getByText(/Back to you\./)).toBeInTheDocument();
});

test("the iPad's Talk button turns the mic on, and a second tap sends (2026-11-09)", async () => {
  jest.useFakeTimers();
  let rec;
  window.webkitSpeechRecognition = function Rec() {
    rec = this;
    this.start = () => {};
    this.stop = () => {};
  };
  let state = { seq: 0, index: 0 };
  const calls = [];
  global.fetch = jest.fn(async (url) => {
    calls.push(String(url));
    if (String(url).includes('/api/ao/talk/remote')) return { ok: true, status: 200, json: async () => ({ ok: true, state }) };
    if (String(url).includes('/api/ao/talk/ask')) return { ok: true, status: 200, json: async () => ({ ok: true, agent: 'auto', reply: 'Ready.' }) };
    if (String(url).includes('/api/ao/talk/speak')) return { ok: false, status: 500 };
    return { ok: true, status: 200, json: async () => ({ ok: true, talk }) };
  });
  render(<Talk />);
  await waitFor(() => expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument());
  const tick = async () => {
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        jest.advanceTimersByTime(400);
        await Promise.resolve();
      });
    }
  };
  await tick();
  state = { ...state, seq: 1, action: 'talk' };
  await tick();
  expect(screen.getByText(/tap Send on the iPad/)).toBeInTheDocument();
  act(() => {
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'hey Ada are you ready' }], { isFinal: true })] });
    rec.onend();
  });
  state = { ...state, seq: 2, action: 'talk' };
  await tick();
  await waitFor(() => expect(calls.some((u) => u.includes('/api/ao/talk/ask'))).toBe(true));
  delete window.webkitSpeechRecognition;
});

test('moving on while the mic is on drops it and changes the slide (2026-11-09)', async () => {
  jest.useFakeTimers();
  window.webkitSpeechRecognition = function Rec() {
    this.start = () => {};
    this.stop = () => {};
    this.abort = () => {};
  };
  render(<Talk />);
  await act(async () => {
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'v' });
  expect(screen.getByText(/tap Send on the iPad/)).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(screen.queryByText(/tap Send on the iPad/)).not.toBeInTheDocument();
  expect(screen.getByText('Live from the room')).toBeInTheDocument();
  delete window.webkitSpeechRecognition;
});

test('starting over goes to the title slide and tells the server to forget the run (2026-11-08)', async () => {
  const calls = [];
  global.fetch = jest.fn(async (url, opts) => {
    calls.push([String(url), opts?.body || '']);
    return { ok: true, status: 200, json: async () => ({ ok: true, talk }) };
  });
  render(<Talk />);
  await waitFor(() => expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'PageDown' });
  expect(screen.getByText('Live from the room')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument();
  await waitFor(() => expect(calls.some(([u, b]) => u.includes('/api/ao/talk/remote') && b.includes('"reset"'))).toBe(true));
});

// 2026-11-09: a second talk tab spoke the last slide's line while Bart was on slide 8.
test('an older copy of the talk goes quiet when a newer one opens', async () => {
  const listeners = [];
  global.BroadcastChannel = function BC() {
    this.postMessage = (data) => listeners.filter((l) => l !== this).forEach((l) => l.onmessage?.({ data }));
    this.close = () => {};
    listeners.push(this);
  };
  render(<Talk />);
  await waitFor(() => expect(screen.getByText('McDonald County Chamber')).toBeInTheDocument());
  render(<Talk />);
  await waitFor(() => expect(screen.getByText(/open in another tab/)).toBeInTheDocument());
  delete global.BroadcastChannel;
});

test('a cut-in that does not hand back gets "Back to you." (2026-11-09)', () => {
  const { withHandBack } = require('../Talk.jsx');
  expect(withHandBack([{ agent: 'auto', text: 'Thank you for your service.' }])[0].text).toBe('Thank you for your service. Back to you.');
  expect(withHandBack([{ agent: 'jot', text: 'Worth bringing up. As you were.' }])[0].text).toBe('Worth bringing up. As you were.');
  expect(withHandBack([{ agent: 'auto', text: 'Hands up?' }, { pause: 5000 }])[0].text).toMatch(/Back to you\.$/);
});
