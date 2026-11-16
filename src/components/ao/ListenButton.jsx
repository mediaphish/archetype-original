/**
 * Listen: reads a long piece aloud (Bart, 2026-11-16: "Can we give Auto the
 * ability to read posts to me ... while I drive." "I would want this on all
 * long form work Auto does.").
 *
 * Audio is only made when Bart asks for it (Bart, 2026-11-16: "I want to make
 * sure we only generate the audio for a post when I ask for it. I don't want the
 * spend unless I really need it."). The first tap only checks: if audio for this
 * exact version already exists it plays for free; otherwise it shows the length
 * and the one-time cost and waits for "Make the audio". Nothing is spent until
 * that second tap.
 *
 * Uses the phone's own audio player, so it keeps playing with the screen off and
 * shows on the lock screen and in the car.
 */
import { useState } from 'react';

const LONG_FORM_WORDS = 300;

export function isLongForm(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length >= LONG_FORM_WORDS;
}

function costLabel(dollars) {
  const cents = Math.max(1, Math.round(Number(dollars || 0) * 100));
  return cents < 100 ? `about ${cents} cents` : `about $${(cents / 100).toFixed(2)}`;
}

export default function ListenButton({ text, title = '' }) {
  // idle | checking | confirm | making | ready | error
  const [state, setState] = useState('idle');
  const [url, setUrl] = useState(null);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');

  if (!isLongForm(text)) return null;

  const call = async (extra) => {
    const res = await fetch('/api/ao/auto/listen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, title, ...extra }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) throw new Error(json?.error || 'Could not get the audio. Try again.');
    return json;
  };

  const check = async () => {
    setState('checking');
    setError('');
    try {
      const json = await call({ check: true });
      if (json.url) { setUrl(json.url); setState('ready'); return; }
      setQuote({ minutes: json.minutes, dollars: json.dollars });
      setState('confirm');
    } catch (e) {
      setError(e?.message || 'Could not get the audio. Try again.');
      setState('error');
    }
  };

  const make = async () => {
    setState('making');
    setError('');
    try {
      const json = await call({ confirm: true });
      if (!json.url) throw new Error('Could not make the audio. Try again.');
      setUrl(json.url);
      setState('ready');
    } catch (e) {
      setError(e?.message || 'Could not make the audio. Try again.');
      setState('error');
    }
  };

  if (state === 'ready' && url) {
    return (
      <div className="flex w-full flex-col gap-1" data-testid="listen-player">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls autoPlay preload="auto" src={url} className="w-full" title={title || 'Listen'} />
      </div>
    );
  }

  const btn = 'inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60';

  if (state === 'confirm' && quote) {
    return (
      <div className="flex flex-col items-start gap-1" data-testid="listen-confirm">
        <p className="text-[11px] text-gray-600">
          No audio for this version yet. It runs about {quote.minutes} minute{quote.minutes === 1 ? '' : 's'} and costs {costLabel(quote.dollars)} to make, once.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={make} data-testid="listen-make" className={btn}>Make the audio</button>
          <button type="button" onClick={() => setState('idle')} data-testid="listen-cancel" className={btn}>Not now</button>
        </div>
      </div>
    );
  }

  const busy = state === 'checking' || state === 'making';
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={check} disabled={busy} data-testid="listen-button" className={btn}>
        <span aria-hidden="true">{busy ? '…' : '▶'}</span>
        {state === 'making' ? 'Getting it ready (a minute or two)' : state === 'checking' ? 'Checking' : 'Listen'}
      </button>
      {state === 'error' ? <p className="text-[11px] text-rose-700">{error}</p> : null}
    </div>
  );
}
