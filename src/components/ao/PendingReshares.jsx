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
  const [expanded, setExpanded] = useState({});

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
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-900">Reshares waiting on you ({pending.length})</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Finished posts for all four channels. Approve one and it goes out on the date shown.
      </p>

      <div className="space-y-3">
        {pending.map((reshare) => {
          const day = formatDay(reshare.posts?.[0]?.scheduled_at);
          // All four channels carry the same picture, so the first one that has
          // it speaks for the set.
          const image = (reshare.posts || []).map((p) => p.image_url).find(Boolean) || null;
          const isOpen = !!expanded[reshare.slug];
          return (
            <div key={reshare.slug} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  {/* The picture that goes out, at a size you can actually judge.
                      Before this the panel named the channels and showed the words
                      and left the image invisible, so the only way to see what was
                      about to be published was to ask. */}
                  {image ? (
                    <a href={image} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img
                        src={image}
                        alt={`Image for ${reshare.title}`}
                        className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-lg border border-gray-200 bg-white"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-lg border border-dashed border-red-300 bg-red-50 flex items-center justify-center p-2">
                      <span className="text-[11px] font-semibold text-red-700 text-center leading-tight">
                        No image. Instagram will refuse this.
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">{reshare.title}</p>
                      {day && (
                        <span className="shrink-0 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1">
                          {day}
                        </span>
                      )}
                    </div>
                    <a
                      href={reshare.journal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline break-all"
                    >
                      {reshare.journal_url}
                    </a>
                    <p className="text-xs text-gray-500 mt-2">
                      {(reshare.posts || []).map((p) => p.platform).join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [reshare.slug]: !isOpen }))}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  {isOpen ? 'Hide the posts' : `Read the ${reshare.posts?.length || 0} posts`}
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-3">
                    {(reshare.posts || []).map((post) => (
                      <div key={post.id}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                          {post.platform}
                          {post.image_url ? '' : ' (no image)'}
                        </p>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
                {actionResult[reshare.slug] ? (
                  <p
                    className={`text-xs font-medium ${
                      actionResult[reshare.slug].ok ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {actionResult[reshare.slug].message}
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => runAction(reshare.slug, 'approve')}
                      disabled={!!actionLoading[reshare.slug]}
                      className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      {actionLoading[reshare.slug] === 'approve' ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction(reshare.slug, 'discard')}
                      disabled={!!actionLoading[reshare.slug]}
                      className="px-4 py-2 border border-gray-200 bg-white text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {actionLoading[reshare.slug] === 'discard' ? 'Discarding…' : 'Discard'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
