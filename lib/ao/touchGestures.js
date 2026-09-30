/**
 * Swipe detection for Auto on a phone.
 *
 * 2026-09-29. Bart asked for gestures so the screen stops being eaten by bars.
 * The line we drew: a gesture moves something that has a position (a drawer
 * slides, a sheet rises) and never picks between options. Swiping through
 * threads would be fast and wrong, and firing mid-sentence would be infuriating.
 *
 * Nothing here starts at a screen edge. iOS gives the left edge to back and the
 * right to forward, in Safari and Chrome alike, and fighting the operating
 * system loses intermittently, which is worse than not having the gesture.
 *
 * Every gesture in the UI keeps its button. These are accelerators, never the
 * only door.
 */

/**
 * Thresholds, loosened 2026-09-29 after the first real-device test.
 *
 * The originals were tuned against synthetic touch events, which travel in
 * perfectly straight lines at constant speed. A thumb does neither. It arcs,
 * and a deliberate swipe is slower than a simulated one. Bart's swipes were
 * being rejected as scrolls, so the gesture simply did nothing for him while
 * passing every test here.
 */

/** Minimum travel before a drag counts as a swipe. Below this it is a tap. */
export const SWIPE_MIN_DISTANCE = 40;

/** How much straighter the swipe must be than its cross-axis wobble. */
export const SWIPE_AXIS_RATIO = 1.2;

/** A swipe slower than this is a scroll or a drag, not a flick. */
export const SWIPE_MAX_MS = 1200;

/**
 * Classify a touch from its start and end points.
 *
 * @returns {'left'|'right'|'up'|'down'|null} null when it was not a swipe.
 */
export function swipeDirection(start, end, { minDistance = SWIPE_MIN_DISTANCE } = {}) {
  if (!start || !end) return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const elapsed = end.t - start.t;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Number.isFinite(elapsed) && elapsed > SWIPE_MAX_MS) return null;

  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  if (ax >= minDistance && ax >= ay * SWIPE_AXIS_RATIO) return dx < 0 ? 'left' : 'right';
  if (ay >= minDistance && ay >= ax * SWIPE_AXIS_RATIO) return dy < 0 ? 'up' : 'down';
  return null;
}

/** Did this touch begin close enough to a screen edge that iOS may claim it? */
export function startedAtEdge(start, viewportWidth, { edgeSize = 28 } = {}) {
  if (!start || !Number.isFinite(viewportWidth)) return false;
  return start.x <= edgeSize || start.x >= viewportWidth - edgeSize;
}

/** Point from the first touch of an event, or null. */
export function touchPoint(event) {
  const t = event?.touches?.[0] || event?.changedTouches?.[0];
  if (!t) return null;
  return { x: t.clientX, y: t.clientY, t: Date.now() };
}

/**
 * Handlers for an element that should respond to swipes.
 *
 * Fires on touchmove, the moment the threshold is crossed, rather than waiting
 * for touchend. On a vertically scrolling element the browser will often decide
 * a drag is a scroll and send touchcancel instead of touchend, which threw the
 * gesture away entirely. That is why Bart's swipes did nothing on 2026-09-29
 * while every synthetic test here passed: simulated events never go through the
 * browser's own touch-action arbitration.
 *
 * Pair this with `touch-action: pan-y` on the element. Without it the browser
 * claims horizontal movement for itself before these handlers ever see it.
 *
 * @param {(dir: 'left'|'right'|'up'|'down') => void} onSwipe
 * @param {{ allowFromEdge?: boolean, minDistance?: number }} [options]
 */
export function createSwipeHandlers(onSwipe, { allowFromEdge = false, minDistance } = {}) {
  let start = null;
  let fired = false;

  const reset = () => {
    start = null;
    fired = false;
  };

  return {
    onTouchStart(event) {
      start = touchPoint(event);
      fired = false;
    },
    onTouchMove(event) {
      if (!start || fired) return;
      const now = touchPoint(event);
      if (!now) return;
      if (!allowFromEdge && startedAtEdge(start, typeof window !== 'undefined' ? window.innerWidth : NaN)) {
        return;
      }
      const dir = swipeDirection(start, now, { minDistance });
      if (dir) {
        fired = true;
        onSwipe?.(dir);
      }
    },
    onTouchEnd(event) {
      // Backstop for a swipe that completed without a qualifying move event.
      if (start && !fired) {
        const end = touchPoint(event);
        const from = start;
        if (
          end &&
          (allowFromEdge || !startedAtEdge(from, typeof window !== 'undefined' ? window.innerWidth : NaN))
        ) {
          const dir = swipeDirection(from, end, { minDistance });
          if (dir) onSwipe?.(dir);
        }
      }
      reset();
    },
    onTouchCancel: reset,
  };
}
