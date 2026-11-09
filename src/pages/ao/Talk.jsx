import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useKeepAwake } from '../../lib/useKeepAwake.js';
import { parseTalkCommand, captionChunks, chunkAt, TEAM_LABELS, TEAM_ORDER, MISTAKE_ORDER } from '../../lib/talkCommands.js';
import { avatarFor } from '../../components/ao/teamAvatars.js';

/**
 * A talk given from inside Auto, on the big screen (2026-10-28, first: the
 * McDonald County Chamber, Nov 11). Bart: "Maybe instead of a slide deck. We have the
 * whole talk built out in Auto?" and "Let's explore voice."
 *
 * 2026-11-09: no clicker. The iPad's Back, Next and Talk buttons run it (Talk
 * turns this laptop's mic on, a second tap sends), the arrow keys only change
 * slides, and holding V on the laptop still listens.
 * Slide moves happen here; anything said to a teammate gets a spoken reply.
 * See notes/PLAN-talk-mode.md.
 */

const LISTEN_MAX_MS = 20000;
const REPLY_HOLD_MS = 6000;
const DEFAULT_SLUG = 'mcdonald-county-chamber-2026';

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
    // Chrome can end listening on its own (a pause, a network blip) while the
    // button is still held. Then rec.stop() never fires onend again, and the
    // page sat on what it heard with nothing happening (2026-11-08, Bart's
    // first run with the clicker). Remember it ended so letting go still acts.
    rec.ended = false;
    rec.onend = () => {
      rec.ended = true;
    };
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
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          recRef.current = null;
          setListening(false);
          resolve(finalRef.current.trim() || heardRef.current);
        };
        if (rec.ended) return finish();
        rec.onend = finish;
        setTimeout(() => {
          try {
            rec.stop();
          } catch (_) {
            finish();
          }
        }, 350);
        // Never wait on Chrome forever: act on what was heard.
        setTimeout(finish, 2000);
      }),
    []
  );
  const heardRef = useRef('');
  heardRef.current = heard;

  // Stop without sending anything (a double-press of Back means "go back").
  const cancel = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    setListening(false);
    setHeard('');
    if (rec) {
      rec.onend = null;
      try {
        rec.abort ? rec.abort() : rec.stop();
      } catch (_) {
        /* already stopped */
      }
    }
  }, []);

  return { supported: Boolean(Rec), start, stop, cancel, heard, listening };
}

export default function Talk() {
  useKeepAwake();
  const slug = new URLSearchParams(window.location.search).get('slug') || DEFAULT_SLUG;
  const [talk, setTalk] = useState(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [reply, setReply] = useState(null); // { agent, text }
  const [thinking, setThinking] = useState(null); // agent key
  const audioRef = useRef(null);
  const speech = useSpeech();
  const holdRef = useRef(null);
  const fadeRef = useRef(null);
  const startOverRef = useRef(null);
  const [heardNote, setHeardNote] = useState('');
  const heardNoteRef = useRef(null);
  // Rehearsal only: which key each clicker button sends, so a remote that sends
  // something unexpected can be matched (2026-11-08, Bart's Logitech Back).
  const [lastKey, setLastKey] = useState('');
  // Rehearsal only: what the mic heard last, so a missed ask can be read back.
  const [lastHeard, setLastHeard] = useState('');
  useEffect(() => {
    const note = (e) => {
      if (['Meta', 'Shift', 'Control', 'Alt', 'CapsLock'].includes(e.key)) return;
      const name = `${e.key}${e.code && e.code !== e.key ? ` (${e.code})` : ''}`;
      setLastKey((prev) => [name, ...String(prev || '').split(' · ').filter(Boolean)].slice(0, 3).join(' · '));
    };
    window.addEventListener('keydown', note, true);
    return () => window.removeEventListener('keydown', note, true);
  }, []);
  // Rehearsal unless the page is opened with ?live=1: a rehearsal never posts.
  const live = new URLSearchParams(window.location.search).get('live') === '1';
  const [photo, setPhoto] = useState(null);
  const [demo, setDemo] = useState({ phase: 'idle' });
  const seqRef = useRef(null);

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

  // The phone remote: next, back, and the room photo (lib/ao/talkDemo.js).
  const remoteRef = useRef(null);
  const screenRef = useRef(null);
  // One talk page at a time (2026-11-09: a second tab on the last slide spoke
  // Ada's closing line while Bart was on slide 8, and both tabs told the iPad
  // their slide). The newest page takes over; any older one goes quiet.
  const [benched, setBenched] = useState(false);
  const benchedRef = useRef(false);
  benchedRef.current = benched;
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const me = `${Date.now()}-${Math.random()}`;
    const ch = new BroadcastChannel('ao-talk');
    ch.onmessage = (e) => {
      if (e.data?.type === 'claim' && e.data.id !== me) {
        setBenched(true);
        audioRef.current?.pause();
      }
    };
    ch.postMessage({ type: 'claim', id: me });
    return () => ch.close();
  }, []);
  const reportRef = useRef(null);
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/ao/talk/remote?slug=${encodeURIComponent(slug)}`);
        const j = await r.json().catch(() => ({}));
        const st = j?.state || {};
        if (stop) return;
        if (seqRef.current === null) {
          seqRef.current = Number(st.seq) || 0;
          if (st.photo_url && Date.now() - Date.parse(st.at || 0) < 3 * 3600 * 1000) setPhoto(st.photo_url);
          return;
        }
        if ((Number(st.seq) || 0) > seqRef.current) {
          seqRef.current = Number(st.seq);
          if (!benchedRef.current) remoteRef.current?.(st);
        }
        // The iPad follows what is written here. If a write was lost (2026-11-09:
        // the iPad sat two slides behind), say it again.
        const mine = benchedRef.current ? null : screenRef.current;
        if (mine && (Number(st.index) !== mine.index || Boolean(st.listening) !== mine.listening)) reportRef.current?.();
      } catch (_) {
        /* the clicker still works */
      }
    };
    poll();
    // Fast enough that the iPad's Talk button feels immediate.
    const t = setInterval(poll, 700);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [slug]);

  const sections = talk?.sections || [];
  const total = sections.length;
  const go = useCallback((i) => setIndex(Math.max(0, Math.min(total - 1, i))), [total]);
  const section = sections[index];

  // Shows the line and speaks it; resolves when the line has finished playing.
  const say = useCallback(
    async (agent, text, readyAudio = null) => {
      // A message fades a few seconds after it is spoken (Bart, 2026-11-08: Ada's
      // line was still up minutes later).
      const id = Date.now() + Math.random();
      clearTimeout(fadeRef.current);
      // Long replies show a screen-sized piece at a time, in step with the voice
      // (2026-11-09: Bit's build story ran off the bottom of the screen).
      setReply({ agent, text, id, chunks: captionChunks(text), part: 0 });
      const fadeLater = () => {
        fadeRef.current = setTimeout(() => {
          setReply((r) => (r && r.id === id ? { ...r, fading: true } : r));
          fadeRef.current = setTimeout(() => setReply((r) => (r && r.id === id ? null : r)), 900);
        }, REPLY_HOLD_MS);
      };
      try {
        let blob = readyAudio;
        if (!blob) {
          const r = await fetch('/api/ao/talk/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent, text }),
          });
          if (!r.ok) return fadeLater();
          blob = await r.blob();
        }
        const url = URL.createObjectURL(blob);
        audioRef.current?.pause();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.ontimeupdate = () => {
          if (!audio.duration) return;
          setReply((r) => {
            if (!r || r.id !== id || !r.chunks) return r;
            const part = chunkAt(r.chunks, audio.currentTime / audio.duration);
            return part === r.part ? r : { ...r, part };
          });
        };
        await new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = resolve;
          audio.play().catch(resolve);
        });
        fadeLater();
      } catch (_) {
        /* the words are on screen either way */
        fadeLater();
      }
    },
    []
  );

  const ask = useCallback(
    async (agent, text, topic = '', handedBy = null) => {
      setThinking(agent);
      try {
        const r = await fetch('/api/ao/talk/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent, text, slug, section_id: section?.id, topic, handed_by: handedBy }),
        });
        const j = await r.json().catch(() => ({}));
        setThinking(null);
        return j.ok ? j : null;
      } catch (_) {
        setThinking(null);
        return null;
      }
    },
    [slug, section]
  );

  // Bit's build story is written and voiced as soon as its slide is up, so it
  // plays the moment Bart asks (2026-11-09: "It took about 10 seconds for Bit
  // to start talking").
  const builtRef = useRef(null);
  useEffect(() => {
    if (section?.id !== 'team' || builtRef.current) return;
    builtRef.current = (async () => {
      try {
        const r = await fetch('/api/ao/talk/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: 'it', text: 'Hey Bit, give them a run down on what it took to build you all and put this presentation together.', slug, section_id: section.id, topic: 'built' }),
        });
        const j = await r.json().catch(() => ({}));
        if (!j.ok) return null;
        const v = await fetch('/api/ao/talk/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: j.agent, text: j.reply }),
        });
        return { ...j, audio: v.ok ? await v.blob() : null };
      } catch (_) {
        return null;
      }
    })();
  }, [section, slug]);

  const act = useCallback(
    async (said) => {
      setLastHeard(said);
      const cmd = parseTalkCommand(said);
      if (cmd.type === 'next') return go(index + 1);
      if (cmd.type === 'back') return go(index - 1);
      if (cmd.type === 'last') return go(total - 1);
      // Heard words but no teammate or command in them: say so instead of
      // doing nothing (2026-11-08: an intro request vanished).
      if (cmd.type === 'none' && cmd.text && cmd.text.split(' ').length >= 3) {
        setHeardNote(`Didn't catch who that was for: "${cmd.text}"`);
        clearTimeout(heardNoteRef.current);
        heardNoteRef.current = setTimeout(() => setHeardNote(''), 5000);
        return;
      }
      if (cmd.type === 'goto') return go(cmd.index);
      if (cmd.type === 'demo') {
        const d = sections.findIndex((s) => s.kind === 'demo');
        if (d >= 0) go(d);
        if (!photo) return say('auto', 'Snap a photo of the room on your phone first, and we will take it from there.');
        setDemo({ phase: 'working' });
        try {
          const r = await fetch('/api/ao/talk/demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, photo_url: photo }),
          });
          const j = await r.json().catch(() => ({}));
          if (!j.ok) {
            setDemo({ phase: 'idle' });
            return say('auto', 'We hit a snag putting that together. Give me one more try.');
          }
          setDemo({ phase: 'talking', pkg: j.package });
          for (const l of j.lines || []) await say(l.agent, l.line);
          setDemo({ phase: 'ready', pkg: j.package });
        } catch (_) {
          setDemo({ phase: 'idle' });
        }
        return;
      }
      if (cmd.type === 'post') {
        if (demo.phase !== 'ready') return;
        setDemo((d) => ({ ...d, phase: 'posting' }));
        try {
          const r = await fetch('/api/ao/talk/demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post: true, package: demo.pkg, live, slug }),
          });
          const j = await r.json().catch(() => ({}));
          setDemo((d) => ({ ...d, phase: 'posted', result: j }));
          if (j.rehearsal) await say('auto', 'Rehearsal run. Nothing went out, but that is exactly how it would have gone.');
          else if (j.ok) {
            const n = (j.results || []).filter((x) => x.ok).length;
            await say('auto', `It's live. Out on ${n} of ${(j.results || []).length} channels.`);
          } else await say('it', 'Dude, it did not go out. I will check what broke right after the talk.');
        } catch (_) {
          setDemo((d) => ({ ...d, phase: 'ready' }));
        }
        return;
      }
      if (cmd.type === 'ask' && cmd.topic === 'built' && builtRef.current) {
        setReply(null);
        setThinking('it');
        const ready = await builtRef.current;
        builtRef.current = null;
        setThinking(null);
        if (ready) return say(ready.agent, ready.reply, ready.audio);
      }
      if (cmd.type === 'ask') {
        setReply(null);
        const j = await ask(cmd.agent, cmd.text, cmd.topic || '');
        if (!j) {
          setReply({ agent: cmd.agent, text: "Sorry, I didn't catch that. Say it once more?" });
          return;
        }
        await say(j.agent, j.reply);
        // "That's Bit's world, let me hand it over" (2026-11-08): the teammate it
        // belongs to answers right after, on their own.
        if (j.handoff) {
          const h = await ask(j.handoff, cmd.text, '', j.agent);
          if (h) await say(h.agent, h.reply);
        }
      }
      if (cmd.type === 'mistakes') {
        // Section 6: each one owns a real mistake in turn; the next is asked for while the current one speaks.
        setReply(null);
        let pending = ask(MISTAKE_ORDER[0], cmd.text, 'mistake');
        for (let i = 0; i < MISTAKE_ORDER.length; i++) {
          const j = await pending;
          if (i + 1 < MISTAKE_ORDER.length) pending = ask(MISTAKE_ORDER[i + 1], cmd.text, 'mistake');
          if (j) await say(j.agent, j.reply);
        }
        // Bart, 2026-11-08: after Bit, one of them says "Hey Bart, tell them
        // about the tattoos." Des, since images are hers.
        await say('designer', 'Hey Bart, tell them about the tattoos.');
        return;
      }
      if (cmd.type === 'team') {
        // Each teammate in turn: the next one's line is asked for while the current one speaks.
        setReply(null);
        const prompt = `${cmd.text}\n\n(Bart asked the whole team to say hi to the room. Introduce yourself in one short line: your name and what you do on the team, in your own way.)`;
        let pending = ask(TEAM_ORDER[0], prompt);
        for (let i = 0; i < TEAM_ORDER.length; i++) {
          const j = await pending;
          if (i + 1 < TEAM_ORDER.length) pending = ask(TEAM_ORDER[i + 1], prompt);
          if (j) await say(j.agent, j.reply);
        }
      }
    },
    [go, index, total, sections, say, ask, photo, slug, demo, live]
  );

  // A teammate cuts in on their own, once per talk, some seconds into a slide
  // (Bart, 2026-11-08: the Wildcats' win, and Veterans Day). If someone is
  // talking or listening, it waits for a quiet moment. Moving on cancels the rest.
  const interruptedRef = useRef(new Set());
  const busyRef = useRef(false);
  busyRef.current = Boolean(speech.listening || thinking || (reply && !reply.fading));
  useEffect(() => {
    if (benched) return undefined;
    const plan = section?.interrupt;
    if (!plan?.lines?.length || interruptedRef.current.has(section.id)) return undefined;
    let cancelled = false;
    let timer = setTimeout(async function go() {
      if (cancelled) return;
      if (busyRef.current) {
        timer = setTimeout(go, 1500);
        return;
      }
      interruptedRef.current.add(section.id);
      for (const l of plan.lines) {
        if (cancelled) return;
        if (l.pause) await new Promise((r) => setTimeout(r, l.pause));
        else await say(l.agent, l.text);
      }
    }, (plan.after_seconds || 20) * 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [section, say, benched]);

  // A teammate's answer belongs to the slide it was given on (Bart, 2026-11-08:
  // Ada's reply was still on screen after he moved to slide 2).
  useEffect(() => {
    setReply(null);
    audioRef.current?.pause();
  }, [index]);

  // Tell the iPad which slide is up, so it shows that slide's script
  // (2026-11-08), and whether the mic is on, so Talk reads Send (2026-11-09).
  screenRef.current = total ? { index, listening: Boolean(speech.listening) } : null;
  const reportingRef = useRef(false);
  reportRef.current = () => {
    if (!screenRef.current || reportingRef.current || benchedRef.current) return;
    reportingRef.current = true;
    fetch('/api/ao/talk/remote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, action: 'at', ...screenRef.current }),
    })
      .catch(() => {})
      .finally(() => {
        reportingRef.current = false;
      });
  };
  useEffect(() => {
    if (total) reportRef.current?.();
  }, [index, total, slug, speech.listening]);

  // Starting over wipes the run: the room photo, the demo, any message on
  // screen, and the interruptions play again (Bart, 2026-11-08: "The original
  // photo I took is still there. When the presentation starts over, this needs
  // to be wiped.").
  const startOver = () => {
    speech.cancel();
    audioRef.current?.pause();
    setReply(null);
    setPhoto(null);
    setDemo({ phase: 'idle' });
    interruptedRef.current = new Set();
    builtRef.current = null;
    go(0);
    fetch('/api/ao/talk/remote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, action: 'reset' }),
    }).catch(() => {});
  };

  startOverRef.current = startOver;
  remoteRef.current = (st) => {
    if (st.action === 'talk') {
      if (speech.listening) endListening();
      else beginListening();
    } else if (st.action === 'next') {
      if (speech.listening) speech.cancel();
      go(index + 1);
    }
    else if (st.action === 'first') startOver();
    else if (st.action === 'back') {
      if (speech.listening) speech.cancel();
      go(index - 1);
    }
    else if (st.action === 'photo' && st.photo_url) setPhoto(st.photo_url);
  };

  const beginListening = useCallback(() => {
    if (!speech.supported) return;
    audioRef.current?.pause();
    setReply(null);
    speech.start();
  }, [speech]);

  // Listening never runs on forever: after LISTEN_MAX_MS it sends what it heard.
  const endRef = useRef(null);
  useEffect(() => {
    if (!speech.listening) return undefined;
    const t = setTimeout(() => endRef.current?.(), LISTEN_MAX_MS);
    return () => clearTimeout(t);
  }, [speech.listening]);

  const endListening = useCallback(async () => {
    const said = await speech.stop();
    if (said) act(said);
  }, [speech, act]);
  endRef.current = endListening;

  useEffect(() => {
    const down = (e) => {
      // The arrows only change slides (2026-11-09: "free up the left and right
      // arrows to just be navigation"). Moving on while the mic is on drops it.
      if (e.key === 'PageDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (e.repeat) return;
        if (speech.listening) speech.cancel();
        go(index + 1);
      } else if (e.key === 'PageUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.repeat) return;
        if (speech.listening) speech.cancel();
        go(index - 1);
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        if (e.repeat || holdRef.current) return;
        // The V key on the laptop still listens while held.
        holdRef.current = { key: e.key, listening: true, timer: null };
        beginListening();
      } else if (e.key === 'Home' || e.key === 'Escape') startOverRef.current?.();
      else if (e.key === 'End') go(total - 1);
      else if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.().catch(() => {});
    };
    const up = (e) => {
      const h = holdRef.current;
      if (!h || h.key !== e.key) return;
      holdRef.current = null;
      if (h.listening) endListening();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [go, index, total, beginListening, endListening, speech.listening, speech.cancel]);

  if (error) return <div className="flex min-h-screen items-center justify-center bg-black p-8 text-lg text-gray-300">{error}</div>;
  if (!talk) return <div className="min-h-screen bg-black" />;
  if (benched)
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-8 text-center text-gray-300" style={{ fontSize: '2vw' }}>
        The talk is open in another tab. This one is paused so the two don't talk over each other. Close this tab.
      </div>
    );

  const speaker = reply?.agent || thinking;
  return (
    <div className="relative flex h-screen select-none flex-col overflow-hidden bg-black text-white" onDoubleClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
      <style>{"@font-face{font-family:'AO Display';src:url('/fonts/BebasNeue-Regular.ttf') format('truetype');font-display:block}"}</style>
      <main className="flex min-h-0 flex-1 items-center px-[8vw] pt-[7vh] pb-[2vh]">
        {section ? (
          <div className="flex w-full items-center gap-[5vw]">
            <div className="min-w-0 flex-1">
              {section.kind === 'demo' ? (
                <p className="mb-[3vh] font-semibold uppercase tracking-[0.3em] text-[#DB0812]" style={{ fontSize: '1.6vw' }}>Live</p>
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
            {section.kind === 'demo' && photo ? (
              <div className="flex max-w-[44vw] flex-col gap-3">
                <img src={demo.pkg?.photo_url || photo} alt="The room" className="max-h-[38vh] rounded-lg object-contain" />
                {demo.pkg ? (
                  <p className="max-h-[24vh] overflow-y-auto whitespace-pre-line rounded-lg bg-white/10 p-4 text-gray-200" style={{ fontSize: '1.05vw' }}>
                    {demo.pkg.captions.linkedin_personal}
                  </p>
                ) : null}
                <p className="text-gray-400" style={{ fontSize: '1.2vw' }}>
                  {demo.phase === 'working'
                    ? 'The team is on it…'
                    : demo.phase === 'ready'
                      ? 'Ready for your call.'
                      : demo.phase === 'posting'
                        ? 'Posting…'
                        : demo.phase === 'posted'
                          ? demo.result?.rehearsal
                            ? 'Rehearsal: nothing was posted.'
                            : `Posted: ${(demo.result?.results || []).filter((x) => x.ok).map((x) => x.platform).join(', ') || 'none'}`
                          : 'Photo is in.'}
                </p>
              </div>
            ) : section.image ? (
              <img src={section.image} alt="" className="max-h-[70vh] max-w-[38vw] rounded-lg object-contain" />
            ) : null}
          </div>
        ) : null}
      </main>

      {/* The team's bar (Bart, 2026-11-08): its own space at the bottom, so it
          never covers the slide or the demo caption. */}
      <section className="flex h-[17vh] flex-shrink-0 items-center px-[8vw]">
        {speech.listening ? (
          <p className="w-full text-center text-gray-400" style={{ fontSize: '1.4vw' }}>
            <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-[#DB0812] align-middle" />
            {speech.heard || 'Listening… tap Send on the iPad'}
          </p>
        ) : heardNote && !speaker ? (
          <p className="w-full text-center text-gray-400" style={{ fontSize: '1.3vw' }}>
            {heardNote}
          </p>
        ) : speaker ? (
          <div className={`flex w-full items-center gap-4 rounded-2xl bg-white/10 px-6 py-4 transition-opacity duration-700 ${reply?.fading ? 'opacity-0' : 'opacity-100'}`}>
            <img src={avatarFor(speaker)} alt="" className="h-14 w-14 flex-shrink-0 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-300" style={{ fontSize: '1.2vw' }}>{TEAM_LABELS[speaker] || 'Ada'}</p>
              <p className="text-white" style={{ fontSize: '1.8vw', lineHeight: 1.3 }}>{thinking ? '…' : reply?.chunks ? reply.chunks[reply.part || 0] : reply?.text}</p>
            </div>
          </div>
        ) : null}
      </section>

      <footer className="flex items-center justify-between px-[4vw] pb-[3vh]">
        <div className="flex gap-1.5">
          {sections.map((s, i) => (
            <span key={s.id} className={`h-1.5 rounded-full ${i === index ? 'w-8 bg-white' : 'w-3 bg-white/25'}`} />
          ))}
        </div>
        <img src="/brand/archetype-original-lockup.svg" alt="Archetype Original" className="h-[5vh] w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
      </footer>
      {!speech.supported ? <p className="absolute left-4 top-3 text-xs text-gray-500">Voice needs Chrome.</p> : null}
      {!live ? <p className="absolute right-4 top-3 rounded bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Rehearsal</p> : null}
      {!live && lastKey ? <p className="absolute left-4 top-3 rounded bg-white/10 px-2 py-1 text-xs text-gray-400">Last buttons: {lastKey}</p> : null}
      {!live && lastHeard ? <p className="absolute left-4 top-11 max-w-[60vw] truncate rounded bg-white/10 px-2 py-1 text-xs text-gray-400">Last heard: {lastHeard}</p> : null}
    </div>
  );
}
