/**
 * Listen: reads a long piece aloud (Bart, 2026-11-16: "Can we give Auto the
 * ability to read posts to me ... while I drive." "I would want this on all
 * long form work Auto does."). The first press makes the audio, which can take
 * a minute or two for a long piece; after that it plays from the saved file.
 * Uses the phone's own audio player, so it keeps playing with the screen off and
 * shows on the lock screen and in the car.
 */
import { useState } from 'react';

const LONG_FORM_WORDS = 300;

export function isLongForm(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length >= LONG_FORM_WORDS;
}

export default function ListenButton({ text, title = '' }) {
  const [state, setState] = useState('idle'); // idle | making | ready | error
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');

  if (!isLongForm(text)) return null;

  const make = async () => {
    setState('making');
    setError('');
    try {
      const res = await fetch('/api/ao/auto/listen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok || !json.url) throw new Error(json?.error || 'Could not make the audio. Try again.');
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

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={make}
        disabled={state === 'making'}
        data-testid="listen-button"
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        <span aria-hidden="true">{state === 'making' ? '…' : '▶'}</span>
        {state === 'making' ? 'Getting it ready (a minute or two)' : 'Listen'}
      </button>
      {state === 'error' ? <p className="text-[11px] text-rose-700">{error}</p> : null}
    </div>
  );
}
