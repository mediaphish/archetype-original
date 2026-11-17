import React, { useEffect, useMemo, useState } from 'react';

// ALI survey page (instrument v3).
// The link decides the role (team link or leader link); nobody picks their own role.
// One question at a time, sized for a 375px phone. Team members are never told how
// many others have answered.

const FALLBACK_LABELS = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neither' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
];

function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}
function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {
    /* private mode: fine, the server still guards duplicates per id */
  }
}
function newSubmissionId() {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch (_) {
    /* fall through */
  }
  const bytes = new Uint8Array(16);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function formatDay(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  } catch (_) {
    return '';
  }
}

const Shell = ({ children }) => (
  <div className="min-h-screen bg-gray-50 py-8 px-4">
    <div className="max-w-xl mx-auto">{children}</div>
  </div>
);

const Card = ({ children }) => <div className="bg-white rounded-lg shadow p-5 sm:p-8">{children}</div>;

const ALISurvey = () => {
  const token = useMemo(() => window.location.pathname.split('/').filter(Boolean).pop() || '', []);
  const subKey = `ali_v3_sub_${token}`;
  const doneKey = `ali_v3_done_${token}`;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(-1); // -1 intro, 0..n-1 questions, n review
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) {
        setLoadError('This survey link is incomplete. Please ask for a new link.');
        setLoading(false);
        return;
      }
      try {
        const r = await fetch(`/api/ali/survey/${encodeURIComponent(token)}`);
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) {
          setLoadError(j?.error || 'This survey could not be loaded. Please try again later.');
          return;
        }
        setSurvey(j);
        if (j.role === 'leader' && j.previous_answers && typeof j.previous_answers === 'object') {
          setAnswers(j.previous_answers);
        }
        if (j.role === 'team_member' && storageGet(doneKey) === '1') setDone(true);
      } catch (_) {
        if (alive) setLoadError('This survey could not be loaded. Please check your connection and try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, doneKey]);

  const questions = survey?.questions || [];
  const labels = survey?.answer_labels?.length === 5 ? survey.answer_labels : FALLBACK_LABELS;
  const isLeader = survey?.role === 'leader';
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const unanswered = questions.filter((q) => answers[q.id] === undefined);

  const choose = (qid, value) => {
    setError('');
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    setTimeout(() => setStep((s) => Math.min(s + 1, questions.length)), 180);
  };

  const submit = async () => {
    setError('');
    if (unanswered.length > 0) {
      setError(`Please answer every question. ${unanswered.length === 1 ? 'One question is' : `${unanswered.length} questions are`} still open.`);
      return;
    }
    let submissionId = storageGet(subKey);
    if (!submissionId) {
      submissionId = newSubmissionId();
      storageSet(subKey, submissionId);
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/ali/submit-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, submissionId, answers }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok || j?.duplicate) {
        if (!isLeader) storageSet(doneKey, '1');
        setDoneMessage(j?.duplicate ? 'Your answers were already sent. Thank you.' : j?.message || 'Thank you. Your answers were saved.');
        setDone(true);
        return;
      }
      if (j?.closed) {
        setSurvey((s) => ({ ...s, status: 'closed' }));
        return;
      }
      setError(j?.error || 'Your answers could not be sent. Please try again.');
    } catch (_) {
      setError('Your answers could not be sent. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <Card>
          <p className="text-gray-600 text-center">Loading the survey...</p>
        </Card>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This survey is not available</h1>
          <p className="text-gray-600">{loadError}</p>
        </Card>
      </Shell>
    );
  }

  const company = survey?.company_name || 'your company';

  if (survey?.status === 'closed') {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This survey has closed</h1>
          <p className="text-gray-600">
            Thank you for stopping by. This round of the {company} survey is no longer taking answers.
            If you think you should still be able to answer, please ask the person who sent you the link.
          </p>
        </Card>
      </Shell>
    );
  }

  if (survey?.status === 'not_open') {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This survey is not open yet</h1>
          <p className="text-gray-600">Please come back when the person who sent you the link says it is open.</p>
        </Card>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Thank you</h1>
          <p className="text-gray-600 mb-4">{doneMessage || 'Your answers were already sent. Thank you.'}</p>
          {isLeader ? (
            <p className="text-sm text-gray-500">
              You can open this link again to change your answers until the round closes
              {survey?.closes_at ? ` on ${formatDay(survey.closes_at)}` : ''}.
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Your answers will only ever be shown combined with at least four other people's. Your leader never sees anyone's individual answers.
            </p>
          )}
        </Card>
      </Shell>
    );
  }

  // Intro
  if (step === -1) {
    return (
      <Shell>
        <Card>
          <div className="text-sm font-semibold text-blue-700 mb-2">{company}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isLeader ? 'Your leader survey' : 'Team survey'}
          </h1>
          <p className="text-gray-700 mb-3">
            {questions.length} short statements. It takes about 4 minutes. For each one, choose how much you agree.
          </p>
          {isLeader ? (
            <p className="text-gray-700 mb-3">
              This link is for you as the leader. Your answers are shown next to your team's combined answers so you can see where you and your team see things the same way and where you don't.
              {' '}You can change your answers until the round closes{survey?.closes_at ? ` on ${formatDay(survey.closes_at)}` : ''}.
            </p>
          ) : (
            <p className="text-gray-700 mb-3">
              Your answers are anonymous. They are only ever shown combined with at least four other people's, and your leader never sees anyone's individual answers.
            </p>
          )}
          {survey?.closes_at && !isLeader && (
            <p className="text-sm text-gray-500 mb-6">Open until {formatDay(survey.closes_at)}.</p>
          )}
          <button
            type="button"
            onClick={() => setStep(0)}
            className="w-full min-h-[48px] bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            {isLeader && answeredCount > 0 ? 'Review my answers' : 'Start'}
          </button>
        </Card>
      </Shell>
    );
  }

  const progressPct = Math.round((answeredCount / Math.max(questions.length, 1)) * 100);
  const Progress = () => (
    <div className="mb-4">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{step < questions.length ? `Question ${step + 1} of ${questions.length}` : 'Ready to send'}</span>
        <span>{answeredCount} answered</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden" aria-hidden="true">
        <div className="h-2 bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );

  // Review and send
  if (step >= questions.length) {
    return (
      <Shell>
        <Progress />
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {unanswered.length === 0 ? 'All done. Ready to send?' : 'A few questions still need an answer'}
          </h2>
          {unanswered.length > 0 && (
            <ul className="mb-4 space-y-2">
              {unanswered.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setStep(questions.findIndex((x) => x.id === q.id))}
                    className="text-left text-blue-700 underline min-h-[44px]"
                  >
                    {q.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full min-h-[48px] bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : isLeader ? 'Save my answers' : 'Send my answers'}
          </button>
          <button
            type="button"
            onClick={() => setStep(questions.length - 1)}
            className="w-full min-h-[44px] mt-3 text-gray-700"
          >
            Back
          </button>
        </Card>
      </Shell>
    );
  }

  // One question
  const q = questions[step];
  return (
    <Shell>
      <Progress />
      <Card>
        <h2 id={`q-${q.id}`} className="text-lg sm:text-xl font-semibold text-gray-900 mb-5">
          {q.text}
        </h2>
        <div role="radiogroup" aria-labelledby={`q-${q.id}`} className="flex flex-col gap-2">
          {labels.map((opt) => {
            const selected = answers[q.id] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(q.id, opt.value)}
                className={`w-full min-h-[48px] px-4 rounded-lg border-2 text-left font-medium transition-colors ${
                  selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-900 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between mt-5">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="min-h-[44px] px-3 text-gray-700"
          >
            Back
          </button>
          {answers[q.id] !== undefined && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="min-h-[44px] px-3 text-blue-700 font-semibold"
            >
              Next
            </button>
          )}
        </div>
      </Card>
    </Shell>
  );
};

export default ALISurvey;
