/**
 * Infographic posts waiting on Bart, on the Queue.
 *
 * Bart, 2026-10-24: "These I will want to approve." Each one shows the graphic
 * and both captions (editable). Approve schedules it on every channel at the
 * next Tuesday, Wednesday or Thursday slot; Redo writes another take on the
 * same piece with his note; Set aside drops it. Server: api/ao/infographics.js.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { discussUrl } from '../../lib/discussLink.js';

const day = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function Item({ item, onDone }) {
  const [caption, setCaption] = useState(item.caption);
  const [captionX, setCaptionX] = useState(item.caption_x);
  const [note, setNote] = useState('');
  const [redoOpen, setRedoOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const act = async (action, extra = {}) => {
    setBusy(action);
    try {
      const j = await fetch('/api/ao/infographics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: item.id, ...extra }) }).then((r) => r.json());
      if (!j.ok) throw new Error(j.error || 'That did not work');
      if (action === 'approve') window.alert(`Scheduled for ${day(j.scheduled_at)} on all five channels.`);
      await onDone();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-[minmax(0,360px)_1fr]">
      <a href={item.image_url} target="_blank" rel="noreferrer">
        <img src={item.image_url} alt={item.content?.title || 'Infographic'} className="w-full rounded-xl border border-gray-100" />
      </a>
      <div className="min-w-0 space-y-3">
        <p className="text-xs text-gray-500">
          From{' '}
          {item.source_url ? (
            <a href={item.source_url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700">
              {item.source_title}
            </a>
          ) : (
            item.source_title
          )}
          {item.redo_note ? ` · redo: ${item.redo_note}` : ''}
        </p>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Caption (Instagram, Facebook, LinkedIn)</label>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-[160px] w-full rounded-lg border border-gray-300 p-3 text-sm leading-relaxed" />
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">X ({captionX.length}/200)</label>
        <textarea value={captionX} onChange={(e) => setCaptionX(e.target.value.slice(0, 200))} className="min-h-[70px] w-full rounded-lg border border-gray-300 p-3 text-sm" />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!!busy} onClick={() => act('approve', { caption, caption_x: captionX })} className="min-h-[44px] rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
            {busy === 'approve' ? 'Scheduling…' : 'Approve'}
          </button>
          <button type="button" disabled={!!busy} onClick={() => setRedoOpen((v) => !v)} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800">
            Redo
          </button>
          <button type="button" disabled={!!busy} onClick={() => act('discard')} className="min-h-[44px] px-3 text-sm text-gray-600">
            Set aside
          </button>
          <a
            href={discussUrl({ text: `about the infographic "${item.source_title}" waiting in the Queue: `, topic: `Infographic: ${item.source_title}` })}
            className="min-h-[44px] inline-flex items-center px-3 text-sm font-semibold text-gray-700 hover:underline"
          >
            Change
          </a>
        </div>
        {redoOpen ? (
          <div className="space-y-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change? (for example: fewer words, a different angle, use the line about the room)" className="min-h-[80px] w-full rounded-lg border border-gray-300 p-3 text-sm" />
            <button type="button" disabled={!!busy} onClick={() => act('redo', { note })} className="min-h-[44px] rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
              {busy === 'redo' ? 'Making another take… (a minute or two)' : 'Make another take'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function InfographicReview() {
  const [data, setData] = useState(null);
  const [making, setMaking] = useState(false);
  const load = useCallback(
    () =>
      fetch('/api/ao/infographics')
        .then((r) => r.json())
        .then((j) => setData(j.ok ? j : { pending: [], upcoming: [], error: j.error }))
        .catch((e) => setData({ pending: [], upcoming: [], error: e.message })),
    []
  );
  useEffect(() => {
    load();
  }, [load]);
  const makeOne = async () => {
    setMaking(true);
    try {
      const j = await fetch('/api/ao/infographics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'make' }) }).then((r) => r.json());
      if (!j.ok) throw new Error(j.error || 'Could not make one');
      await load();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setMaking(false);
    }
  };
  if (!data) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-900">Infographics {data.pending.length ? `(${data.pending.length} waiting)` : ''}</h2>
        <button type="button" disabled={making} onClick={makeOne} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800 disabled:opacity-50">
          {making ? 'Making one… (a minute or two)' : 'Make another'}
        </button>
      </div>
      {data.error ? <p className="mb-2 text-sm text-red-700">{data.error}</p> : null}
      {data.pending.length ? (
        <div className="space-y-4">
          {data.pending.map((it) => (
            <Item key={it.id} item={it} onDone={load} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600">Nothing waiting. New ones arrive on weekday mornings, up to three at a time.</p>
      )}
      {data.upcoming.length ? (
        <p className="mt-3 text-sm text-gray-600">Coming up: {data.upcoming.map((u) => `${u.source_title} (${day(u.scheduled_at)})`).join('; ')}</p>
      ) : null}
    </section>
  );
}
