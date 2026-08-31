import { useEffect, useState } from 'react';

/**
 * The current pathname, as React state that updates on navigation.
 *
 * The bug this exists to kill, found 2026-08-30 on
 * /journal/leadership-is-not-a-clenched-fist-but-a-guiding-hand-part-2:
 * clicking a Related Journal Posts link changed the URL to Part 1 and left
 * Part 2 on the screen. Verified in a browser, not theorised. The URL said
 * part-1 while the heading and body still said Part 2.
 *
 * The cause was the same in every detail page. Each read
 * window.location.pathname INSIDE an effect whose dependency array was empty,
 * so the slug was captured once at mount. This app navigates with
 * history.pushState plus a synthetic popstate event, and moving from one
 * journal post to another does not change which component is rendered, so the
 * component never remounted, the effect never re-ran, and the old post stayed.
 *
 * Reading the pathname as state instead makes the slug an actual dependency,
 * which is what it always was.
 *
 * Listens for popstate specifically because that is what the app's own
 * navigateTo helpers dispatch after pushState. A real back or forward button
 * fires the same event, so both paths are covered by one listener.
 */
export function useLocationPathname() {
  const [pathname, setPathname] = useState(() =>
    typeof window === 'undefined' ? '' : window.location.pathname
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const sync = () => {
      // Compare before setting. An unrelated popstate would otherwise re-run
      // every dependent effect, which on these pages means refetching the
      // corpus and re-scrolling to the top for no reason.
      setPathname((prev) => (prev === window.location.pathname ? prev : window.location.pathname));
    };

    // The pathname can already have changed between first render and this
    // effect running, so sync once rather than waiting for the next event.
    sync();

    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return pathname;
}

export default useLocationPathname;
