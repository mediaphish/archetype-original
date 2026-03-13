import { useEffect, useState } from 'react';

function clamp0(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

/**
 * Mobile helper: track on-screen keyboard overlap on iOS/Chrome.
 *
 * - Updates CSS var: --aoKeyboardInset (px)
 * - Returns inset (number, px)
 *
 * Uses window.visualViewport when available.
 */
export function useKeyboardInset({ enabled = true } = {}) {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let raf = 0;
    const root = document.documentElement;

    const measure = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setInset(0);
        root.style.setProperty('--aoKeyboardInset', '0px');
        return;
      }
      // On iOS, when the keyboard opens, visualViewport.height shrinks.
      // The gap between layout viewport and visual viewport approximates keyboard overlap.
      const raw = window.innerHeight - vv.height - (vv.offsetTop || 0);
      const next = Math.round(clamp0(raw));
      setInset(next);
      root.style.setProperty('--aoKeyboardInset', `${next}px`);
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    schedule();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', schedule);
      vv.addEventListener('scroll', schedule);
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (vv) {
        vv.removeEventListener('resize', schedule);
        vv.removeEventListener('scroll', schedule);
      }
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      root.style.setProperty('--aoKeyboardInset', '0px');
    };
  }, [enabled]);

  return inset;
}

