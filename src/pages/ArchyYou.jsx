/**
 * A client's private Archy (/archy/you?e=<email>&s=<signature>).
 *
 * Only for clients who said yes to "A private Archy for you" on Before we
 * talk. Archy here knows Bart's writing and their conversations with Bart,
 * never his private notes. Only they and Bart can see it. When a question
 * needs Bart, Archy hands it to him and says when to expect his answer.
 * Server: api/clients/archy.js, lib/calendly/privateArchy.js.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';

export default function ArchyYou() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const query = `e=${encodeURIComponent(params.get('e') || '')}&s=${encodeURIComponent(params.get('s') || '')}`;
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef(null);

  useEffect(() => {
    fetch(`/api/clients/archy?${query}`)
      .then((r) => r.json())
      .then((j) => (j.ok ? setInfo(j) : setError(j.error || 'This link does not work. Ask Bart for a new one.')))
      .catch(() => setError('Could not load. Try again in a minute.'));
  }, [query]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [info?.messages?.length]);

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setInfo((i) => ({ ...i, messages: [...i.messages, { id: 'pending', role: 'user', content: message }] }));
    setText('');
    try {
      const j = await fetch(`/api/clients/archy?${query}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }).then((r) => r.json());
      if (!j.ok) throw new Error(j.error || 'Archy could not answer just now.');
      setInfo((i) => ({ ...i, messages: j.messages }));
    } catch (e) {
      setInfo((i) => ({ ...i, messages: i.messages.filter((m) => m.id !== 'pending') }));
      setText(message);
      window.alert(e.message);
    } finally {
      setSending(false);
    }
  };

  const day = (iso) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <Helmet>
        <title>Your Archy | Archetype Original</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[#6B6B6B]">Private</p>
      <h1 className="mt-2 font-serif text-3xl text-[#1A1A1A]">{info?.first ? `Your Archy, ${info.first}` : 'Your Archy'}</h1>
      <p className="mt-3 font-sans text-[15px] leading-relaxed text-[#1A1A1A]/80">
        Archy knows Bart's writing and your conversations with him. Only you and Bart can see this. When something needs Bart himself, Archy passes it to him
        {info?.answer_window ? `, and he answers ${info.answer_window}` : ''}.
      </p>

      {error ? <p className="mt-8 bg-white px-6 py-6 font-sans text-[15px] text-[#1A1A1A]">{error}</p> : null}
      {!info && !error ? <p className="mt-8 font-sans text-[14px] text-[#6B6B6B]">Loading…</p> : null}

      {info ? (
        <div className="mt-8 bg-white px-5 py-6 sm:px-8">
          {info.messages.length ? null : <p className="font-sans text-[14px] text-[#6B6B6B]">Ask about anything you and Bart have worked through, or something new that came up.</p>}
          <ol className="space-y-5">
            {info.messages.map((m) => (
              <li key={m.id} className={m.role === 'user' ? 'text-right' : ''}>
                <p className="mb-1 font-sans text-[11px] uppercase tracking-[0.12em] text-[#6B6B6B]">{m.role === 'user' ? 'You' : m.role === 'bart' ? 'Bart' : 'Archy'}</p>
                <div className={`inline-block max-w-full whitespace-pre-wrap text-left font-sans text-[15px] leading-relaxed ${m.role === 'user' ? 'bg-[#1A1A1A] px-4 py-3 text-white' : m.role === 'bart' ? 'border-l-2 border-[#DB0812] pl-4 text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                  {m.content}
                </div>
                {m.handed_to_bart && m.answer_by ? <p className="mt-2 font-sans text-[12px] text-[#6B6B6B]">Passed to Bart. Expect his answer by {day(m.answer_by)}.</p> : null}
              </li>
            ))}
            {sending ? <li className="font-sans text-[14px] text-[#6B6B6B]">Archy is thinking…</li> : null}
          </ol>
          <div ref={end} />
          <div className="mt-6 border-t border-[#1A1A1A]/10 pt-5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
              }}
              placeholder="What is on your mind?"
              className="min-h-[96px] w-full resize-y border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3 font-sans text-[15px] text-[#1A1A1A] focus:border-[#1A1A1A] focus:bg-white focus:outline-none"
            />
            <button type="button" onClick={send} disabled={sending || !text.trim()} className="mt-3 min-h-[44px] bg-[#DB0812] px-6 font-sans text-[14px] font-semibold text-white disabled:opacity-50">
              {sending ? 'Sending…' : 'Ask Archy'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
