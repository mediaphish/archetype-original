import React, { useCallback, useEffect, useState } from 'react';
import { avatarFor } from './teamAvatars.js';

/**
 * Who on Auto's team is working on what. Bart, 2026-10-25: "Then they run
 * autonomously until they need me again." What needs him comes first.
 */

const STATUS_LABEL = {
  needs_bart: 'Needs you',
  running: 'Working now',
  queued: 'Up next',
  done: 'Done',
  failed: 'Stuck',
  cancelled: 'Cancelled',
};

function timeAgo(iso) {
  const ms = Date.now() - Date.parse(iso || 0);
  if (!Number.isFinite(ms) || ms < 0) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

function TaskRow({ task, onOpen, onAction }) {
  const busy = task.status === 'running' || task.status === 'queued';
  return (
    <li className="border border-gray-200 rounded-xl p-3 bg-white">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          <img src={avatarFor(task.agent)} alt="" aria-hidden="true" className="w-6 h-6 rounded-full object-cover bg-orange-50" draggable={false} />
          {task.agent_name} · {STATUS_LABEL[task.status] || task.status}
        </span>
        <span className="text-[11px] text-gray-400">{timeAgo(task.updated_at)}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{task.title}</p>
      {task.status === 'needs_bart' && task.question ? (
        <p className="mt-1 text-sm text-gray-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">{task.question}</p>
      ) : null}
      {task.status === 'done' && task.summary ? <p className="mt-1 text-sm text-gray-600">{task.summary}</p> : null}
      {task.status === 'failed' && task.error ? <p className="mt-1 text-sm text-red-700">{task.error}</p> : null}
      {busy ? (
        <p className="mt-1 text-xs text-gray-500">
          Pass {Math.max(task.passes || 0, 1)} of {task.max_passes}
          {task.last_note ? ` · ${task.last_note}` : ''}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        {task.thread_id ? (
          <button
            type="button"
            onClick={() => onOpen(task.thread_id)}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-900 text-white"
          >
            {task.status === 'needs_bart' ? 'Answer' : 'Open'}
          </button>
        ) : null}
        {busy || task.status === 'needs_bart' ? (
          <button type="button" onClick={() => onAction('cancel', task.id)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700">
            Stop
          </button>
        ) : null}
        {task.status === 'failed' || task.status === 'cancelled' ? (
          <button type="button" onClick={() => onAction('retry', task.id)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700">
            Try again
          </button>
        ) : null}
      </div>
    </li>
  );
}

export default function TeamBoard({ onOpenThread, onClose }) {
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [agent, setAgent] = useState('jot');
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ao/team/tasks');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load the team board');
      setBoard(json);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load the team board');
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const act = useCallback(
    async (action, id) => {
      await fetch('/api/ao/team/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      }).catch(() => {});
      load();
    },
    [load]
  );

  const assign = useCallback(async () => {
    if (!title.trim() || !brief.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/ao/team/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', agent, title: title.trim(), brief: brief.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not hand that off');
      setTitle('');
      setBrief('');
      load();
    } catch (e) {
      setError(e.message || 'Could not hand that off');
    } finally {
      setSending(false);
    }
  }, [agent, title, brief, sending, load]);

  const sections = board
    ? [
        ['Needs you', board.needs_bart],
        ['Working', board.working],
        ['Finished', board.finished],
      ]
    : [];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div>
          <p className="text-sm font-semibold text-gray-900">Team</p>
          <p className="text-xs text-gray-500">Ada, Jot, Vox and Cam</p>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="text-sm text-gray-500 px-2 py-1" aria-label="Close the team board">
            Close
          </button>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!board && !error ? <p className="text-sm text-gray-500">Loading…</p> : null}
        {board?.emails_waiting ? (
          <a href="/ao/library/review-queue#emails" className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-semibold">{board.emails_waiting} email{board.emails_waiting === 1 ? '' : 's'} waiting on you.</span> Review in the Queue.
          </a>
        ) : null}
        {sections.map(([label, rows]) =>
          rows && rows.length ? (
            <section key={label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
              <ul className="space-y-2">
                {rows.map((t) => (
                  <TaskRow key={t.id} task={t} onOpen={onOpenThread} onAction={act} />
                ))}
              </ul>
            </section>
          ) : null
        )}
        {board && !board.needs_bart.length && !board.working.length && !board.finished.length ? (
          <p className="text-sm text-gray-500">Nobody is on a task yet. Tell Ada what you want, or hand something off below.</p>
        ) : null}
        <section className="border-t border-gray-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Hand something off</p>
          <div className="flex gap-2 mb-2">
            {[
              ['jot', 'Jot'],
              ['reach', 'Vox'],
              ['producer', 'Cam'],
              ['auto', 'Ada'],
            ].map(([k, n]) => (
              <button
                key={k}
                type="button"
                onClick={() => setAgent(k)}
                className={`flex items-center gap-1.5 text-xs pl-1 pr-3 py-1 rounded-full border ${agent === k ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700'}`}
              >
                <img src={avatarFor(k)} alt="" aria-hidden="true" className="w-5 h-5 rounded-full object-cover bg-orange-50" draggable={false} />
                {n}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is it? (a short name)"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-2 bg-white"
          />
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Brief them the way you would a person: the goal, what you want, what done looks like."
            rows={4}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
          />
          <button
            type="button"
            onClick={assign}
            disabled={sending || !title.trim() || !brief.trim()}
            className="mt-2 text-sm font-medium px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-40"
          >
            {sending ? 'Handing off…' : 'Hand off'}
          </button>
        </section>
      </div>
    </div>
  );
}
