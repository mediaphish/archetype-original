import React, { useState } from 'react';

/**
 * The phone remote for a live talk (2026-10-28). A backup clicker, and the
 * camera for the demo's room photo, which goes straight to the big screen.
 * Open /ao/remote on the phone while /ao/talk runs on the laptop.
 */

const DEFAULT_SLUG = 'neosho-chamber-2026';

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

export default function Remote() {
  const slug = new URLSearchParams(window.location.search).get('slug') || DEFAULT_SLUG;
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(null);

  const send = async (body) => {
    const r = await fetch('/api/ao/talk/remote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...body }),
    });
    if (r.status === 401) window.location.replace('/ao/login');
    return r.json().catch(() => ({}));
  };

  const move = async (action) => {
    setStatus(action === 'next' ? 'Next' : 'Back');
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

  const big = 'flex-1 rounded-2xl text-2xl font-bold active:scale-[0.98]';
  return (
    <div className="flex min-h-screen select-none flex-col gap-4 bg-black p-5 text-white">
      <p className="text-center text-sm text-gray-400">Talk remote</p>
      <div className="flex flex-1 gap-4">
        <button type="button" className={`${big} bg-white/10`} onClick={() => move('back')}>
          Back
        </button>
        <button type="button" className={`${big} bg-white text-black`} onClick={() => move('next')}>
          Next
        </button>
      </div>
      <label className="flex min-h-[22vh] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-[#DB0812] text-2xl font-bold">
        Photo for the demo
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={takePhoto} />
      </label>
      {preview ? <img src={preview} alt="" className="max-h-40 self-center rounded-lg" /> : null}
      <p className="min-h-[1.5rem] text-center text-sm text-gray-300">{status}</p>
    </div>
  );
}
