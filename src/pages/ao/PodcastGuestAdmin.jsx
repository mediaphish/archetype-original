/**
 * Bart's guest prep page — AO auth required.
 */
import React, { useCallback, useEffect, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import PodcastGuestSubmissionContent from '../../components/podcast/PodcastGuestSubmissionContent';

function navigateTo(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function formatTimestamp(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function QuestionSet({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg text-gray-900">{title}</h3>
      <ol className="space-y-4">
        {items.map((item, i) => (
          <li key={`${title}-${i}`} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="font-medium text-gray-900">{item.question}</p>
            {item.why && <p className="mt-2 text-sm text-gray-600">{item.why}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function PodcastGuestAdmin() {
  const guestId = window.location.pathname.replace('/ao/podcast/guest/', '').replace(/\/$/, '');
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [magicStatus, setMagicStatus] = useState({ loading: false, message: '', error: '' });
  const [researchStatus, setResearchStatus] = useState({ loading: false, error: '' });
  const [questionsStatus, setQuestionsStatus] = useState({ loading: false, error: '' });

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
      } catch {
        window.location.replace('/ao/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadGuest = useCallback(async () => {
    if (!guestId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ao/podcast/guest?id=${encodeURIComponent(guestId)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load guest');
      setGuest(json.guest);
    } catch (e) {
      setError(e.message || 'Could not load guest');
      setGuest(null);
    } finally {
      setLoading(false);
    }
  }, [guestId]);

  useEffect(() => {
    if (!authChecked || !guestId) return;
    loadGuest();
  }, [authChecked, guestId, loadGuest]);

  const sendMagicLink = async () => {
    setMagicStatus({ loading: true, message: '', error: '' });
    try {
      const res = await fetch('/api/ao/podcast/guest-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not send magic link');
      setMagicStatus({ loading: false, message: 'Magic link sent to guest.', error: '' });
    } catch (e) {
      setMagicStatus({ loading: false, message: '', error: e.message || 'Could not send magic link' });
    }
  };

  const runResearch = async (regenerate = false) => {
    setResearchStatus({ loading: true, error: '' });
    try {
      const res = await fetch('/api/ao/podcast/guest-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId, regenerate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Research failed');
      setGuest(json.guest);
    } catch (e) {
      setResearchStatus({ loading: false, error: e.message || 'Research failed' });
      return;
    }
    setResearchStatus({ loading: false, error: '' });
  };

  const runQuestions = async (regenerate = false) => {
    setQuestionsStatus({ loading: true, error: '' });
    try {
      const res = await fetch('/api/ao/podcast/guest-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId, regenerate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Question generation failed');
      setGuest(json.guest);
    } catch (e) {
      setQuestionsStatus({ loading: false, error: e.message || 'Question generation failed' });
      return;
    }
    setQuestionsStatus({ loading: false, error: '' });
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="podcast" email={email} onNavigate={navigateTo} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {loading && <p className="text-sm text-gray-500">Loading guest…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {guest && (
          <div className="space-y-8">
            <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-xl text-gray-900">Guest record</h2>
                <button
                  type="button"
                  onClick={sendMagicLink}
                  disabled={magicStatus.loading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {magicStatus.loading ? 'Sending…' : 'Email guest their page link'}
                </button>
              </div>
              {magicStatus.message && <p className="mb-4 text-sm text-green-700">{magicStatus.message}</p>}
              {magicStatus.error && <p className="mb-4 text-sm text-red-600">{magicStatus.error}</p>}
              <PodcastGuestSubmissionContent guest={guest} showAdminFields />
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl text-gray-900">AI research brief</h2>
                  {guest.research_generated_at && (
                    <p className="mt-1 text-xs text-gray-500">
                      Generated {formatTimestamp(guest.research_generated_at)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!guest.research_brief ? (
                    <button
                      type="button"
                      onClick={() => runResearch(false)}
                      disabled={researchStatus.loading}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {researchStatus.loading ? 'Generating…' : 'Generate research'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => runResearch(true)}
                      disabled={researchStatus.loading}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {researchStatus.loading ? 'Regenerating…' : 'Regenerate'}
                    </button>
                  )}
                </div>
              </div>
              {researchStatus.error && <p className="mb-4 text-sm text-red-600">{researchStatus.error}</p>}
              {guest.research_brief ? (
                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                  {guest.research_brief}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No research yet. Generate a brief from the guest&apos;s intake and public web sources.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl text-gray-900">Suggested questions</h2>
                  {guest.questions_generated_at && (
                    <p className="mt-1 text-xs text-gray-500">
                      Generated {formatTimestamp(guest.questions_generated_at)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!guest.suggested_questions ? (
                    <button
                      type="button"
                      onClick={() => runQuestions(false)}
                      disabled={questionsStatus.loading || !guest.research_brief}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {questionsStatus.loading ? 'Generating…' : 'Generate questions'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => runQuestions(true)}
                      disabled={questionsStatus.loading}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {questionsStatus.loading ? 'Regenerating…' : 'Regenerate'}
                    </button>
                  )}
                </div>
              </div>
              {questionsStatus.error && <p className="mb-4 text-sm text-red-600">{questionsStatus.error}</p>}
              {guest.suggested_questions ? (
                <div className="space-y-8">
                  <QuestionSet
                    title="Person-specific"
                    items={guest.suggested_questions.person_specific}
                  />
                  <QuestionSet
                    title="AO theology connections"
                    items={guest.suggested_questions.ao_theology}
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {guest.research_brief
                    ? 'Generate interview questions from the research brief.'
                    : 'Generate research first, then questions.'}
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
