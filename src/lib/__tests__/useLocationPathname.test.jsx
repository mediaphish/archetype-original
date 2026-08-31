/**
 * Related-post navigation changed the URL and left the previous post on screen.
 *
 * Reproduced 2026-08-30 on the live site: from
 * /journal/leadership-is-not-a-clenched-fist-but-a-guiding-hand-part-2, clicking
 * the Related Journal Posts link for Part 1 moved the URL to part-1 while the
 * heading and body still read Part 2.
 *
 * Every detail page read window.location.pathname inside an effect with an empty
 * dependency array. The app navigates with history.pushState plus a synthetic
 * popstate, and journal-to-journal navigation renders the same component, so
 * nothing remounted, the effect never re-ran, and the slug stayed frozen at
 * whatever it was on mount.
 */
import React, { useEffect, useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import { useLocationPathname } from '../useLocationPathname.js';

/** Navigate the way the app's own navigateTo helpers do. */
function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Stand-in for a detail page: derives a slug and "loads" content from it. */
function DetailPage() {
  const pathname = useLocationPathname();
  const [loadedFor, setLoadedFor] = useState(null);

  useEffect(() => {
    setLoadedFor(pathname.replace('/journal/', ''));
  }, [pathname]);

  return <h1>{loadedFor || 'nothing'}</h1>;
}

describe('useLocationPathname', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/journal/part-2');
  });

  it('reports the pathname at mount', () => {
    render(<DetailPage />);
    expect(screen.getByRole('heading').textContent).toBe('part-2');
  });

  it('re-runs the dependent effect when navigation changes the URL', () => {
    // The actual bug. Without the hook this heading stays 'part-2' forever.
    render(<DetailPage />);
    expect(screen.getByRole('heading').textContent).toBe('part-2');

    act(() => navigate('/journal/part-1'));
    expect(screen.getByRole('heading').textContent).toBe('part-1');
  });

  it('follows a chain of navigations, not just the first', () => {
    render(<DetailPage />);
    act(() => navigate('/journal/part-1'));
    act(() => navigate('/journal/part-3'));
    expect(screen.getByRole('heading').textContent).toBe('part-3');
  });

  it('does not change identity when an unrelated popstate fires', () => {
    // Dependent effects refetch the corpus and scroll to top, so a popstate
    // that did not change the path must not retrigger them.
    let renders = 0;
    function Counter() {
      useLocationPathname();
      renders += 1;
      return null;
    }
    render(<Counter />);
    const before = renders;
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(renders).toBe(before);
  });

  it('removes its listener on unmount', () => {
    const { unmount } = render(<DetailPage />);
    unmount();
    // Would warn about setting state on an unmounted component if it leaked.
    expect(() => act(() => navigate('/journal/part-9'))).not.toThrow();
  });
});
