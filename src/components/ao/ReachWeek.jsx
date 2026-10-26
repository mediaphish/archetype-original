import React, { useCallback, useEffect, useState } from 'react';
import { avatarFor } from './teamAvatars.js';
import { discussUrl } from '../../lib/discussLink.js';

/**
 * Reach's week at the top of the Queue: what goes out each day against Bart's
 * rhythm, what is missing, and the approved entries that could fill a gap.
 * The same view Reach reads (lib/ao/reach/reachWeek.js).
 */

const DAY_LABEL = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

function clock(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h)) return '';
  const suffix = h >= 12 ? 'pm' : 'am';
  const hr = h % 12 || 12;
  return m ? `${hr}:${String(m).padStart(2, '0')}${suffix}` : `${hr}${suffix}`;
}

function shortDate(ymd) {
  const [y, mo, d] = String(ymd).split('-').map(Number);
  if (!y) return '';
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function ReachWeek({ onNavigate }) {
  const [which, setWhich] = useState('this');
  const [week, setWeek] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (w) => {
    setError('');
    try {
      const res = await fetch(`/api/ao/reach/week?week=${encodeURIComponent(w)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load the week');
      setWeek(json);
    } catch (e) {
      setError(e.message || 'Could not load the week');
    }
  }, []);

  useEffect(() => {
    load(which);
  }, [which, load]);

  const talk = (text) => {
    const url = discussUrl({ agent: 'reach', text });
    if (onNavigate) onNavigate(url);
    else window.location.href = url;
  };

  const gapsByDate = new Map((week?.gaps || []).map((g) => [g.date, g]));

  return (
    <section id="week" className="mb-8 scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src={avatarFor('reach')} alt="" aria-hidden="true" className="w-9 h-9 rounded-full object-cover bg-orange-50 border border-orange-100" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">The week</h2>
            <p className="text-xs text-gray-500">From Vox{week?.week_of ? `, week of ${shortDate(week.week_of)}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[
            ['this', 'This week'],
            ['next', 'Next week'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setWhich(k)}
              className={`min-h-[36px] px-3 rounded-lg text-sm font-semibold border ${which === k ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 bg-white'}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => talk(`about the ${which === 'next' ? 'week ahead' : 'week'}: `)}
            className="min-h-[36px] px-3 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 bg-white"
          >
            Talk to Vox
          </button>
        </div>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!week && !error ? <p className="text-sm text-gray-500">Loading the week…</p> : null}
      {week ? (
        <div className="grid gap-3 md:grid-cols-5">
          {week.days.map((d) => {
            const gap = gapsByDate.get(d.date);
            return (
              <div key={d.date} className={`rounded-xl border p-3 bg-white ${gap ? 'border-amber-300' : 'border-gray-200'}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {DAY_LABEL[d.weekday]} <span className="font-normal text-gray-500">{shortDate(d.date)}</span>
                  </p>
                </div>
                {d.focus ? <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">{d.focus}</p> : null}
                <ul className="mt-2 space-y-1.5">
                  {d.entries.map((e) => (
                    <li key={e.slug} className="text-xs text-gray-900">
                      <span className="font-semibold">Entry:</span> {e.title} <span className="text-gray-500">{clock(e.time)}</span>
                    </li>
                  ))}
                  {d.pieces.map((p, i) => (
                    <li key={`${p.kind}-${i}`} className="text-xs text-gray-800">
                      <span className="font-medium">{p.kind}</span>
                      {p.status === 'pending_review' ? <span className="text-amber-700"> (waiting on you)</span> : null}
                      <span className="text-gray-500">
                        {' '}
                        · {p.channels.length} channel{p.channels.length === 1 ? '' : 's'} from {clock(p.channels[0]?.time)}
                      </span>
                    </li>
                  ))}
                  {!d.entries.length && !d.pieces.length ? <li className="text-xs text-gray-400">Nothing going out</li> : null}
                </ul>
                {gap ? (
                  <button
                    type="button"
                    onClick={() => talk(`${DAY_LABEL[d.weekday]} ${shortDate(d.date)} has no ${gap.missing.toLowerCase()}. What should fill it? `)}
                    className="mt-2 w-full text-left text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1.5"
                  >
                    Missing: {gap.missing}. Ask Vox what fits.
                  </button>
                ) : null}
                {d.notes.map((n, i) => (
                  <p key={i} className="mt-2 text-[11px] text-gray-500 leading-snug">
                    {n}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
      {week?.ready_not_scheduled?.length ? (
        <p className="mt-3 text-sm text-gray-600">
          Approved and waiting for a date: {week.ready_not_scheduled.map((r) => r.title).join('; ')}
        </p>
      ) : null}
    </section>
  );
}
