import React, { useEffect, useState } from 'react';
import { useKeepAwake } from '../../lib/useKeepAwake.js';

/**
 * The presenter screen for a live talk. Open /ao/remote on the iPad (or phone)
 * while /ao/talk runs on the laptop.
 *
 * 2026-10-28: a backup clicker, and the camera for the demo's room photo,
 * which goes straight to the big screen.
 * 2026-11-08: Bart: "I'm going to need the script on a screen where I can
 * reference it ... Maybe we shift the remote control to be a screen I can
 * pull up on my iPad with the script there?" It now shows the script for the
 * slide on the big screen and follows along as he clicks.
 * 2026-11-09, three devices and no clicker. The iPad runs the talk: Back, Talk
 * (turns the laptop's mic on, tap again to send), Photo and Next. The phone
 * shows only the live demo's camera (open with ?view=phone, or any phone-sized
 * screen opens it that way).
 */

const DEFAULT_SLUG = 'mcdonald-county-chamber-2026';

async function shrink(file) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, 2048 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.86));
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Bold and italic only, from the script's markdown. */
const inline = (s) =>
  escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

/** Pure: the script's markdown as blocks to read on stage. Cues in parentheses stand apart. */
export function scriptBlocks(md) {
  const blocks = [];
  for (const chunk of String(md || '').split(/\n\s*\n/)) {
    const text = chunk.trim();
    if (!text || /^-{3,}$/.test(text)) continue;
    const lines = text.split('\n');
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      blocks.push({ kind: 'list', items: lines.map((l) => l.replace(/^\s*[-*]\s+/, '')) });
    } else if (/^\*\(.*\)\*$/s.test(text)) {
      blocks.push({ kind: 'cue', text: text.slice(2, -2) });
    } else if (/^\*\[.*\]\*$/s.test(text)) {
      blocks.push({ kind: 'yours', text: text.slice(2, -2) });
    } else {
      blocks.push({ kind: 'say', text: lines.join(' ') });
    }
  }
  return blocks;
}

function Script({ md }) {
  const blocks = scriptBlocks(md);
  if (!blocks.length) return <p className="text-gray-500">No script for this slide.</p>;
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        if (b.kind === 'list')
          return (
            <ul key={i} className="list-disc space-y-2 pl-6">
              {b.items.map((it, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: inline(it) }} />
              ))}
            </ul>
          );
        if (b.kind === 'cue')
          return <p key={i} className="rounded-lg bg-[#3a2a05] px-4 py-2 text-[0.8em] font-semibold text-[#f5c96a]" dangerouslySetInnerHTML={{ __html: inline(b.text) }} />;
        if (b.kind === 'yours')
          return <p key={i} className="rounded-lg border border-dashed border-gray-500 px-4 py-2 text-[0.85em] text-gray-300" dangerouslySetInnerHTML={{ __html: inline(b.text) }} />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: inline(b.text) }} />;
      })}
    </div>
  );
}

export default function Remote() {
  useKeepAwake();
  const slug = new URLSearchParams(window.location.search).get('slug') || DEFAULT_SLUG;
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(null);
  const [sections, setSections] = useState([]);
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [talkPending, setTalkPending] = useState(false);
  const view = (() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'phone' || v === 'ipad') return v;
    return window.innerWidth < 640 ? 'phone' : 'ipad';
  })();
  const [size, setSize] = useState(() => {
    try {
      return Number(localStorage.getItem('talk-script-size')) || (window.innerWidth < 640 ? 20 : 26);
    } catch {
      return 26;
    }
  });

  const send = async (body) => {
    const r = await fetch('/api/ao/talk/remote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...body }),
    });
    if (r.status === 401) window.location.replace('/ao/login');
    return r.json().catch(() => ({}));
  };

  useEffect(() => {
    fetch(`/api/ao/talk?slug=${encodeURIComponent(slug)}`)
      .then((r) => {
        if (r.status === 401) window.location.replace('/ao/login');
        return r.json();
      })
      .then((j) => setSections(j?.talk?.sections || []))
      .catch(() => {});
  }, [slug]);

  // Follow the big screen.
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/ao/talk/remote?slug=${encodeURIComponent(slug)}`);
        const j = await r.json().catch(() => ({}));
        if (!stop && Number.isFinite(Number(j?.state?.index))) setIndex(Number(j.state.index));
        if (!stop) {
          setListening(Boolean(j?.state?.listening));
          setTalkPending(false);
        }
      } catch (_) {
        /* keep the last slide */
      }
    };
    poll();
    const t = setInterval(poll, 700);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [slug]);

  const scrollRef = React.useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [index]);

  const setFont = (n) => {
    const v = Math.max(18, Math.min(40, n));
    setSize(v);
    try {
      localStorage.setItem('talk-script-size', String(v));
    } catch {}
  };

  const move = async (action) => {
    if (action === 'talk') setTalkPending(true);
    setStatus(action === 'next' ? 'Next' : action === 'first' ? 'Back to the start' : action === 'talk' ? '' : 'Back');
    const j = await send({ action });
    setStatus(j.ok ? '' : 'Did not reach the screen. Try again.');
  };

  const takePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setStatus('Sending the photo…');
      const blob = await shrink(file);
      setPreview(URL.createObjectURL(blob));
      const target = await send({ upload: true });
      if (!target.ok) throw new Error(target.error || 'No upload');
      const put = await fetch(target.upload_url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }, body: blob });
      if (!put.ok) throw new Error(`Upload ${put.status}`);
      const j = await send({ action: 'photo', photo_url: target.public_url });
      setStatus(j.ok ? 'Photo is on the big screen.' : 'The photo did not reach the screen.');
    } catch (err) {
      setStatus(`The photo did not send: ${err.message}`);
    }
  };

  const section = sections[index];
  const photoInput = <input type="file" accept="image/*" capture="environment" className="hidden" onChange={takePhoto} />;

  if (view === 'phone') {
    // The phone is only the camera for the live demo (2026-11-09).
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <p className="text-xs uppercase tracking-widest text-gray-400">Live demo</p>
        <p className="text-2xl font-bold">Take the room photo</p>
        <label className="flex h-40 w-full max-w-sm cursor-pointer items-center justify-center rounded-3xl bg-[#DB0812] text-3xl font-bold active:scale-[0.98]">
          Photo
          {photoInput}
        </label>
        {preview ? <img src={preview} alt="" className="max-h-[30vh] rounded-xl" /> : null}
        <p className="min-h-[1.5em] text-base text-gray-300">{status}</p>
      </div>
    );
  }
  const next = sections[index + 1];
  const btn = 'min-h-[56px] flex-1 rounded-2xl text-lg font-bold active:scale-[0.98] sm:min-h-[64px] sm:text-xl';

  return (
    // One screen tall on any device: the script scrolls in the middle and the
    // buttons stay on screen (Bart, 2026-11-08, iPhone: "the buttons are off the screen").
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-black text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-black px-4 py-3 sm:gap-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-gray-400">
            Slide {sections.length ? index + 1 : '–'} of {sections.length || '–'}
            {section?.minutes ? ` · about ${section.minutes} min` : ''}
          </p>
          <p className="truncate text-xl font-bold">{section?.title || 'Waiting for the big screen…'}</p>
        </div>
        <button type="button" className="h-10 rounded-lg bg-white/10 px-3 text-sm font-semibold sm:h-11" onClick={() => move('first')}>
          Start over
        </button>
        <button type="button" aria-label="Smaller text" className="h-10 w-10 rounded-lg bg-white/10 text-base sm:h-11 sm:w-11 sm:text-lg" onClick={() => setFont(size - 2)}>
          A-
        </button>
        <button type="button" aria-label="Larger text" className="h-10 w-10 rounded-lg bg-white/10 text-lg sm:h-11 sm:w-11 sm:text-xl" onClick={() => setFont(size + 2)}>
          A+
        </button>
      </header>

      <main ref={scrollRef} className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-5 leading-relaxed sm:px-5" style={{ fontSize: `${size}px` }}>
        <div className="mx-auto max-w-3xl break-words">
        {section?.lines?.length ? (
          <div className="mb-6 rounded-xl border border-white/15 px-4 py-3 text-[0.75em] text-gray-300">
            <p className="mb-1 text-[0.8em] uppercase tracking-widest text-gray-500">On screen</p>
            {section.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        ) : null}
        <Script md={section?.script} />
        {next ? <p className="mt-10 text-[0.7em] text-gray-500">Next: {next.title}</p> : null}
        </div>
      </main>

      <footer className="flex-shrink-0 border-t border-white/10 bg-black px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <div className="mx-auto flex max-w-3xl gap-3">
          <button type="button" className={`${btn} bg-white/10`} onClick={() => move('back')}>
            Back
          </button>
          {/* The laptop's mic (2026-11-09): tap to talk to the team, tap again to send. */}
          <button
            type="button"
            className={`${btn} ${listening ? 'animate-pulse bg-[#DB0812] text-white' : 'bg-[#1f6feb] text-white'} ${talkPending ? 'opacity-60' : ''}`}
            onClick={() => move('talk')}
          >
            {listening ? 'Send' : 'Talk'}
          </button>
          <label className={`${btn} flex cursor-pointer items-center justify-center bg-white/10`}>
            Photo
            {photoInput}
          </label>
          <button type="button" className={`${btn} bg-white text-black`} onClick={() => move('next')}>
            Next
          </button>
        </div>
        {preview || status ? (
          <div className="mx-auto mt-2 flex max-w-3xl items-center justify-center gap-3">
            {preview ? <img src={preview} alt="" className="h-10 rounded" /> : null}
            <p className="text-sm text-gray-300">{status}</p>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
