/**
 * Auto > CRM (/ao/crm, and the old /ao/clients address).
 *
 * Bart, 2026-10-25: "It needs to look and work like a CRM ... open the page,
 * know what to do, or have an AI I can ask about it quickly." Four views on a
 * phone-first bar: Today, People, Pipeline, Ask (src/components/ao/crm/CrmViews.jsx).
 * Today keeps this week's calls, dates coming up and the numbers underneath.
 *
 * Bart, 2026-10-24: "Treat this piece of Auto like a CRM. What I see when I
 * open it is the most important stuff at the top." And the person page was
 * "clunky": it needs a senior UX pass and to fit how he works.
 *
 * Two screens:
 *   Home      /ao/crm                what needs you, this week, coming up,
 *                                     your numbers, everyone at a glance
 *   Person    /ao/crm?c=<email>      one person across all conversations:
 *                                     Now, Conversations, Messages, Profile,
 *                                     Research, Notes
 * Built for the phone first. Server: api/ao/clients.js. Nothing reaches a
 * client until Bart presses Send.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import {
  when,
  firstName,
  btnRed,
  btnGray,
  Badge,
  Permissions,
  PrepAnswers,
  WhatTheyWrote,
  FollowUp,
  TranscriptBox,
  Analysis,
  CheckinPlan,
  Research,
  Timeline,
} from '../../components/ao/clients/parts';
import { go, personPath, TodayView, PeopleView, PipelineView, AskView, PersonCrmBox } from '../../components/ao/crm/CrmViews.jsx';

function ago(iso) {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  return `${Math.round(days / 30)} months ago`;
}

function dayLabel(iso) {
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const BAND = {
  strong: { ring: 'text-green-600', pill: 'bg-green-50 text-green-800', label: 'Strong' },
  steady: { ring: 'text-amber-500', pill: 'bg-amber-50 text-amber-900', label: 'Steady' },
  needs_attention: { ring: 'text-red-600', pill: 'bg-red-50 text-red-800', label: 'Needs attention' },
};

function HealthPill({ health }) {
  const b = BAND[health?.band] || BAND.steady;
  return <span className={`inline-flex min-w-[44px] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${b.pill}`}>{health?.score ?? '–'}</span>;
}

function HealthRing({ health, size = 72 }) {
  const b = BAND[health?.band] || BAND.steady;
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, health?.score || 0)) / 100;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" className={b.ring} aria-label={`Health ${health?.score}`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#E5E7EB" strokeWidth="7" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 36 36)" />
      <text x="36" y="41" textAnchor="middle" className="fill-gray-900" style={{ fontSize: 18, fontWeight: 700 }}>{health?.score ?? '–'}</text>
    </svg>
  );
}

function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 ${className}`}>{children}</div>;
}

/** A transcript that came in on its own and could not be matched to a conversation. */
function UnmatchedTranscript({ item, conversations, onDone }) {
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (body) => {
    setBusy(true);
    try {
      const j = await fetch('/api/ao/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'incoming', incoming_id: item.id, ...body }) }).then((r) => r.json());
      if (!j.ok) throw new Error(j.error || 'That did not work');
      await onDone();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusy(false);
    }
  };
  const when = item.started_at || item.received_at;
  return (
    <Card>
      <p className="text-sm font-semibold text-gray-900">
        From {item.source === 'zoom' ? 'Zoom' : item.source}
        {item.topic ? `: ${item.topic}` : ''}
      </p>
      <p className="text-xs text-gray-500">{new Date(when).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-gray-600">{item.preview}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="rounded-lg border border-gray-300 p-2 text-sm">
          <option value="">Whose conversation is this?</option>
          {conversations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {new Date(c.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </option>
          ))}
        </select>
        <button type="button" disabled={busy || !pick} onClick={() => act({ inquiry_id: pick })} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Reading… (a minute or two)' : 'Read it'}
        </button>
        <button type="button" disabled={busy} onClick={() => act({ discard: true })} className="text-sm text-gray-600">Not a client call</button>
      </div>
    </Card>
  );
}

/** Suggestions only. Each says why, so Bart can judge it in a glance. */
function NextMoves({ moves }) {
  if (!moves?.length) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {moves.map((mv) => (
        <li key={mv.kind + mv.label} className="text-sm">
          <span className="text-gray-900">{mv.label}</span>
          <span className="block text-xs text-gray-500">{mv.why}</span>
        </li>
      ))}
    </ul>
  );
}

function Heading({ children, right = null }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{children}</h2>
      {right}
    </div>
  );
}

function useAuth() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ao/me');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) return window.location.replace('/ao/login');
        setOk(true);
      } catch {
        window.location.replace('/ao/login');
      }
    })();
  }, []);
  return ok;
}

// ---------------------------------------------------------------- Home

function Metric({ label, value, hint }) {
  return (
    <div className="min-w-[132px] shrink-0 rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-2xl font-semibold text-gray-900">{value ?? '–'}</p>
      <p className="mt-1 text-xs leading-snug text-gray-600">{label}</p>
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

function Home({ compact = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const load = useCallback(
    () =>
      fetch('/api/ao/clients?view=home')
        .then((r) => r.json())
        .then((j) => (j.ok ? setData(j) : setError(j.error || 'Could not load')))
        .catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  const people = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.people.filter((p) => (filter === 'all' || p.stage === filter) && (!term || `${p.name} ${p.company || ''}`.toLowerCase().includes(term)));
  }, [data, filter, q]);

  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;
  const m = data.metrics;
  const money = (n) => (n ? `$${n.toLocaleString()}` : '$0');

  return (
    <div className="space-y-8">
      {data.unmatched?.length ? (
        <section id="transcripts" className="scroll-mt-28">
          <Heading>Transcripts to match</Heading>
          <div className="space-y-2">
            {data.unmatched.map((t) => (
              <UnmatchedTranscript key={t.id} item={t} conversations={data.conversations || []} onDone={load} />
            ))}
          </div>
        </section>
      ) : null}

      {compact ? null : <section>
        <Heading>Needs you</Heading>
        {data.needs.length ? (
          <div className="space-y-2">
            {data.needs.map((n) => (
              <button key={n.email} type="button" onClick={() => go(personPath(n.email))} className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-gray-400">
                <HealthPill health={n.health} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">
                    {n.name} {n.test ? <span className="ml-1 rounded bg-gray-100 px-1.5 text-[11px] font-normal text-gray-500">test</span> : null}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {n.items.map((i) => (
                      <span key={i.kind + (i.session_id || '')} className={`rounded-full px-2 py-0.5 text-xs ${i.kind === 'gone_quiet' ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{i.label}</span>
                    ))}
                  </div>
                </div>
                <span className="text-gray-300" aria-hidden>›</span>
              </button>
            ))}
          </div>
        ) : (
          <Card><p className="text-sm text-gray-600">Nothing needs you right now.</p></Card>
        )}
      </section>}

      <section>
        <Heading>This week</Heading>
        {data.this_week.length ? (
          <div className="space-y-2">
            {data.this_week.map((w) => (
              <button key={w.email + w.at} type="button" onClick={() => go(personPath(w.email))} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-gray-400">
                <div>
                  <p className="font-semibold text-gray-900">{w.name}</p>
                  <p className="text-sm text-gray-600">{dayLabel(w.at)} · {w.joining === 'phone' ? 'Phone' : 'Zoom'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <span className={w.brief_ready ? 'text-green-700' : 'text-gray-400'}>{w.brief_ready ? 'Brief ready' : 'Brief coming'}</span>
                  <span className={w.prep_done ? 'text-green-700' : 'text-gray-400'}>{w.prep_done ? 'Form in' : 'Form not in yet'}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Card><p className="text-sm text-gray-600">No conversations this week.</p></Card>
        )}
      </section>

      {data.next_moves?.length ? (
        <section>
          <Heading>Suggested next moves</Heading>
          <div className="space-y-2">
            {data.next_moves.map((p) => (
              <button key={p.email} type="button" onClick={() => go(personPath(p.email))} className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-gray-400">
                <p className="font-semibold text-gray-900">
                  {p.name} {p.test ? <span className="ml-1 rounded bg-gray-100 px-1.5 text-[11px] font-normal text-gray-500">test</span> : null}
                </p>
                <NextMoves moves={p.moves} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {data.coming_up.length ? (
        <section>
          <Heading>Coming up</Heading>
          <Card>
            <ul className="space-y-2">
              {data.coming_up.map((d) => (
                <li key={d.email + d.id}>
                  <button type="button" onClick={() => go(personPath(d.email))} className="text-left text-sm text-gray-900">
                    <strong>{d.name}</strong>: {d.label} · {d.days_away === 0 ? 'today' : `in ${d.days_away} day${d.days_away === 1 ? '' : 's'}`}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section>
        <Heading>Your numbers</Heading>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          <Metric label="Active clients (season and ongoing)" value={m.active_clients} />
          <Metric label="Monthly from seasons and ongoing" value={money(m.monthly_income)} />
          <Metric label="Conversations this month" value={m.sessions_this_month} />
          <Metric label="First conversations that became a season or ongoing" value={m.conversion_rate === null ? '–' : `${m.conversion_rate}%`} hint={`of ${m.first_conversations}`} />
          <Metric label="Average health, active clients" value={m.average_health} />
          <Metric label="Follow-through on what they committed to" value={m.follow_through_rate === null ? '–' : `${m.follow_through_rate}%`} />
          <Metric label="Time from call to follow-up sent" value={m.followup_hours_median === null ? '–' : `${m.followup_hours_median}h`} hint="median" />
          <Metric label="Gone quiet" value={m.gone_quiet} />
        </div>
        <p className="mt-2 text-xs text-gray-400">Test clients are left out of these numbers.</p>
      </section>

      {compact ? null : <section>
        <Heading>Everyone</Heading>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or company" className="mb-3 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm" />
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
          {[{ key: 'all', label: 'All' }, ...data.stages].map((s) => {
            const n = s.key === 'all' ? data.people.length : data.people.filter((p) => p.stage === s.key).length;
            return (
              <button key={s.key} type="button" onClick={() => setFilter(s.key)} className={`min-h-[36px] shrink-0 rounded-full px-3 text-xs font-semibold ${filter === s.key ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}>
                {s.label} ({n})
              </button>
            );
          })}
        </div>
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {people.map((p) => (
            <button key={p.email} type="button" onClick={() => go(personPath(p.email))} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50">
              <HealthPill health={p.health} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">
                  {p.name} {p.test ? <span className="ml-1 rounded bg-gray-100 px-1.5 text-[11px] font-normal text-gray-500">test</span> : null}
                </p>
                <p className="truncate text-xs text-gray-600">
                  {[p.company, data.stages.find((s) => s.key === p.stage)?.label, p.next_conversation_at ? `next ${dayLabel(new Date(p.next_conversation_at).toISOString())}` : `last ${ago(p.last_contact_at ? new Date(p.last_contact_at).toISOString() : null)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {p.needs ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#DB0812]" aria-label="Needs you" /> : null}
              <span className="text-gray-300" aria-hidden>›</span>
            </button>
          ))}
          {!people.length ? <p className="p-4 text-sm text-gray-500">No one matches.</p> : null}
        </div>
      </section>}
    </div>
  );
}

// ---------------------------------------------------------------- Person

const TABS = [
  ['now', 'Now'],
  ['conversations', 'Conversations'],
  ['messages', 'Messages'],
  ['profile', 'Profile'],
  ['research', 'Research'],
  ['notes', 'Notes'],
  ['archy', 'Archy'],
];

// Bart, 2026-10-24: "Ongoing within a day, a season within two days, rising leaders within five days."
const ARCHY_WINDOW = { ongoing: 'within a day', season: 'within two days', rising: 'within five days' };

function archyLinkLetter(person) {
  const first = String(person.name || '').trim().split(/\s+/)[0] || 'there';
  const window = ARCHY_WINDOW[person.tier] || ARCHY_WINDOW.season;
  return `Hi ${first},\n\nYou said yes to a private Archy, so here it is. Archy is the AI trained on my writing, and yours also knows what we have talked through together. Use it between our conversations: to think something through, to check yourself against what you said you would do, or to ask what I would say.\n\nOnly you and I can see it. If something needs me, Archy will pass it to me, and I will answer ${window}.\n\nBart`;
}

/** Their private Archy: send the link, answer what Archy handed over, read everything it said. */
function ArchyTab({ person, onPerson, busy }) {
  const [data, setData] = useState(null);
  const [letter, setLetter] = useState(() => archyLinkLetter(person));
  const [answers, setAnswers] = useState({});
  const load = useCallback(() => {
    fetch(`/api/ao/clients?archy=${encodeURIComponent(person.email)}`)
      .then((r) => r.json())
      .then((j) => setData(j.ok ? j : { error: j.error }))
      .catch((e) => setData({ error: e.message }));
  }, [person.email]);
  useEffect(() => {
    load();
  }, [load]);
  const act = async (op, extra) => {
    await onPerson(op, extra);
    load();
  };
  if (!data) return <Card><p className="text-sm text-gray-500">Loading…</p></Card>;
  if (data.error) return <Card><p className="text-sm text-red-800">{data.error}</p></Card>;
  const first = String(person.name || '').trim().split(/\s+/)[0];
  if (data.consent !== 'yes') {
    return (
      <Card>
        <p className="text-sm text-gray-700">
          {data.consent === 'no' ? `${first} said no to a private Archy.` : `${first} has not answered the private Archy question on Before we talk yet.`} It only opens for people who said yes.
        </p>
      </Card>
    );
  }
  const waiting = data.messages.filter((m) => m.handoff_status === 'waiting');
  const when = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div className="space-y-4">
      {waiting.length ? (
        <Card>
          <Heading>Handed to you</Heading>
          <div className="space-y-4">
            {waiting.map((m) => (
              <div key={m.id} className="rounded-xl bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-900">{m.handoff_reason}</p>
                <p className="text-xs text-red-800">Answer by {new Date(m.answer_by).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                <textarea
                  value={answers[m.id] ?? `Hi ${first},\n\n\n\nBart`}
                  onChange={(e) => setAnswers((a) => ({ ...a, [m.id]: e.target.value }))}
                  className="mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
                />
                <button type="button" disabled={busy} onClick={() => act('archy_answer', { handoff_id: m.id, text: answers[m.id] ?? '' })} className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  Send my answer
                </button>
                <p className="mt-1 text-xs text-gray-600">Goes to {first} by email and shows in their Archy.</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <Heading>Their link</Heading>
        {data.link_sent_at ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">Sent {when(data.link_sent_at)}.</p>
            {data.url ? (
              <a href={data.url} target="_blank" rel="noreferrer" className="block text-sm font-semibold text-blue-700">
                Open their Archy as they see it
              </a>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Turn off ${first}'s current link? You can send a new one after.`)) act('archy_revoke');
              }}
              className="text-sm font-semibold text-gray-700"
            >
              Turn off this link
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm text-gray-600">Nothing goes to {first} until you press Send. The link goes below your note as a button.</p>
            <textarea value={letter} onChange={(e) => setLetter(e.target.value)} className="min-h-[220px] w-full rounded-lg border border-gray-300 p-3 text-sm leading-relaxed" />
            <button type="button" disabled={busy} onClick={() => act('archy_send_link', { subject: 'Your private Archy', text: letter })} className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Send {first} their Archy
            </button>
          </div>
        )}
      </Card>

      <Card>
        <Heading>Everything Archy has said to {first}</Heading>
        {data.messages.length ? (
          <ol className="space-y-3">
            {data.messages.map((m) => (
              <li key={m.id} className="border-l-2 border-gray-200 pl-3">
                <p className="text-xs text-gray-500">{m.role === 'user' ? first : m.role === 'bart' ? 'You' : 'Archy'} · {when(m.at)}</p>
                <p className="whitespace-pre-wrap text-sm text-gray-900">{m.content}</p>
                {m.handoff_reason ? <p className="mt-1 text-xs text-red-800">Handed to you: {m.handoff_reason}{m.handoff_status === 'answered' ? ' (answered)' : ''}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-500">Nothing yet.</p>
        )}
      </Card>
    </div>
  );
}

const DETAIL_KINDS = [
  ['birthday', 'Birthday'],
  ['anniversary', 'Anniversary'],
  ['family', 'Family'],
  ['decision', 'Big decision'],
  ['milestone', 'Milestone'],
  ['health', 'Health'],
  ['interest', 'Interest'],
  ['other', 'Other'],
];

function Para({ label, children }) {
  if (!children) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">{children}</div>
    </div>
  );
}

const FT_TONE = { done: 'green', partly: 'amber', not_done: 'red', unknown: 'gray' };
const FT_LABEL = { done: 'Done', partly: 'Partly', not_done: 'Not done', unknown: 'Unknown' };

function NowTab({ person, onSession, onPerson, busy }) {
  const t = person.thread || {};
  const followUps = person.sessions.filter((s) => s.needs_follow_up);
  return (
    <div className="space-y-4">
      {followUps.map((s) => (
        <Card key={s.id}>
          <Heading>Follow-up for {dayLabel(s.scheduled_for)}</Heading>
          <FollowUp client={s} onAction={onSession} busy={busy} />
          {!s.has_transcript ? (
            <div className="mt-4">
              <TranscriptBox client={s} onAction={onSession} busy={busy} />
            </div>
          ) : null}
        </Card>
      ))}

      <Card>
        <Heading right={<button type="button" disabled={busy} onClick={() => onPerson('thread')} className="text-xs font-semibold text-blue-700">{busy ? 'Updating…' : 'Refresh the read'}</button>}>
          Auto&apos;s read on {firstName(person.name)}
        </Heading>
        {t.who_they_are ? (
          <div className="space-y-4">
            <Para label="Who they are">{t.who_they_are}</Para>
            <Para label="How they take what you say">{t.how_they_take_advice}</Para>
            {t.momentum?.direction && t.momentum.direction !== 'unknown' ? (
              <Para label="Momentum">{`${t.momentum.direction[0].toUpperCase()}${t.momentum.direction.slice(1)}. ${t.momentum.reason || ''}`}</Para>
            ) : null}
            {t.follow_through ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Follow-through</p>
                {t.follow_through.assessment ? <p className="mb-2 text-sm text-gray-900">{t.follow_through.assessment}</p> : null}
                <ul className="space-y-2">
                  {(t.follow_through.items || []).map((x) => (
                    <li key={x.item} className="text-sm">
                      <Badge tone={FT_TONE[x.status]}>{FT_LABEL[x.status]}</Badge> <span className="text-gray-900">{x.item}</span>
                      {x.evidence ? <p className="mt-0.5 text-xs text-gray-500">{x.evidence}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {t.patterns?.length ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Patterns</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-900">{t.patterns.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ) : null}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Your side</p>
              <div className="space-y-3">
                <Para label="What landed">{t.coaching_reflection?.what_landed}</Para>
                <Para label="Where it may have missed">{t.coaching_reflection?.where_it_may_have_missed}</Para>
                <Para label="Next time">{t.coaching_reflection?.next_time}</Para>
              </div>
            </div>
            {t.open_questions?.length ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Still to learn</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-900">{t.open_questions.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ) : null}
            <p className="text-xs text-gray-400">From {t.conversations || 1} conversation{t.conversations === 1 ? '' : 's'}, updated {ago(t.updated_at)}.</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">This fills in after the first transcript: who they are, how they take your advice, whether they follow through, and how your advice is landing.</p>
        )}
      </Card>

      {person.upcoming_dates?.length ? (
        <Card>
          <Heading>Coming up</Heading>
          <ul className="space-y-1 text-sm">
            {person.upcoming_dates.map((d) => (
              <li key={d.id}>{d.label} · {d.days_away === 0 ? 'today' : `in ${d.days_away} day${d.days_away === 1 ? '' : 's'}`}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {person.ali_candidate ? (
        <Card>
          <Heading>ALI</Heading>
          <p className="text-sm text-gray-700">{firstName(person.name)} leads a team of {person.org_size}. ALI could show how leadership is actually landing across it.</p>
        </Card>
      ) : null}
    </div>
  );
}

function ConversationsTab({ person, onSession, busy }) {
  const [open, setOpen] = useState(person.sessions[0]?.id || null);
  return (
    <div className="space-y-3">
      {person.sessions.map((s) => {
        const isOpen = open === s.id;
        const past = s.scheduled_for && Date.parse(s.scheduled_for) <= Date.now();
        return (
          <Card key={s.id} className="p-0 sm:p-0">
            <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <div>
                <p className="font-semibold text-gray-900">{s.scheduled_for ? dayLabel(s.scheduled_for) : 'Note'}</p>
                <p className="text-xs text-gray-600">
                  {[s.joining === 'phone' ? 'Phone' : s.joining ? 'Zoom' : null, s.cancelled_at ? 'Cancelled' : null, s.has_transcript ? 'Transcript in' : past ? 'No transcript yet' : 'Upcoming', s.thank_you_sent_at ? 'Follow-up sent' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className="text-sm text-gray-400">{isOpen ? 'Close' : 'Open'}</span>
            </button>
            {isOpen ? (
              <div className="space-y-5 border-t border-gray-100 p-4">
                {s.needs_follow_up ? <FollowUp client={s} onAction={onSession} busy={busy} /> : null}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">What they wrote when booking</p>
                  <WhatTheyWrote items={s.what_they_wrote} />
                </div>
                {past && !s.cancelled_at ? <TranscriptBox client={s} onAction={onSession} busy={busy} /> : null}
                <Analysis analysis={s.analysis} client={s} onAction={onSession} busy={busy} />
                {s.checkin_plan?.length ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Check-in plan</p>
                    <CheckinPlan client={s} onAction={onSession} busy={busy} />
                  </div>
                ) : null}
                {s.thank_you_text ? <Para label="Follow-up you sent">{s.thank_you_text}</Para> : null}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

function DetailForm({ onSave, busy, initial = null, onCancel = null }) {
  const [d, setD] = useState(initial || { kind: 'birthday', label: '', date: '', note: '' });
  return (
    <div className="space-y-2 rounded-xl bg-gray-50 p-3">
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value })} className="rounded-lg border border-gray-300 bg-white p-2 text-sm">
          {DETAIL_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} placeholder="e.g. Wife Sarah, second baby in August" className="rounded-lg border border-gray-300 bg-white p-2 text-sm" />
      </div>
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <input type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : ''} onChange={(e) => setD({ ...d, date: e.target.value })} className="rounded-lg border border-gray-300 bg-white p-2 text-sm" />
        <input value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Why it matters (optional)" className="rounded-lg border border-gray-300 bg-white p-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={busy || !d.label.trim()} onClick={() => onSave(d)} className={btnRed}>Save</button>
        {onCancel ? <button type="button" onClick={onCancel} className={btnGray}>Cancel</button> : null}
      </div>
    </div>
  );
}

function ProfileTab({ person, tiers, onPerson, busy }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const suggested = person.details.filter((d) => d.status === 'suggested');
  const confirmed = person.details.filter((d) => d.status !== 'suggested');
  const kindLabel = (k) => DETAIL_KINDS.find(([x]) => x === k)?.[1] || 'Other';
  return (
    <div className="space-y-4">
      <Card>
        <Heading>Contact</Heading>
        <div className="space-y-1 text-sm">
          <p><a className="text-blue-700 underline" href={`mailto:${person.email}`}>{person.email}</a></p>
          {person.phone ? <p><a className="text-blue-700 underline" href={`tel:${person.phone}`}>{person.phone}</a>{person.prep?.texts_ok ? ' · texts are fine' : ''}</p> : null}
          {[person.role, person.company, person.org_size ? `${person.org_size} people` : null].filter(Boolean).length ? <p className="text-gray-700">{[person.role, person.company, person.org_size ? `${person.org_size} people` : null].filter(Boolean).join(' · ')}</p> : null}
        </div>
      </Card>

      <Card>
        <Heading right={!adding ? <button type="button" onClick={() => setAdding(true)} className="text-xs font-semibold text-blue-700">Add</button> : null}>Personal details</Heading>
        <p className="mb-3 text-xs text-gray-500">Birthdays, anniversaries, family, big decisions. Auto suggests what it hears in conversations; nothing is kept until you confirm it.</p>
        {suggested.length ? (
          <div className="mb-4 space-y-2">
            {suggested.map((d) => (
              <div key={d.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-gray-900"><Badge tone="amber">Suggested · {kindLabel(d.kind)}</Badge> {d.label}{d.date ? ` · ${d.date}` : ''}</p>
                {d.note ? <p className="mt-1 text-xs text-gray-600">{d.note}</p> : null}
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={busy} onClick={() => onPerson('detail_confirm', { detail_id: d.id })} className={btnRed}>Keep it</button>
                  <button type="button" disabled={busy} onClick={() => onPerson('detail_remove', { detail_id: d.id })} className={btnGray}>Not needed</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {adding ? <DetailForm busy={busy} onCancel={() => setAdding(false)} onSave={(d) => onPerson('detail_add', { detail: d }).then(() => setAdding(false))} /> : null}
        {confirmed.length ? (
          <ul className="mt-2 divide-y divide-gray-100">
            {confirmed.map((d) =>
              editing === d.id ? (
                <li key={d.id} className="py-2"><DetailForm busy={busy} initial={d} onCancel={() => setEditing(null)} onSave={(x) => onPerson('detail_update', { detail: { ...x, id: d.id } }).then(() => setEditing(null))} /></li>
              ) : (
                <li key={d.id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm text-gray-900"><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{kindLabel(d.kind)}</span> {d.label}{d.date ? ` · ${d.date}` : ''}</p>
                    {d.note ? <p className="text-xs text-gray-600">{d.note}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-3 text-xs">
                    <button type="button" onClick={() => setEditing(d.id)} className="text-blue-700">Edit</button>
                    <button type="button" onClick={() => window.confirm('Remove this detail?') && onPerson('detail_remove', { detail_id: d.id })} className="text-gray-500">Remove</button>
                  </div>
                </li>
              )
            )}
          </ul>
        ) : !suggested.length && !adding ? <p className="text-sm text-gray-500">Nothing yet.</p> : null}
      </Card>

      <Card>
        <Heading>Permissions</Heading>
        <Permissions client={{ ...person.sessions[0], consent: person.consent, podcast_interest: person.podcast_interest }} />
      </Card>

      {person.prep ? (
        <Card>
          <Heading>Before we talk</Heading>
          <PrepAnswers prep={person.prep} />
        </Card>
      ) : null}

      <Card>
        <Heading>Tier</Heading>
        <div className="flex flex-wrap gap-2">
          {[{ key: null, label: 'None' }, ...tiers].map((t) => (
            <button key={t.key || 'none'} type="button" disabled={busy} onClick={() => onPerson('tier', { tier: t.key })} className={`min-h-[36px] rounded-full px-3 text-xs font-semibold ${person.tier === t.key ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">The tier sets how long silence can last before Auto flags them: {tiers.map((t) => `${t.label.toLowerCase()} ${t.quietDays} days`).join(', ')}; otherwise 21.</p>
      </Card>
    </div>
  );
}

function ResearchTab({ person, onSession, onPerson, busy }) {
  const withBrief = person.sessions.find((s) => s.research_at);
  useEffect(() => {
    if (person.web_watch?.unseen) onPerson('web_seen', {}, { quiet: true });
  }, [person.web_watch?.unseen, onPerson]);
  return (
    <div className="space-y-4">
      <Card>
        <Heading right={<button type="button" disabled={busy} onClick={() => onPerson('web_watch')} className="text-xs font-semibold text-blue-700">{busy ? 'Checking…' : 'Check now'}</button>}>
          In the news
        </Heading>
        {person.web_watch?.items?.length ? (
          <ul className="space-y-3">
            {person.web_watch.items.map((x) => (
              <li key={x.headline} className="text-sm">
                <p className="font-medium text-gray-900">{x.url ? <a href={x.url} target="_blank" rel="noreferrer" className="underline">{x.headline}</a> : x.headline}</p>
                <p className="text-xs text-gray-600">{[x.date, x.why_it_matters].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">Nothing found{person.web_watch?.checked_at ? ` as of ${ago(person.web_watch.checked_at)}` : ' yet'}. Auto looks once a month for active clients.</p>
        )}
      </Card>
      <Card>
        <Heading>Research brief</Heading>
        {withBrief ? <Research client={withBrief} onAction={onSession} busy={busy} /> : <p className="text-sm text-gray-600">The brief is written when they book.</p>}
      </Card>
    </div>
  );
}

function NotesTab({ person, onPerson, busy }) {
  const [text, setText] = useState(person.notes || '');
  useEffect(() => setText(person.notes || ''), [person.notes]);
  return (
    <Card>
      <Heading>Notes</Heading>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Anything to remember. Dictating with Wispr works here." className="min-h-[220px] w-full rounded-xl border border-gray-300 p-3 text-sm leading-relaxed" />
      <button type="button" disabled={busy || text === (person.notes || '')} onClick={() => onPerson('notes', { notes: text })} className={`mt-2 ${btnRed}`}>Save notes</button>
    </Card>
  );
}

function HealthDetail({ person, onPerson, busy }) {
  const h = person.health;
  const [score, setScore] = useState(h.override?.score ?? '');
  const [note, setNote] = useState(h.override?.note ?? '');
  return (
    <div className="mt-3 space-y-3 rounded-xl bg-gray-50 p-3 text-sm">
      <ul className="space-y-1 text-gray-800">{h.reasons.map((r) => <li key={r}>· {r}</li>)}</ul>
      <p className="text-xs text-gray-500">
        Engagement {h.parts.engagement}/30 · Follow-through {h.parts.follow_through}/30 · Momentum {h.parts.momentum}/25 · Connection {h.parts.connection}/15
        {h.early ? ' · Early: rough until two or three conversations are on record.' : ''}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="Your score" inputMode="numeric" className="w-28 rounded-lg border border-gray-300 bg-white p-2" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why (optional)" className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white p-2" />
        <button type="button" disabled={busy} onClick={() => onPerson('health_override', { score, note })} className={btnGray}>{score === '' ? 'Use Auto’s score' : 'Set'}</button>
      </div>
    </div>
  );
}

function Person({ email }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('now');
  const [busy, setBusy] = useState(false);
  const [showHealth, setShowHealth] = useState(false);

  const load = useCallback(async () => {
    try {
      const j = await fetch(`/api/ao/clients?person=${encodeURIComponent(email)}`).then((r) => r.json());
      if (!j.ok) throw new Error(j.error || 'Could not load');
      setData(j);
    } catch (e) {
      setError(e.message);
    }
  }, [email]);
  useEffect(() => {
    load();
  }, [load]);

  const post = useCallback(async (body, { quiet = false } = {}) => {
    if (!quiet) setBusy(true);
    try {
      const j = await fetch('/api/ao/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
      if (!j.ok) throw new Error(j.error || 'That did not work');
      if (j.person) setData((d) => ({ ...d, person: j.person }));
      else await load();
      if (body.action === 'send') window.alert('Sent.');
    } catch (e) {
      if (!quiet) window.alert(e.message);
    } finally {
      if (!quiet) setBusy(false);
    }
  }, [load]);

  const onSession = useCallback((client, action, extra = {}) => post({ action, id: client.id, ...extra }), [post]);
  const onPerson = useCallback((op, extra = {}, opts) => post({ action: 'person', email, op, ...extra }, opts), [post, email]);

  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;
  const p = data.person;
  const stageLabel = data.stages.find((s) => s.key === p.stage)?.label;

  return (
    <div>
      <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : go('/ao/crm?view=people'))} className="mb-3 min-h-[44px] text-sm text-gray-600">‹ Back</button>

      <Card className="mb-4">
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => setShowHealth((v) => !v)} aria-label="Health details"><HealthRing health={p.health} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-gray-900">
              {p.name} {p.test ? <span className="ml-1 align-middle rounded bg-gray-100 px-1.5 text-[11px] font-normal text-gray-500">test</span> : null}
            </h1>
            <p className="truncate text-sm text-gray-600">{[p.role, p.company].filter(Boolean).join(' · ') || p.email}</p>
            <p className="mt-1 text-xs text-gray-500">
              {[stageLabel, data.tiers.find((t) => t.key === p.tier)?.label].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-gray-50 p-2"><p className="text-gray-500">Last contact</p><p className="font-semibold text-gray-900">{ago(p.last_contact_at ? new Date(p.last_contact_at).toISOString() : null)}</p></div>
          <div className="rounded-xl bg-gray-50 p-2"><p className="text-gray-500">Next conversation</p><p className="font-semibold text-gray-900">{p.next_conversation_at ? dayLabel(new Date(p.next_conversation_at).toISOString()) : 'None booked'}</p></div>
        </div>
        {p.quiet ? <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-800">Quiet for {p.quiet.days} days. The line for their tier is {p.quiet.limit}.</p> : null}
        {p.next_moves?.length ? (
          <div className="mt-3 rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Suggested next moves</p>
            <NextMoves moves={p.next_moves} />
          </div>
        ) : null}
        {showHealth ? <HealthDetail person={p} onPerson={onPerson} busy={busy} /> : null}
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Stage</p>
        <div className="mt-1 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {data.stages.map((s) => (
            <button key={s.key} type="button" disabled={busy} onClick={() => onPerson('stage', { stage: s.key })} className={`min-h-[36px] shrink-0 rounded-full px-3 text-xs font-semibold ${p.stage === s.key ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      <PersonCrmBox key={`crm-${p.stage}`} email={email} />

      <nav className="sticky top-[52px] z-10 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 bg-gray-50/95 px-4 backdrop-blur md:top-[73px]" aria-label="Client sections">
        {TABS.map(([key, label]) => {
          const dot = (key === 'now' && p.needs.length) || (key === 'research' && p.web_watch?.unseen) || (key === 'profile' && p.details.some((d) => d.status === 'suggested')) || (key === 'archy' && p.archy_waiting > 0);
          return (
            <button key={key} type="button" onClick={() => setTab(key)} className={`relative min-h-[44px] shrink-0 px-3 text-sm ${tab === key ? 'border-b-2 border-gray-900 font-semibold text-gray-900' : 'text-gray-600'}`}>
              {label}
              {dot ? <span className="absolute right-1 top-2 h-1.5 w-1.5 rounded-full bg-[#DB0812]" /> : null}
            </button>
          );
        })}
      </nav>

      {tab === 'now' ? <NowTab person={p} onSession={onSession} onPerson={onPerson} busy={busy} /> : null}
      {tab === 'conversations' ? <ConversationsTab person={p} onSession={onSession} busy={busy} /> : null}
      {tab === 'messages' ? <Card><Heading>Everything so far</Heading><Timeline email={p.email} /></Card> : null}
      {tab === 'profile' ? <ProfileTab person={p} tiers={data.tiers} onPerson={onPerson} busy={busy} /> : null}
      {tab === 'research' ? <ResearchTab person={p} onSession={onSession} onPerson={onPerson} busy={busy} /> : null}
      {tab === 'notes' ? <NotesTab person={p} onPerson={onPerson} busy={busy} /> : null}
      {tab === 'archy' ? <ArchyTab person={p} onPerson={onPerson} busy={busy} /> : null}
    </div>
  );
}

const VIEWS = [
  ['today', 'Today'],
  ['people', 'People'],
  ['pipeline', 'Pipeline'],
  ['ask', 'Ask'],
];

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  return { email: params.get('c'), view: VIEWS.some(([k]) => k === view) ? view : 'today' };
}

export default function AOClients() {
  const authed = useAuth();
  const [where, setWhere] = useState(readUrl);
  useEffect(() => {
    // The old address keeps working; the CRM lives at /ao/crm now.
    if (window.location.pathname === '/ao/clients') window.history.replaceState({}, '', `/ao/crm${window.location.search}${window.location.hash}`);
    const onPop = () => setWhere(readUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  if (!authed) return null;
  const { email, view } = where;
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <AOHeader active="clients" onNavigate={go} />
      <main className="container mx-auto max-w-3xl px-4 py-4">
        {email ? (
          <Person key={email} email={email} />
        ) : (
          <>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">CRM</h1>
              <p className="text-xs text-gray-500">Nothing goes to anyone until you approve it.</p>
            </div>
            <nav className="sticky top-[52px] z-10 -mx-4 mb-4 grid grid-cols-4 border-b border-gray-200 bg-gray-50/95 px-2 backdrop-blur md:top-[73px]" aria-label="CRM views">
              {VIEWS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => go(key === 'today' ? '/ao/crm' : `/ao/crm?view=${key}`)}
                  aria-current={view === key ? 'page' : undefined}
                  className={`min-h-[48px] text-sm ${view === key ? 'border-b-2 border-[#DB0812] font-semibold text-gray-900' : 'text-gray-600'}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            {view === 'today' ? (
              <>
                <TodayView />
                <div className="mt-10 border-t border-gray-200 pt-6">
                  <Home compact />
                </div>
              </>
            ) : null}
            {view === 'people' ? <PeopleView /> : null}
            {view === 'pipeline' ? <PipelineView /> : null}
            {view === 'ask' ? <AskView /> : null}
          </>
        )}
      </main>
    </div>
  );
}
