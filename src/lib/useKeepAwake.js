import { useEffect } from 'react';

/**
 * Keeps the screen on while the page is open (2026-11-09, Bart: "When I setup
 * at the location ... can you run a process that will keep my screen on?").
 * Used by the talk on the laptop and the remote on the iPad and phone. The
 * browser lets go when the tab is hidden, so it asks again when it is back.
 * Browsers without it (or an iPhone in Low Power Mode) simply sleep as usual.
 */
export function useKeepAwake() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.wakeLock?.request) return undefined;
    let lock = null;
    let stopped = false;
    const ask = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch (_) {
        /* not allowed right now; the next visit to the tab tries again */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') ask();
    };
    ask();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch?.(() => {});
    };
  }, []);
}
