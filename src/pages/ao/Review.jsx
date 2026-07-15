/**
 * Analyst / Auto — conversation-first layout (Auto V2 panel).
 * Viewport-height shell so the thread scrolls inside the panel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import AOHeader from '../../components/ao/AOHeader';
import AutoV2Panel from '../../components/ao/AutoV2Panel';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

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
      {/* Lock the viewport for the Auto workspace only. react-helmet-async
          reverts this when navigating away, so the public site keeps pinch-zoom. */}
      <Helmet>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </Helmet>
      <div className="shrink-0">
        <AOHeader active="analyst" email={email} onNavigate={handleNavigate} />
      </div>
      <main className="flex-1 flex flex-col min-h-0 w-full px-0 pt-0 pb-0">
        <AutoV2Panel className="flex-1 min-h-0 h-full" onNavigate={handleNavigate} />
      </main>
    </div>
  );
}
