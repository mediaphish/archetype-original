import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  Info,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Shield,
  Handshake,
  MessagesSquare,
  Target,
  Compass,
  Activity
} from 'lucide-react';
import ChatApp from '../../app/ChatApp';
import AliHeader from '../../components/ali/AliHeader';
import AliFooter from '../../components/ali/AliFooter';

function fmt1(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toFixed(1);
}

function displayTestScore(testKey, rawScore) {
  if (typeof rawScore !== 'number' || !Number.isFinite(rawScore)) return null;
  // leadership_drift is measured as "drift" in the data model (higher = worse).
  // We display it to users as "Leadership Alignment" (higher = better).
  if (testKey === 'leadership_drift') return 100 - rawScore;
  return rawScore;
}

function keyToLabel(k) {
  if (!k) return '—';
  if (k === 'leadership_drift') return 'Leadership Alignment';
  if (k === 'ali') return 'ALI Overall';
  return String(k).replace(/_/g, ' ');
}

function getZoneInfo(zone) {
  const zones = {
    green: {
      key: 'green',
      color: '#10b981',
      label: 'Green Zone',
      meaning:
        'Healthy, stable leadership environment. Your team likely experiences clarity and follow-through as consistent.'
    },
    yellow: {
      key: 'yellow',
      color: '#f59e0b',
      label: 'Yellow Zone',
      meaning:
        'Stable but inconsistent in moments that matter. Small gaps are showing up—fixable with focused habits.'
    },
    orange: {
      key: 'orange',
      color: '#f97316',
      label: 'Orange Zone',
      meaning:
        'Early warning signs of drift. The team experiences inconsistency and/or unclear priorities often enough to create friction.'
    },
    red: {
      key: 'red',
      color: '#ef4444',
      label: 'Red Zone',
      meaning:
        'High-risk leadership environment. Trust/clarity gaps are likely impacting performance and morale—requires immediate attention.'
    }
  };
  return zones[zone] || zones.yellow;
}

function zoneBand(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  if (score >= 75) return { zone: 'green', range: '75–100' };
  if (score >= 60) return { zone: 'yellow', range: '60–74.9' };
  if (score >= 45) return { zone: 'orange', range: '45–59.9' };
  return { zone: 'red', range: '0–44.9' };
}

const ZONE_GUIDE = [
  { key: 'green', range: '75–100', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.45)' },
  { key: 'yellow', range: '60–74.9', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.50)' },
  { key: 'orange', range: '45–59.9', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.50)' },
  { key: 'red', range: '0–44.9', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.45)' }
];

const TEST_META = {
  clarity: {
    label: 'Clarity',
    blurb: 'How clear priorities and expectations feel.',
    what: 'How clear priorities, expectations, and “what good looks like” feel to the team.',
    why: 'Low clarity creates rework, guessing, and hesitation—people stall because they’re not sure what matters most.'
  },
  consistency: {
    label: 'Consistency',
    blurb: 'How reliably leadership follows through.',
    what: 'How reliably leadership follows through (habits, decisions, accountability, and standards).',
    why: 'Low consistency makes the environment unpredictable—people stop trusting priorities because they change or aren’t reinforced.'
  },
  trust: {
    label: 'Trust',
    blurb: 'How safe it feels to be honest and raise issues.',
    what: 'How safe it feels to be honest, ask questions, and raise issues without punishment.',
    why: 'Low trust causes silence and “workarounds.” Problems stay hidden until they become expensive.'
  },
  communication: {
    label: 'Communication',
    blurb: 'How well context and decisions are communicated.',
    what: 'How well information flows: context, updates, and the “why” behind decisions.',
    why: 'Low communication creates rumors, misalignment, and duplicated work because people fill gaps with assumptions.'
  },
  alignment: {
    label: 'Alignment',
    blurb: 'How aligned the team is on priorities and direction.',
    what: 'How aligned people are on direction: priorities, tradeoffs, and what the team is optimizing for.',
    why: 'Low alignment looks like teams pulling in different directions—even high effort won’t compound if it’s not pointed at the same target.'
  },
  stability: {
    label: 'Stability',
    blurb: 'How stable the operating environment feels.',
    what: 'How stable the operating environment feels: pace, pressure, chaos, and ability to plan.',
    why: 'Low stability burns energy on firefighting. People default to survival behaviors instead of improvement.'
  },
  leadership_drift: {
    label: 'Leadership Alignment',
    blurb: 'Gap between stated and observed leadership behaviors.',
    what: 'A signal of drift: how often leadership behavior and the team’s lived experience feel out of sync.',
    why: 'Drift is where confusion and resentment grow—leaders think they’re doing one thing, while the team experiences another.'
  }
};

const TEST_VISUALS = {
  clarity: { Icon: Lightbulb, color: '#2563eb' },
  consistency: { Icon: Shield, color: '#14b8a6' },
  trust: { Icon: Handshake, color: '#8b5cf6' },
  communication: { Icon: MessagesSquare, color: '#f59e0b' },
  alignment: { Icon: Target, color: '#10b981' },
  stability: { Icon: Compass, color: '#6366f1' },
  leadership_drift: { Icon: Activity, color: '#ec4899' }
};

const CONSTRAINT_ACTIONS = {
  clarity: {
    why_concerning:
      'Low clarity forces people to guess. Guessing turns into hesitation, rework, and “busy” work that doesn’t compound.',
    try_this_week:
      'Publish “Top 3 priorities this week” and what to ignore.',
    micro_script:
      '“This week our top 3 priorities are A, B, C. If something doesn’t support these, we’ll pause it or park it.”'
  },
  consistency: {
    why_concerning:
      'Low consistency makes the system feel unpredictable. When follow-through is uneven, people stop trusting priorities and standards.',
    try_this_week:
      'Pick one standard you will enforce for 7 days (and make it visible).',
    micro_script:
      '“For the next 7 days, we’re going to be consistent about X. If we miss it, we’ll name it and correct it the same day.”'
  },
  trust: {
    why_concerning:
      'Low trust reduces truth. People protect themselves by staying quiet, so risks arrive late and expensive.',
    try_this_week:
      'Run a 10-minute “what’s hard right now?” round and thank the first person who’s honest.',
    micro_script:
      '“What’s one thing that feels harder than it should right now? No fixing today—just naming it so we can see reality.”'
  },
  communication: {
    why_concerning:
      'Low communication creates rumor and misalignment. People fill gaps with assumptions and duplicate work.',
    try_this_week:
      'Add a weekly 5-sentence update: what changed, why, and what to do next.',
    micro_script:
      '“Here’s what changed this week, why it changed, and what I need you to do differently because of it.”'
  },
  alignment: {
    why_concerning:
      'Low alignment looks like high effort with low compounding. Teams pull in different directions and tradeoffs get fuzzy.',
    try_this_week:
      'Do a 15-minute alignment check-in: “What are you prioritizing, and why?”',
    micro_script:
      '“Before we start: what is each of us prioritizing today, and how does it connect to the team goal?”'
  },
  stability: {
    why_concerning:
      'Low stability triggers firefighting. People optimize for survival instead of improvement, and quality erodes.',
    try_this_week:
      'Create one “protected block” (no meetings) for deep work or recovery.',
    micro_script:
      '“We’re protecting X hours this week for deep work. If we break it, we’ll be explicit about why.”'
  },
  leadership_drift: {
    why_concerning:
      'Low leadership alignment means the team’s lived experience doesn’t match what leadership believes is happening. That mismatch breeds resentment.',
    try_this_week:
      'Pick one value you say you live and name one observable behavior that proves it.',
    micro_script:
      '“We say we value X. This week you’ll see it in Y behavior from me. If you don’t see it, tell me directly.”'
  }
};

const TEST_ORDER = [
  'clarity',
  'consistency',
  'trust',
  'communication',
  'alignment',
  'stability',
  'leadership_drift'
];

export default function ReportsZones() {
  const [showArchyChat, setShowArchyChat] = useState(false);
  const [archyInitialMessage, setArchyInitialMessage] = useState(null);
  const [showAllHistoryByTest, setShowAllHistoryByTest] = useState({});

  const [liveDashboardSummary, setLiveDashboardSummary] = useState(null);
  const [liveDashboardError, setLiveDashboardError] = useState(null);
  const [liveLoadedOnce, setLiveLoadedOnce] = useState(false);

  const [zoneReco, setZoneReco] = useState(null);
  const [zoneRecoLoading, setZoneRecoLoading] = useState(false);
  const [zoneRecoError, setZoneRecoError] = useState(null);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

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
  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  // Persist email so /ali/reports/zones works without query params after first login
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
        setLiveDashboardError(null);
        const resp = await fetch(`/api/ali/dashboard?email=${encodeURIComponent(email)}`);
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to load dashboard summary');
        if (!isMounted) return;
        setLiveDashboardSummary(json);
        setLiveLoadedOnce(true);
      } catch (err) {
        if (!isMounted) return;
        setLiveDashboardSummary(null);
        setLiveDashboardError(err?.message || 'Failed to load');
        setLiveLoadedOnce(true);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [email]);

  const isLoadingLive = !!email && !liveLoadedOnce;

  const zone = liveDashboardSummary?.scores?.ali?.zone || '';
  const aliScore = liveDashboardSummary?.scores?.ali?.current;
  const respCount = liveDashboardSummary?.responseCounts?.overall;
  const zoneInfo = getZoneInfo(zone || 'yellow');
  const band = zoneBand(aliScore);

  const patterns = liveDashboardSummary?.scores?.patterns || {};
  const patternTrends = liveDashboardSummary?.patternTrends || {};
  const surveys = Array.isArray(liveDashboardSummary?.surveys) ? liveDashboardSummary.surveys : [];

  const evidence = useMemo(() => {
    const lowest = Object.entries(patterns)
      .map(([k, v]) => [k, displayTestScore(k, v?.current)])
      .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .map(([k, v]) => ({ key: k, value: v }));

    return {
      lowestPatterns: lowest
    };
  }, [patterns]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!email) return;
      if (!zone) return;
      if (!liveDashboardSummary) return;

      try {
        setZoneRecoLoading(true);
        setZoneRecoError(null);
        setZoneReco(null);

        const lowestPatterns = (evidence.lowestPatterns || []).map((p) => `${p.key}:${p.value.toFixed(1)}`);

        const resp = await fetch(`/api/ali/zone-recommendations?ts=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            zone,
            aliScore,
            lowestPatterns,
            largestGap: '',
            responseCount: respCount
          })
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to generate recommendation');
        if (!isMounted) return;
        setZoneReco(json?.recommendation || null);
      } catch (err) {
        if (!isMounted) return;
        setZoneRecoError(err?.message || 'Failed to generate recommendation');
      } finally {
        if (!isMounted) return;
        setZoneRecoLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [email, zone, aliScore, respCount, liveDashboardSummary, evidence]);

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AliHeader active="reports" email="" isSuperAdminUser={false} onNavigate={handleNavigate} />
        <main className="container mx-auto px-4 py-10 max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Zones</h1>
          <p className="text-gray-600 mb-6">Please log in via magic link to view your live Zones guide.</p>
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
      <div className="min-h-screen bg-gray-50">
        <AliHeader active="reports" email={email} isSuperAdminUser={isSuperAdminUser} onNavigate={handleNavigate} />
        <main className="container mx-auto px-4 py-10 max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Zones</h1>
          <p className="text-gray-600">Loading your live Zone guide…</p>
        </main>
        <AliFooter />
      </div>
    );
  }

  const TestCard = ({ testKey }) => {
    const meta = TEST_META[testKey] || { label: keyToLabel(testKey), what: '—', why: '—' };
    const visual = TEST_VISUALS[testKey] || { Icon: Activity, color: '#2563eb' };
    const Icon = visual.Icon;
    const color = visual.color;
    const currentRaw = patterns?.[testKey]?.current;
    const rollingRaw = patterns?.[testKey]?.rolling;
    const current = displayTestScore(testKey, currentRaw);
    const rolling = displayTestScore(testKey, rollingRaw);
    const showAll = !!showAllHistoryByTest[testKey];

    const historyPointsRaw = Array.isArray(patternTrends?.[testKey]) ? patternTrends[testKey] : [];
    const historyPoints = historyPointsRaw
      .map((p) => {
        const survey = surveys.find((s) => s?.survey_index === p?.survey_index);
        const period = survey?.year && survey?.quarter
          ? `${survey.year} ${survey.quarter}`
          : (typeof p?.survey_index === 'number' ? `Survey ${p.survey_index}` : '—');
        const responses = typeof survey?.response_count === 'number' ? survey.response_count : null;
        const score = displayTestScore(testKey, p?.score);
        return { period, responses, score };
      })
      .filter((p) => typeof p.score === 'number' && Number.isFinite(p.score));

    const displayHistory = showAll ? historyPoints : historyPoints.slice(-4);

    const trend = (() => {
      if (historyPoints.length < 2) return null;
      const prev = historyPoints[historyPoints.length - 2]?.score;
      const last = historyPoints[historyPoints.length - 1]?.score;
      if (typeof prev !== 'number' || typeof last !== 'number' || !Number.isFinite(prev) || !Number.isFinite(last)) return null;
      const delta = last - prev;
      const pct = prev !== 0 ? (delta / prev) * 100 : null;
      return { delta, pct };
    })();

    const trendUp = trend ? trend.delta > 0 : null;

    return (
      <div id={`test-${testKey}`} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm scroll-mt-28">
        {/* Header row: icon + title + (optional) show all */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{meta.label}</div>
              <div className="text-xs text-gray-500">{meta.blurb}</div>
            </div>
          </div>

          {historyPoints.length > 4 ? (
            <button
              type="button"
              onClick={() => setShowAllHistoryByTest((prev) => ({ ...prev, [testKey]: !showAll }))}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              {showAll ? 'Show less' : 'Show all'}
              {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          ) : null}
        </div>

        {/* Big score + rolling + trend */}
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-5xl font-bold leading-none" style={{ color }}>
              {fmt1(current)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Rolling: <span className="font-semibold text-gray-900">{fmt1(rolling)}</span>
            </div>
          </div>
          <div className="text-right">
            {trend ? (
              <div className={`text-sm font-semibold ${trendUp ? 'text-green-700' : trendUp === false ? 'text-red-700' : 'text-gray-600'}`}>
                {trendUp ? '↑' : '↓'} {trend.pct !== null ? `${Math.abs(trend.pct).toFixed(1)}%` : `${trend.delta.toFixed(1)}`}
              </div>
            ) : (
              <div className="text-sm font-semibold text-gray-400">—</div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {historyPoints.length ? `${historyPoints.length} survey cycle(s)` : 'No history yet'}
            </div>
          </div>
        </div>

        {/* Larger, central bar chart */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-gray-900 mb-3">Survey history</div>
          {displayHistory.length ? (
            <div className="space-y-3">
              {displayHistory.map((p, idx) => {
                const barWidth = Math.max(Math.min((p.score / 100) * 100, 100), 2);
                return (
                  <div key={`${p.period}-${idx}`} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-600 font-medium flex-shrink-0">{p.period}</div>
                    <div className="flex-1 relative h-10 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-3"
                        style={{ width: `${barWidth}%`, backgroundColor: color, minWidth: '56px' }}
                        title={`${meta.label}: ${p.score.toFixed(1)}${p.responses !== null ? ` • ${p.responses} responses` : ''}`}
                      >
                        <span className="text-sm font-semibold text-white">{p.score.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="w-20 text-xs text-gray-500 flex-shrink-0 text-right">
                      {p.responses !== null ? `${p.responses} responses` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-600">Survey history will appear after multiple survey cycles.</div>
          )}
        </div>

        {/* Definitions (still present, but visually secondary) */}
        <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
          <div className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">What this is:</span> {meta.what}
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">Why it matters:</span> {meta.why}
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => {
              setArchyInitialMessage(
                `I'm reviewing my ALI Zones guide.\n\nTest: ${meta.label}\nCurrent score: ${fmt1(current)}\nRolling score: ${fmt1(rolling)}\n\nExplain what this test means in plain language, what low vs high typically looks like, and give me 2 script-ready actions I can run this week to improve it.`
              );
              setShowArchyChat(true);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <MessageSquare className="w-4 h-4" />
            Ask Archy about {meta.label}
          </button>
        </div>
      </div>
    );
  };

  const scrollToTest = (testKey) => {
    const el = document.getElementById(`test-${testKey}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const ConstraintCard = ({ testKey, score }) => {
    const meta = TEST_META[testKey] || { label: keyToLabel(testKey), blurb: '', what: '—', why: '—' };
    const visual = TEST_VISUALS[testKey] || { Icon: Activity, color: '#2563eb' };
    const Icon = visual.Icon;
    const color = visual.color;
    const actions = CONSTRAINT_ACTIONS[testKey] || null;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{meta.label}</div>
              <div className="text-xs text-gray-500">{meta.blurb}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Score</div>
            <div className="text-2xl font-bold leading-none" style={{ color }}>{fmt1(score)}</div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-700 leading-relaxed">
          <span className="font-semibold text-gray-900">Why this is constraining:</span>{' '}
          {actions?.why_concerning || meta.why}
        </div>

        <div className="mt-3 text-sm text-gray-700 leading-relaxed">
          <span className="font-semibold text-gray-900">Try this week:</span>{' '}
          {actions?.try_this_week || 'Run one small experiment to improve this score.'}
        </div>

        {actions?.micro_script ? (
          <div className="mt-2 text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">Micro-script:</span>{' '}
            <span className="italic">{actions.micro_script}</span>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => scrollToTest(testKey)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            See full chart →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AliHeader active="reports" email={email} isSuperAdminUser={isSuperAdminUser} onNavigate={handleNavigate} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Zones</h1>
            <p className="text-gray-600">A complete guide to the four zones and the seven primary tests that drive them.</p>
            {liveDashboardError ? <p className="text-xs text-red-600 mt-1">(live data unavailable: {liveDashboardError})</p> : null}
          </div>
          <button
            onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Current zone + evidence + first move (top of the page) */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Zone (no duplicated evidence) */}
            <div
              className="rounded-xl border p-6 h-full"
              style={{ backgroundColor: 'rgba(249,115,22,0.10)', borderColor: 'rgba(249,115,22,0.50)' }}
            >
              <div className="text-xs text-black/[0.38] uppercase tracking-wide">Current Zone</div>

              <div className="mt-2">
                <div className="text-4xl font-bold leading-tight" style={{ color: zoneInfo.color }}>
                  {zone || '—'}
                </div>
                <div className="mt-4">
                  <div className="text-xs text-black/[0.38] uppercase tracking-wide">ALI score</div>
                  <div className="text-5xl font-bold text-black/[0.87] leading-none mt-1">{fmt1(aliScore)}</div>
                  <div className="text-sm text-black/[0.6] mt-3">
                    Based on {typeof respCount === 'number' ? respCount : '—'} response(s).
                    {band?.range ? <span className="text-black/[0.38]"> • {band.range}</span> : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-black/[0.12] space-y-3">
                <div className="text-sm font-semibold text-black/[0.87]">
                  What {zone || 'this zone'} means (and why you’re here)
                </div>

                {band?.zone ? (
                  <div className="text-sm text-black/[0.6] leading-relaxed">
                    Your ALI score is <span className="font-semibold text-black/[0.87]">{fmt1(aliScore)}</span>, which places you in the{' '}
                    <span className="font-semibold text-black/[0.87]">{band.zone}</span> band ({band.range}). In plain language,{' '}
                    <span className="font-semibold text-black/[0.87]">{zoneInfo.meaning}</span>
                  </div>
                ) : (
                  <div className="text-sm text-black/[0.6] leading-relaxed">
                    We’ll show a score-based explanation once your score is available.
                  </div>
                )}

                {(evidence.lowestPatterns || []).length ? (
                  <div className="text-sm text-black/[0.6] leading-relaxed">
                    What’s driving this most right now are your lowest tests:{' '}
                    <span className="font-semibold text-black/[0.87]">
                      {keyToLabel(evidence.lowestPatterns[0].key)} ({evidence.lowestPatterns[0].value.toFixed(1)})
                    </span>
                    {evidence.lowestPatterns[1]
                      ? (
                        <>
                          {' '}and{' '}
                          <span className="font-semibold text-black/[0.87]">
                            {keyToLabel(evidence.lowestPatterns[1].key)} ({evidence.lowestPatterns[1].value.toFixed(1)})
                          </span>
                          .
                        </>
                      )
                      : '.'}
                    {' '}Improving these tends to move the overall zone the fastest.
                  </div>
                ) : null}
              </div>
            </div>

            {/* Constraints */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Two constraints driving your zone</div>
                    <div className="text-xs text-gray-600 mt-1">
                      These are your lowest-scoring tests. Improving them is usually the fastest way to move the overall system.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {(evidence.lowestPatterns || []).length ? (
                    evidence.lowestPatterns.map((p) => (
                      <ConstraintCard key={p.key} testKey={p.key} score={p.value} />
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">Constraints will appear once your scores are available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Suggested first move (standalone, directly beneath hero) */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-1">Suggested first move</div>
                <div className="text-xs text-gray-600">A concrete experiment + script you can run this week based on your data.</div>
              </div>
            </div>

            <div className="mt-4">
              {zoneRecoLoading ? (
                <div className="text-sm text-gray-700">Generating a specific first move…</div>
              ) : zoneRecoError ? (
                <div className="text-sm text-red-700">Couldn’t generate a recommendation yet.</div>
              ) : zoneReco ? (
                <div className="space-y-3 text-sm text-gray-800">
                  <div className="text-lg font-semibold text-gray-900">{zoneReco.title}</div>
                  <div><span className="font-semibold">Behavior experiment:</span> {zoneReco.behavior_experiment}</div>
                  <div><span className="font-semibold">Team script:</span> {zoneReco.team_script}</div>
                  <div><span className="font-semibold">Watch for:</span> {zoneReco.watch_for}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-700">—</div>
              )}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  const lowest = evidence.lowestPatterns?.length
                    ? evidence.lowestPatterns.map((p) => `${keyToLabel(p.key)} (${p.value.toFixed(1)})`).join(', ')
                    : 'unknown';
                  setArchyInitialMessage(
                    `I'm looking at my ALI Zones guide.\n\nCurrent zone: ${zone}\nALI score: ${fmt1(aliScore)}\nLowest tests (constraints): ${lowest}\nResponses: ${typeof respCount === 'number' ? respCount : 'unknown'}\n\nExplain (1) why this zone happens in plain language, (2) what my data suggests is driving it, and (3) give me 2 additional script-ready options that specifically target the two lowest tests.`
                  );
                  setShowArchyChat(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4" />
                Ask Archy
              </button>

              <div className="text-xs text-gray-600">Best results once you have 10+ responses and multiple quarters.</div>
            </div>
          </div>
        </section>

        {/* How zones work */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-gray-900">How zones work</div>
              <div className="text-sm text-gray-700 leading-relaxed mt-1">
                Your <span className="font-semibold text-gray-900">ALI score</span> summarizes the seven primary tests below. Your zone is determined by
                your ALI score (rolling score when available; otherwise current).
              </div>
              <div className="text-sm text-gray-700 leading-relaxed mt-2">
                <span className="font-semibold text-gray-900">Why we call them zones:</span> We group your overall score into simple “zones” because
                it’s easier to understand a leadership environment as a range (healthy → warning → high risk) than as a single number. Your zone is a
                quick read on “where things are right now,” and the tests below show what’s driving it.
              </div>
            </div>
          </div>
        </div>

        {/* All zones */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">All zones</div>
              <div className="text-sm text-gray-600 mt-1">
                Zones are score bands. They tell you what kind of leadership environment your team is experiencing right now.
              </div>
            </div>
            <div className="text-sm text-gray-700">
              Your current zone:{' '}
              <span className="font-semibold" style={{ color: zoneInfo.color }}>
                {zoneInfo.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
            {ZONE_GUIDE.map((z) => {
              const zi = getZoneInfo(z.key);
              const isCurrent = zi.key === zoneInfo.key;
              return (
                <div key={z.key} className="rounded-xl border p-5" style={{ backgroundColor: z.bg, borderColor: z.border }}>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold" style={{ color: zi.color }}>
                      {zi.label}
                    </div>
                    {isCurrent ? (
                      <div className="text-xs font-semibold px-2 py-1 rounded-full bg-white/70 border border-black/[0.12]">
                        You are here
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Range: {z.range}</div>
                  <div className="text-sm text-gray-800 leading-relaxed mt-3">{zi.meaning}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Primary tests (granular charts) */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Primary tests (what we measure)</div>
              <div className="text-sm text-gray-600 mt-1">
                These are the seven tests that roll up into your ALI score and ultimately drive your zone.
              </div>
            </div>
            <div className="text-xs text-gray-500">Scores are 0–100.</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {TEST_ORDER.map((k) => (
              <TestCard key={k} testKey={k} />
            ))}
          </div>
        </section>
      </main>
      <AliFooter />

      {/* Archy Chat Floating Button */}
      <button
        onClick={() => {
          setArchyInitialMessage(null);
          setShowArchyChat(!showArchyChat);
        }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-[#FF6B35] shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center overflow-hidden"
        aria-label="Chat with Archy about your Zones guide"
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

      {/* Archy Chat Overlay */}
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
                  context="ali-reports-zones"
                  initialMessage={
                    archyInitialMessage ||
                    "I'm looking at my ALI Zones guide. Help me understand what my zone means and what to do next."
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

