import React, { useEffect, useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import ChatApp from '../../app/ChatApp';
import AliHeader from '../../components/ali/AliHeader';
import AliFooter from '../../components/ali/AliFooter';

function fmt1(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toFixed(1);
}

const profileNames = {
  guardian: 'Guardian',
  aspirer: 'Aspirer',
  protector: 'Protector',
  producer_leader: 'Producer-Leader',
  stabilizer: 'Stabilizer',
  operator: 'Operator',
  profile_forming: 'Profile Forming'
};

const profileDescriptions = {
  guardian: 'High Honesty • High Clarity. The healthiest leadership model—stable, safe, aligned.',
  aspirer: 'High Honesty • Unstable Clarity. Well-intentioned but clarity slips under stress.',
  protector: 'Selective Honesty • High Clarity. Communicates well but edits truth to protect.',
  producer_leader: 'Courageous Honesty • Ambiguous Clarity. Works hard, tells truth, but vague due to overload.',
  stabilizer: 'Selective Honesty • Unstable Clarity. Keeps peace but unintentionally confuses team.',
  operator: 'Protective Honesty • Ambiguous Clarity. Well-meaning but exhausted and unequipped.',
  profile_forming: 'Profile still forming. Complete more surveys to see your leadership archetype.'
};

export default function ReportsProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const storedEmail = (() => {
    try {
      return localStorage.getItem('ali_email') || '';
    } catch {
      return '';
    }
  })();
  const emailRaw = (emailParam || storedEmail || '').toString();
  const email = emailRaw ? emailRaw.toLowerCase().trim() : '';
  const isSuperAdminUser = !!email && email.endsWith('@archetypeoriginal.com');

  const [liveSummary, setLiveSummary] = useState(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  const [showArchyChat, setShowArchyChat] = useState(false);
  const [archyInitialMessage, setArchyInitialMessage] = useState('');

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  useEffect(() => {
    if (!emailParam) return;
    try {
      if (email) localStorage.setItem('ali_email', email);
    } catch {
      /* ignore */
    }
  }, [emailParam, email]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!email) return;
      try {
        setError(null);
        const resp = await fetch(`/api/ali/dashboard?email=${encodeURIComponent(email)}`);
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to load profile');
        if (!isMounted) return;
        setLiveSummary(json);
        setLoadedOnce(true);
      } catch (err) {
        if (!isMounted) return;
        setLiveSummary(null);
        setError(err?.message || 'Failed to load');
        setLoadedOnce(true);
      }
    };
    run();
    return () => { isMounted = false; };
  }, [email]);

  const askArchyAboutProfile = () => {
    const msg = 'Help me understand my Leadership Profile and what I can do to grow.';
    setArchyInitialMessage(msg);
    setShowArchyChat(true);
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AliHeader active="reports" email="" isSuperAdminUser={false} onNavigate={handleNavigate} />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <p className="text-gray-600">Sign in with your email to view your Leadership Profile.</p>
          <button
            onClick={() => handleNavigate('/ali/login')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to login →
          </button>
        </main>
      </div>
    );
  }

  if (!loadedOnce) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AliHeader active="reports" email={email} isSuperAdminUser={isSuperAdminUser} onNavigate={handleNavigate} />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-gray-600">Loading your Leadership Profile…</div>
        </main>
      </div>
    );
  }

  const lp = liveSummary?.leadershipProfile || {};
  const profile = lp.profile || 'profile_forming';
  const honesty = lp.honesty || { score: null, state: '—' };
  const clarity = lp.clarity || { level: null, state: '—', stddev: null };

  return (
    <div className="min-h-screen bg-gray-50">
      <AliHeader active="reports" email={email} isSuperAdminUser={isSuperAdminUser} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <nav className="text-sm text-gray-500 mb-1" aria-label="Breadcrumb">
              <button onClick={() => handleNavigate(withEmail('/ali/dashboard'))} className="hover:text-gray-900">Dashboard</button>
              <span className="mx-1">→</span>
              <button onClick={() => handleNavigate(withEmail('/ali/reports'))} className="hover:text-gray-900">Reports</button>
              <span className="mx-1">→</span>
              <span className="text-gray-900 font-medium">Leadership Profile</span>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Profile</h1>
            <p className="text-gray-600">
              Your leadership archetype, measured across Honesty and Clarity.
            </p>
            {error ? <p className="text-xs text-red-600 mt-1">(live data unavailable: {error})</p> : null}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={() => handleNavigate(withEmail('/ali/reports'))}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Reports Hub
            </button>
            <button
              onClick={() => handleNavigate(withEmail('/ali/reports/mirror'))}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Leadership Mirror
            </button>
            <button
              onClick={() => handleNavigate(withEmail('/ali/reports/zones'))}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Zones Guide
            </button>
          </div>
        </div>

        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-700 leading-relaxed">
              <div className="font-semibold text-gray-900">What this is</div>
              <div className="mt-1">
                Your Leadership Profile reveals the archetype of how you lead, measured across two axes: Honesty and Clarity.
                These are behavioral patterns—stable, measurable, and actionable—not moral judgments.
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-black/[0.12] p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-[22px] font-semibold text-black/[0.87]">Your Profile</h2>
              <button
                type="button"
                onClick={askArchyAboutProfile}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                aria-label="Ask Archy about your Leadership Profile"
              >
                <HelpCircle className="w-4 h-4" />
                Ask Archy
              </button>
            </div>
            <button
              onClick={() => handleNavigate(withEmail('/ali/reports'))}
              className="text-[13px] font-semibold text-[#2563eb] hover:text-[#2563eb]/80"
            >
              Reports Hub →
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border-2 border-purple-200 p-6">
            <div className="mb-4">
              <div className="text-[28px] font-bold text-black/[0.87] capitalize">
                {profileNames[profile] || profile}
              </div>
              <div className="text-[13px] text-black/[0.6]">Based on completed surveys</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-purple-200 p-5 shadow-sm">
                <div className="text-[13px] font-medium text-black/[0.6] mb-2">Honesty</div>
                <div className="text-[42px] font-bold text-black/[0.87] leading-none">{fmt1(honesty.score)}</div>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-[12px] font-medium capitalize">
                  {honesty.state || '—'}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-purple-200 p-5 shadow-sm">
                <div className="text-[13px] font-medium text-black/[0.6] mb-2">Clarity</div>
                <div className="text-[42px] font-bold text-black/[0.87] leading-none">{fmt1(clarity.level)}</div>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-[12px] font-medium capitalize">
                  {clarity.state || '—'}
                </div>
                {clarity.stddev != null && (
                  <div className="text-[11px] text-black/[0.6] mt-2">Stddev: {fmt1(clarity.stddev)}</div>
                )}
              </div>
            </div>
            <div className="pt-6 border-t border-purple-200">
              <p className="text-[14px] text-black/[0.87] leading-relaxed">
                {profileDescriptions[profile] || profileDescriptions.profile_forming}
              </p>
            </div>
          </div>
        </section>
      </main>
      <AliFooter />

      <button
        onClick={() => { setArchyInitialMessage(''); setShowArchyChat(!showArchyChat); }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-[#FF6B35] shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center overflow-hidden"
        aria-label="Chat with Archy about your Leadership Profile"
      >
        <img src="/images/archy-avatar.png" alt="Archy" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
      </button>
      {showArchyChat && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-end p-4 md:p-8 pointer-events-none">
          <div className="w-full max-w-xl h-[85vh] max-h-[700px] pointer-events-auto flex flex-col">
            <div className="bg-white rounded-2xl shadow-2xl h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <img src="/images/archy-avatar.png" alt="Archy" className="w-10 h-10 rounded-full border-0" onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Archy</h3>
                    <p className="text-xs text-gray-500">AI Leadership Assistant</p>
                  </div>
                </div>
                <button onClick={() => setShowArchyChat(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2" aria-label="Close chat">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <ChatApp context="ali-reports-profile" initialMessage={archyInitialMessage || "I'm on my Leadership Profile. Help me understand my archetype and what I can do to grow."} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
