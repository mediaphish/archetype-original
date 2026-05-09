import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import AutoHubPanel from '../../components/ao/AutoHubPanel';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

/**
 * Analyst / Auto — chat only. Viewport-height shell so the thread scrolls inside the panel
 * and the composer stays pinned (see AutoHubPanel).
 */
export default function Review() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ao/me');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          window.location.replace('/ao/login');
          return;
        }
        if (!cancelled) {
          setEmail(json.email || '');
          setAuthChecked(true);
        }
      } catch (_) {
        window.location.replace('/ao/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner />
        <p className="text-sm text-gray-600">Checking sign-in…</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-gray-50 overscroll-none">
      <div className="shrink-0">
        <AOHeader active="analyst" email={email} onNavigate={handleNavigate} />
      </div>
      <main className="flex-1 flex flex-col min-h-0 w-full max-w-7xl mx-auto px-3 sm:px-4 pt-3 pb-0">
        <AutoHubPanel className="flex-1 min-h-0 h-full" onNavigate={handleNavigate} />
      </main>
    </div>
  );
}
