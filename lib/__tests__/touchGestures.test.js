/**
 * @jest-environment node
 *
 * Gestures for Auto on a phone (2026-09-29).
 */
import {
  swipeDirection,
  startedAtEdge,
  createSwipeHandlers,
  SWIPE_MIN_DISTANCE,
  SWIPE_MAX_MS,
} from '../ao/touchGestures.js';

const p = (x, y, t = 0) => ({ x, y, t });

describe('swipeDirection', () => {
  it('reads the four directions', () => {
    expect(swipeDirection(p(300, 400), p(200, 410, 120))).toBe('left');
    expect(swipeDirection(p(100, 400), p(220, 405, 120))).toBe('right');
    expect(swipeDirection(p(200, 700), p(205, 600, 120))).toBe('up');
    expect(swipeDirection(p(200, 600), p(198, 700, 120))).toBe('down');
  });

  it('ignores a tap', () => {
    expect(swipeDirection(p(200, 400), p(205, 404, 80))).toBeNull();
    expect(swipeDirection(p(200, 400), p(200 + SWIPE_MIN_DISTANCE - 1, 400, 100))).toBeNull();
  });

  it('ignores a slow drag, which is a scroll and not a flick', () => {
    expect(swipeDirection(p(200, 700), p(210, 600, SWIPE_MAX_MS + 1))).toBeNull();
  });

  // Tuned against a real thumb on 2026-09-29. A synthetic swipe travels in a
  // straight line at constant speed; a thumb arcs and takes its time. The first
  // thresholds passed every test here and did nothing at all on Bart's phone.
  it('accepts a swipe that arcs, because real thumbs do', () => {
    expect(swipeDirection(p(300, 500), p(210, 560, 400))).toBe('left');
  });

  it('accepts a deliberate slow swipe', () => {
    expect(swipeDirection(p(300, 500), p(220, 520, 1000))).toBe('left');
  });

  it('accepts a short flick', () => {
    expect(swipeDirection(p(300, 500), p(255, 505, 150))).toBe('left');
  });

  it('ignores a diagonal, so a scroll that wanders never opens a drawer', () => {
    expect(swipeDirection(p(200, 400), p(280, 480, 120))).toBeNull();
  });

  it('survives malformed input rather than throwing', () => {
    expect(swipeDirection(null, p(1, 1))).toBeNull();
    expect(swipeDirection(p(1, 1), null)).toBeNull();
    expect(swipeDirection(p(NaN, 1), p(1, 1, 10))).toBeNull();
  });
});

describe('startedAtEdge', () => {
  it('flags the edges iOS claims for back and forward', () => {
    expect(startedAtEdge(p(8, 400), 375)).toBe(true);
    expect(startedAtEdge(p(370, 400), 375)).toBe(true);
  });

  it('leaves the middle of the screen alone', () => {
    expect(startedAtEdge(p(200, 400), 375)).toBe(false);
  });

  it('says no when the width is unknown, rather than blocking every swipe', () => {
    expect(startedAtEdge(p(8, 400), NaN)).toBe(false);
  });
});

describe('createSwipeHandlers', () => {
  const evt = (x, y) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });

  beforeAll(() => { global.window = { innerWidth: 375 }; });
  afterAll(() => { delete global.window; });

  it('calls back with the direction', () => {
    const seen = [];
    const h = createSwipeHandlers((d) => seen.push(d));
    h.onTouchStart(evt(300, 400));
    h.onTouchEnd(evt(200, 405));
    expect(seen).toEqual(['left']);
  });

  it('refuses a swipe that began at an edge iOS owns', () => {
    const seen = [];
    const h = createSwipeHandlers((d) => seen.push(d));
    h.onTouchStart(evt(5, 400));
    h.onTouchEnd(evt(150, 405));
    expect(seen).toEqual([]);
  });

  it('forgets the touch when it is cancelled', () => {
    const seen = [];
    const h = createSwipeHandlers((d) => seen.push(d));
    h.onTouchStart(evt(300, 400));
    h.onTouchCancel();
    h.onTouchEnd(evt(200, 405));
    expect(seen).toEqual([]);
  });
});
