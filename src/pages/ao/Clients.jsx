/**
 * Auto > Clients (/ao/clients).
 *
 * Bart, 2026-10-23: follow-ups move out of email and into Auto. Three parts:
 *   Waiting on you   calls that are over with nothing sent yet: edit and send
 *                    the thank-you, or send the re-invite if they did not show
 *   Upcoming         booked conversations with the researched brief
 *   Everyone         by stage, moved with one tap
 * Server: api/ao/clients.js. Nothing reaches a client until Bart presses Send.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';

function navigateTo(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function when(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

const REINVITE = (name) =>
  `Hi ${firstName(name)},\n\nIt looks like we missed each other. No problem at all. Things come up.\n\nIf you still want to talk, you can pick a new time here: https://calendly.com/bartpaden/a-conversation-with-bart\n\nBart`;

const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold';
const btnRed = `${btn} bg-[#DB0812] text-white hover:opacity-90 disabled:opacity-50`;
const btnGray = `${btn} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50`;

function Section({ title, count, children }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        {title} {typeof count === 'number' ? <span className="text-gray-400">({count})</span> : null}
      </h2>
      {children}
    </section>
  );
}

function WhatTheyWrote({ items }) {
  if (!items?.length) return <p className="text-sm text-gray-500">They did not add anything beyond the booking.</p>;
  return (
    <div className="space-y-3">
      {items.map((x) => (
        <div key={x.question}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{x.question}</p>
          <p className="whitespace-pre-wrap text-sm text-gray-900">{x.answer}</p>
        </div>
      ))}
    </div>
  );
}

function Research({ client, onAction, busy }) {
  if (!client.research_at) {
    return <p className="text-sm text-gray-500">Research runs within 15 minutes of booking.</p>;
  }
  return (
    <div>
      {client.research_brief ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">{client.research_brief}</div>
      ) : (
        <p className="text-sm text-amber-800">The research did not come through{client.research_error ? `: ${client.research_error}` : ''}.</p>
      )}
      <button type="button" disabled={busy} onClick={() => onAction(client, 'research')} className={`mt-3 ${btnGray}`}>
        {busy ? 'Researching… (a minute or two)' : 'Research again'}
      </button>
    </div>
  );
}

function Notes({ client, onAction, busy }) {
  const [text, setText] = useState(client.notes || '');
  useEffect(() => setText(client.notes || ''), [client.notes]);
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What you talked about, what to remember next time."
        className="min-h-[96px] w-full rounded-lg border border-gray-300 p-3 text-sm"
      />
      <button
        type="button"
        disabled={busy || text === (client.notes || '')}
        onClick={() => onAction(client, 'notes', { notes: text })}
        className={`mt-2 ${btnGray}`}
      >
        Save notes
      </button>
    </div>
  );
}

function StagePicker({ client, stages, onAction, busy }) {
  return (
    <div className="flex flex-wrap gap-2">
      {stages.map((s) => (
        <button
          key={s.key}
          type="button"
          disabled={busy}
          onClick={() => onAction(client, 'stage', { stage: s.key })}
          className={`min-h-[36px] rounded-full px-3 text-xs font-semibold ${
            client.stage === s.key ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function FollowUp({ client, onAction, busy }) {
  const [mode, setMode] = useState('thank_you');
  const [subject, setSubject] = useState('Thank you');
  const [text, setText] = useState(client.thank_you_draft || '');
  useEffect(() => {
    if (mode === 'thank_you') {
      setSubject('Thank you');
      setText(client.thank_you_draft || '');
    } else {
      setSubject('Sorry we missed each other');
      setText(REINVITE(client.name));
    }
  }, [mode, client.thank_you_draft, client.name]);

  return (
    <div className="rounded-xl border border-[#DB0812]/30 bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode('thank_you')} className={mode === 'thank_you' ? btnRed : btnGray}>
          Thank-you
        </button>
        <button type="button" onClick={() => setMode('reinvite')} className={mode === 'reinvite' ? btnRed : btnGray}>
          They did not show
        </button>
      </div>
      {mode === 'thank_you' && !client.thank_you_draft ? (
        <div>
          <p className="mb-2 text-sm text-gray-600">The draft is written about two hours after the call starts.</p>
          <button type="button" disabled={busy} onClick={() => onAction(client, 'draft')} className={btnGray}>
            {busy ? 'Drafting…' : 'Draft it now'}
          </button>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs text-gray-500">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mb-3 w-full rounded-lg border border-gray-300 p-2 text-sm" />
          <label className="mb-1 block text-xs text-gray-500">Message to {client.email}, from you. Replies come to you, and you are copied.</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[200px] w-full rounded-lg border border-gray-300 p-3 text-sm leading-relaxed" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !text.trim()}
              onClick={() => {
                if (window.confirm(`Send this to ${client.name}?`)) onAction(client, 'send', { kind: mode, subject, text });
              }}
              className={btnRed}
            >
              Send to {firstName(client.name)}
            </button>
            {mode === 'thank_you' ? (
              <button type="button" disabled={busy} onClick={() => onAction(client, 'draft')} className={btnGray}>
                Redraft
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={() => onAction(client, 'dismiss')} className={btnGray}>
              No follow-up needed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function Badge({ tone = 'gray', children }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-50 text-green-800',
    red: 'bg-red-50 text-red-800',
    amber: 'bg-amber-50 text-amber-900',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function Permissions({ client }) {
  const one = (label, v) => (
    <Badge tone={v === 'yes' ? 'green' : v === 'no' ? 'red' : 'gray'}>
      {label}: {v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'not yet'}
    </Badge>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {one('Record', client.consent?.record)}
      {one('Private Archy', client.consent?.archy)}
      {one('Check-ins', client.consent?.checkins)}
      {client.podcast_interest ? (
        <Badge tone={client.podcast_interest === 'yes' ? 'amber' : 'gray'}>
          Podcast: {client.podcast_interest === 'yes' ? 'open to it' : client.podcast_interest === 'maybe' ? 'maybe later' : 'not for them'}
        </Badge>
      ) : null}
      <Badge>
        {client.prep_submitted_at
          ? `Before we talk: filled out ${new Date(client.prep_submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : client.prep_email_sent_at && client.prep_email_sent_at !== 'not needed'
            ? 'Before we talk: sent, not filled out yet'
            : 'Before we talk: not sent'}
      </Badge>
    </div>
  );
}

function PrepAnswers({ prep }) {
  if (!prep) return null;
  const rows = [
    ['Company', prep.company],
    ['Role', prep.role],
    ['Website', prep.website],
    ['LinkedIn', prep.linkedin],
    ['Texts', prep.texts_ok ? 'Text messages are fine' : null],
    ['What would make our time worth it', prep.worth_it],
    ['How they work through hard things', prep.how_you_work],
    ['Anything else', prep.anything_else],
  ].filter(([, v]) => String(v || '').trim());
  if (!rows.length) return null;
  return (
    <div className="space-y-3">
      {rows.map(([q, a]) => (
        <div key={q}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{q}</p>
          <p className="whitespace-pre-wrap text-sm text-gray-900">{a}</p>
        </div>
      ))}
    </div>
  );
}

function TranscriptBox({ client, onAction, busy }) {
  const [text, setText] = useState('');
  if (client.consent?.record === 'no') {
    return <p className="text-sm text-gray-600">{firstName(client.name)} said no to recording, so transcripts are off for them. Use Notes instead.</p>;
  }
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  };
  return (
    <div>
      {client.has_transcript ? (
        <p className="mb-2 text-sm text-green-700">Transcript added {new Date(client.transcript_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Adding another replaces the summary and plan.</p>
      ) : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the transcript here, or choose a file below (.txt, .vtt, .srt, .md)."
        className="min-h-[120px] w-full rounded-lg border border-gray-300 p-3 text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="file" accept=".txt,.vtt,.srt,.md,text/plain" onChange={onFile} className="text-sm" />
        <button type="button" disabled={busy || text.trim().length < 200} onClick={() => onAction(client, 'transcript', { text })} className={btnRed}>
          {busy ? 'Reading the conversation… (a minute or two)' : 'Read the transcript'}
        </button>
      </div>
    </div>
  );
}

function Analysis({ analysis }) {
  if (!analysis) return null;
  const list = (items) => (items?.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-gray-900">{items.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-sm text-gray-500">None.</p>);
  return (
    <div className="space-y-4 rounded-xl bg-gray-50 p-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Summary (just for you)</p>
        <p className="whitespace-pre-wrap text-sm text-gray-900">{analysis.summary}</p>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Key points</p>
        {list(analysis.key_points)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Their action items</p>
          {list(analysis.action_items?.theirs)}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Yours</p>
          {list(analysis.action_items?.bart)}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Worth asking next time</p>
        {list(analysis.next_time)}
      </div>
    </div>
  );
}

function PlanItem({ client, item, onAction, busy }) {
  const [text, setText] = useState(item.text);
  const [date, setDate] = useState(item.send_at ? item.send_at.slice(0, 10) : '');
  useEffect(() => {
    setText(item.text);
    setDate(item.send_at ? item.send_at.slice(0, 10) : '');
  }, [item.text, item.send_at]);
  const editable = item.status === 'draft' || item.status === 'approved';
  const changed = text !== item.text || date !== (item.send_at || '').slice(0, 10);
  const tone = { draft: 'gray', approved: 'amber', sent: 'green', stopped: 'red' }[item.status] || 'gray';
  const label = { draft: 'Waiting for your OK', approved: 'Approved, sends on its date', sent: 'Sent', stopped: 'Stopped' }[item.status];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{label}</Badge>
        <span className="text-xs text-gray-500">{item.reason}</span>
      </div>
      <label className="mb-1 block text-xs text-gray-500">Send on</label>
      <input type="date" value={date} disabled={!editable} onChange={(e) => setDate(e.target.value)} className="mb-2 rounded-lg border border-gray-300 p-2 text-sm" />
      <textarea value={text} disabled={!editable} onChange={(e) => setText(e.target.value)} className="min-h-[120px] w-full rounded-lg border border-gray-300 p-3 text-sm leading-relaxed disabled:bg-gray-50" />
      {editable ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {changed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(client, 'plan_update', { items: [{ id: item.id, text, send_at: date ? `${date}T15:00:00Z` : item.send_at }] })}
              className={btnGray}
            >
              Save changes
            </button>
          ) : null}
          {item.status === 'draft' && !changed ? (
            <button type="button" disabled={busy || client.consent?.checkins === 'no'} onClick={() => onAction(client, 'plan_approve', { item_id: item.id })} className={btnRed}>
              Approve
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CheckinPlan({ client, onAction, busy }) {
  const plan = client.checkin_plan || [];
  if (!plan.length) return <p className="text-sm text-gray-500">A plan is drafted after you add a transcript.</p>;
  return (
    <div className="space-y-3">
      {client.consent?.checkins === 'no' ? <p className="text-sm text-red-800">{firstName(client.name)} said no to check-ins. Nothing here will send.</p> : null}
      <p className="text-sm text-gray-600">Each one sends on its date only after you approve it. Replies come to your email.</p>
      {plan.map((item) => (
        <PlanItem key={item.id} client={client} item={item} onAction={onAction} busy={busy} />
      ))}
      {!client.checkins_stopped_at && plan.some((x) => x.status === 'draft' || x.status === 'approved') ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Stop all remaining check-ins for ${client.name}?`)) onAction(client, 'plan_stop');
          }}
          className={btnGray}
        >
          Stop all check-ins
        </button>
      ) : null}
    </div>
  );
}

const EVENT_LABELS = {
  prep_email_sent: 'Before we talk form sent',
  prep_submitted: 'Filled out Before we talk',
  prep_updated: 'Updated their answers',
  transcript_added: 'Transcript added',
  thank_you_sent: 'Thank-you sent',
  reinvite_sent: 'Re-invite sent',
  checkin_sent: 'Check-in sent',
  checkins_stopped: 'Check-ins stopped',
  stage: 'Stage changed',
};

function Timeline({ email }) {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    let off = false;
    fetch(`/api/ao/clients?timeline=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((j) => !off && setEvents(j.ok ? j.events : []))
      .catch(() => !off && setEvents([]));
    return () => {
      off = true;
    };
  }, [email]);
  if (!events) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!events.length) return <p className="text-sm text-gray-500">Nothing yet.</p>;
  return (
    <ol className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="border-l-2 border-gray-200 pl-3">
          <p className="text-xs text-gray-500">{new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
          <p className="text-sm font-medium text-gray-900">
            {EVENT_LABELS[e.kind] || e.kind}
            {e.kind === 'stage' && e.subject ? `: ${e.subject.replace('_', ' ')}` : ''}
          </p>
          {e.body && e.kind !== 'stage' ? (
            <details className="text-sm text-gray-700">
              <summary className="cursor-pointer text-xs text-blue-700">Show</summary>
              <p className="mt-1 whitespace-pre-wrap">{e.body}</p>
            </details>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function ClientCard({ client, stages, onAction, busyId, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const busy = busyId === client.id;
  const sent = client.thank_you_sent_at || client.reinvite_sent_at;
  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">
            {client.name} {client.test ? <span className="ml-1 rounded bg-gray-100 px-1.5 text-xs font-normal text-gray-500">test</span> : null}
          </p>
          <p className="text-sm text-gray-600">
            {client.kind === 'conversation'
              ? `${when(client.scheduled_for)}${client.joining ? ` · ${client.joining === 'phone' ? 'Phone' : 'Zoom'}` : ''}`
              : client.kind === 'rising_note'
                ? 'Rising leader note'
                : 'Inquiry form'}
            {client.role ? ` · ${client.role}` : ''}
            {client.org_size ? ` · ${client.org_size} people` : ''}
          </p>
          {client.cancelled_at ? <p className="text-xs text-gray-500">Cancelled</p> : null}
          {sent ? <p className="text-xs text-green-700">{client.thank_you_sent_at ? 'Thank-you sent · session complete' : 'Re-invite sent'}</p> : null}
        </div>
        <span className="shrink-0 text-sm text-gray-400">{open ? 'Close' : 'Open'}</span>
      </button>
      {open ? (
        <div className="space-y-6 border-t border-gray-100 p-4">
          {client.needs_follow_up ? <FollowUp client={client} onAction={onAction} busy={busy} /> : null}
          <Permissions client={client} />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Contact</p>
            <p className="text-sm">
              <a className="text-blue-700 underline" href={`mailto:${client.email}`}>{client.email}</a>
              {client.phone ? ` · ${client.phone}` : ''}
              {client.join_url ? (
                <>
                  {' · '}
                  <a className="text-blue-700 underline" href={client.join_url} target="_blank" rel="noreferrer">Zoom link</a>
                </>
              ) : null}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">What they wrote</p>
            <WhatTheyWrote items={client.what_they_wrote} />
          </div>
          {client.prep ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Before we talk</p>
              <PrepAnswers prep={client.prep} />
            </div>
          ) : null}
          {client.kind === 'conversation' && client.scheduled_for && Date.parse(client.scheduled_for) <= Date.now() ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">The conversation</p>
              <TranscriptBox client={client} onAction={onAction} busy={busy} />
              <div className="mt-4">
                <Analysis analysis={client.analysis} />
              </div>
            </div>
          ) : null}
          {client.checkin_plan?.length ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Check-in plan</p>
              <CheckinPlan client={client} onAction={onAction} busy={busy} />
            </div>
          ) : null}
          {client.kind === 'conversation' ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Research brief</p>
              <Research client={client} onAction={onAction} busy={busy} />
            </div>
          ) : null}
          {client.thank_you_text ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Thank-you you sent</p>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{client.thank_you_text}</p>
            </div>
          ) : null}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</p>
            <Notes client={client} onAction={onAction} busy={busy} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Stage</p>
            <StagePicker client={client} stages={stages} onAction={onAction} busy={busy} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</p>
            <Timeline email={client.email} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AOClients() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [clients, setClients] = useState([]);
  const [stages, setStages] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [stageFilter, setStageFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ao/me');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) return window.location.replace('/ao/login');
        setEmail(json.email || '');
        setAuthChecked(true);
      } catch {
        window.location.replace('/ao/login');
      }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ao/clients');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Could not load clients');
      setClients(json.clients || []);
      setStages(json.stages || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (authChecked) load();
  }, [authChecked, load]);

  const onAction = useCallback(async (client, action, extra = {}) => {
    setBusyId(client.id);
    try {
      const res = await fetch('/api/ao/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: client.id, ...extra }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'That did not work');
      setClients((list) => list.map((c) => (c.id === client.id ? json.client : c)));
      if (action === 'send') window.alert('Sent.');
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusyId(null);
    }
  }, []);

  const waiting = useMemo(() => clients.filter((c) => c.needs_follow_up), [clients]);
  const upcoming = useMemo(
    () =>
      clients
        .filter((c) => c.kind === 'conversation' && !c.cancelled_at && c.scheduled_for && Date.parse(c.scheduled_for) > Date.now())
        .sort((a, b) => Date.parse(a.scheduled_for) - Date.parse(b.scheduled_for)),
    [clients]
  );
  const everyone = useMemo(
    () => (stageFilter === 'all' ? clients : clients.filter((c) => c.stage === stageFilter)),
    [clients, stageFilter]
  );

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <AOHeader active="clients" email={email} onNavigate={navigateTo} />
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-semibold text-gray-900">Clients</h1>
        <p className="mb-8 text-sm text-gray-600">
          Everyone who booked a conversation or sent a note. Nothing goes to anyone until you press Send.
        </p>
        {error ? <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

        <Section title="Waiting on you" count={waiting.length}>
          {waiting.length ? (
            waiting.map((c) => <ClientCard key={c.id} client={c} stages={stages} onAction={onAction} busyId={busyId} defaultOpen />)
          ) : (
            <p className="text-sm text-gray-500">Nothing waiting. Follow-ups show up here after each call.</p>
          )}
        </Section>

        <Section title="Upcoming conversations" count={upcoming.length}>
          {upcoming.length ? (
            upcoming.map((c) => <ClientCard key={c.id} client={c} stages={stages} onAction={onAction} busyId={busyId} />)
          ) : (
            <p className="text-sm text-gray-500">No conversations booked yet.</p>
          )}
        </Section>

        <Section title="Everyone">
          <div className="mb-4 flex flex-wrap gap-2">
            {[{ key: 'all', label: 'All' }, ...stages].map((s) => {
              const n = s.key === 'all' ? clients.length : clients.filter((c) => c.stage === s.key).length;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStageFilter(s.key)}
                  className={`min-h-[36px] rounded-full px-3 text-xs font-semibold ${
                    stageFilter === s.key ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {s.label} ({n})
                </button>
              );
            })}
          </div>
          {everyone.map((c) => (
            <ClientCard key={c.id} client={c} stages={stages} onAction={onAction} busyId={busyId} />
          ))}
        </Section>
      </main>
    </div>
  );
}
