/**
 * Contact Page — general questions; form posts to /api/contact
 */
import React, { useState } from 'react';
import SEO from '../components/SEO';

function go(e, path) {
  e.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
  });
  const [formStatus, setFormStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });

      const data = await res.json();

      if (res.ok) {
        setFormStatus({ loading: false, success: true, error: null });
        setFormState({ name: '', email: '', company: '', phone: '', message: '' });
      } else {
        setFormStatus({
          loading: false,
          success: false,
          error: data?.error || 'Something went wrong. Please try again.',
        });
      }
    } catch {
      setFormStatus({
        loading: false,
        success: false,
        error: 'Network error. Please check your connection and try again.',
      });
    }
  };

  return (
    <>
      <SEO pageKey="contact" />
      <div className="min-h-screen bg-[#FAFAF9] font-inter text-[#1A1A1A] antialiased">
        <section className="border-b-2 border-[#FAFAF9] bg-white">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-20">
            <div>
              <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                Contact
              </p>
              <h1 className="mb-5 font-serif text-[clamp(36px,4vw,56px)] font-normal leading-[1.1] tracking-[-0.01em] text-[#1A1A1A]">
                A direct line to Bart.
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#6B6B6B]">
                Whether you have a question about the work, the books, or what working with Bart looks like,
                this is the right place to start.
              </p>
            </div>
            <div className="pt-2">
              <p className="mb-5 font-sans text-[15px] leading-[1.85] text-[#3A3A3A]">
                This form goes directly to Bart. Not a support queue, not a routing system. If you are ready
                to explore advisory or a specific engagement, the Engagement Inquiry is the better starting
                point.
              </p>
              <p className="mb-5 font-sans text-[15px] leading-[1.85] text-[#3A3A3A]">
                For general questions, this works well.
              </p>
              <a
                href="/engagement-inquiry"
                onClick={(e) => go(e, '/engagement-inquiry')}
                className="font-sans text-[13px] font-semibold uppercase tracking-[0.06em] text-[#DB0812]"
              >
                Go to Engagement Inquiry &rarr;
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[#FAFAF9] py-[72px]">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-12 px-6 lg:grid-cols-[1fr_380px] lg:gap-20 lg:px-10">
            <div>
              <p className="mb-8 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                Send a message
              </p>
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                      Name <span className="text-[#DB0812]">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                      Email <span className="text-[#DB0812]">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="company" className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                    Organization
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={formState.company}
                    onChange={(e) => setFormState((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="Where you work (optional)"
                    className="w-full border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">
                    Message <span className="text-[#DB0812]">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={7}
                    value={formState.message}
                    onChange={(e) => setFormState((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="What's on your mind?"
                    className="w-full resize-y border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    disabled={formStatus.loading}
                    className="inline-flex min-h-[44px] items-center justify-center bg-[#DB0812] px-10 py-3 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {formStatus.loading ? 'Sending...' : 'Send Message'}
                  </button>
                  <span className="font-sans text-[12px] text-[#6B6B6B]">Bart responds personally.</span>
                </div>
                {formStatus.success && (
                  <p className="font-sans text-[14px] text-[#1A1A1A]" role="alert">
                    Message sent. Bart will be in touch.
                  </p>
                )}
                {formStatus.error && (
                  <p className="font-sans text-[14px] text-[#DB0812]" role="alert">
                    {formStatus.error}
                  </p>
                )}
              </form>
            </div>

            <div className="flex flex-col gap-[2px] lg:sticky lg:top-[88px]">
              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <h3 className="mb-3 font-serif text-[20px] font-normal text-[#1A1A1A]">What this is for</h3>
                <p className="mb-5 font-sans text-[14px] leading-[1.75] text-[#6B6B6B]">
                  General questions about the work, the books, speaking, or anything else. If you are exploring
                  an advisory or consulting engagement, use the Engagement Inquiry form.
                </p>
                <a
                  href="/engagement-inquiry"
                  onClick={(e) => go(e, '/engagement-inquiry')}
                  className="inline-flex min-h-[44px] items-center justify-center bg-[#DB0812] px-6 py-3 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90"
                >
                  Start an Inquiry &rarr;
                </a>
              </div>
              <div className="border border-[#1A1A1A]/08 bg-white p-8">
                <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  Response
                </p>
                <div className="space-y-3">
                  {[
                    ['Who responds', 'Bart directly'],
                    ['Timing', 'Within a few business days'],
                    ['Advisory', 'Limited availability'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start gap-4">
                      <span className="min-w-[80px] pt-[2px] font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7D72]">
                        {label}
                      </span>
                      <span className="font-sans text-[13px] text-[#6B6B6B]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#E1DED8] p-8">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                  Not sure where to start?
                </p>
                <p className="mb-5 font-sans text-[14px] leading-[1.75] text-[#6B6B6B]">
                  Chat with Archy. He can answer most questions about the work, the methods, and whether any of
                  this makes sense for your situation.
                </p>
                <a
                  href="/archy"
                  onClick={(e) => go(e, '/archy')}
                  className="inline-flex min-h-[44px] items-center justify-center border border-[#1A1A1A]/25 px-6 py-3 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                >
                  Chat with Archy
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#2B2929] px-6 py-20 text-center lg:px-10">
          <h2 className="mb-4 font-serif text-[clamp(26px,3vw,40px)] font-normal text-white">
            Ready for the real conversation?
          </h2>
          <p className="mx-auto mb-10 max-w-[480px] font-sans text-[15px] leading-[1.75] text-white/60">
            Advisory is available to a limited number of leaders at any given time. When you are ready, the
            inquiry starts here.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/engagement-inquiry"
              onClick={(e) => go(e, '/engagement-inquiry')}
              className="inline-flex min-h-[44px] items-center justify-center bg-[#DB0812] px-8 py-3 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90"
            >
              Start an Inquiry
            </a>
            <a
              href="/advisory"
              onClick={(e) => go(e, '/advisory')}
              className="inline-flex min-h-[44px] items-center justify-center border border-white/30 px-8 py-3 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-white/80 transition-all hover:border-white/70 hover:text-white"
            >
              How advisory works
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
