import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Info, ArrowUpRight, AlertTriangle } from 'lucide-react';
import ChatApp from '../../app/ChatApp';
import AliHeader from '../../components/ali/AliHeader';
import AliFooter from '../../components/ali/AliFooter';

function fmt1(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toFixed(1);
}

function keyToLabel(k) {
  if (!k) return '—';
  if (k === 'leadership_drift') return 'Leadership Alignment';
  if (k === 'ali') return 'ALI Overall';
  const words = String(k)
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function severityToCopy(sev) {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical') return { label: 'Critical', cls: 'bg-red-50 border-red-200 text-red-800' };
  if (s === 'caution') return { label: 'Caution', cls: 'bg-orange-50 border-orange-200 text-orange-800' };
  if (s === 'neutral') return { label: 'Neutral', cls: 'bg-gray-50 border-gray-200 text-gray-700' };
  return { label: '—', cls: 'bg-gray-50 border-gray-200 text-gray-700' };
}

export default function ReportsMirror() {
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
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailParam]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!email) return;
      try {
        setError(null);
        const resp = await fetch(`/api/ali/dashboard?email=${encodeURIComponent(email)}`);
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to load mirror');
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
    return () => {
      isMounted = false;
    };
  }, [email]);

  const isLoadingLive = !!email && !loadedOnce;

  const mirror = liveSummary?.leadershipMirror || {};
  const gaps = mirror?.gaps || {};
  const leaderScores = mirror?.leaderScores || {};
  const teamScores = mirror?.teamScores || {};
  const severity = mirror?.severity || {};

  const responseCounts = liveSummary?.responseCounts || {};
  const leaderN = typeof responseCounts.leader === 'number' ? responseCounts.leader : null;
  const teamN = typeof responseCounts.team_member === 'number' ? responseCounts.team_member : null;

  const gapRows = useMemo(() => {
    const entries = Object.entries(gaps)
      .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
      .map(([k, v]) => ({
        key: k,
        label: keyToLabel(k),
        gap: v,
        abs: Math.abs(v),
        leader: leaderScores?.[k],
        team: teamScores?.[k],
        severity: severity?.[k]
      }))
      .sort((a, b) => b.abs - a.abs);
    return entries;
  }, [gaps, leaderScores, teamScores, severity]);

  const topGap = gapRows.length ? gapRows[0] : null;

  const askArchyAboutGap = (row) => {
    const dir = row.gap > 0 ? 'leaders rate higher' : 'leaders rate lower';
    setArchyInitialMessage(
      `I'm reviewing my ALI Leadership Mirror.\n\nArea: ${row.label}\nLeader score: ${fmt1(row.leader)}\nTeam score: ${fmt1(row.team)}\nGap (leader - team): ${fmt1(row.gap)} (${dir})\nLeader responses: ${leaderN ?? '—'}\nTeam responses: ${teamN ?? '—'}\n\nExplain in plain language what this gap usually means, what the most likely misunderstanding is, and give me (1) one conversation script for the leader, and (2) one behavioral experiment we can run this week to close the gap.`
    );
    setShowArchyChat(true);
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-white">
        <AliHeader active="reports" email="" isSuperAdminUser={false} onNavigate={handleNavigate} />
        <main className="container mx-auto px-4 py-10 max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Mirror</h1>
          <p className="text-gray-600 mb-6">Please log in via magic link to view your live Leadership Mirror.</p>
          <button
            onClick={() => handleNavigate('/ali/login')}
            className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </main>
        <AliFooter />
      </div>
    );
  }

  if (isLoadingLive) {
    return (
      <div className="min-h-screen bg-white">
        <AliHeader active="reports" email={email} isSuperAdminUser={isSuperAdminUser} onNavigate={handleNavigate} />
        <main className="container mx-auto px-4 py-10 max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Mirror</h1>
          <p className="text-gray-600">Loading your live Leadership Mirror…</p>
        </main>
        <AliFooter />
      </div>
    );
  }

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
              <span className="text-gray-900 font-medium">Leadership Mirror</span>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Mirror</h1>
            <p className="text-gray-600">
              Where leader and team experience differ. Gaps can signal misunderstanding, misalignment, or blind spots.
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
              onClick={() => handleNavigate(withEmail('/ali/reports/profile'))}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Leadership Profile
            </button>
          </div>
        </div>

        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-500 mt-0.5" />
            <div className="text-sm text-gray-700 leading-relaxed">
              <div className="text-sm font-semibold text-gray-900">What this is</div>
              <div className="mt-1">
                The Leadership Mirror compares <span className="font-semibold text-gray-900">leader self-ratings</span> to{' '}
                <span className="font-semibold text-gray-900">team experience</span> on the same tests.
              </div>
              <div className="mt-2">
                <span className="font-semibold text-gray-900">Why it matters:</span> the biggest gaps are often the fastest place to reduce friction—
                not by “trying harder,” but by aligning expectations and behaviors.
              </div>
            </div>
          </div>
        </section>

        {topGap ? (
          <section className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Biggest gap right now</div>
                <div className="text-2xl font-bold text-gray-900 mt-2">{topGap.label}</div>
                <div className="text-sm text-gray-600 mt-2">
                  Gap: <span className="font-semibold text-gray-900">{fmt1(topGap.gap)}pt</span>{' '}
                  <span className="text-gray-500">(leader − team)</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Leader: <span className="font-semibold text-gray-900">{fmt1(topGap.leader)}</span> • Team:{' '}
                  <span className="font-semibold text-gray-900">{fmt1(topGap.team)}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`px-3 py-1 rounded-full border text-xs font-semibold ${severityToCopy(topGap.severity).cls}`}>
                  {severityToCopy(topGap.severity).label} severity
                </div>
                <button
                  type="button"
                  onClick={() => askArchyAboutGap(topGap)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ask Archy
                </button>
              </div>
            </div>

            {(leaderN !== null || teamN !== null) ? (
              <div className="mt-4 text-xs text-gray-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                Based on {leaderN ?? '—'} leader response(s) and {teamN ?? '—'} team response(s).
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">All perception gaps</div>
              <div className="text-sm text-gray-600 mt-1">Sorted by absolute gap (largest first).</div>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate(withEmail('/ali/reports/zones'))}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Open Zones guide <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="py-3 pr-4">Area</th>
                  <th className="py-3 pr-4">Leader</th>
                  <th className="py-3 pr-4">Team</th>
                  <th className="py-3 pr-4">Gap (L − T)</th>
                  <th className="py-3 pr-4">Severity</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {gapRows.length ? (
                  gapRows.map((row) => {
                    const sev = severityToCopy(row.severity);
                    const dir = row.gap > 0 ? 'Leader higher' : row.gap < 0 ? 'Leader lower' : 'Even';
                    return (
                      <tr key={row.key} className="border-b border-gray-100">
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-gray-900">{row.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{dir}</div>
                        </td>
                        <td className="py-4 pr-4 text-gray-700">{fmt1(row.leader)}</td>
                        <td className="py-4 pr-4 text-gray-700">{fmt1(row.team)}</td>
                        <td className="py-4 pr-4">
                          <span className="font-semibold text-gray-900">{fmt1(row.gap)}</span>
                          <span className="text-gray-500 text-sm">pt</span>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${sev.cls}`}>
                            {sev.label}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            type="button"
                            onClick={() => askArchyAboutGap(row)}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Ask Archy
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-6 text-sm text-gray-600" colSpan={6}>
                      No perception gaps available yet. This view becomes meaningful once both leader and team members have responded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <AliFooter />

      {/* Archy Chat Floating Button */}
      <button
        onClick={() => {
          setArchyInitialMessage('');
          setShowArchyChat(!showArchyChat);
        }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-[#FF6B35] shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center overflow-hidden"
        aria-label="Chat with Archy about your Leadership Mirror"
      >
        <img
          src="/images/archy-avatar.png"
          alt="Archy"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </button>

      {showArchyChat && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-end p-4 md:p-8 pointer-events-none">
          <div className="w-full max-w-xl h-[85vh] max-h-[700px] pointer-events-auto flex flex-col">
            <div className="bg-white rounded-2xl shadow-2xl h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <img
                      src="/images/archy-avatar.png"
                      alt="Archy"
                      className="w-10 h-10 rounded-full border-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Archy</h3>
                    <p className="text-xs text-gray-500">AI Leadership Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowArchyChat(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                  aria-label="Close chat"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <ChatApp
                  context="ali-reports-mirror"
                  initialMessage={archyInitialMessage || "I'm reviewing my Leadership Mirror. Help me understand what this gap means and what to do next."}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

