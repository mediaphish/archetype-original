/**
 * Shared guest prep/hosting bodies for episode admin pages.
 * Ported from PodcastGuestAdminCombined.jsx — leave that file in place for now.
 */
import React, { useEffect, useState } from 'react';
import PodcastGuestSubmissionContent from './PodcastGuestSubmissionContent';
import { getTimezoneOptionGroups } from '../../../lib/ao/podcastTimezones.js';
import { formatGuestSchedulePrefs } from '../../../lib/ao/podcastScheduleUtils.js';
import { CONVERSATION_ARCHITECTURE_BEATS } from './conversationArchitecture.js';
import PostRecordingCapture from './PostRecordingCapture';

export function formatTimestamp(value) {
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

export function guestInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function QuestionSet({ title, items }) {
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
export function GuestPrepBody({ guest, onGuestUpdated }) {
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
export function GuestHostingBody({ guest }) {
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
          <p className="text-sm text-gray-500">No producer brief yet. Open the Guests tab to generate one.</p>
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
          <p className="text-sm text-gray-500">No questions yet. Open the Guests tab to generate them.</p>
        )}
      </section>
    </div>
  );
}
