/**
 * ALI results screen (instrument v3). Replaces the old dashboard.
 *
 * Reads GET /api/ali/results (signed-in company only). Shows combined numbers
 * only: no per-person data, no sample numbers. Top to bottom:
 *   1. round status (or a waiting / welcome state)
 *   2. one plain headline
 *   3. the Mirror (team and leader side by side), then Trust and Commitment
 *   4. one focus for this round
 *   5. patterns, if any
 *   6. all conditions as sorted bars with a word band
 *   7. change since last round (round 2 on)
 *   8. round picker (several rounds)
 *   9. how this works
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Minus, MessageCircle } from 'lucide-react';
import AliArchyDrawer from '../../components/ali/AliArchyDrawer';
import AliHeader from '../../components/ali/AliHeader';
import AliFooter from '../../components/ali/AliFooter';
import { OptimizedImage } from '../../components/OptimizedImage';
import { buildAliResultsSnapshot } from '../../lib/ali/archyContextPayload';
import { getAliSessionEmail, setAliSessionEmail } from '../../lib/magicLinkBrowserSession';
import {
  CONDITION_KEYS,
  RESULT_KEYS,
  CONDITION_LABELS,
  CONDITION_DESCRIPTIONS,
} from '../../../lib/ali-conditions.js';
import { SOLID_READ_MIN_TEAM } from '../../../lib/ali-v3-scoring.js';
import {
  BAND_MIXED_MIN,
  BAND_STRONG_MIN,
  answeredText,
  bandFor,
  buildHeadline,
  directionText,
  driftText,
  hasDrift,
  mirrorRows,
  patternCards,
  pickFocus,
  roundStatusLine,
  screenState,
  sortedByTeam,
} from '../../lib/ali/resultsModel';
import { guidanceFor } from '../../lib/ali/conditionGuidance';

const pct = (n) => `${Math.max(0, Math.min(100, n))}%`;

function Section({ title, children, id }) {
  return (
    <section className="mb-10" aria-labelledby={id}>
      {title && (
        <h2 id={id} className="text-lg font-semibold text-gray-900 mb-3">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

/** One Mirror row: a 0 to 100 line, team dot, leader dot, gap shaded between them. */
function MirrorRow({ row }) {
  const hasLeader = row.leader !== null;
  const lo = hasLeader ? Math.min(row.team, row.leader) : row.team;
  const hi = hasLeader ? Math.max(row.team, row.leader) : row.team;
  return (
    <li className="py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-2">
        <span className="font-semibold text-gray-900">{row.label}</span>
        <span className="text-sm text-gray-700">
          Team {row.team}
          {hasLeader && <> · You {row.leader}</>}
        </span>
      </div>
      <div className="relative h-6" aria-hidden="true">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded bg-gray-200" />
        {hasLeader && hi > lo && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 rounded bg-blue-100"
            style={{ left: pct(lo), width: pct(hi - lo) }}
          />
        )}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900 ring-2 ring-white"
          style={{ left: pct(row.team) }}
          title={`Team ${row.team}`}
        />
        {hasLeader && (
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-blue-600 bg-white"
            style={{ left: pct(row.leader) }}
            title={`You ${row.leader}`}
          />
        )}
      </div>
      {hasLeader && row.direction && (
        <p className="text-sm text-gray-600 mt-1">
          {directionText(row.direction)}
          {row.direction !== 'in_agreement' && row.gap !== null && ` (${Math.abs(row.gap)} points apart)`}
        </p>
      )}
    </li>
  );
}

function MirrorLegend({ showLeader }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600 mb-2">
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full bg-gray-900" aria-hidden="true" />
        Your team
      </span>
      {showLeader && (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-[3px] border-blue-600 bg-white" aria-hidden="true" />
          You
        </span>
      )}
      <span>0 to 100, higher is better</span>
    </div>
  );
}

function ScoreBar({ label, score, sub }) {
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-gray-900">{label}</span>
        <span className="text-sm text-gray-700 whitespace-nowrap">
          {score}
          {sub && <span className="text-gray-500"> · {sub}</span>}
        </span>
      </div>
      <div className="h-2 rounded bg-gray-100" aria-hidden="true">
        <div className="h-2 rounded bg-blue-600" style={{ width: pct(score) }} />
      </div>
    </li>
  );
}

function SignedOut({ onNavigate }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Please sign in</h1>
      <p className="text-gray-600 mb-4">Sign in with the link we email you to see your results.</p>
      <button
        type="button"
        onClick={() => onNavigate('/ali/login')}
        className="min-h-[44px] px-5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
      >
        Go to sign in
      </button>
    </div>
  );
}

const ALIDashboard = () => {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showArchy, setShowArchy] = useState(false);
  const [archyMessage, setArchyMessage] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const email = (emailParam || getAliSessionEmail() || '').toString().toLowerCase().trim();
  const isSuperAdminUser = !!email && email.endsWith('@archetypeoriginal.com');

  const withEmail = (path) => {
    if (!email || !path || path.includes('email=')) return path;
    return `${path}${path.includes('?') ? '&' : '?'}email=${encodeURIComponent(email)}`;
  };

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    if (!emailParam) return;
    try {
      if (email) setAliSessionEmail(email);
    } catch {
      // ignore
    }
  }, [emailParam, email]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError('');
      setSignedOut(false);
      try {
        const qs = selectedRound ? `?round=${encodeURIComponent(selectedRound)}` : '';
        const resp = await fetch(`/api/ali/results${qs}`, { credentials: 'include' });
        const json = await resp.json().catch(() => null);
        if (!alive) return;
        if (resp.status === 401) {
          setSignedOut(true);
          setPayload(null);
          return;
        }
        if (!resp.ok || !json || json.ok === false) {
          throw new Error((json && json.error) || 'Could not load results.');
        }
        setPayload(json);
      } catch (err) {
        if (!alive) return;
        setPayload(null);
        setError('We could not load your results right now.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [selectedRound, reloadKey]);

  const state = loading ? 'loading' : signedOut ? 'signed_out' : error ? 'error' : screenState(payload);
  const conditions = payload?.conditions || [];
  const focusKey = state === 'ready' ? pickFocus(conditions) : null;

  const getArchyContextPayload = useCallback(
    () => buildAliResultsSnapshot(payload, { focus: focusKey ? CONDITION_LABELS[focusKey] : undefined }),
    [payload, focusKey]
  );

  const openArchy = (message) => {
    setArchyMessage(message || null);
    setShowArchy(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AliHeader active="dashboard" email={email} isSuperAdminUser={isSuperAdminUser} onNavigate={handleNavigate} />

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        {state === 'loading' && (
          <p className="text-gray-600" role="status">
            Loading your results...
          </p>
        )}

        {state === 'signed_out' && <SignedOut onNavigate={handleNavigate} />}

        {state === 'error' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6" role="alert">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Results</h1>
            <p className="text-gray-700 mb-4">{error || 'We could not load your results right now.'} Please try again.</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="min-h-[44px] px-5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        )}

        {state === 'welcome' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ALI</h1>
            <p className="text-gray-700 mb-2">
              ALI shows you how your team experiences your leadership, and how that compares with how you see yourself.
            </p>
            <p className="text-gray-700 mb-5">
              Start your first round to get going. You will get a link for your team and a separate link for your own survey.
              It takes about four minutes to answer.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate(withEmail('/ali/deploy'))}
              className="min-h-[44px] w-full sm:w-auto px-5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Send your first survey
            </button>
          </div>
        )}

        {(state === 'ready' || state === 'waiting') && payload && (
          <ResultsBody
            payload={payload}
            state={state}
            focusKey={focusKey}
            onNavigate={(p) => handleNavigate(withEmail(p))}
            onPickRound={(n) => setSelectedRound(n)}
            onAskArchy={openArchy}
          />
        )}

        <HowThisWorks />
      </main>

      <AliFooter />

      <button
        type="button"
        onClick={() => {
          setArchyMessage(null);
          setShowArchy(!showArchy);
        }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-[#FF6B35] shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center overflow-hidden"
        aria-label="Ask Archy about your results"
      >
        <OptimizedImage
          src="/images/archy-avatar.png"
          alt="Archy"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </button>

      <AliArchyDrawer
        open={showArchy}
        onClose={() => setShowArchy(false)}
        context="ali-dashboard"
        initialMessage={
          archyMessage || "I'm looking at my ALI results. Can you help me understand what I'm seeing and what to do next?"
        }
        getContextPayload={getArchyContextPayload}
      />
    </div>
  );
};

function RoundPicker({ payload, onPickRound }) {
  const rounds = Array.isArray(payload.rounds) ? payload.rounds : [];
  if (rounds.length < 2) return null;
  const statusWord = { open: 'open', closed: 'closed', not_open: 'not open yet' };
  return (
    <div className="mt-3">
      <label htmlFor="ali-round-picker" className="text-sm text-gray-700 mr-2">
        Show round
      </label>
      <select
        id="ali-round-picker"
        value={payload.round?.number ?? ''}
        onChange={(e) => onPickRound(parseInt(e.target.value, 10))}
        className="min-h-[44px] px-3 border border-gray-300 rounded-lg bg-white text-gray-900"
      >
        {rounds.map((r) => (
          <option key={r.number} value={r.number}>
            Round {r.number} ({statusWord[r.status] || r.status})
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusLine({ payload, state }) {
  const pieces = [roundStatusLine(payload.round), answeredText(payload.teamResponses)];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-700">
      <span>{pieces.filter(Boolean).join(' · ')}</span>
      {state === 'ready' && payload.confidence?.label && (
        <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 px-3 py-1 font-medium">
          {payload.confidence.label}
        </span>
      )}
    </div>
  );
}

function LeaderSurveyNote({ payload, onNavigate }) {
  if (payload.leaderAnswered) {
    return <p className="text-gray-700">You have taken your own survey for this round.</p>;
  }
  if (payload.round?.status === 'closed') {
    return <p className="text-gray-700">You did not take your own survey this round, so there is no side by side view of your answers.</p>;
  }
  return (
    <div>
      <p className="text-gray-700 mb-3">
        You have not taken your own survey yet. Your answers are what your team's answers are compared with, so take it
        before the round closes.
      </p>
      <button
        type="button"
        onClick={() => onNavigate('/ali/deploy')}
        className="min-h-[44px] px-5 rounded-lg border border-blue-600 text-blue-700 font-semibold hover:bg-blue-50"
      >
        Get your leader link
      </button>
    </div>
  );
}

function WaitingState({ payload, onNavigate }) {
  const needed = payload.needed || 5;
  const count = payload.teamResponses || 0;
  const closed = payload.round?.status === 'closed';
  let detail;
  if (payload.reason === 'round_open') {
    detail = `You have enough answers. Results appear here as soon as the round closes.`;
  } else if (closed) {
    detail = `This round closed with ${count} team ${count === 1 ? 'answer' : 'answers'}. At least ${needed} are needed so nobody's answers can be picked out. Start a new round to try again.`;
  } else {
    detail = `So far ${count} of the ${needed} needed have answered.`;
  }
  const own = payload.leaderOwn && payload.leaderOwn.answered ? payload.leaderOwn : null;
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Your results are on the way</h2>
        <p className="text-gray-700 mb-2">
          Results appear when the round closes and at least {needed} team members have answered.
        </p>
        <p className="text-gray-700 mb-5">{detail}</p>
        {closed && payload.reason !== 'round_open' && (
          <button
            type="button"
            onClick={() => onNavigate('/ali/deploy')}
            className="min-h-[44px] mb-5 px-5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Send survey
          </button>
        )}
        <LeaderSurveyNote payload={payload} onNavigate={onNavigate} />
      </div>

      {own && Array.isArray(own.conditions) && (
        <Section title="Your own answers" id="ali-own-answers">
          <p className="text-sm text-gray-600 mb-3">
            How you rated each condition. Your team's view appears beside these once results are ready.
          </p>
          <ul className="bg-white border border-gray-200 rounded-lg px-4 py-2">
            {own.conditions
              .filter((c) => typeof c.score === 'number')
              .map((c) => (
                <ScoreBar key={c.key} label={c.label || CONDITION_LABELS[c.key]} score={c.score} />
              ))}
          </ul>
        </Section>
      )}
    </>
  );
}

function ResultsBody({ payload, state, focusKey, onNavigate, onPickRound, onAskArchy }) {
  const conditions = payload.conditions || [];
  const results = payload.results || [];
  const headline = useMemo(() => (state === 'ready' ? buildHeadline(conditions) : ''), [state, conditions]);
  const condRows = mirrorRows(conditions, payload.mirror, CONDITION_KEYS);
  const resultRows = mirrorRows(results, payload.mirror, RESULT_KEYS);
  const showLeader = condRows.some((r) => r.leader !== null);
  const patterns = patternCards(payload.patterns);
  const bars = sortedByTeam(conditions);
  const drift = hasDrift(payload.drift) ? payload.drift.filter((d) => typeof d.change === 'number') : null;

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Results</h1>
        <StatusLine payload={payload} state={state} />
        <RoundPicker payload={payload} onPickRound={onPickRound} />
      </header>

      {state === 'waiting' && <WaitingState payload={payload} onNavigate={onNavigate} />}

      {state === 'ready' && (
        <>
          {headline && <p className="text-xl text-gray-900 leading-relaxed mb-8">{headline}</p>}

          <Section title="How your team sees you, next to how you see yourself" id="ali-mirror">
            {!showLeader && (
              <p className="text-sm text-gray-600 mb-3">
                You did not take your own survey this round, so only your team's view is shown.
              </p>
            )}
            <MirrorLegend showLeader={showLeader} />
            <ul className="bg-white border border-gray-200 rounded-lg px-4">
              {condRows.map((row) => (
                <MirrorRow key={row.key} row={row} />
              ))}
            </ul>
            {resultRows.length > 0 && (
              <>
                <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">What it produces</h3>
                <ul className="bg-white border border-gray-200 rounded-lg px-4">
                  {resultRows.map((row) => (
                    <MirrorRow key={row.key} row={row} />
                  ))}
                </ul>
              </>
            )}
          </Section>

          {focusKey && <FocusCard focusKey={focusKey} onAskArchy={onAskArchy} onNavigate={onNavigate} />}

          {patterns.length > 0 && (
            <Section title="Worth noticing" id="ali-patterns">
              <ul className="space-y-3">
                {patterns.map((p) => (
                  <li key={p.key} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900">{p.title}</div>
                    <p className="text-gray-700 mt-1">{p.text}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="All seven conditions, strongest first" id="ali-bars">
            <p className="text-sm text-gray-600 mb-3">
              Your team's score. Strong is {BAND_STRONG_MIN} and up, Mixed is {BAND_MIXED_MIN} to {BAND_STRONG_MIN - 1}, Weak
              is below {BAND_MIXED_MIN}. These cut points are early and may be adjusted as more teams take ALI.
            </p>
            <ul className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              {bars.map((c) => (
                <ScoreBar key={c.key} label={c.label} score={c.team} sub={bandFor(c.team)?.label} />
              ))}
            </ul>
          </Section>

          {drift && (
            <Section title="Since last round" id="ali-drift">
              <ul className="bg-white border border-gray-200 rounded-lg px-4 divide-y divide-gray-100">
                {drift.map((d) => {
                  const Icon = d.change > 0 ? ArrowUp : d.change < 0 ? ArrowDown : Minus;
                  return (
                    <li key={d.key} className="py-3 flex items-center justify-between gap-3">
                      <span className="text-gray-900">{d.label || CONDITION_LABELS[d.key]}</span>
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        {driftText(d.change)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </>
      )}
    </>
  );
}

function FocusCard({ focusKey, onAskArchy, onNavigate }) {
  const label = CONDITION_LABELS[focusKey];
  const guidance = guidanceFor(focusKey);
  return (
    <Section title="One focus for this round" id="ali-focus">
      <div className="bg-white border-2 border-blue-600 rounded-lg p-5">
        <div className="text-xl font-semibold text-gray-900 mb-1">{label}</div>
        <p className="text-gray-700 mb-4">{CONDITION_DESCRIPTIONS[focusKey]}</p>
        {guidance && (
          <>
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-900 mb-1">Try this week</div>
              <p className="text-gray-700">{guidance.tryThis}</p>
            </div>
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-900 mb-1">Say this to your team</div>
              <p className="text-gray-700">{guidance.sayThis}</p>
            </div>
          </>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() =>
              onAskArchy(
                `My team scored ${label} lowest in my ALI results this round. Help me understand what that might mean and how to start improving it.`
              )
            }
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Ask Archy about {label}
          </button>
          {guidance?.journal && (
            <a
              href={guidance.journal}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(guidance.journal);
              }}
              className="min-h-[44px] inline-flex items-center justify-center px-5 rounded-lg border border-gray-300 text-gray-900 font-semibold hover:bg-gray-50"
            >
              Read more on {label}
            </a>
          )}
        </div>
      </div>
    </Section>
  );
}

function HowThisWorks() {
  return (
    <details className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
      <summary className="cursor-pointer min-h-[44px] flex items-center font-semibold text-gray-900">How this works</summary>
      <div className="mt-3 space-y-3 text-gray-700">
        <p>
          Each question is answered from Strongly disagree to Strongly agree. Each answer becomes a number from 0 to 100,
          and each condition's score is the average across its questions and your team. Higher is always better.
        </p>
        <p>
          Your team's results only appear once at least five team members have answered. That way nobody's answers can be
          picked out. Your own answers do not count toward the five.
        </p>
        <p>
          Results wait until the round closes, so nobody can watch the numbers move as each person answers and work out
          who said what.
        </p>
        <p>
          Each round asks the same ideas in slightly different words, in a different order, so people answer what they see
          today rather than from memory. Scores stay comparable from round to round.
        </p>
        <p>
          An early read means fewer than {SOLID_READ_MIN_TEAM} team members answered. Treat it as a first look. A solid
          read has {SOLID_READ_MIN_TEAM} or more.
        </p>
      </div>
    </details>
  );
}

export default ALIDashboard;
