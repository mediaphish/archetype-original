/**
 * #queue: everything waiting on Bart, in chat.
 *
 * Bart, 2026-10-27: "I want as much in chat as we can get there. Even if it's a
 * queue channel." Each item is posted by the teammate who owns it, and its
 * buttons work right here: Approve, Change (its own conversation), Set aside.
 * Journal posts keep their own conversations; their card takes him there.
 *
 * The emails, resurfaces, infographics and quote cards reuse the review cards
 * the Queue page has used, so approving here does exactly what it did there.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { avatarFor } from './teamAvatars.js';
import { discussUrl } from '../../lib/discussLink.js';
import OutboxReview from './OutboxReview.jsx';
import PendingReshares from './PendingReshares.jsx';
import InfographicReview from './InfographicReview.jsx';
import WeeklyQuoteCards from './WeeklyQuoteCards.jsx';

const NAMES = { auto: 'Ada', jot: 'Jot', reach: 'Vox', producer: 'Cam', editor: 'Red' };

/** One post in the channel: who posted it and what it is, then the card. */
export function QueuePost({ agent, what, children }) {
  return (
    <div className="flex gap-3">
      <img src={avatarFor(agent)} alt="" aria-hidden="true" className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-full bg-orange-50 object-cover" draggable={false} />
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-sm">
          <span className="font-semibold text-gray-900">{NAMES[agent] || 'Ada'}</span>
          <span className="text-gray-500"> · {what}</span>
        </p>
        {children}
      </div>
    </div>
  );
}

export function QuestionCard({ q, onOpenThread }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{q.title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-900">{q.question || 'Needs your answer.'}</p>
      <button
        type="button"
        disabled={!q.thread_id}
        onClick={() => onOpenThread(q.thread_id)}
        className="mt-3 min-h-[44px] rounded-lg bg-red-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
      >
        Answer
      </button>
    </div>
  );
}

export function PostCard({ post, onOpenThread }) {
  const open = () => {
    if (post.thread_id) return onOpenThread(post.thread_id);
    window.location.href = discussUrl({ text: `about "${post.title}": `, agent: 'jot', topic: post.title, channel: 'writing' });
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-base font-semibold text-gray-900">{post.title}</p>
      <p className="mt-0.5 text-sm text-gray-600">{post.label}</p>
      <button type="button" onClick={open} className="mt-3 min-h-[44px] rounded-lg bg-red-600 px-5 text-sm font-semibold text-white">
        {post.step === 'brief' ? 'Open the brief' : 'Open the post'}
      </button>
    </div>
  );
}

export default function QueueFeed({ onOpenThread, onCount, className = '' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ao/queue');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'The queue did not load.');
      setData(json);
      setError('');
      onCount?.(json.count || 0);
    } catch (e) {
      setError(e.message || 'The queue did not load.');
    }
  }, [onCount]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  // The review cards inside save on their own. After any button press here,
  // check again so the count drops as soon as the item is done (2026-10-27:
  // "that number never went down").
  const recheckSoon = useCallback(() => {
    setTimeout(load, 1500);
    setTimeout(load, 6000);
  }, [load]);

  const c = data?.counts || {};
  return (
    <div className={`flex min-h-0 flex-1 flex-col bg-white ${className}`}>
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <p className="text-sm">
          <span className="font-semibold text-gray-900"># queue</span>
          <span className="text-gray-500">
            {' '}
            · {data ? (data.count ? `${data.count} waiting on you` : 'You are caught up') : 'Loading…'}
          </span>
        </p>
        <button type="button" onClick={load} className="min-h-[36px] px-2 text-xs font-semibold text-gray-500 hover:text-gray-900">
          Refresh
        </button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        onClickCapture={(e) => {
          if (e.target?.closest?.('button')) recheckSoon();
        }}
      >
        <div className="mx-auto max-w-3xl space-y-6">
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
          {data && !data.count ? (
            <p className="py-10 text-center text-sm text-gray-500">Nothing is waiting on you. New items land here as the team finishes them.</p>
          ) : null}

          {(data?.questions || []).map((q) => (
            <QueuePost key={`q-${q.id}`} agent={q.agent} what="has a question for you">
              <QuestionCard q={q} onOpenThread={onOpenThread} />
            </QueuePost>
          ))}

          {(data?.posts || []).map((p) => (
            <QueuePost key={`p-${p.slug}`} agent="jot" what={p.step === 'brief' ? 'journal brief' : 'journal post'}>
              <PostCard post={p} onOpenThread={onOpenThread} />
            </QueuePost>
          ))}

          {c.emails ? (
            <QueuePost agent="auto" what={`${c.emails === 1 ? 'an email' : `${c.emails} emails`} for your OK`}>
              <OutboxReview />
            </QueuePost>
          ) : null}

          {c.reshares ? (
            <QueuePost agent="producer" what={`${c.reshares === 1 ? 'a resurface' : `${c.reshares} resurfaces`} for your OK`}>
              <PendingReshares onCountChange={load} />
            </QueuePost>
          ) : null}

          {c.infographics ? (
            <QueuePost agent="producer" what={`${c.infographics === 1 ? 'an infographic' : `${c.infographics} infographics`} for your OK`}>
              <InfographicReview />
            </QueuePost>
          ) : null}

          {c.quote_cards ? (
            <QueuePost agent="producer" what="this week's quote cards">
              <WeeklyQuoteCards />
            </QueuePost>
          ) : null}
        </div>
      </div>
    </div>
  );
}
