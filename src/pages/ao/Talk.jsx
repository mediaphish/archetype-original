import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useKeepAwake } from '../../lib/useKeepAwake.js';
import { parseTalkCommand, captionChunks, TEAM_LABELS, TEAM_ORDER, MISTAKE_ORDER } from '../../lib/talkCommands.js';
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

/** Pure: a cut-in whose last spoken line does not hand back to Bart gets "Back to you." */
export function withHandBack(lines) {
  const out = (lines || []).map((l) => ({ ...l }));
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].pause) continue;
    if (!/\b(back to you|as you were|over to you|all yours)\b/i.test(out[i].text || '')) out[i].text = `${String(out[i].text || '').trim()} Back to you.`;
    break;
  }
  return out;
}

/** One piece of a teammate's line as audio, tried twice; null if the voice failed. */
async function speechBlob(agent, text) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch('/api/ao/talk/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, text }),
      });
      if (r.ok) {
        const blob = await r.blob();
        blob.voiceRate = Number(r.headers.get('X-Voice-Rate')) || 1;
        return blob;
      }
    } catch (_) {
      /* try once more */
    }
  }
  return null;
}
// Every teammate at the same loudness (Bart, 2026-11-10: "Cam's voice is super
// quiet. Can we level each voice so they are presented at the same volume?").
// Each line is measured and lifted or lowered to one target, with a limiter so
// a boosted line never distorts. Without sound processing it plays as recorded.
const TARGET_DB = -20;
let soundCtx = null;
function sound() {
  try {
    if (!soundCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      soundCtx = new Ctx();
    }
    if (soundCtx.state === 'suspended') soundCtx.resume().catch(() => {});
    return soundCtx;
  } catch (_) {
    return null;
  }
}

// Browsers only allow sound processing after a click or key press, and the
// presenter always presses something to start, so any press switches it on.
if (typeof window !== 'undefined') {
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, () => sound(), { capture: true, passive: true }));
}

/** Pure: loudness of speech in decibels, ignoring the silent stretches. */
export function speechLevelDb(samples, windowSize = 1200) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i + windowSize <= samples.length; i += windowSize) {
    let p = 0;
    for (let j = i; j < i + windowSize; j++) p += samples[j] * samples[j];
    p /= windowSize;
    if (p > 1e-5) {
      sum += p;
      n++;
    }
  }
  return n ? 10 * Math.log10(sum / n) : null;
}

/** Pure: how much to turn a line up or down to reach the target. */
export function levelGain(db) {
  if (db === null || !Number.isFinite(db)) return 1;
  return Math.min(6, Math.max(0.25, 10 ** ((TARGET_DB - db) / 20)));
}

async function gainFor(blob) {
  const ctx = sound();
  if (!ctx) return 1;
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    return levelGain(speechLevelDb(buf.getChannelData(0), Math.round(buf.sampleRate / 20)));
  } catch (_) {
    return 1;
  }
}

/** Plays one line at its teammate's pace and the shared loudness. */
function playLeveled(audio, blob, gain) {
  audio.playbackRate = blob.voiceRate || 1;
  audio.preservesPitch = true;
  const ctx = sound();
  if (!ctx || ctx.state !== 'running') {
    audio.volume = Math.min(1, gain);
    return;
  }
  try {
    const src = ctx.createMediaElementSource(audio);
    const g = ctx.createGain();
    g.gain.value = gain;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -3;
    limit.knee.value = 0;
    limit.ratio.value = 20;
    limit.attack.value = 0.003;
    limit.release.value = 0.1;
    src.connect(g).connect(limit).connect(ctx.destination);
  } catch (_) {
    audio.volume = Math.min(1, gain);
  }
}

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
  const replyIdRef = useRef(null);
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
  // Spoken a piece at a time, the next piece's voice made while this one plays
  // (2026-11-09: long answers took about 9 seconds to voice in one go, ran into
  // the site's time limit, and the room saw words nobody said). A piece whose
  // voice fails stays on screen for about as long as it would take to say.
  const say = useCallback(
    async (agent, text, readyAudio = null) => {
      // A message fades a few seconds after it is spoken (Bart, 2026-11-08: Ada's
      // line was still up minutes later).
      const id = Date.now() + Math.random();
      clearTimeout(fadeRef.current);
      const chunks = captionChunks(text);
      setReply({ agent, text, id, chunks, part: 0 });
      const fadeLater = () => {
        fadeRef.current = setTimeout(() => {
          setReply((r) => (r && r.id === id ? { ...r, fading: true } : r));
          fadeRef.current = setTimeout(() => setReply((r) => (r && r.id === id ? null : r)), 900);
        }, REPLY_HOLD_MS);
      };
      const stillMine = () => replyIdRef.current === id;
      replyIdRef.current = id;
      const voices = Array.isArray(readyAudio) ? readyAudio.map((b) => Promise.resolve(b)) : [];
      const voiceFor = (i) => {
        if (!voices[i]) voices[i] = speechBlob(agent, chunks[i]);
        return voices[i];
      };
      try {
        voiceFor(0);
        for (let i = 0; i < chunks.length; i++) {
          if (!stillMine()) return;
          if (i + 1 < chunks.length) voiceFor(i + 1);
          const blob = await voiceFor(i);
          if (!stillMine()) return;
          setReply((r) => (r && r.id === id ? { ...r, part: i } : r));
          if (!blob) {
            await new Promise((resolve) => setTimeout(resolve, Math.max(1500, chunks[i].length * 65)));
            continue;
          }
          const gain = await gainFor(blob);
          if (!stillMine()) return;
          const url = URL.createObjectURL(blob);
          audioRef.current?.pause();
          const audio = new Audio(url);
          playLeveled(audio, blob, gain);
          audioRef.current = audio;
          await new Promise((resolve) => {
            audio.onended = resolve;
            audio.onerror = resolve;
            audio.onpause = () => {
              if (!audio.ended) resolve();
            };
            audio.play().catch(resolve);
          });
          URL.revokeObjectURL(url);
        }
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
        // Voiced a piece at a time, the same pieces the screen shows.
        const audio = await Promise.all(captionChunks(j.reply).map((c) => speechBlob(j.agent, c)));
        return { ...j, audio };
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
    // Every cut-in ends by handing back to Bart, out loud (2026-11-09: "When the
    // interruptions happen, I need them to tell me when they are done").
    const lines = withHandBack(plan.lines);
    // Voiced as the slide opens, so it plays the moment it is due.
    const voiced = lines.map((l) => (l.pause ? Promise.resolve(null) : Promise.all(captionChunks(l.text).map((c) => speechBlob(l.agent, c)))));
    let timer = setTimeout(async function go() {
      if (cancelled) return;
      if (busyRef.current) {
        timer = setTimeout(go, 1500);
        return;
      }
      interruptedRef.current.add(section.id);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (cancelled) return;
        if (l.pause) await new Promise((r) => setTimeout(r, l.pause));
        else await say(l.agent, l.text, await voiced[i]);
      }
    }, (plan.after_seconds || 20) * 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [section, say, benched]);

  // A page opened before an update keeps running the old talk (2026-11-09: the
  // team photo was made, but the laptop's page was older and never showed it).
  // On the title slide, with nothing going on, it picks up a newer version.
  useEffect(() => {
    if (index !== 0) return undefined;
    const mine = document.querySelector('script[src*="/assets/index-"]')?.getAttribute('src');
    if (!mine) return undefined;
    const t = setInterval(async () => {
      if (busyRef.current || benchedRef.current) return;
      try {
        const html = await (await fetch('/ao/talk', { cache: 'no-store' })).text();
        const latest = /\/assets\/index-[^"']+\.js/.exec(html)?.[0];
        if (latest && !mine.endsWith(latest)) window.location.reload();
      } catch (_) {
        /* try again next time */
      }
    }, 60000);
    return () => clearInterval(t);
  }, [index]);

  // A teammate's answer belongs to the slide it was given on (Bart, 2026-11-08:
  // Ada's reply was still on screen after he moved to slide 2).
  useEffect(() => {
    replyIdRef.current = null;
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
    replyIdRef.current = null;
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
    replyIdRef.current = null;
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
                <img
                  src={demo.pkg?.photo_url || photo}
                  alt="The room"
                  // The team in the room is the moment, so it gets the space (2026-11-09).
                  className={`${demo.pkg?.team_in_photo?.length ? 'max-h-[52vh]' : 'max-h-[38vh]'} rounded-lg object-contain`}
                />
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
