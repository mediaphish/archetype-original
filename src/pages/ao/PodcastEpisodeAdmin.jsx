/**
 * Unified episode admin — AO auth required.
 * Route: /ao/podcast/episode/[thread_id]
 * Works for 1 guest or N guests sharing the same episode_thread_id.
 */
import React, { useCallback, useEffect, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import { getTimezoneOptionGroups } from '../../../lib/ao/podcastTimezones.js';
import { localDateTimeToIso } from '../../../lib/ao/podcastScheduleUtils.js';
import { CONVERSATION_ARCHITECTURE_BEATS } from '../../components/podcast/conversationArchitecture.js';
import JournalMarkdownBody from '../../components/JournalMarkdownBody';
import {
  GuestPrepBody,
  GuestHostingBody,
  formatTimestamp,
  guestInitials,
} from '../../components/podcast/episodeAdminBodies.jsx';

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

function parseEpisodeThreadId(pathname) {
  const raw = String(pathname || '')
    .replace(/^\/ao\/podcast\/episode\//, '')
    .replace(/\/$/, '');
  if (!raw || raw.includes('/')) return '';
  return raw.trim();
}

export default function PodcastEpisodeAdmin() {
  const threadId = parseEpisodeThreadId(window.location.pathname);

  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Top-level: guests | setup | hosting
  const [mainTab, setMainTab] = useState('guests');
  const [guestTabId, setGuestTabId] = useState(null);
  const [setupSubTab, setSetupSubTab] = useState('riverside');
  const [hostingTab, setHostingTab] = useState('combined');

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
  const [combinedShowNotes, setCombinedShowNotes] = useState('');
  const [notesEditing, setNotesEditing] = useState(true);
  const [showNotesStatus, setShowNotesStatus] = useState({
    loading: false,
    message: '',
    error: '',
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
    if (!threadId) {
      setError('This page needs an episode conversation id in the URL.');
      setGuests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/ao/podcast/episode/guests?thread_id=${encodeURIComponent(threadId)}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Could not load episode guests');
      }
      const list = Array.isArray(json.guests) ? json.guests : [];
      if (list.length === 0) {
        throw new Error(
          'No guests are linked to this episode conversation yet. Open Podcast and use Build episode (or Build episode together) first.'
        );
      }
      setGuests(list);
      setGuestTabId((prev) => {
        if (prev && list.some((g) => g.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch (e) {
      setError(e.message || 'Could not load episode');
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (!authChecked) return;
    loadGuests();
  }, [authChecked, loadGuests]);

  useEffect(() => {
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
        // Prefill is best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/ao/podcast/episode/show-notes?thread_id=${encodeURIComponent(threadId)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok || cancelled) return;
        const notes =
          typeof json.combined_show_notes_md === 'string' ? json.combined_show_notes_md : '';
        setCombinedShowNotes(notes);
        setNotesEditing(!notes.trim());
      } catch {
        // Prefill is best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    if (mainTab === 'hosting') {
      setHostingTab('combined');
    }
  }, [mainTab]);

  const updateGuest = (updated) => {
    setGuests((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
  };

  const saveCombinedShowNotes = async () => {
    if (!threadId) return;
    setShowNotesStatus({ loading: true, message: '', error: '' });
    try {
      const res = await fetch('/api/ao/podcast/episode/show-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          combined_show_notes_md: combinedShowNotes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Could not save notes');
      }
      setShowNotesStatus({ loading: false, message: 'Notes saved.', error: '' });
      setNotesEditing(false);
    } catch (e) {
      setShowNotesStatus({
        loading: false,
        message: '',
        error: e.message || 'Could not save notes',
      });
    }
  };

  const sendRecordingLink = async () => {
    if (!threadId) return;
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
          thread_id: threadId,
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

  const titleNames = guests.map((g) => g.name).filter(Boolean).join(' & ');
  const researchReady = guests.every((g) => g.research_brief && g.suggested_questions);
  const activeGuest = guests.find((g) => g.id === guestTabId) || guests[0] || null;
  const activeHostingGuest =
    mainTab === 'hosting' && hostingTab !== 'combined'
      ? guests.find((g) => g.id === hostingTab) || null
      : null;

  const tabBtn = (active) =>
    `px-4 py-2 text-xs font-medium ${
      active ? 'bg-[#2B2929] text-white' : 'text-gray-700 hover:bg-gray-50'
    }`;

  const pillBtn = (active) =>
    `rounded-full px-4 py-2 text-xs font-medium ${
      active
        ? 'bg-[#2B2929] text-white'
        : 'border border-[#E1DED8] bg-white text-gray-700 hover:border-[#8B7D72]'
    }`;

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
        {loading && <p className="text-sm text-gray-500">Loading episode…</p>}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
              Episode admin
            </p>
            <h1 className="mb-2 font-serif text-2xl text-gray-900">Could not open this page</h1>
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

        {!loading && !error && guests.length >= 1 && (
          <>
            <div className="mb-4 rounded-2xl border border-[#E1DED8] bg-[#F0ECE4] px-6 py-5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8B7D72]">
                Episode admin
              </p>
              <h1 className="mb-2 font-serif text-2xl text-gray-900">{titleNames}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                  Shared thread confirmed
                  {guests.length === 1
                    ? ' — 1 guest on this episode'
                    : ` — ${guests.length} guests on this episode`}
                </span>
                <span aria-hidden>·</span>
                <span>
                  {researchReady
                    ? guests.length === 1
                      ? 'Research & questions saved'
                      : 'Research & questions saved for all guests'
                    : 'Prep in progress'}
                </span>
              </div>
              {threadId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigateTo(`/ao/analyst?thread=${threadId}`)}
                    className="rounded-full bg-[#2B2929] px-4 py-2 text-xs font-medium text-white hover:bg-black"
                  >
                    Open shared Auto thread
                  </button>
                </div>
              )}
            </div>

            <div
              className="mb-6 flex overflow-hidden rounded-full border border-gray-300 bg-white"
              role="tablist"
              aria-label="Episode sections"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mainTab === 'guests'}
                onClick={() => setMainTab('guests')}
                className={tabBtn(mainTab === 'guests')}
              >
                Guests
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mainTab === 'setup'}
                onClick={() => setMainTab('setup')}
                className={tabBtn(mainTab === 'setup')}
              >
                Episode Setup
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mainTab === 'hosting'}
                onClick={() => setMainTab('hosting')}
                className={tabBtn(mainTab === 'hosting')}
              >
                Hosting
              </button>
            </div>

            {mainTab === 'guests' && (
              <>
                <div
                  className="mb-6 flex flex-wrap gap-2 border-b border-[#E1DED8] pb-3"
                  role="tablist"
                  aria-label="Guests"
                >
                  {guests.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      role="tab"
                      aria-selected={guestTabId === g.id}
                      onClick={() => setGuestTabId(g.id)}
                      className={pillBtn(guestTabId === g.id)}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
                {activeGuest && (
                  <section role="tabpanel">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1DED8] font-serif text-sm font-bold text-[#8B7D72]">
                        {guestInitials(activeGuest.name)}
                      </div>
                      <h2 className="font-serif text-xl text-gray-900">{activeGuest.name}</h2>
                    </div>
                    <GuestPrepBody guest={activeGuest} onGuestUpdated={updateGuest} />
                  </section>
                )}
              </>
            )}

            {mainTab === 'setup' && (
              <>
                <div
                  className="mb-6 flex flex-wrap gap-2 border-b border-[#E1DED8] pb-3"
                  role="tablist"
                  aria-label="Episode setup"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={setupSubTab === 'riverside'}
                    onClick={() => setSetupSubTab('riverside')}
                    className={pillBtn(setupSubTab === 'riverside')}
                  >
                    Riverside invite
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={setupSubTab === 'showpage'}
                    onClick={() => setSetupSubTab('showpage')}
                    className={pillBtn(setupSubTab === 'showpage')}
                  >
                    Show page
                  </button>
                </div>

                {setupSubTab === 'riverside' ? (
                  <div role="tabpanel" className="rounded-xl border border-[#E1DED8] bg-white p-4 sm:p-6">
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
                ) : (
                  <div
                    role="tabpanel"
                    className="rounded-xl border border-[#E1DED8] bg-white px-6 py-8 text-sm text-gray-600"
                  >
                    <p className="font-serif text-xl text-gray-900">Show page</p>
                    <p className="mt-2">Publishing workflow coming in a later phase.</p>
                  </div>
                )}
              </>
            )}

            {mainTab === 'hosting' && (
              <>
                <div
                  className="mb-6 flex flex-wrap gap-2 border-b border-[#E1DED8] pb-3"
                  role="tablist"
                  aria-label="Hosting views"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={hostingTab === 'combined'}
                    onClick={() => setHostingTab('combined')}
                    className={pillBtn(hostingTab === 'combined')}
                  >
                    Combined show page
                  </button>
                  {guests.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      role="tab"
                      aria-selected={hostingTab === g.id}
                      onClick={() => setHostingTab(g.id)}
                      className={pillBtn(hostingTab === g.id)}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>

                {hostingTab === 'combined' ? (
                  <div role="tabpanel" className="space-y-6">
                    <div className="rounded-xl border border-[#E1DED8] bg-white p-4 sm:p-6">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8B7D72]">
                          Combined show notes
                        </p>
                        {!notesEditing && combinedShowNotes.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setNotesEditing(true);
                              setShowNotesStatus({ loading: false, message: '', error: '' });
                            }}
                            className="text-xs font-medium text-[#8B7D72] hover:underline"
                          >
                            Edit notes
                          </button>
                        )}
                      </div>

                      {!notesEditing && combinedShowNotes.trim() ? (
                        <div className="max-w-3xl">
                          <JournalMarkdownBody
                            post={{ title: '', body: combinedShowNotes, image: null }}
                          />
                        </div>
                      ) : (
                        <>
                          <textarea
                            rows={20}
                            value={combinedShowNotes}
                            onChange={(e) => setCombinedShowNotes(e.target.value)}
                            placeholder="Paste the combined intro and run sheet here…"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 font-mono text-sm leading-relaxed text-gray-900"
                          />
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={saveCombinedShowNotes}
                              disabled={showNotesStatus.loading}
                              className="rounded-full bg-[#2B2929] px-4 py-2 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
                            >
                              {showNotesStatus.loading ? 'Saving…' : 'Save notes'}
                            </button>
                            {showNotesStatus.message && (
                              <p className="text-sm text-green-700">{showNotesStatus.message}</p>
                            )}
                            {showNotesStatus.error && (
                              <p className="text-sm text-red-600">{showNotesStatus.error}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="border-b border-[#E1DED8] bg-[#E1DED8] px-4 py-4">
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
                  </div>
                ) : activeHostingGuest ? (
                  <section role="tabpanel">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1DED8] font-serif text-sm font-bold text-[#8B7D72]">
                        {guestInitials(activeHostingGuest.name)}
                      </div>
                      <h2 className="font-serif text-xl text-gray-900">{activeHostingGuest.name}</h2>
                    </div>
                    <GuestHostingBody guest={activeHostingGuest} />
                  </section>
                ) : null}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
