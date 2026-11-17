import React, { useEffect, useState } from 'react';
import { getAliSessionEmail, setAliSessionEmail } from '../../lib/magicLinkBrowserSession';

// Billing (2026-11-17): one yearly plan per leader, whole team included.
// Everything shown comes from /api/ali/billing; nothing here is made up.

function formatDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function statusWords(b) {
  if (!b) return { label: '', detail: '' };
  const through = formatDay(b.paidThrough);
  const pilotEnds = formatDay(b.pilotEndsOn);
  switch (b.status) {
    case 'pilot':
      return {
        label: 'Free pilot year',
        detail: pilotEnds
          ? `Your free year runs until ${pilotEnds}. To keep going after that, start your plan below. No card is needed to start.`
          : 'Your company has a free pilot year.',
      };
    case 'trialing':
      return {
        label: b.pilot ? 'Free pilot year' : 'Free trial',
        detail: b.cancelAtPeriodEnd
          ? `Your free year ends on ${through}, and your plan is set to stop then.`
          : `Your free year ends on ${through}. You will be asked for a card before then, and the plan then renews once a year.`,
      };
    case 'active':
      return {
        label: 'Active',
        detail: b.cancelAtPeriodEnd
          ? `Your plan is paid through ${through} and is set to stop then.`
          : `Your plan renews on ${through}.`,
      };
    case 'past_due':
      return {
        label: 'Payment needed',
        detail: 'Your last payment did not go through. Use Manage billing to update your card. Your results are still here.',
      };
    case 'canceled':
      return {
        label: 'Ended',
        detail: 'Your plan has ended. Your results are still here. Subscribe again to start new survey rounds.',
      };
    default:
      return { label: 'No plan yet', detail: '' };
  }
}

const ALIBilling = () => {
  const [billing, setBilling] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Preserve magic-link email across ALI app navigation (used for role-aware links)
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const email = (emailParam || getAliSessionEmail() || '').toLowerCase().trim();
  const isSuperAdminUser = !!email && email.endsWith('@archetypeoriginal.com');
  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  useEffect(() => {
    if (!emailParam) return;
    if (email) setAliSessionEmail(email);
  }, [emailParam, email]);

  const checkoutResult = urlParams.get('checkout');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/ali/billing', { credentials: 'include' });
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) {
          setLoadError(j?.error || 'Billing could not be loaded. Please try again.');
        } else {
          setBilling(j);
        }
      } catch (e) {
        if (alive) setLoadError('Billing could not be loaded. Please check your connection and try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const goToStripe = async (action) => {
    setActionError('');
    setBusy(action);
    try {
      const r = await fetch('/api/ali/billing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.url) {
        setActionError(j?.error || 'That did not work. Please try again.');
        setBusy('');
        return;
      }
      window.location.href = j.url;
    } catch (e) {
      setActionError('That did not work. Please check your connection and try again.');
      setBusy('');
    }
  };

  const words = statusWords(billing);
  const seats = billing?.seats || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <nav className="flex flex-wrap items-center gap-1 sm:gap-4">
              <button
                onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/reports'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Reports
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/deploy'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/settings'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Settings
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/billing'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-blue-600 font-semibold"
              >
                Billing
              </button>
              {isSuperAdminUser && (
                <button
                  onClick={() => handleNavigate(withEmail('/ali/super-admin/overview'))}
                  className="min-h-[44px] inline-flex items-center justify-center px-3 text-[#2563eb] font-semibold hover:text-[#1d4ed8]"
                >
                  Super Admin
                </button>
              )}
              <button
                onClick={() => handleNavigate('/ali')}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-800"
              >
                Log Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing</h1>
        </div>

        {checkoutResult === 'done' && (
          <div role="status" className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Thank you. Your plan is being set up. If the details below have not changed yet, refresh this page in a minute.
          </div>
        )}
        {checkoutResult === 'canceled' && (
          <div role="status" className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 text-sm">
            Checkout was stopped. Nothing was charged.
          </div>
        )}

        {loading && <p className="text-gray-600">Loading billing...</p>}

        {!loading && loadError && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {loadError}
          </div>
        )}

        {!loading && billing && (
          <div className="space-y-4">
            <section className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Your plan</h2>
              <p className="text-gray-700">
                {billing.founding ? 'Founding price: ' : 'Price: '}
                {billing.priceLabel} a year per leader, your whole team included.
              </p>
              <p className="text-gray-600 text-sm mt-2">
                {seats === 1 ? '1 leader on this plan.' : `${seats} leaders on this plan.`} Results stay yours to view whatever happens with billing.
              </p>
            </section>

            {!billing.billingOn ? (
              <section className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Billing is not switched on yet</h2>
                <p className="text-gray-600">
                  There is nothing to pay right now and no card is needed. You can keep using ALI as you are.
                </p>
              </section>
            ) : (
              <section className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Status: {words.label}</h2>
                {words.detail && <p className="text-gray-600">{words.detail}</p>}

                {billing.status === 'none' && billing.startsPilot && (
                  <p className="text-gray-600">
                    Your company can have a free pilot year. No card is needed to start. After the first year the plan is {billing.priceLabel} a year per leader.
                  </p>
                )}
                {billing.status === 'none' && !billing.startsPilot && (
                  <p className="text-gray-600">Subscribe to start new survey rounds.</p>
                )}

                {billing.isOwner ? (
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    {billing.canStart && (
                      <button
                        type="button"
                        onClick={() => goToStripe('checkout')}
                        disabled={!!busy}
                        className="min-h-[44px] w-full sm:w-auto px-5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busy === 'checkout' ? 'Opening...' : billing.startsPilot ? 'Start your free pilot year' : 'Subscribe'}
                      </button>
                    )}
                    {billing.canManage && (
                      <button
                        type="button"
                        onClick={() => goToStripe('portal')}
                        disabled={!!busy}
                        className="min-h-[44px] w-full sm:w-auto px-5 rounded-lg border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 disabled:opacity-60"
                      >
                        {busy === 'portal' ? 'Opening...' : 'Manage billing'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-600">Only your company's account owner can change billing.</p>
                )}

                {actionError && (
                  <div role="alert" className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {actionError}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ALIBilling;

