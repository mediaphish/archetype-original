/**
 * The CRM's own views (notes/PLAN-crm.md): Today, People, Pipeline, Ask, and
 * the CRM box on each person (call, text, email, what they are to Bart, how
 * they found him, and the next step with its owner).
 *
 * Bart, 2026-10-25: "I want to be able to open the page, know what to do, or
 * have an AI I can ask about it quickly." And: "I would bet 70% of the time I
 * will be working this system from my phone." So every view here is laid out
 * for a phone first: one column, thumb-sized buttons, nothing that needs a
 * hover.
 *
 * Server: api/ao/crm.js (lib/calendly/crm.js) and api/ao/crm-ask.js.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatMarkdown from '../ChatMarkdown.jsx';
import { avatarFor } from '../teamAvatars.js';

export function go(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export const personPath = (email) => `/ao/crm?c=${encodeURIComponent(email)}`;

const OWNER_NAMES = { bart: 'You', auto: 'Auto', jot: 'Jot', reach: 'Reach', producer: 'Cam' };

function ago(iso) {
  if (!iso) return 'no contact yet';
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  return `${Math.round(days / 30)} months ago`;
}

function dueLabel(due) {
  if (!due) return '';
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  if (due === today) return 'today';
  if (due === tomorrow) return 'tomorrow';
  const d = new Date(`${due}T12:00:00`);
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return due < today ? `was due ${label}` : label;
}

function telOf(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

async function getJson(url) {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || 'Could not load');
  return j;
}

async function postCrm(body) {
  const r = await fetch('/api/ao/crm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || 'That did not work');
  return j;
}

function Initials({ name }) {
  const parts = String(name || '?').trim().split(/\s+/);
  const text = ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white" aria-hidden>
      {text || '?'}
    </span>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[36px] shrink-0 rounded-full px-3 text-xs font-semibold ${on ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}
    >
      {children}
    </button>
  );
}

function Loading() {
  return <p className="py-6 text-sm text-gray-500">Loading…</p>;
}

function Problem({ children }) {
  return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{children}</p>;
}

/** Call, text and email, sized for a thumb. */
export function ContactButtons({ email, phone, small = false }) {
  const tel = telOf(phone);
  const cls = `inline-flex ${small ? 'min-h-[36px] px-3 text-xs' : 'min-h-[44px] px-4 text-sm'} items-center justify-center rounded-full border border-gray-300 bg-white font-semibold text-gray-800`;
  const stop = (e) => e.stopPropagation();
  return (
    <div className="flex flex-wrap gap-2">
      {tel ? (
        <a href={`tel:${tel}`} onClick={stop} className={cls}>
          Call
        </a>
      ) : null}
      {tel ? (
        <a href={`sms:${tel}`} onClick={stop} className={cls}>
          Text
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} onClick={stop} className={cls}>
          Email
        </a>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- Today

const KIND_LABEL = {
  approve_email: 'Email to approve',
  answer_team: 'The team needs you',
  reply: 'Reply owed',
  next_step: 'Your next step',
  prepare: 'Call coming up',
  send_follow_up: 'Follow-up',
  add_transcript: 'Transcript',
  approve_checkins: 'Check-ins',
  confirm_details: 'Details',
  archy_handoff: 'Archy',
  reach_out: 'Gone quiet',
  schedule_podcast: 'Podcast',
  match_transcript: 'Transcript',
};

const BAND = [
  { priority: 1, title: 'Now' },
  { priority: 2, title: 'Today' },
  { priority: 3, title: 'This week' },
  { priority: 4, title: 'When you have a moment' },
];

function TodayItem({ item, onChanged }) {
  const [busy, setBusy] = useState(false);
  const open = () => {
    if (item.go) {
      if (item.go.startsWith('/ao/crm')) {
        go(item.go.split('#')[0]);
        const hash = item.go.split('#')[1];
        if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 600);
      } else window.location.href = item.go;
    } else if (item.email) go(personPath(item.email));
  };
  const done = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      await postCrm({ action: 'update', email: item.email, next_step: null });
      onChanged();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  };
  const contact = item.kind === 'reply' || item.kind === 'reach_out' || item.kind === 'next_step';
  return (
    <div role="button" tabIndex={0} onClick={open} onKeyDown={(e) => e.key === 'Enter' && open()} className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 hover:border-gray-400">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{KIND_LABEL[item.kind] || 'To do'}</p>
          <p className="mt-0.5 font-semibold leading-snug text-gray-900">{item.title}</p>
          {item.why ? <p className="mt-0.5 text-sm leading-snug text-gray-600">{item.why}</p> : null}
        </div>
        <span className="pt-4 text-gray-300" aria-hidden>
          ›
        </span>
      </div>
      {contact || item.kind === 'next_step' ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {contact ? <ContactButtons email={item.email} phone={item.phone} small /> : null}
          {item.kind === 'next_step' ? (
            <button type="button" disabled={busy} onClick={done} className="inline-flex min-h-[36px] items-center rounded-full bg-gray-900 px-3 text-xs font-semibold text-white disabled:opacity-50">
              {busy ? 'Saving…' : 'Mark done'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TodayView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => getJson('/api/ao/crm?view=today').then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);
  if (error) return <Problem>{error}</Problem>;
  if (!data) return <Loading />;
  const items = data.items || [];
  return (
    <div className="space-y-6">
      {!items.length ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="font-semibold text-gray-900">Nothing needs you right now.</p>
          <p className="mt-1 text-sm text-gray-600">Replies, follow-ups, calls and emails to approve show up here as they come in.</p>
        </div>
      ) : null}
      {BAND.map((b) => {
        const list = items.filter((i) => i.priority === b.priority);
        if (!list.length) return null;
        return (
          <section key={b.priority}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
              {b.title} <span className="text-gray-400">({list.length})</span>
            </h2>
            <div className="space-y-2">
              {list.map((i) => (
                <TodayItem key={i.key} item={i} onChanged={load} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- People

function AddPerson({ data, onAdded, onCancel }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', relationship: 'contact', source: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const j = await postCrm({ action: 'add', ...f, source: f.source || null });
      onAdded(j.email);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const input = 'w-full rounded-xl border border-gray-300 bg-white p-3 text-base';
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
      <p className="font-semibold text-gray-900">Add someone</p>
      <input value={f.name} onChange={set('name')} placeholder="Name" className={input} autoComplete="off" />
      <input value={f.email} onChange={set('email')} placeholder="Email" type="email" inputMode="email" className={input} autoComplete="off" />
      <input value={f.phone} onChange={set('phone')} placeholder="Phone (optional)" type="tel" inputMode="tel" className={input} autoComplete="off" />
      <div className="grid grid-cols-2 gap-2">
        <select value={f.relationship} onChange={set('relationship')} className={input} aria-label="What they are to you">
          {data.relationships.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <select value={f.source} onChange={set('source')} className={input} aria-label="How they found you">
          <option value="">How they found you</option>
          {data.sources.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <textarea value={f.note} onChange={set('note')} placeholder="A note (optional)" className={`${input} min-h-[80px]`} />
      {error ? <Problem>{error}</Problem> : null}
      <div className="flex gap-2">
        <button type="button" disabled={busy || !f.email.trim()} onClick={save} className="min-h-[44px] rounded-full bg-[#DB0812] px-5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Adding…' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} className="min-h-[44px] rounded-full border border-gray-300 px-4 text-sm font-semibold text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

function PersonRow({ p, data }) {
  const rel = data.relationships.find((r) => r.key === p.relationship)?.label;
  const stage = data.stages.find((s) => s.key === p.stage)?.label;
  const line = p.reply_owed
    ? `Wrote ${p.reply_owed.days === 0 ? 'today' : p.reply_owed.days === 1 ? 'yesterday' : `${p.reply_owed.days} days ago`}`
    : p.next_step
      ? `Next: ${p.next_step.what}${p.next_step.due ? `, ${dueLabel(p.next_step.due)}` : ''}${p.next_step.owner !== 'bart' ? ` (${OWNER_NAMES[p.next_step.owner]})` : ''}`
      : p.quiet
        ? `Quiet for ${p.quiet.days} days`
        : `Last contact ${ago(p.last_contact_at)}`;
  return (
    <button type="button" onClick={() => go(personPath(p.email))} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50">
      <Initials name={p.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900">{p.name}</p>
        <p className="truncate text-xs text-gray-500">{[rel, stage, p.company].filter(Boolean).join(' · ')}</p>
        <p className={`truncate text-sm ${p.reply_owed || p.quiet ? 'text-red-700' : 'text-gray-700'}`}>{line}</p>
      </div>
      {p.reply_owed || p.needs ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#DB0812]" aria-label="Needs you" /> : null}
      <span className="text-gray-300" aria-hidden>
        ›
      </span>
    </button>
  );
}

export function PeopleView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [rel, setRel] = useState('all');
  const [only, setOnly] = useState('');
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => getJson('/api/ao/crm?view=people').then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.people.filter(
      (p) =>
        (rel === 'all' || p.relationship === rel) &&
        (!only || (only === 'owed' && p.reply_owed) || (only === 'quiet' && p.quiet) || (only === 'next' && p.next_step)) &&
        (!term || [p.name, p.email, p.company, p.role].filter(Boolean).join(' ').toLowerCase().includes(term))
    );
  }, [data, q, rel, only]);

  if (error) return <Problem>{error}</Problem>;
  if (!data) return <Loading />;
  const count = (key) => data.people.filter((p) => p.relationship === key).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${data.people.length} people`} type="search" className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white p-3 text-base" />
        <button type="button" onClick={() => setAdding((v) => !v)} className="min-h-[44px] shrink-0 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white">
          {adding ? 'Close' : 'Add'}
        </button>
      </div>
      {adding ? (
        <AddPerson
          data={data}
          onCancel={() => setAdding(false)}
          onAdded={(email) => {
            setAdding(false);
            go(personPath(email));
          }}
        />
      ) : null}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip on={rel === 'all'} onClick={() => setRel('all')}>
          Everyone ({data.people.length})
        </Chip>
        {data.relationships
          .filter((r) => count(r.key))
          .map((r) => (
            <Chip key={r.key} on={rel === r.key} onClick={() => setRel(r.key)}>
              {r.label} ({count(r.key)})
            </Chip>
          ))}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[
          ['owed', 'Reply owed'],
          ['next', 'Has a next step'],
          ['quiet', 'Gone quiet'],
        ].map(([k, label]) => (
          <Chip key={k} on={only === k} onClick={() => setOnly((v) => (v === k ? '' : k))}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {rows.map((p) => (
          <PersonRow key={p.email} p={p} data={data} />
        ))}
        {!rows.length ? <p className="p-4 text-sm text-gray-500">No one matches.</p> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pipeline

export function PipelineView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => {
    getJson('/api/ao/crm?view=pipeline').then(setData).catch((e) => setError(e.message));
  }, []);
  if (error) return <Problem>{error}</Problem>;
  if (!data) return <Loading />;
  return (
    <div className="space-y-2 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
      {data.stages.map((s) => {
        const isOpen = open === s.key || (typeof window !== 'undefined' && window.innerWidth >= 768);
        return (
          <section key={s.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <button type="button" onClick={() => setOpen((v) => (v === s.key ? null : s.key))} className="flex min-h-[52px] w-full items-center justify-between px-4 text-left">
              <span className="font-semibold text-gray-900">{s.label}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${s.people.length ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{s.people.length}</span>
            </button>
            {isOpen && s.people.length ? (
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {s.people.map((p) => (
                  <li key={p.email}>
                    <button type="button" onClick={() => go(personPath(p.email))} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900">{p.name}</span>
                        <span className="block truncate text-xs text-gray-500">{p.next_step ? `Next: ${p.next_step.what}` : `Last contact ${ago(p.last_contact_at)}`}</span>
                      </span>
                      <span className="text-gray-300" aria-hidden>
                        ›
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- Ask

const STARTERS = ['What do I need to do today?', 'Who should I follow up with this week?', 'Who has gone quiet?', 'Which podcast guests still need to be scheduled?'];

export function AskView() {
  const [messages, setMessages] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [text, setText] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const end = useRef(null);

  useEffect(() => {
    getJson('/api/ao/crm-ask')
      .then((j) => {
        setMessages(j.messages || []);
        setThreadId(j.thread_id);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, asking]);

  const ask = async (question) => {
    const qText = String(question || '').trim();
    if (!qText || asking) return;
    setText('');
    setError('');
    setAsking(true);
    setMessages((m) => [...(m || []), { id: `local-${Date.now()}`, role: 'user', text: qText }]);
    try {
      const r = await fetch('/api/ao/crm-ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: qText }) });
      const j = await r.json().catch(() => ({}));
      if (j.messages) setMessages(j.messages);
      if (j.thread_id) setThreadId(j.thread_id);
      if (!j.ok) setError(j.error || 'Auto could not answer that just now.');
    } catch (e) {
      setError('Auto could not answer that just now. Try again in a moment.');
    } finally {
      setAsking(false);
    }
  };

  if (!messages && !error) return <Loading />;
  const list = messages || [];
  return (
    <div className="flex flex-col">
      <div className="space-y-3 pb-4">
        {!list.length ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <img src={avatarFor('auto')} alt="" aria-hidden="true" className="h-8 w-8 rounded-full object-cover" />
              <p className="font-semibold text-gray-900">Ask Auto about anyone you work with.</p>
            </div>
            <p className="mt-2 text-sm text-gray-600">Answers come from the CRM: their messages, calls, notes and next steps. Emails Auto writes wait in the Queue for you.</p>
          </div>
        ) : null}
        {list.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="ml-10 rounded-2xl rounded-br-md bg-gray-900 px-4 py-3 text-sm text-white">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="mr-4 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900">
              <ChatMarkdown text={m.text} />
            </div>
          )
        )}
        {asking ? (
          <div className="mr-4 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">Looking through the CRM… this can take a minute.</div>
        ) : null}
        {error ? <Problem>{error}</Problem> : null}
        {threadId && list.length ? (
          <a href={`/ao/analyst?thread=${threadId}`} className="block text-center text-xs font-semibold text-gray-500 underline">
            Continue this in the Auto chat
          </a>
        ) : null}
        <div ref={end} />
      </div>

      <div className="sticky bottom-[calc(68px+env(safe-area-inset-bottom,0px))] -mx-4 border-t border-gray-200 bg-gray-50/95 px-4 pb-3 pt-2 backdrop-blur md:bottom-0">
        <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
          {STARTERS.map((s) => (
            <Chip key={s} on={false} onClick={() => ask(s)}>
              {s}
            </Chip>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="flex gap-2"
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about anyone" className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white p-3 text-base" enterKeyHint="send" />
          <button type="submit" disabled={asking || !text.trim()} className="min-h-[44px] shrink-0 rounded-xl bg-[#DB0812] px-4 text-sm font-semibold text-white disabled:opacity-50">
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- On each person

/** Call, text, email; what they are to Bart; how they found him; the next step and who owns it. */
export function PersonCrmBox({ email }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState({ what: '', due: '', owner: 'bart' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(
    () =>
      getJson(`/api/ao/crm?view=person&email=${encodeURIComponent(email)}`)
        .then((j) => {
          setData(j);
          const n = j.person.crm.next_step;
          setStep({ what: n?.what || '', due: n?.due || '', owner: n?.owner || 'bart' });
        })
        .catch((e) => setError(e.message)),
    [email]
  );
  useEffect(() => {
    load();
  }, [load]);

  const save = async (change, message = '') => {
    setBusy(true);
    setNotice('');
    try {
      const j = await postCrm({ action: 'update', email, ...change });
      if (j.handed) setNotice(`Handed to ${OWNER_NAMES[j.handed.agent]}. You will see it on the Team board, and anything it writes waits for you in the Queue.`);
      else if (message) setNotice(message);
      setEditing(false);
      await load();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Problem>{error}</Problem>;
  if (!data) return null;
  const c = data.person.crm;
  const next = c.next_step;
  const select = 'min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-3 text-base';

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
      <ContactButtons email={data.person.email} phone={data.person.phone || c.phone} />
      {c.reply_owed ? (
        <p className="rounded-xl bg-red-50 p-2 text-sm text-red-800">
          They wrote {c.reply_owed.days === 0 ? 'today' : c.reply_owed.days === 1 ? 'yesterday' : `${c.reply_owed.days} days ago`}
          {c.reply_owed.subject ? `: ${c.reply_owed.subject}` : ''}. Nothing has gone back yet.
        </p>
      ) : null}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Next step</p>
        {!editing ? (
          next ? (
            <div className="mt-1 flex items-start justify-between gap-3">
              <p className="text-sm text-gray-900">
                <strong>{next.what}</strong>
                <span className="text-gray-600">
                  {next.due ? `, ${dueLabel(next.due)}` : ''} · {OWNER_NAMES[next.owner]}
                </span>
              </p>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => setEditing(true)} className="min-h-[36px] rounded-full border border-gray-300 px-3 text-xs font-semibold text-gray-700">
                  Change
                </button>
                <button type="button" disabled={busy} onClick={() => save({ next_step: null }, 'Marked done.')} className="min-h-[36px] rounded-full bg-gray-900 px-3 text-xs font-semibold text-white disabled:opacity-50">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="mt-1 min-h-[44px] w-full rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-600">
              Set a next step
            </button>
          )
        ) : (
          <div className="mt-2 space-y-2">
            <input value={step.what} onChange={(e) => setStep((s) => ({ ...s, what: e.target.value }))} placeholder="What happens next" className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={step.due} onChange={(e) => setStep((s) => ({ ...s, due: e.target.value }))} className={select} aria-label="When" />
              <select value={step.owner} onChange={(e) => setStep((s) => ({ ...s, owner: e.target.value }))} className={select} aria-label="Who owns it">
                {data.owners.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.key === 'bart' ? 'You' : o.label}
                  </option>
                ))}
              </select>
            </div>
            {step.owner !== 'bart' ? <p className="text-xs text-gray-500">{OWNER_NAMES[step.owner]} starts on it as soon as you save. Anything that goes to this person waits for your approval.</p> : null}
            <div className="flex gap-2">
              <button type="button" disabled={busy || !step.what.trim()} onClick={() => save({ next_step: { what: step.what, due: step.due || null, owner: step.owner } })} className="min-h-[44px] rounded-full bg-[#DB0812] px-5 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="min-h-[44px] rounded-full border border-gray-300 px-4 text-sm font-semibold text-gray-700">
                Cancel
              </button>
            </div>
          </div>
        )}
        {notice ? <p className="mt-2 text-sm text-green-800">{notice}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">What they are to you</span>
          <select value={c.relationship} disabled={busy} onChange={(e) => save({ relationship: e.target.value })} className={`mt-1 ${select}`}>
            {data.relationships.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">How they found you</span>
          <select value={c.source || ''} disabled={busy} onChange={(e) => save({ source: e.target.value || null })} className={`mt-1 ${select}`}>
            <option value="">Not set</option>
            {data.sources.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
