/**
 * The week's quote cards, ready to send in one action.
 *
 * 2026-10-02. The weekly bundle has been building cards into the queue as a
 * single row with the five cards buried inside it, and the endpoint that
 * schedules the whole week existed with nothing in the site calling it. So the
 * cards arrived every week and there was no way to look at them or send them.
 *
 * Bart: "Can you help me get Quote Cards going efficiently." This is the whole
 * week on one screen: see the five cards, pick the first date and the spacing,
 * send them to all four channels.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyQuoteCards() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => todayPlus(1));
  const [gapDays, setGapDays] = useState(3);
  const [busyId, setBusyId] = useState(null);
  const [result, setResult] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ao/quotes/list?status=pending&limit=50&offset=0');
      const json = await res.json().catch(() => ({}));
      const rows = Array.isArray(json?.quotes) ? json.quotes : [];
      setBundles(rows.filter((q) => q?.content_kind === 'weekly_corpus_bundle'));
    } catch (_) {
      // The rest of the queue still renders without this panel.
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const schedule = useCallback(
    async (quoteId) => {
      setBusyId(quoteId);
      setResult((prev) => ({ ...prev, [quoteId]: null }));
      try {
        const res = await fetch('/api/ao/publishing/schedule-weekly-pull-bundle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: quoteId,
            start_at: `${startDate}T15:00:00.000Z`,
            gap_days: gapDays,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setResult((prev) => ({ ...prev, [quoteId]: { ok: false, message: json.error || 'Could not schedule' } }));
          return;
        }
        const count = json.scheduled ?? json.inserted ?? null;
        setResult((prev) => ({
          ...prev,
          [quoteId]: {
            ok: true,
            message: count ? `Scheduled ${count} posts, first on ${startDate}.` : `Scheduled, first on ${startDate}.`,
          },
        }));
        load();
      } catch (e) {
        setResult((prev) => ({ ...prev, [quoteId]: { ok: false, message: e.message || 'Could not schedule' } }));
      } finally {
        setBusyId(null);
      }
    },
    [startDate, gapDays, load]
  );

  const gapChoices = useMemo(() => [1, 2, 3, 7], []);

  if (loading || bundles.length === 0) return null;

  return (
    <>
      {bundles.map((bundle) => {
        const pull = bundle?.studio_playbook?.weekly_corpus_pull || {};
        const items = Array.isArray(pull.items) ? pull.items : [];
        if (!items.length) return null;
        const outcome = result[bundle.id];

        return (
          <section key={bundle.id} className="rounded-2xl border border-gray-200 bg-white p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Quote cards for the week of {pull.week_start || 'this week'} ({items.length})
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Lines from your own writing, each one made into a card. Pick the first day and the spacing, then send the
              set to Instagram, Facebook, LinkedIn and X. Weekends are skipped, so at three days apart five cards land on
              a Monday, Thursday, Tuesday, Friday and Wednesday.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, i) => (
                <div key={item.quote_card_image_url || i} className="border border-gray-200 rounded-xl overflow-hidden">
                  {item.quote_card_image_url ? (
                    <img
                      src={item.quote_card_image_url}
                      alt={`Quote card: ${String(item.quote || '').slice(0, 80)}`}
                      className="w-full block bg-gray-50"
                      loading="lazy"
                    />
                  ) : (
                    <div className="p-4 text-sm text-gray-700">{item.quote}</div>
                  )}
                  <div className="px-3 py-3">
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-5">{item.caption}</p>
                    {item.source_title ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-blue-600 hover:underline"
                      >
                        {item.source_title}
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-4 border-t border-gray-100 pt-4">
              <label className="text-xs font-semibold text-gray-700">
                First one goes out
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block min-h-[44px] rounded-lg border border-gray-200 px-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-gray-700">
                Then one every
                <select
                  value={gapDays}
                  onChange={(e) => setGapDays(Number(e.target.value))}
                  className="mt-1 block min-h-[44px] rounded-lg border border-gray-200 px-3 text-sm font-normal"
                >
                  {gapChoices.map((g) => (
                    <option key={g} value={g}>
                      {g === 1 ? 'working day' : g === 7 ? 'week and a half' : `${g} working days`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => schedule(bundle.id)}
                disabled={busyId === bundle.id}
                className="min-h-[44px] px-5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
              >
                {busyId === bundle.id ? 'Scheduling…' : `Schedule all ${items.length}`}
              </button>
              {outcome ? (
                <p className={`text-xs font-medium ${outcome.ok ? 'text-green-700' : 'text-red-700'}`}>
                  {outcome.message}
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </>
  );
}
