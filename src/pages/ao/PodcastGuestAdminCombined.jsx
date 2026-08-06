/**
 * Combined multi-guest prep page — AO auth required.
 * Route: /ao/podcast/guest-combined/[id1],[id2],...
 * Layout matches podcast-guest-combined-mockup.html (AO brand tokens).
 */
import React, { useCallback, useEffect, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import PodcastGuestSubmissionContent from '../../components/podcast/PodcastGuestSubmissionContent';
import { getTimezoneOptionGroups } from '../../../lib/ao/podcastTimezones.js';
import {
  formatGuestSchedulePrefs,
  localDateTimeToIso,
} from '../../../lib/ao/podcastScheduleUtils.js';
import { CONVERSATION_ARCHITECTURE_BEATS } from '../../components/podcast/conversationArchitecture.js';
import PostRecordingCapture from '../../components/podcast/PostRecordingCapture';

function isoToDateAndTimeParts(iso, timezone) {
  if (!iso) return { date: '', time: '' };
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: '', time: '' };
    const tz = timezone || 'America/Chicago';
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    const timeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const hour = timeParts.find((p) => p.type === 'hour')?.value || '00';
    const minute = timeParts.find((p) => p.type === 'minute')?.value || '00';
    const normalizedHour = hour === '24' ? '00' : hour.padStart(2, '0');
    return { date, time: `${normalizedHour}:${minute}` };
  } catch {
    return { date: '', time: '' };
  }
}

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

function guestInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function parseCombinedGuestIds(pathname) {
  const raw = String(pathname || '')
    .replace(/^\/ao\/podcast\/guest-combined\//, '')
    .replace(/\/$/, '');
  if (!raw || raw.includes('/')) return [];
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );
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

/** Full single-guest admin body — same sections/actions as PodcastGuestAdmin, scoped to one guest. */
function GuestPrepBody({ guest, onGuestUpdated }) {
  const guestId = guest.id;
  const [magicStatus, setMagicStatus] = useState({ loading: false, message: '', error: '' });
  const [researchStatus, setResearchStatus] = useState({ loading: false, error: '' });
  const [questionsStatus, setQuestionsStatus] = useState({ loading: false, error: '' });
  const [producerStatus, setProducerStatus] = useState({ loading: false, error: '' });
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '',
    timezone: guest.schedule_timezone || '',
    notes: '',
  });
  const [scheduleStatus, setScheduleStatus] = useState({ loading: false, message: '', error: '' });
  const timezoneGroups = getTimezoneOptionGroups();
  const schedulePrefs = formatGuestSchedulePrefs(guest);

  useEffect(() => {
    setScheduleForm((prev) => ({
      ...prev,
      timezone: prev.timezone || guest.schedule_timezone || '',
    }));
  }, [guest.schedule_timezone, guest.id]);

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
      onGuestUpdated(json.guest);
      setResearchStatus({ loading: false, error: '' });
    } catch (e) {
      setResearchStatus({ loading: false, error: e.message || 'Research failed' });
    }
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
      onGuestUpdated(json.guest);
      setQuestionsStatus({ loading: false, error: '' });
    } catch (e) {
      setQuestionsStatus({ loading: false, error: e.message || 'Question generation failed' });
    }
  };

  const runProducerBrief = async (regenerate = false) => {
    setProducerStatus({ loading: true, error: '' });
    try {
      const res = await fetch('/api/ao/podcast/guest-producer-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId, regenerate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Producer brief failed');
      onGuestUpdated(json.guest);
      setProducerStatus({ loading: false, error: '' });
    } catch (e) {
      setProducerStatus({ loading: false, error: e.message || 'Producer brief failed' });
    }
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    setScheduleStatus({ loading: true, message: '', error: '' });
    try {
      const res = await fetch('/api/ao/podcast/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: scheduleForm.date,
          time: scheduleForm.time,
          timezone: scheduleForm.timezone,
          guest_id: guestId,
          episode_title: guest?.name ? `Recording with ${guest.name}` : null,
          notes: scheduleForm.notes,
          send_confirmation_email: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not schedule recording');

      let message = 'Recording scheduled.';
      if (json.email_sent) {
        message = 'Recording scheduled and confirmation email sent to guest.';
      } else if (json.email_error) {
        message = 'Recording scheduled, but the confirmation email could not be sent.';
      }

      setScheduleStatus({ loading: false, message, error: '' });
      setShowScheduleForm(false);
      setScheduleForm((prev) => ({ ...prev, date: '', time: '', notes: '' }));
      onGuestUpdated({ ...guest, has_scheduled_recording: true });
    } catch (err) {
      setScheduleStatus({
        loading: false,
        message: '',
        error: err.message || 'Could not schedule recording',
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-xl text-gray-900">Guest record</h3>
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={magicStatus.loading}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:border-[#8B7D72] disabled:opacity-50"
          >
            {magicStatus.loading ? 'Sending…' : 'Send magic link'}
          </button>
        </div>
        {magicStatus.message && <p className="mb-4 text-sm text-green-700">{magicStatus.message}</p>}
        {magicStatus.error && <p className="mb-4 text-sm text-red-600">{magicStatus.error}</p>}
        <PodcastGuestSubmissionContent guest={guest} showAdminFields />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-xl text-gray-900">Scheduling</h3>
          <button
            type="button"
            onClick={() => setShowScheduleForm((v) => !v)}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:border-[#8B7D72]"
          >
            {showScheduleForm ? 'Cancel' : 'Schedule recording'}
          </button>
        </div>

        {schedulePrefs ? (
          <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-gray-500">Preferred days</dt>
              <dd className="text-gray-900">{schedulePrefs.preferred_days}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Preferred time</dt>
              <dd className="text-gray-900">{schedulePrefs.preferred_time}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Dates to avoid</dt>
              <dd className="text-gray-900">{schedulePrefs.avoid_dates}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Timezone</dt>
              <dd className="text-gray-900">{schedulePrefs.timezone}</dd>
            </div>
          </dl>
        ) : (
          <p className="mb-4 text-sm text-gray-500">No scheduling preferences from intake yet.</p>
        )}

        {scheduleStatus.message && <p className="mb-4 text-sm text-green-700">{scheduleStatus.message}</p>}
        {scheduleStatus.error && <p className="mb-4 text-sm text-red-600">{scheduleStatus.error}</p>}

        {showScheduleForm && (
          <form onSubmit={submitSchedule} className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              Scheduling for <strong>{guest.name}</strong>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
                <input
                  type="date"
                  required
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Time</label>
                <input
                  type="time"
                  required
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Timezone</label>
              <select
                required
                value={scheduleForm.timezone}
                onChange={(e) => setScheduleForm((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select timezone…</option>
                <optgroup label="Common US timezones">
                  {timezoneGroups.us.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All timezones">
                  {timezoneGroups.rest.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Notes (optional)</label>
              <textarea
                rows={2}
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={scheduleStatus.loading}
              className="rounded-lg bg-[#2B2929] px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {scheduleStatus.loading ? 'Saving…' : 'Confirm and email guest'}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Advanced brief</p>
            <h3 className="font-serif text-xl text-gray-900">AI research brief</h3>
            {guest.research_generated_at && (
              <p className="mt-1 text-xs text-gray-500">
                Generated {formatTimestamp(guest.research_generated_at)}
              </p>
            )}
          </div>
          {!guest.research_brief ? (
            <button
              type="button"
              onClick={() => runResearch(false)}
              disabled={researchStatus.loading}
              className="text-[11px] font-medium text-[#8B7D72] hover:underline disabled:opacity-50"
            >
              {researchStatus.loading ? 'Generating…' : 'Generate'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runResearch(true)}
              disabled={researchStatus.loading}
              className="text-[11px] font-medium text-[#8B7D72] hover:underline disabled:opacity-50"
            >
              {researchStatus.loading ? 'Regenerating…' : 'Regenerate'}
            </button>
          )}
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

      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Suggested questions</p>
            <h3 className="font-serif text-xl text-gray-900">Suggested questions</h3>
            {guest.questions_generated_at && (
              <p className="mt-1 text-xs text-gray-500">
                Generated {formatTimestamp(guest.questions_generated_at)}
              </p>
            )}
          </div>
          {!guest.suggested_questions ? (
            <button
              type="button"
              onClick={() => runQuestions(false)}
              disabled={questionsStatus.loading || !guest.research_brief}
              className="text-[11px] font-medium text-[#8B7D72] hover:underline disabled:opacity-50"
            >
              {questionsStatus.loading ? 'Generating…' : 'Generate'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runQuestions(true)}
              disabled={questionsStatus.loading}
              className="text-[11px] font-medium text-[#8B7D72] hover:underline disabled:opacity-50"
            >
              {questionsStatus.loading ? 'Regenerating…' : 'Regenerate'}
            </button>
          )}
        </div>
        {questionsStatus.error && <p className="mb-4 text-sm text-red-600">{questionsStatus.error}</p>}
        {guest.suggested_questions ? (
          <div className="space-y-8">
            <QuestionSet title="Person-specific" items={guest.suggested_questions.person_specific} />
            <QuestionSet title="AO theology connections" items={guest.suggested_questions.ao_theology} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {guest.research_brief
              ? 'Generate interview questions from the research brief.'
              : 'Generate research first, then questions.'}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <div className="mb-4 border-b border-[#E1DED8] bg-[#E1DED8] px-4 py-4">
          <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
            Conversation architecture
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONVERSATION_ARCHITECTURE_BEATS.map((beat) => (
              <div key={beat.title} className="flex items-start gap-2.5">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#DB0812]" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-gray-900">{beat.title}</p>
                  <p className="text-xs leading-relaxed text-gray-600">{beat.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Producer brief</p>
            <h3 className="font-serif text-xl text-gray-900">Producer brief</h3>
            {guest.producer_brief_generated_at && (
              <p className="mt-1 text-xs text-gray-500">
                Generated {formatTimestamp(guest.producer_brief_generated_at)}
              </p>
            )}
          </div>
          {!guest.producer_brief ? (
            <button
              type="button"
              onClick={() => runProducerBrief(false)}
              disabled={producerStatus.loading || !guest.research_brief}
              className="text-[11px] font-medium text-[#8B7D72] hover:underline disabled:opacity-50"
            >
              {producerStatus.loading ? 'Generating…' : 'Generate'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runProducerBrief(true)}
              disabled={producerStatus.loading}
              className="text-[11px] font-medium text-[#8B7D72] hover:underline disabled:opacity-50"
            >
              {producerStatus.loading ? 'Regenerating…' : 'Regenerate'}
            </button>
          )}
        </div>
        {producerStatus.error && <p className="mt-4 text-sm text-red-600">{producerStatus.error}</p>}
        {guest.producer_brief ? (
          <div className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
            {guest.producer_brief}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            {guest.research_brief
              ? 'Generate a producer brief for recording day.'
              : 'Generate research first, then the producer brief.'}
          </p>
        )}
      </section>

      {guest.has_scheduled_recording && (
        <section id={`post-recording-${guestId}`} className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <h3 className="mb-2 font-serif text-xl text-gray-900">Post-recording capture</h3>
          <p className="mb-4 text-sm text-gray-600">
            Fill this in right after the session ends — while it&apos;s still fresh.
          </p>
          <PostRecordingCapture
            guestId={guestId}
            guest={guest}
            onSaved={(updated) => onGuestUpdated(updated)}
          />
        </section>
      )}
    </div>
  );
}

/** Condensed hosting view: bio, producer brief, questions only. */
function GuestHostingBody({ guest }) {
  const bioSnippet = String(guest.bio_md || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  const bioLine = [guest.company, bioSnippet].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      {bioLine && <p className="text-sm text-gray-600">{bioLine}{bioSnippet.length >= 160 ? '…' : ''}</p>}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Producer brief
        </p>
        {guest.producer_brief ? (
          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
            {guest.producer_brief}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No producer brief yet. Switch to Prep to generate one.</p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Interview questions
        </p>
        {guest.suggested_questions ? (
          <div className="space-y-8">
            <QuestionSet title="Person-specific" items={guest.suggested_questions.person_specific} />
            <QuestionSet title="AO theology connections" items={guest.suggested_questions.ao_theology} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No questions yet. Switch to Prep to generate them.</p>
        )}
      </section>
    </div>
  );
}

export default function PodcastGuestAdminCombined() {
  const guestIds = parseCombinedGuestIds(window.location.pathname);

  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('prep');
  const [recordingLinkForm, setRecordingLinkForm] = useState({
    riverside_link: '',
    riverside_episode_id: '',
    date: '',
    time: '',
    timezone: 'America/Chicago',
  });
  const [recordingLinkSentAt, setRecordingLinkSentAt] = useState(null);
  const [recordingLinkStatus, setRecordingLinkStatus] = useState({
    loading: false,
    message: '',
    error: '',
    results: [],
  });
  const timezoneGroups = getTimezoneOptionGroups();

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

  const loadGuests = useCallback(async () => {
    if (guestIds.length < 2) {
      setError('This page needs at least two guest IDs, separated by commas in the URL.');
      setGuests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const results = await Promise.all(
        guestIds.map(async (id) => {
          const res = await fetch(`/api/ao/podcast/guest?id=${encodeURIComponent(id)}`);
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok || !json.guest) {
            throw new Error(json.error || `Could not load guest ${id}`);
          }
          return json.guest;
        })
      );

      const byId = new Map(results.map((g) => [g.id, g]));
      const ordered = guestIds.map((id) => byId.get(id)).filter(Boolean);
      if (ordered.length !== guestIds.length) {
        throw new Error('One or more guest IDs could not be found.');
      }

      const threadIds = ordered.map((g) => g.episode_thread_id).filter(Boolean);
      if (threadIds.length !== ordered.length) {
        throw new Error(
          'These guests are not all linked to the same episode conversation yet. Select them on the Podcast dashboard and click “Build episode together” first.'
        );
      }
      const uniqueThreads = new Set(threadIds);
      if (uniqueThreads.size !== 1) {
        throw new Error(
          'These guests do not share the same episode conversation. Open “Build episode together” from the Podcast dashboard so they share one thread first.'
        );
      }

      setGuests(ordered);
    } catch (e) {
      setError(e.message || 'Could not load combined guest prep');
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }, [guestIds.join(',')]);

  useEffect(() => {
    if (!authChecked) return;
    loadGuests();
  }, [authChecked, loadGuests]);

  useEffect(() => {
    const threadId = guests[0]?.episode_thread_id;
    if (!threadId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/ao/podcast/episode/recording-link?thread_id=${encodeURIComponent(threadId)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok || cancelled) return;
        const tz = json.timezone || 'America/Chicago';
        const parts = isoToDateAndTimeParts(json.scheduled_at, tz);
        setRecordingLinkForm({
          riverside_link: json.riverside_link || '',
          riverside_episode_id: json.riverside_episode_id || '',
          date: parts.date,
          time: parts.time,
          timezone: tz,
        });
        setRecordingLinkSentAt(json.recording_link_sent_at || null);
      } catch {
        // Prefill is best-effort; leave defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guests[0]?.episode_thread_id]);

  const updateGuest = (updated) => {
    setGuests((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
  };

  const sharedThreadId = guests[0]?.episode_thread_id || null;
  const titleNames = guests.map((g) => g.name).filter(Boolean).join(' & ');
  const researchReady = guests.every((g) => g.research_brief && g.suggested_questions);

  const sendRecordingLink = async () => {
    if (!sharedThreadId) return;
    setRecordingLinkStatus({ loading: true, message: '', error: '', results: [] });
    try {
      const scheduledAt = localDateTimeToIso(
        recordingLinkForm.date,
        recordingLinkForm.time,
        recordingLinkForm.timezone
      );
      if (!scheduledAt) {
        throw new Error('Enter a valid recording date, time, and timezone.');
      }
      if (!String(recordingLinkForm.riverside_link || '').trim()) {
        throw new Error('Enter the Riverside recording link.');
      }

      const res = await fetch('/api/ao/podcast/episode/recording-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: sharedThreadId,
          riverside_link: recordingLinkForm.riverside_link.trim(),
          riverside_episode_id: recordingLinkForm.riverside_episode_id.trim() || null,
          scheduled_at: scheduledAt,
          timezone: recordingLinkForm.timezone || 'America/Chicago',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Could not send recording link');
      }

      const results = Array.isArray(json.results) ? json.results : [];
      const sent = Number(json.sent_count || 0);
      const total = Number(json.guest_count || results.length);
      const failed = results.filter((r) => !r.ok);
      let message = `Sent to ${sent} of ${total} guest${total === 1 ? '' : 's'}.`;
      if (failed.length) {
        message += ` Failed: ${failed.map((r) => r.name || r.email || r.id).join(', ')}.`;
      }
      setRecordingLinkStatus({
        loading: false,
        message,
        error: failed.length && sent === 0 ? 'No emails were sent.' : '',
        results,
      });
      if (json.recording_link_sent_at) {
        setRecordingLinkSentAt(json.recording_link_sent_at);
      } else if (sent > 0) {
        setRecordingLinkSentAt(new Date().toISOString());
      }
    } catch (e) {
      setRecordingLinkStatus({
        loading: false,
        message: '',
        error: e.message || 'Could not send recording link',
        results: [],
      });
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <p className="text-sm text-gray-500">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1A1A1A] antialiased">
      <AOHeader active="podcast" email={email} onNavigate={navigateTo} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && <p className="text-sm text-gray-500">Loading guests…</p>}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 mb-1">
              Combined episode prep
            </p>
            <h1 className="font-serif text-2xl text-gray-900 mb-2">Could not open this page</h1>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => navigateTo('/ao/podcast')}
              className="mt-4 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700"
            >
              Back to Podcast
            </button>
          </div>
        )}

        {!loading && !error && guests.length >= 2 && (
          <>
            {/* 1. Episode banner — shared, episode-level only */}
            <div className="mb-4 rounded-2xl border border-[#E1DED8] bg-[#F0ECE4] px-6 py-5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8B7D72]">
                Combined episode prep
              </p>
              <h1 className="mb-2 font-serif text-2xl text-gray-900">{titleNames}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                  Shared thread confirmed — both guests on one episode_thread_id
                </span>
                <span aria-hidden>·</span>
                <span>
                  {researchReady
                    ? 'Research & questions saved for both'
                    : 'Prep in progress for one or more guests'}
                </span>
                <span aria-hidden>·</span>
                <span>Awaiting Riverside transcript to build the episode</span>
              </div>
              {sharedThreadId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="flex overflow-hidden rounded-full border border-gray-300 bg-white">
                    <button
                      type="button"
                      onClick={() => setViewMode('prep')}
                      className={`px-4 py-2 text-xs font-medium ${
                        viewMode === 'prep'
                          ? 'bg-[#2B2929] text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Prep
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('hosting')}
                      className={`px-4 py-2 text-xs font-medium ${
                        viewMode === 'hosting'
                          ? 'bg-[#2B2929] text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Hosting
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo(`/ao/analyst?thread=${sharedThreadId}`)}
                    className="rounded-full bg-[#2B2929] px-4 py-2 text-xs font-medium text-white hover:bg-black"
                  >
                    Open shared Auto thread
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('/ao/podcast')}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:border-[#8B7D72]"
                  >
                    Back to Podcast
                  </button>
                </div>
              )}

              {sharedThreadId && (
                <div className="mt-5 rounded-xl border border-[#E1DED8] bg-white/70 p-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[#8B7D72]">
                    Riverside recording link
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs text-gray-600">Studio link</span>
                      <input
                        type="url"
                        value={recordingLinkForm.riverside_link}
                        onChange={(e) =>
                          setRecordingLinkForm((prev) => ({
                            ...prev,
                            riverside_link: e.target.value,
                          }))
                        }
                        placeholder="https://riverside.com/studio/..."
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs text-gray-600">
                        Riverside episode ID (optional)
                      </span>
                      <input
                        type="text"
                        value={recordingLinkForm.riverside_episode_id}
                        onChange={(e) =>
                          setRecordingLinkForm((prev) => ({
                            ...prev,
                            riverside_episode_id: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-gray-600">Recording date</span>
                      <input
                        type="date"
                        value={recordingLinkForm.date}
                        onChange={(e) =>
                          setRecordingLinkForm((prev) => ({ ...prev, date: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-gray-600">Recording time</span>
                      <input
                        type="time"
                        value={recordingLinkForm.time}
                        onChange={(e) =>
                          setRecordingLinkForm((prev) => ({ ...prev, time: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs text-gray-600">Timezone</span>
                      <select
                        value={recordingLinkForm.timezone}
                        onChange={(e) =>
                          setRecordingLinkForm((prev) => ({
                            ...prev,
                            timezone: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      >
                        <optgroup label="United States">
                          {timezoneGroups.us.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Other">
                          {timezoneGroups.rest.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={sendRecordingLink}
                      disabled={recordingLinkStatus.loading}
                      className="rounded-full bg-[#DB0812] px-4 py-2 text-xs font-medium text-white hover:bg-[#b5070f] disabled:opacity-50"
                    >
                      {recordingLinkStatus.loading ? 'Sending…' : 'Send to both guests'}
                    </button>
                    {recordingLinkSentAt && (
                      <p className="text-xs text-gray-500">
                        Sent {formatTimestamp(recordingLinkSentAt)}
                      </p>
                    )}
                  </div>
                  {recordingLinkStatus.message && (
                    <p className="mt-2 text-sm text-green-700">{recordingLinkStatus.message}</p>
                  )}
                  {recordingLinkStatus.error && (
                    <p className="mt-2 text-sm text-red-600">{recordingLinkStatus.error}</p>
                  )}
                  {recordingLinkStatus.results?.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-600">
                      {recordingLinkStatus.results.map((r) => (
                        <li key={r.id || r.email}>
                          {r.name || r.email}: {r.ok ? 'sent' : `failed (${r.error || 'error'})`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* 2. Quick-jump row */}
            <div className="sticky top-[57px] z-40 mb-8 flex items-center gap-2 bg-[#FAFAF9]/95 py-2 backdrop-blur-sm">
              <span className="mr-1 text-[10px] uppercase tracking-wide text-gray-400">Jump to:</span>
              {guests.map((g) => (
                <a
                  key={g.id}
                  href={`#guest-${g.id}`}
                  className="rounded-full border border-[#E1DED8] bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-[#8B7D72] hover:text-[#8B7D72]"
                >
                  {g.name}
                </a>
              ))}
            </div>

            {viewMode === 'hosting' && (
              <div className="mb-8 border-b border-[#E1DED8] bg-[#E1DED8] px-4 py-4">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  Conversation architecture
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CONVERSATION_ARCHITECTURE_BEATS.map((beat) => (
                    <div key={beat.title} className="flex items-start gap-2.5">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#DB0812]" aria-hidden />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{beat.title}</p>
                        <p className="text-xs leading-relaxed text-gray-600">{beat.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3–6. Guest sections with divider */}
            {guests.map((guest, index) => (
              <React.Fragment key={guest.id}>
                {index > 0 && (
                  <div className="my-10 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">Next guest</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                )}

                <section id={`guest-${guest.id}`} className="scroll-mt-32">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1DED8] font-serif text-sm font-bold text-[#8B7D72]">
                      {guestInitials(guest.name)}
                    </div>
                    <h2 className="font-serif text-xl text-gray-900">{guest.name}</h2>
                  </div>
                  {viewMode === 'hosting' ? (
                    <GuestHostingBody guest={guest} />
                  ) : (
                    <GuestPrepBody guest={guest} onGuestUpdated={updateGuest} />
                  )}
                </section>
              </React.Fragment>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
