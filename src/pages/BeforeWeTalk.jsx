/**
 * Before we talk (/before-we-talk?b=<booking>&s=<signature>).
 *
 * Bart, 2026-10-23: a prep form people fill out once, as part of onboarding,
 * so consent to record is settled before the call ("Then I don't have to ask
 * every time"). Modelled on the podcast guest intake. Wording Bart-approved
 * 2026-10-23, including the podcast line.
 *
 * Private: the link is signed per booking, the page is not indexed, and the
 * same link lets them change their answers later.
 * Server: api/clients/prep.js.
 */
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

const inputClass =
  'w-full border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none';
const textareaClass = `${inputClass} min-h-[96px] resize-y`;
const labelClass = 'mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]';
const cardClass = 'bg-white px-6 py-8 sm:px-8';

const CONTEXT_PLACEHOLDER = 'A sentence is plenty. A story is great too.';

function YesNo({ name, value, onChange }) {
  return (
    <div className="mt-3 flex gap-3">
      {[
        ['yes', 'Yes'],
        ['no', 'No'],
      ].map(([v, label]) => (
        <label
          key={v}
          className={`flex min-h-[44px] cursor-pointer items-center gap-2 border px-5 font-sans text-[14px] ${
            value === v ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A]'
          }`}
        >
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
          {label}
        </label>
      ))}
    </div>
  );
}

export default function BeforeWeTalk() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const query = `b=${encodeURIComponent(params.get('b') || '')}&s=${encodeURIComponent(params.get('s') || '')}`;
  const [state, setState] = useState({ loading: true, error: '', info: null });
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ saving: false, error: '', done: false, when: null });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/clients/prep?${query}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'This link is not valid.');
        setState({ loading: false, error: '', info: json });
        setForm({ name: json.name || '', website_trap: '', ...json.saved });
      } catch (e) {
        setState({ loading: false, error: e.message, info: null });
      }
    })();
  }, [query]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const setConsent = (key) => (v) => setForm((f) => ({ ...f, consent: { ...f.consent, [key]: v } }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ saving: true, error: '', done: false, when: null });
    try {
      const res = await fetch(`/api/clients/prep?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'That did not save. Please try again.');
      setStatus({ saving: false, error: '', done: true, when: json.when });
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      setStatus({ saving: false, error: err.message, done: false, when: null });
    }
  };

  const head = (
    <Helmet>
      <title>Before we talk | Archetype Original</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );

  if (state.loading) return <>{head}<div className="min-h-screen bg-[#FAFAF9]" /></>;

  if (state.error) {
    return (
      <>
        {head}
        <div className="min-h-screen bg-[#FAFAF9] px-6 py-24 lg:px-10">
          <div className="mx-auto max-w-[640px]">
            <h1 className="mb-4 font-serif text-[32px] text-[#1A1A1A]">{state.error}</h1>
            <p className="font-sans text-[15px] text-[#6B6B6B]">Open the link from Bart&apos;s email again, or reply to that email and he will sort it out.</p>
          </div>
        </div>
      </>
    );
  }

  if (status.done) {
    return (
      <>
        {head}
        <div className="min-h-screen bg-[#FAFAF9]">
          <section className="border-b border-[#1A1A1A]/10 bg-white px-6 py-20 lg:px-10">
            <div className="mx-auto max-w-[900px]">
              <h1 className="mb-5 font-serif text-[clamp(28px,3.5vw,48px)] font-normal leading-[1.15] text-[#1A1A1A]">
                Thank you. I have what I need.
              </h1>
              {status.when ? <p className="font-sans text-[16px] text-[#6B6B6B]">See you {status.when}.</p> : null}
            </div>
          </section>
        </div>
      </>
    );
  }

  const consentText = state.info.consent_text;

  return (
    <>
      {head}
      <div className="min-h-screen bg-[#FAFAF9] font-inter antialiased">
        <section className="bg-[#2B2929] px-6 pb-16 pt-20 lg:px-10">
          <div className="mx-auto max-w-[900px]">
            <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
              {state.info.when ? `Your conversation with Bart · ${state.info.when}` : 'Your conversation with Bart'}
            </p>
            <h1 className="mb-6 font-serif text-[clamp(36px,4.5vw,60px)] font-normal leading-[1.1] text-white">Before we talk</h1>
            <p className="max-w-[600px] font-sans text-[16px] leading-[1.8] text-white/70">
              Thank you for booking a conversation. This takes about five minutes, and you only fill it out once. It helps me come
              prepared, and it tells me what you are comfortable with.
            </p>
          </div>
        </section>

        <section className="py-14">
          <form onSubmit={submit} className="mx-auto flex max-w-[900px] flex-col gap-[2px] px-6 lg:px-10">
            <div className="absolute -left-[10000px] h-px w-px overflow-hidden opacity-0" aria-hidden="true">
              <label htmlFor="bwt-trap">Leave this field blank</label>
              <input id="bwt-trap" tabIndex={-1} autoComplete="off" value={form.website_trap} onChange={set('website_trap')} />
            </div>

            <div className={cardClass}>
              <h2 className="mb-6 font-serif text-[22px] text-[#1A1A1A]">About you</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="bwt-name">Name</label>
                  <input id="bwt-name" className={inputClass} value={form.name} onChange={set('name')} required />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input className={`${inputClass} text-[#6B6B6B]`} value={state.info.email} readOnly />
                </div>
                <div>
                  <label className={labelClass} htmlFor="bwt-phone">Phone (optional)</label>
                  <input id="bwt-phone" className={inputClass} value={form.phone} onChange={set('phone')} placeholder="(555) 555-5555" />
                  <label className="mt-3 flex cursor-pointer items-center gap-3 font-sans text-[13px] text-[#1A1A1A]">
                    <input type="checkbox" checked={Boolean(form.texts_ok)} onChange={set('texts_ok')} />
                    Text messages are fine
                  </label>
                </div>
                <div>
                  <label className={labelClass} htmlFor="bwt-company">Company or organization</label>
                  <input id="bwt-company" className={inputClass} value={form.company} onChange={set('company')} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="bwt-role">Your role</label>
                  <input id="bwt-role" className={inputClass} value={form.role} onChange={set('role')} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="bwt-website">Website</label>
                  <input id="bwt-website" className={inputClass} value={form.website} onChange={set('website')} placeholder="https://" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="bwt-linkedin">LinkedIn</label>
                  <input id="bwt-linkedin" className={inputClass} value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/yourname" />
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <h2 className="mb-6 font-serif text-[22px] text-[#1A1A1A]">What you are comfortable with</h2>
              {[
                ['record', 'Recording our conversations.'],
                ['archy', 'A private Archy for you.'],
                ['checkins', 'Check-ins by email'],
              ].map(([key, lead]) => (
                <div key={key} className="mb-7">
                  <p className="font-sans text-[15px] leading-[1.7] text-[#1A1A1A]">
                    <strong>{lead}</strong> {consentText[key].slice(lead.length).trim()}
                  </p>
                  <YesNo name={`consent-${key}`} value={form.consent?.[key]} onChange={setConsent(key)} />
                </div>
              ))}
              <p className="font-sans text-[13px] text-[#6B6B6B]">You can change any of these at any time. Every email from me has a link.</p>
            </div>

            <div className={cardClass}>
              <h2 className="mb-2 font-serif text-[22px] text-[#1A1A1A]">A little context</h2>
              <p className="mb-6 font-sans text-[13px] text-[#6B6B6B]">{CONTEXT_PLACEHOLDER}</p>
              <div className="space-y-5">
                <div>
                  <label className={labelClass} htmlFor="bwt-worth">What would make our time together worth it to you?</label>
                  <textarea id="bwt-worth" className={textareaClass} value={form.worth_it} onChange={set('worth_it')} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="bwt-how">How do you like to work through hard things? Talk it out, think it over first, something else?</label>
                  <textarea id="bwt-how" className={textareaClass} value={form.how_you_work} onChange={set('how_you_work')} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="bwt-else">Anything you want me to know before we start?</label>
                  <textarea id="bwt-else" className={textareaClass} value={form.anything_else} onChange={set('anything_else')} />
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <h2 className="mb-4 font-serif text-[22px] text-[#1A1A1A]">One more thing</h2>
              <p className="font-sans text-[15px] leading-[1.7] text-[#1A1A1A]">
                I also host The Archetype Original Podcast, conversations with people who have carried real weight and have
                something true to say about it. Would you be open to being a guest?
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  ['yes', "Yes, I'd like that"],
                  ['maybe', 'Maybe later'],
                  ['no', 'Not for me'],
                ].map(([v, label]) => (
                  <label
                    key={v}
                    className={`flex min-h-[44px] cursor-pointer items-center border px-5 font-sans text-[14px] ${
                      form.podcast === v ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A]'
                    }`}
                  >
                    <input type="radio" name="podcast" value={v} checked={form.podcast === v} onChange={() => set('podcast')(v)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-3 font-sans text-[13px] text-[#6B6B6B]">This has nothing to do with our conversation. It is just an open door.</p>
            </div>

            <div className="bg-white px-6 py-8 sm:px-8">
              {status.error ? <p className="mb-4 font-sans text-[14px] text-[#DB0812]">{status.error}</p> : null}
              <button
                type="submit"
                disabled={status.saving}
                className="inline-flex min-h-[48px] items-center justify-center bg-[#DB0812] px-8 font-sans text-[14px] font-semibold uppercase tracking-wider text-white disabled:opacity-60"
              >
                {status.saving ? 'Sending…' : 'Send it to Bart'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
