import React, { useCallback, useEffect, useState } from 'react';
import { avatarFor } from './teamAvatars.js';

/**
 * Emails the team wrote, waiting on Bart at the top of the Queue. Nothing goes
 * out until he approves (2026-10-25: "Show me first for now"). Approved emails
 * leave from his own Gmail within about five minutes.
 */

/** Whether the email was read against what is on record about the person. */
function AccuracyNote({ accuracy, onRecheck, busy }) {
  const ok = accuracy?.checked && !(accuracy.issues || []).length;
  const issues = accuracy?.issues || [];
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${ok ? 'border-green-200 bg-green-50 text-green-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      {ok ? <p>Checked against what is on record. Nothing unsupported.</p> : null}
      {!accuracy ? <p>Not checked against the record yet.</p> : null}
      {accuracy && !accuracy.checked ? <p>{accuracy.note || 'The accuracy check could not run.'}</p> : null}
      {issues.length ? (
        <ul className="list-none space-y-1 pl-0">
          {issues.map((i, k) => (
            <li key={k}>
              <span className="font-semibold">"{i.quote}"</span> {i.why}
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" disabled={busy} onClick={onRecheck} className="mt-1 text-xs font-semibold underline disabled:opacity-50">
        {busy ? 'Checking…' : 'Check again'}
      </button>
    </div>
  );
}

function EmailCard({ email, onDone }) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [accuracy, setAccuracy] = useState(email.accuracy || null);

  const recheck = async () => {
    setBusy('recheck');
    try {
      const res = await fetch('/api/ao/team/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recheck', id: email.id, subject, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.ok) setAccuracy(json.accuracy);
    } finally {
      setBusy('');
    }
  };

  const act = async (action) => {
    setBusy(action);
    try {
      const res = await fetch('/api/ao/team/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: email.id, subject, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'That did not work');
      setResult(action === 'approve' ? 'Approved. It goes out from your Gmail within about five minutes.' : 'Discarded. Nothing was sent.');
      setTimeout(onDone, 1500);
    } catch (e) {
      setResult(e.message || 'That did not work');
    } finally {
      setBusy('');
    }
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <img src={avatarFor(email.agent)} alt="" aria-hidden="true" className="w-9 h-9 rounded-full object-cover bg-orange-50 border border-orange-100" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {email.agent_name} wrote to {email.to_name ? `${email.to_name} ` : ''}
            <span className="font-normal text-gray-500">({email.to_email})</span>
          </p>
          {email.purpose ? <p className="text-xs text-gray-500">{email.purpose}</p> : null}
        </div>
      </div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Subject</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[200px] w-full rounded-lg border border-gray-300 p-3 text-sm leading-relaxed" />
      <AccuracyNote accuracy={accuracy} onRecheck={recheck} busy={busy === 'recheck'} />
      <p className="text-xs text-gray-500">Sends from bart@archetypeoriginal.com as "{email.agent_name}, for Bart Paden". Replies come to your inbox.</p>
      {result ? (
        <p className="text-sm font-medium text-gray-800">{result}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!!busy} onClick={() => act('approve')} className="min-h-[44px] rounded-lg bg-red-600 px-5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === 'approve' ? 'Approving…' : 'Approve and send'}
          </button>
          <button type="button" disabled={!!busy} onClick={() => act('discard')} className="min-h-[44px] rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 disabled:opacity-50">
            Discard
          </button>
        </div>
      )}
    </article>
  );
}

export default function OutboxReview() {
  const [data, setData] = useState(null);
  const load = useCallback(
    () =>
      fetch('/api/ao/team/outbox')
        .then((r) => r.json())
        .then((j) => setData(j.ok ? j : { waiting: [], on_the_way: [], recent: [], error: j.error }))
        .catch((e) => setData({ waiting: [], on_the_way: [], recent: [], error: e.message })),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (window.location.hash !== '#emails') return;
    const t = setTimeout(() => document.getElementById('emails')?.scrollIntoView({ behavior: 'smooth' }), 600);
    return () => clearTimeout(t);
  }, []);

  if (!data) return null;
  if (!data.waiting.length && !data.on_the_way.length && !data.recent.length && !data.error) return null;

  return (
    <section id="emails" className="mb-8 scroll-mt-24">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Emails waiting on you {data.waiting.length ? `(${data.waiting.length})` : ''}</h2>
      <p className="text-sm text-gray-600 mb-3">Written by the team, sent from your Gmail only after you approve.</p>
      {data.error ? <p className="mb-2 text-sm text-red-700">{data.error}</p> : null}
      <div className="space-y-4">
        {data.waiting.map((e) => (
          <EmailCard key={e.id} email={e} onDone={load} />
        ))}
      </div>
      {data.on_the_way.length ? (
        <p className="mt-3 text-sm text-gray-600">On the way: {data.on_the_way.map((e) => `${e.subject} to ${e.to_name || e.to_email}`).join('; ')}</p>
      ) : null}
      {data.recent.length ? (
        <p className="mt-2 text-sm text-gray-500">
          Recently: {data.recent.map((e) => `${e.status === 'sent' ? 'Sent' : 'Could not send'}, ${e.subject} to ${e.to_name || e.to_email}`).join('; ')}
        </p>
      ) : null}
    </section>
  );
}
