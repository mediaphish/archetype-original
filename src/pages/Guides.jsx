/**
 * Guides and drops (2026-10-28): /guides, /guides/:slug, /guides/thanks.
 * Guides are downloads delivered by email the moment they are paid for; a
 * drop is one design, ordered while the window is open, then printed.
 */
import React, { useEffect, useState } from 'react';

const money = (c) => `$${(Number(c || 0) / 100).toFixed(Number(c) % 100 ? 2 : 0)}`;

function goTo(event, path) {
  event.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

const closesLine = (p) => {
  if (p.kind !== 'apparel' || !p.closes_at) return null;
  const d = new Date(p.closes_at);
  return `Orders close ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. Printed after the window closes.`;
};

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="container mx-auto max-w-4xl px-4 py-14 sm:px-6 md:px-12">{children}</div>
    </div>
  );
}

function Product({ slug }) {
  const [p, setP] = useState(null);
  const [state, setState] = useState('loading');
  const [size, setSize] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/shop?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => (j.ok ? (setP(j.product), setState('ready')) : setState('missing')))
      .catch(() => setState('missing'));
  }, [slug]);
  const buy = async () => {
    setError('');
    if (p.kind === 'apparel' && !size) return setError('Pick a size.');
    setState('going');
    const r = await fetch('/api/shop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, size: size || null }) });
    const j = await r.json().catch(() => ({}));
    if (j.url) return window.location.assign(j.url);
    setError(j.error || 'Checkout did not start. Please try again.');
    setState('ready');
  };
  if (state === 'loading') return <Shell><p className="text-[#6B6B6B]">Loading…</p></Shell>;
  if (state === 'missing') return <Shell><p className="text-[#6B6B6B]">This one is not available.</p><a href="/guides" onClick={(e) => goTo(e, '/guides')} className="underline">See all guides</a></Shell>;
  return (
    <Shell>
      <div className="grid gap-10 md:grid-cols-2">
        {p.cover_url ? <img src={p.cover_url} alt={p.title} className="w-full rounded-lg shadow" /> : <div />}
        <div>
          <h1 className="font-serif text-4xl font-bold text-[#1A1A1A]">{p.title}</h1>
          {p.subtitle ? <p className="mt-3 text-lg text-[#6B6B6B]">{p.subtitle}</p> : null}
          <p className="mt-6 text-2xl font-semibold text-[#1A1A1A]">{money(p.price_cents)}</p>
          {p.description ? <div className="mt-6 whitespace-pre-line leading-relaxed text-[#1A1A1A]">{p.description}</div> : null}
          {p.kind === 'apparel' && (p.sizes || []).length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {p.sizes.map((s) => (
                <button key={s} type="button" onClick={() => setSize(s)} className={`rounded border px-4 py-2 ${size === s ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' : 'border-[#1A1A1A]/30'}`}>{s}</button>
              ))}
            </div>
          ) : null}
          {closesLine(p) ? <p className="mt-4 text-sm text-[#6B6B6B]">{closesLine(p)}</p> : null}
          {p.buyable ? (
            <button type="button" onClick={buy} disabled={state === 'going'} className="mt-8 rounded bg-[#1A1A1A] px-8 py-3 font-semibold text-white disabled:opacity-60">
              {state === 'going' ? 'Opening checkout…' : p.kind === 'guide' ? 'Buy and download' : 'Order yours'}
            </button>
          ) : (
            <p className="mt-8 text-[#6B6B6B]">{p.status === 'closed' ? 'This one is closed.' : 'Not on sale yet.'}</p>
          )}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          {p.kind === 'guide' ? <p className="mt-4 text-sm text-[#6B6B6B]">Your download arrives by email as soon as you pay.</p> : null}
        </div>
      </div>
    </Shell>
  );
}

function Thanks() {
  const drop = new URLSearchParams(window.location.search).get('drop');
  return (
    <Shell>
      <h1 className="font-serif text-4xl font-bold text-[#1A1A1A]">Thank you.</h1>
      <p className="mt-6 text-lg leading-relaxed text-[#1A1A1A]">
        {drop
          ? 'Your order is in. Shirts are printed after the order window closes, and you will get an email when yours ships.'
          : 'Your download is on its way to your inbox. If it is not there in a few minutes, check your spam folder or reply to your receipt.'}
      </p>
    </Shell>
  );
}

function List() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    fetch('/api/shop').then((r) => r.json()).then((j) => setItems(j.products || [])).catch(() => setItems([]));
  }, []);
  return (
    <Shell>
      <h1 className="font-serif text-5xl font-bold tracking-tight text-[#1A1A1A]">Guides</h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#6B6B6B]">Practical guides for leaders, drawn from years of writing on servant leadership.</p>
      {items === null ? <p className="mt-10 text-[#6B6B6B]">Loading…</p> : null}
      {items && !items.length ? <p className="mt-10 text-[#6B6B6B]">The first guide is on the way.</p> : null}
      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {(items || []).map((p) => (
          <a key={p.slug} href={`/guides/${p.slug}`} onClick={(e) => goTo(e, `/guides/${p.slug}`)} className="block rounded-lg bg-white p-6 shadow-sm hover:shadow">
            {p.cover_url ? <img src={p.cover_url} alt="" className="mb-4 w-full rounded" /> : null}
            <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">{p.title}</h2>
            {p.subtitle ? <p className="mt-2 text-[#6B6B6B]">{p.subtitle}</p> : null}
            <p className="mt-4 font-semibold">{money(p.price_cents)}</p>
          </a>
        ))}
      </div>
    </Shell>
  );
}

export default function Guides() {
  const path = window.location.pathname.replace(/\/+$/, '');
  const slug = path.startsWith('/guides/') ? decodeURIComponent(path.slice('/guides/'.length)) : '';
  if (slug === 'thanks') return <Thanks />;
  if (slug) return <Product slug={slug} />;
  return <List />;
}
