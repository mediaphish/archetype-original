/**
 * Reshares waiting on Bart.
 *
 * 2026-10-02. Six finished reshares sat unapproved from July 22 to October 2,
 * because the only place they appeared was partway down the Settings page, under
 * the reshare engine's own controls. Bart: "Those need to move from Settings. I
 * never see them there. I would have used 1 a week like was the plan for months,
 * but it was buried."
 *
 * So this lives on the Queue, next to the other work waiting on him, and Settings
 * keeps the engine's switches and points here for the stack.
 */
import React, { useCallback, useEffect, useState } from 'react';

function formatDay(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PendingReshares({ onCountChange }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [actionResult, setActionResult] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ao/auto/reshare-review');
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json.ok) {
          const rows = Array.isArray(json.pending) ? json.pending : [];
          setPending(rows);
          onCountChange?.(rows.length);
        }
      } catch (_) {
        // The queue still renders without this panel.
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [onCountChange]);

  const runAction = useCallback(
    async (slug, action) => {
      setActionLoading((prev) => ({ ...prev, [slug]: action }));
      setActionResult((prev) => ({ ...prev, [slug]: null }));
      try {
        const res = await fetch('/api/ao/auto/reshare-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, slug }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setActionResult((prev) => ({
            ...prev,
            [slug]: { ok: false, message: json.error || `${action} failed` },
          }));
          return;
        }
        setActionResult((prev) => ({ ...prev, [slug]: { ok: true, message: json.message } }));
        setPending((prev) => {
          const next = prev.filter((r) => r.slug !== slug);
          onCountChange?.(next.length);
          return next;
        });
      } catch (e) {
        setActionResult((prev) => ({
          ...prev,
          [slug]: { ok: false, message: e.message || `${action} failed` },
        }));
      } finally {
        setActionLoading((prev) => ({ ...prev, [slug]: null }));
      }
    },
    [onCountChange]
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 mb-6">
        <p className="text-sm text-gray-400">Loading reshares…</p>
      </section>
    );
  }

  if (pending.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 mb-6">
      <h2 className="text-lg font-semibold text-gray-900">Reshares waiting on you ({pending.length})</h2>
      <p className="text-sm text-gray-500 mb-4">
        What goes out, exactly as it will look. Approve and it is scheduled for the next reshare day.
      </p>

      <div className="space-y-6">
        {pending.map((reshare) => {
          const day = formatDay(reshare.posts?.[0]?.scheduled_at);
          const image = reshare.image_url || (reshare.posts || []).map((p) => p.image_url).find(Boolean) || null;
          const posts = groupCaptions(reshare.posts || []);
          return (
            <article key={reshare.slug} className="border border-gray-200 rounded-2xl overflow-hidden">
              {/* The graphic at full width: the photo, the pull quote and the logo as posted. */}
              {image ? (
                <a href={image} target="_blank" rel="noopener noreferrer" className="block bg-gray-900">
                  <img src={image} alt={`Reshare image for ${reshare.title}`} className="w-full h-auto" loading="lazy" />
                </a>
              ) : (
                <div className="bg-red-50 border-b border-red-200 p-6 text-sm font-semibold text-red-700">No image. Instagram will refuse this.</div>
              )}

              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a href={reshare.journal_url} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-gray-900 hover:underline">
                      {reshare.title}
                    </a>
                  </div>
                  {day ? <span className="shrink-0 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">{day}</span> : null}
                </div>

                {reshare.brief ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 mb-1">Why this one</p>
                    <p className="text-sm text-gray-900 leading-relaxed">{reshare.brief}</p>
                  </div>
                ) : null}

                {reshare.pull_quote ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Pull quote on the image</p>
                    <p className="text-sm text-gray-900 italic">&ldquo;{reshare.pull_quote}&rdquo;</p>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {posts.map((post) => (
                    <div key={post.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{post.label}</p>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {actionResult[reshare.slug] ? (
                    <p className={`text-sm font-medium ${actionResult[reshare.slug].ok ? 'text-green-700' : 'text-red-700'}`}>{actionResult[reshare.slug].message}</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => runAction(reshare.slug, 'approve')}
                        disabled={!!actionLoading[reshare.slug]}
                        className="min-h-[44px] px-5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading[reshare.slug] === 'approve' ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction(reshare.slug, 'discard')}
                        disabled={!!actionLoading[reshare.slug]}
                        className="min-h-[44px] px-4 border border-gray-200 bg-white text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        {actionLoading[reshare.slug] === 'discard' ? 'Discarding…' : 'Discard'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const CHANNEL_ORDER = ['linkedin', 'instagram', 'facebook', 'twitter'];
const CHANNEL_NAME = { linkedin: 'LinkedIn', instagram: 'Instagram', facebook: 'Facebook', twitter: 'X' };

/** One block per distinct caption; the two Instagram accounts share one, so they show once. */
function groupCaptions(posts) {
  const out = [];
  const seen = new Map();
  const sorted = posts.slice().sort((a, b) => CHANNEL_ORDER.indexOf(a.platform) - CHANNEL_ORDER.indexOf(b.platform));
  for (const p of sorted) {
    const key = `${p.platform}:${p.caption}`;
    const name = CHANNEL_NAME[p.platform] || p.platform;
    if (seen.has(key)) {
      const entry = out[seen.get(key)];
      if (p.platform === 'instagram') entry.label = 'Instagram (both accounts)';
      continue;
    }
    seen.set(key, out.length);
    out.push({ key, label: name, caption: p.caption });
  }
  return out;
}
