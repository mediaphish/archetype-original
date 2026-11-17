import React, { useEffect, useState } from 'react';
import { getAliSessionEmail, setAliSessionEmail } from '../../lib/magicLinkBrowserSession';

// Deploy page: start a survey round. Each round has two links:
//  - the team link, to share with the team;
//  - the leader link, for the leader only, shown only to the account owner.

const DEFAULT_ROUND_DAYS = 14;

function isoDay(date) {
  return date.toISOString().split('T')[0];
}
function defaultCloseDay() {
  return isoDay(new Date(Date.now() + DEFAULT_ROUND_DAYS * 24 * 60 * 60 * 1000));
}

const STATUS_LABEL = { open: 'Open', closed: 'Closed', not_open: 'Not open yet' };

const CopyRow = ({ label, help, url }) => {
  const [feedback, setFeedback] = useState('');
  const copy = () => {
    navigator.clipboard.writeText(url).then(
      () => {
        setFeedback('Copied');
        setTimeout(() => setFeedback(''), 2000);
      },
      () => {
        setFeedback('Copy failed. Select the link and copy it by hand.');
        setTimeout(() => setFeedback(''), 4000);
      }
    );
  };
  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-gray-900">{label}</div>
      {help && <div className="text-xs text-gray-600 mb-2">{help}</div>}
      <div className="bg-white rounded border border-gray-200 p-3 mb-2 font-mono text-sm break-all text-gray-900">{url}</div>
      <button
        type="button"
        onClick={copy}
        className="min-h-[44px] w-full sm:w-auto px-5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
      >
        {feedback || 'Copy link'}
      </button>
    </div>
  );
};

const ALIDeploy = () => {
  const [nextSurvey, setNextSurvey] = useState({
    index: '—',
    availableOn: '—',
    baselineDate: '—',
    canDeploy: false,
    reason: null
  });
  const [loadingNext, setLoadingNext] = useState(true);
  const [closeDay, setCloseDay] = useState(defaultCloseDay());
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const [deployNeedsBilling, setDeployNeedsBilling] = useState(false);
  const [created, setCreated] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [roundsError, setRoundsError] = useState('');
  const [linksFor, setLinksFor] = useState(null);
  const [actionError, setActionError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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

  useEffect(() => {
    async function loadNext() {
      setLoadingNext(true);
      if (!email) {
        setNextSurvey((s) => ({ ...s, canDeploy: false, reason: 'Please sign in again from the email link.' }));
        setLoadingNext(false);
        return;
      }
      try {
        const r = await fetch('/api/ali/deploy/next', { credentials: 'include' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setNextSurvey((s) => ({ ...s, canDeploy: false, reason: j?.error || 'Could not load the next round.' }));
          return;
        }
        setNextSurvey({
          index: j.next_survey_index || '—',
          availableOn: j.available_on || '—',
          baselineDate: j.baseline_date || '—',
          canDeploy: !!j.can_deploy,
          reason: j.reason || null
        });
      } catch (e) {
        setNextSurvey((s) => ({ ...s, canDeploy: false, reason: 'Could not load the next round. Please try again.' }));
      } finally {
        setLoadingNext(false);
      }
    }
    loadNext();
  }, [email, reloadKey]);

  useEffect(() => {
    async function loadRounds() {
      if (!email) return;
      setLoadingRounds(true);
      setRoundsError('');
      try {
        const r = await fetch('/api/ali/deployments', { credentials: 'include' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setRoundsError(j?.error || 'Could not load your rounds.');
          setRounds([]);
          return;
        }
        setIsOwner(!!j.isAccountOwner);
        setRounds((j.deployments || []).filter((d) => d.isV3));
      } catch (e) {
        setRoundsError('Could not load your rounds. Please try again.');
        setRounds([]);
      } finally {
        setLoadingRounds(false);
      }
    }
    loadRounds();
  }, [email, reloadKey]);

  const linkFor = (token) => (token ? `${window.location.origin}/ali/survey/${token}` : '');

  const handleStartRound = async () => {
    setDeployError('');
    setDeployNeedsBilling(false);
    setCreated(null);
    setDeploying(true);
    try {
      const r = await fetch('/api/ali/deploy-survey', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closesAt: closeDay, divisionId: null })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setDeployError(j?.error || 'Could not start the round.');
        setDeployNeedsBilling(Boolean(j?.billing));
        return;
      }
      setCreated(j.deployment || null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setDeployError('Could not start the round. Please check your connection and try again.');
    } finally {
      setDeploying(false);
    }
  };

  const roundAction = async (deploymentId, body) => {
    setActionError('');
    try {
      const r = await fetch('/api/ali/deployments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deploymentId, ...body })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setActionError(j?.error || 'That did not work. Please try again.');
        return false;
      }
      setReloadKey((k) => k + 1);
      return true;
    } catch (e) {
      setActionError('That did not work. Please check your connection and try again.');
      return false;
    }
  };

  const minCloseDay = isoDay(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const maxCloseDay = isoDay(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto">
              <button onClick={() => handleNavigate(withEmail('/ali/dashboard'))} className="text-gray-600 hover:text-gray-900">
                Dashboard
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/reports'))} className="text-gray-600 hover:text-gray-900">
                Reports
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/deploy'))} className="text-blue-600 font-semibold">
                Deploy
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/settings'))} className="text-gray-600 hover:text-gray-900">
                Settings
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/billing'))} className="text-gray-600 hover:text-gray-900">
                Billing
              </button>
              {isSuperAdminUser && (
                <button
                  onClick={() => handleNavigate(withEmail('/ali/super-admin/overview'))}
                  className="text-[#2563eb] font-semibold hover:text-[#1d4ed8]"
                >
                  Super Admin
                </button>
              )}
              <button onClick={() => handleNavigate('/ali')} className="text-gray-600 hover:text-gray-800">
                Log Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Survey rounds</h1>
          <p className="text-gray-600">
            Each round has a team link to share with your team and a separate leader link for the leader.
            Team results appear after the round closes, once at least five team members have answered.
          </p>
        </div>

        {/* Start a round */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Start a new round</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Next round</div>
              <div className="text-gray-900">{loadingNext ? 'Loading...' : nextSurvey.index.replace(/^S/, 'Round ')}</div>
              {!loadingNext && nextSurvey.reason && <p className="text-sm text-gray-600 mt-1">{nextSurvey.reason}</p>}
            </div>

            <div>
              <label htmlFor="closeDay" className="block text-sm font-medium text-gray-700 mb-1">
                Closes on
              </label>
              <input
                id="closeDay"
                type="date"
                value={closeDay}
                min={minCloseDay}
                max={maxCloseDay}
                onChange={(e) => setCloseDay(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Two weeks from today unless you change it.</p>
            </div>

            {!isOwner && !loadingRounds && (
              <p className="text-sm text-gray-600">Only the account owner can start a round.</p>
            )}

            <button
              onClick={handleStartRound}
              disabled={deploying || loadingNext || !nextSurvey.canDeploy || !isOwner}
              className="min-h-[44px] w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deploying ? 'Starting...' : 'Start round and create links'}
            </button>

            {deployError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {deployError}
                {deployNeedsBilling && (
                  <button
                    type="button"
                    onClick={() => handleNavigate(withEmail('/ali/billing'))}
                    className="block mt-2 min-h-[44px] font-semibold underline text-red-800"
                  >
                    Go to Billing
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {created && (
          <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Round {created.roundNumber} is open</h3>
            <CopyRow label="Team link" help="Share this with your team." url={created.surveyUrl} />
            {created.leaderUrl && (
              <CopyRow
                label="Leader link"
                help="For the leader only. Do not share it with the team. The leader can change their answers until the round closes."
                url={created.leaderUrl}
              />
            )}
          </section>
        )}

        {/* Rounds */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Rounds</h2>

          {(roundsError || actionError) && (
            <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {roundsError || actionError}
            </div>
          )}

          {loadingRounds ? (
            <div className="text-center py-8 text-gray-500">Loading rounds...</div>
          ) : rounds.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No rounds yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rounds.map((d) => (
                <li key={d.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-gray-900">Round {d.roundNumber}</div>
                      <div className="text-sm text-gray-600">
                        {STATUS_LABEL[d.roundStatus] || d.roundStatus}
                        {d.closesAt ? ` · closes ${d.closesAt}` : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        {d.teamResponseCount} team {d.teamResponseCount === 1 ? 'answer' : 'answers'} (5 needed)
                        {' · '}
                        {d.leaderAnswered ? 'leader has answered' : 'leader has not answered yet'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.roundStatus === 'open' && (
                        <button
                          type="button"
                          onClick={() => setLinksFor(linksFor === d.id ? null : d.id)}
                          className="min-h-[44px] px-3 text-sm text-blue-700 font-semibold"
                        >
                          {linksFor === d.id ? 'Hide links' : 'Show links'}
                        </button>
                      )}
                      {isOwner && d.roundStatus === 'open' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Close round ${d.roundNumber} now? Nobody will be able to answer after this.`)) {
                              roundAction(d.id, { action: 'close' });
                            }
                          }}
                          className="min-h-[44px] px-3 text-sm text-gray-700 border border-gray-300 rounded-lg"
                        >
                          Close now
                        </button>
                      )}
                    </div>
                  </div>

                  {linksFor === d.id && (
                    <div className="mt-4">
                      <CopyRow label="Team link" help="Share this with your team." url={linkFor(d.deploymentToken)} />
                      {d.leaderToken && (
                        <CopyRow
                          label="Leader link"
                          help="For the leader only. Do not share it with the team."
                          url={linkFor(d.leaderToken)}
                        />
                      )}
                      {isOwner && (
                        <div className="mt-2">
                          <label htmlFor={`close-${d.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Change the close date
                          </label>
                          <input
                            id={`close-${d.id}`}
                            type="date"
                            defaultValue={d.closesAt || ''}
                            min={minCloseDay}
                            max={maxCloseDay}
                            onChange={(e) => {
                              if (e.target.value) roundAction(d.id, { action: 'set_close_date', closesAt: e.target.value });
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default ALIDeploy;
