import React, { useEffect, useState } from 'react';

/**
 * One card at a time: its picture, then every caption that goes with it.
 * Bart, 2026-10-28: "it needs to be a single image with all the captions ...
 * Not this hunt-and-peck." See src/lib/cardPackages.js.
 */
const when = (iso) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function CardPackages({ packages, statuses = {}, onImageError }) {
  const [index, setIndex] = useState(0);
  const total = packages.length;
  useEffect(() => {
    if (index > total - 1) setIndex(Math.max(0, total - 1));
  }, [index, total]);
  const card = packages[Math.min(index, total - 1)];
  if (!card) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-shrink-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
          Card {index + 1} of {total} · {card.heading}
        </p>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Previous card"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={index >= total - 1}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Next card"
          >
            →
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {card.image ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
            <img
              src={card.image.url}
              alt={card.image.label || card.title}
              className="block h-auto w-full"
              onError={() => onImageError?.(card.image.url)}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-xs text-gray-500">
            No card picture for {card.title} in this chat yet.
          </div>
        )}

        {card.image && statuses[card.image.url] ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
            {statuses[card.image.url].status === 'posted' ? 'Posted' : statuses[card.image.url].status === 'failed' ? 'Did not post' : 'Scheduled'} · {when(statuses[card.image.url].scheduled_at)} Central
          </p>
        ) : null}

        {card.quote ? (
          <p className="text-sm italic leading-relaxed text-gray-700">"{card.quote}"</p>
        ) : null}

        {card.channels.map((ch) => (
          <div key={ch.name} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <p className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">{ch.name}</p>
            <p className="whitespace-pre-wrap px-3 py-2.5 text-sm leading-relaxed text-gray-800">{ch.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
