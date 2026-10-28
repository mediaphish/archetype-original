import React, { useCallback, useEffect, useRef, useState } from 'react';
import { parseTalkCommand, TEAM_LABELS } from '../../lib/talkCommands.js';
import { avatarFor } from '../../components/ao/teamAvatars.js';

/**
 * A talk given from inside Auto, on the big screen (2026-10-28, first: the
 * Neosho Chamber, Nov 11). Bart: "Maybe instead of a slide deck. We have the
 * whole talk built out in Auto?" and "Let's explore voice."
 *
 * Clicker (Logitech R500s): Page Down / Page Up, or the arrow keys and space.
 * Hold the Back button, or hold V, to talk; let go and it acts on what it heard.
 * Slide moves happen here; anything said to a teammate gets a spoken reply.
 * See notes/PLAN-talk-mode.md.
 */

const HOLD_MS = 450;
const DEFAULT_SLUG = 'neosho-chamber-2026';

function useSpeech() {
  const recRef = useRef(null);
  const finalRef = useRef('');
  const [heard, setHeard] = useState('');
  const [listening, setListening] = useState(false);
  const Rec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

  const start = useCallback(() => {
    if (!Rec || recRef.current) return;
    const rec = new Rec();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    finalRef.current = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      setHeard(`${finalRef.current}${interim}`.trim());
    };
    rec.onerror = () => {};
    recRef.current = rec;
    setHeard('');
    setListening(true);
    try {
      rec.start();
    } catch (_) {
      /* already started */
    }
  }, [Rec]);

  // Resolves with everything heard, a moment after letting go so the last word lands.
  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const rec = recRef.current;
        if (!rec) return resolve('');
        rec.onend = () => {
          recRef.current = null;
          setListening(false);
          resolve(finalRef.current.trim() || heardRef.current);
        };
        setTimeout(() => {
          try {
            rec.stop();
          } catch (_) {
            rec.onend?.();
          }
        }, 350);
      }),
    []
  );
  const heardRef = useRef('');
  heardRef.current = heard;

  return { supported: Boolean(Rec), start, stop, heard, listening };
}

export default function Talk() {
  const slug = new URLSearchParams(window.location.search).get('slug') || DEFAULT_SLUG;
  const [talk, setTalk] = useState(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [reply, setReply] = useState(null); // { agent, text }
  const [thinking, setThinking] = useState(null); // agent key
  const audioRef = useRef(null);
  const speech = useSpeech();
  const holdRef = useRef(null);

  useEffect(() => {
    fetch(`/api/ao/talk?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (r.status === 401) return window.location.replace('/ao/login');
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || 'The talk did not load.');
        setTalk(j.talk);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  const sections = talk?.sections || [];
  const total = sections.length;
  const go = useCallback((i) => setIndex(Math.max(0, Math.min(total - 1, i))), [total]);
  const section = sections[index];

  const say = useCallback(
    async (agent, text) => {
      setReply({ agent, text });
      try {
        const r = await fetch('/api/ao/talk/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent, text }),
        });
        if (!r.ok) return;
        const url = URL.createObjectURL(await r.blob());
        audioRef.current?.pause();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play().catch(() => {});
      } catch (_) {
        /* the words are on screen either way */
      }
    },
    []
  );

  const act = useCallback(
    async (said) => {
      const cmd = parseTalkCommand(said);
      if (cmd.type === 'next') return go(index + 1);
      if (cmd.type === 'back') return go(index - 1);
      if (cmd.type === 'last') return go(total - 1);
      if (cmd.type === 'goto') return go(cmd.index);
      if (cmd.type === 'demo') {
        const d = sections.findIndex((s) => s.kind === 'demo');
        if (d >= 0) go(d);
        return;
      }
      if (cmd.type === 'ask') {
        setThinking(cmd.agent);
        setReply(null);
        try {
          const r = await fetch('/api/ao/talk/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: cmd.agent, text: cmd.text, slug, section_id: section?.id }),
          });
          const j = await r.json().catch(() => ({}));
          setThinking(null);
          if (j.ok) await say(j.agent, j.reply);
          else setReply({ agent: cmd.agent, text: "Sorry, I didn't catch that. Say it once more?" });
        } catch (_) {
          setThinking(null);
        }
      }
    },
    [go, index, total, sections, slug, section, say]
  );

  const beginListening = useCallback(() => {
    if (!speech.supported) return;
    audioRef.current?.pause();
    setReply(null);
    speech.start();
  }, [speech]);

  const endListening = useCallback(async () => {
    const said = await speech.stop();
    if (said) act(said);
  }, [speech, act]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'PageDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) go(index + 1);
      } else if (e.key === 'PageUp' || e.key === 'ArrowLeft' || e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        if (e.repeat || holdRef.current) return;
        // Back on a tap, listening on a hold.
        holdRef.current = { key: e.key, listening: false, timer: setTimeout(() => {
          if (holdRef.current) {
            holdRef.current.listening = true;
            beginListening();
          }
        }, e.key.toLowerCase() === 'v' ? 0 : HOLD_MS) };
      } else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(total - 1);
      else if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.().catch(() => {});
    };
    const up = (e) => {
      const h = holdRef.current;
      if (!h || h.key !== e.key) return;
      clearTimeout(h.timer);
      holdRef.current = null;
      if (h.listening) endListening();
      else if (e.key === 'PageUp' || e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [go, index, total, beginListening, endListening]);

  if (error) return <div className="flex min-h-screen items-center justify-center bg-black p-8 text-lg text-gray-300">{error}</div>;
  if (!talk) return <div className="min-h-screen bg-black" />;

  const speaker = reply?.agent || thinking;
  return (
    <div className="relative flex min-h-screen select-none flex-col overflow-hidden bg-black text-white" onDoubleClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
      <style>{"@font-face{font-family:'AO Display';src:url('/fonts/BebasNeue-Regular.ttf') format('truetype');font-display:block}"}</style>
      <main className="flex flex-1 items-center px-[8vw] py-[8vh]">
        {section ? (
          <div className="flex w-full items-center gap-[5vw]">
            <div className="min-w-0 flex-1">
              {section.kind === 'demo' ? (
                <p className="mb-[3vh] font-semibold uppercase tracking-[0.3em] text-[#D42B1E]" style={{ fontSize: '1.6vw' }}>Live</p>
              ) : null}
              <h1 className="font-bold uppercase leading-[0.95]" style={{ fontFamily: "'AO Display', Impact, sans-serif", fontSize: '6.5vw' }}>
                {section.title}
              </h1>
              {section.lines.map((l, i) => (
                <p key={i} className="mt-[2.5vh] max-w-[60vw] leading-snug text-gray-300" style={{ fontSize: '2.4vw' }}>
                  {l}
                </p>
              ))}
            </div>
            {section.image ? <img src={section.image} alt="" className="max-h-[70vh] max-w-[38vw] rounded-lg object-contain" /> : null}
          </div>
        ) : null}
      </main>

      {speaker ? (
        <div className="absolute inset-x-[8vw] bottom-[12vh] flex items-start gap-4 rounded-2xl bg-white/10 px-6 py-5 backdrop-blur">
          <img src={avatarFor(speaker)} alt="" className="h-14 w-14 flex-shrink-0 rounded-full object-cover" />
          <div>
            <p className="font-semibold text-gray-300" style={{ fontSize: '1.3vw' }}>{TEAM_LABELS[speaker] || 'Ada'}</p>
            <p className="text-white" style={{ fontSize: '2vw' }}>{thinking ? '…' : reply?.text}</p>
          </div>
        </div>
      ) : null}

      {speech.listening ? (
        <div className="absolute inset-x-0 bottom-[4vh] text-center text-gray-400" style={{ fontSize: '1.4vw' }}>
          <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-[#D42B1E] align-middle" />
          {speech.heard || 'Listening…'}
        </div>
      ) : null}

      <footer className="flex items-center justify-between px-[4vw] pb-[3vh]">
        <div className="flex gap-1.5">
          {sections.map((s, i) => (
            <span key={s.id} className={`h-1.5 rounded-full ${i === index ? 'w-8 bg-white' : 'w-3 bg-white/25'}`} />
          ))}
        </div>
        <img src="/brand/archetype-original-lockup.svg" alt="Archetype Original" className="h-[5vh] w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
      </footer>
      {!speech.supported ? <p className="absolute left-4 top-3 text-xs text-gray-500">Voice needs Chrome.</p> : null}
    </div>
  );
}
