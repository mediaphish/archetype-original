/**
 * AO Podcast Dashboard — guests, episode queue, manual scheduling.
 */
import React, { useCallback, useEffect, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import { getTimezoneOptionGroups } from '../../../lib/ao/podcastTimezones.js';

const PAGE_SIZE = 20;
const INTAKE_URL = `${typeof window !== 'undefined' ? window.location.origin : ''}/podcast/guest-intake`;

function navigateTo(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-50 text-green-800',
    blue: 'bg-blue-50 text-blue-800',
    amber: 'bg-amber-50 text-amber-900',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function episodeBadgeTone(label) {
  if (label === 'Episode published') return 'green';
  if (label === 'Episode assigned') return 'blue';
  return 'gray';
}

function GuestAvatar({ guest }) {
  if (guest.image_url) {
    return (
      <img
        src={guest.image_url}
        alt=""
        className="h-10 w-10 shrink-0 object-cover bg-gray-100"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#E1DED8] font-serif text-sm font-semibold text-[#8B7D72]">
      {guest.initials || '?'}
    </div>
  );
}

export default function PodcastDashboard() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  const [guestSearch, setGuestSearch] = useState('');
  const [guests, setGuests] = useState([]);
  const [guestPage, setGuestPage] = useState(1);
  const [guestTotal, setGuestTotal] = useState(0);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [guestsError, setGuestsError] = useState('');

  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [episodesError, setEpisodesError] = useState('');

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState('');
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({
    date: '',
    time: '',
    timezone: '',
    guest_id: '',
    guest_label: '',
    episode_title: '',
    notes: '',
  });
  const [slotGuestQuery, setSlotGuestQuery] = useState('');
  const [slotGuestHits, setSlotGuestHits] = useState([]);
  const [slotSaving, setSlotSaving] = useState(false);
  const [expandedSlotId, setExpandedSlotId] = useState(null);
  const [emailSlotStatus, setEmailSlotStatus] = useState({});

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

  const loadGuests = useCallback(async (query, page) => {
    setGuestsLoading(true);
    setGuestsError('');
    try {
      const params = new URLSearchParams();
      if (query.trim().length >= 2) params.set('q', query.trim());
      else params.set('page', String(page));
      const res = await fetch(`/api/ao/podcast/guests?${params}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load guests');
      setGuests(json.guests || []);
      setGuestTotal(json.total || 0);
      if (!json.search) setGuestPage(json.page || page);
    } catch (e) {
      setGuestsError(e.message || 'Could not load guests');
      setGuests([]);
    } finally {
      setGuestsLoading(false);
    }
  }, []);

  const loadEpisodes = useCallback(async () => {
    setEpisodesLoading(true);
    setEpisodesError('');
    try {
      const res = await fetch('/api/ao/podcast/episodes');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load episodes');
      setEpisodes(json.episodes || []);
    } catch (e) {
      setEpisodesError(e.message || 'Could not load episodes');
      setEpisodes([]);
    } finally {
      setEpisodesLoading(false);
    }
  }, []);

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    setSlotsError('');
    try {
      const res = await fetch('/api/ao/podcast/schedule');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load schedule');
      setSlots(json.slots || []);
    } catch (e) {
      setSlotsError(e.message || 'Could not load schedule');
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    loadEpisodes();
    loadSlots();
  }, [authChecked, loadEpisodes, loadSlots]);

  useEffect(() => {
    if (!authChecked) return;
    const timer = setTimeout(() => {
      if (guestSearch.trim().length >= 2) {
        loadGuests(guestSearch, 1);
      } else if (guestSearch.trim().length === 0) {
        loadGuests('', guestPage);
      } else {
        setGuests([]);
        setGuestTotal(0);
        setGuestsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [authChecked, guestSearch, guestPage, loadGuests]);

  useEffect(() => {
    if (!showSlotForm || slotGuestQuery.trim().length < 2) {
      setSlotGuestHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ao/auto/guest-search?q=${encodeURIComponent(slotGuestQuery.trim())}`);
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) setSlotGuestHits(json.guests || []);
      } catch {
        setSlotGuestHits([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [slotGuestQuery, showSlotForm]);

  const totalPages = Math.max(1, Math.ceil(guestTotal / PAGE_SIZE));
  const isSearching = guestSearch.trim().length >= 2;

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setSlotSaving(true);
    setSlotsError('');
    try {
      const res = await fetch('/api/ao/podcast/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: slotForm.date,
          time: slotForm.time,
          timezone: slotForm.timezone || null,
          guest_id: slotForm.guest_id || null,
          episode_title: slotForm.episode_title,
          notes: slotForm.notes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save slot');
      setShowSlotForm(false);
      setSlotForm({
        date: '',
        time: '',
        timezone: '',
        guest_id: '',
        guest_label: '',
        episode_title: '',
        notes: '',
      });
      setSlotGuestQuery('');
      await loadSlots();
    } catch (e) {
      setSlotsError(e.message || 'Could not save slot');
    } finally {
      setSlotSaving(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    setSlotsError('');
    try {
      const res = await fetch(`/api/ao/podcast/schedule/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not delete slot');
      await loadSlots();
    } catch (e) {
      setSlotsError(e.message || 'Could not delete slot');
    }
  };

  const handleSendConfirmation = async (slotId) => {
    setEmailSlotStatus((prev) => ({ ...prev, [slotId]: { loading: true, message: '', error: '' } }));
    setSlotsError('');
    try {
      const res = await fetch(`/api/ao/podcast/schedule/${encodeURIComponent(slotId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_confirmation' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not send email');
      setEmailSlotStatus((prev) => ({
        ...prev,
        [slotId]: { loading: false, message: 'Confirmation email sent.', error: '' },
      }));
    } catch (e) {
      setEmailSlotStatus((prev) => ({
        ...prev,
        [slotId]: { loading: false, message: '', error: e.message || 'Could not send email' },
      }));
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <AOHeader active="podcast" email={email} onNavigate={navigateTo} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-serif text-2xl text-gray-900">Podcast</h1>
          <p className="mt-1 text-sm text-gray-600">Guests, episodes, and upcoming recordings.</p>
        </div>

        {/* Panel 1: Guest Directory */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-lg text-gray-900">Guest directory</h2>
            <a
              href={INTAKE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              New guest
            </a>
          </div>

          <input
            type="search"
            value={guestSearch}
            onChange={(e) => {
              setGuestSearch(e.target.value);
              setGuestPage(1);
            }}
            placeholder="Search by name or email…"
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />

          {guestsLoading && <p className="text-sm text-gray-500">Loading guests…</p>}
          {guestsError && <p className="text-sm text-red-600">{guestsError}</p>}

          {!guestsLoading && !guestsError && guests.length === 0 && (
            <p className="text-sm text-gray-500">
              {guestSearch.trim().length === 1
                ? 'Type at least 2 characters to search.'
                : 'No guests yet.'}
            </p>
          )}

          <ul className="divide-y divide-gray-100">
            {guests.map((guest) => (
              <li key={guest.id} className="flex flex-wrap items-center gap-4 py-4">
                <GuestAvatar guest={guest} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{guest.name}</p>
                  <p className="text-sm text-gray-500">
                    {[guest.company, formatDate(guest.submitted_at)].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={episodeBadgeTone(guest.episode_status)}>{guest.episode_status}</Badge>
                    <Badge tone={guest.research_status === 'Research ready' ? 'green' : 'gray'}>
                      {guest.research_status}
                    </Badge>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo(`/ao/podcast/guest/${guest.id}`)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  View
                </button>
              </li>
            ))}
          </ul>

          {!isSearching && guestTotal > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <button
                type="button"
                disabled={guestPage <= 1}
                onClick={() => setGuestPage((p) => Math.max(1, p - 1))}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {guestPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={guestPage >= totalPages}
                onClick={() => setGuestPage((p) => p + 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>

        {/* Panel 2: Episode Queue */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-serif text-lg text-gray-900">Episode queue</h2>
          {episodesLoading && <p className="text-sm text-gray-500">Loading episodes…</p>}
          {episodesError && <p className="text-sm text-red-600">{episodesError}</p>}
          {!episodesLoading && !episodesError && episodes.length === 0 && (
            <p className="text-sm text-gray-500">No episode drafts yet.</p>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Guest</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Publish date</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((ep) => (
                  <tr key={ep.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-900">{ep.title}</td>
                    <td className="py-3 pr-4 capitalize text-gray-600">{ep.episode_type}</td>
                    <td className="py-3 pr-4 text-gray-600">{ep.guest_name || '—'}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={ep.status === 'published' ? 'green' : ep.status === 'approved' ? 'blue' : 'amber'}>
                        {ep.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{ep.publish_date ? formatDate(ep.publish_date) : '—'}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => navigateTo('/ao/studio')}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit in Auto
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Panel 3: Scheduling */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-lg text-gray-900">Upcoming recordings</h2>
            <button
              type="button"
              onClick={() => setShowSlotForm((v) => !v)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {showSlotForm ? 'Cancel' : 'Add recording slot'}
            </button>
          </div>

          {showSlotForm && (
            <form onSubmit={handleAddSlot} className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
                  <input
                    type="date"
                    required
                    value={slotForm.date}
                    onChange={(e) => setSlotForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Time</label>
                  <input
                    type="time"
                    required
                    value={slotForm.time}
                    onChange={(e) => setSlotForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Timezone</label>
                <select
                  value={slotForm.timezone}
                  onChange={(e) => setSlotForm((f) => ({ ...f, timezone: e.target.value }))}
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
                <label className="mb-1 block text-xs font-medium text-gray-600">Guest (optional)</label>
                <input
                  type="text"
                  value={slotGuestQuery || slotForm.guest_label}
                  onChange={(e) => {
                    setSlotGuestQuery(e.target.value);
                    setSlotForm((f) => ({ ...f, guest_id: '', guest_label: '' }));
                  }}
                  placeholder="Search guest by name or email…"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {slotGuestHits.length > 0 && !slotForm.guest_id && (
                  <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-gray-200 bg-white">
                    {slotGuestHits.map((g) => (
                      <li key={g.id}>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => {
                            setSlotForm((f) => ({
                              ...f,
                              guest_id: g.id,
                              guest_label: `${g.name}${g.company ? ` — ${g.company}` : ''}`,
                              timezone: f.timezone || g.schedule_timezone || '',
                            }));
                            setSlotGuestQuery('');
                            setSlotGuestHits([]);
                          }}
                        >
                          {g.name}
                          {g.email ? <span className="text-gray-500"> · {g.email}</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {slotForm.guest_label && (
                  <p className="mt-1 text-xs text-gray-600">Selected: {slotForm.guest_label}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Episode title (optional)</label>
                <input
                  type="text"
                  value={slotForm.episode_title}
                  onChange={(e) => setSlotForm((f) => ({ ...f, episode_title: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={slotForm.notes}
                  onChange={(e) => setSlotForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={slotSaving}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {slotSaving ? 'Saving…' : 'Save slot'}
              </button>
            </form>
          )}

          {slotsLoading && <p className="text-sm text-gray-500">Loading schedule…</p>}
          {slotsError && <p className="text-sm text-red-600">{slotsError}</p>}
          {!slotsLoading && !slotsError && slots.length === 0 && (
            <p className="text-sm text-gray-500">No upcoming recordings scheduled.</p>
          )}

          <ul className="divide-y divide-gray-100">
            {slots.map((slot) => {
              const prefs = slot.guest_schedule_prefs;
              const expanded = expandedSlotId === slot.id;
              const emailStatus = emailSlotStatus[slot.id];
              return (
              <li key={slot.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{formatDateTime(slot.scheduled_at)}</p>
                  <p className="text-sm text-gray-600">
                    {[slot.guest_name, slot.episode_title].filter(Boolean).join(' · ') || 'No guest or title'}
                  </p>
                  {slot.timezone && (
                    <p className="text-xs text-gray-500">Timezone: {slot.timezone}</p>
                  )}
                  {slot.notes && <p className="mt-1 text-sm text-gray-500">{slot.notes}</p>}
                  {slot.guest_id && prefs && (
                    <button
                      type="button"
                      onClick={() => setExpandedSlotId(expanded ? null : slot.id)}
                      className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      {expanded ? 'Hide guest preferences' : 'Show guest preferences'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {slot.guest_id && (
                    <button
                      type="button"
                      onClick={() => handleSendConfirmation(slot.id)}
                      disabled={emailStatus?.loading}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                    >
                      {emailStatus?.loading ? 'Sending…' : 'Send confirmation email'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
                </div>
                {expanded && prefs && (
                  <dl className="mt-3 grid gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-gray-500">Preferred days</dt>
                      <dd className="text-gray-800">{prefs.preferred_days}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Preferred time</dt>
                      <dd className="text-gray-800">{prefs.preferred_time}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Dates to avoid</dt>
                      <dd className="text-gray-800">{prefs.avoid_dates}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Guest timezone</dt>
                      <dd className="text-gray-800">{prefs.timezone}</dd>
                    </div>
                  </dl>
                )}
                {emailStatus?.message && (
                  <p className="mt-2 text-xs text-green-700">{emailStatus.message}</p>
                )}
                {emailStatus?.error && (
                  <p className="mt-2 text-xs text-red-600">{emailStatus.error}</p>
                )}
              </li>
            );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
