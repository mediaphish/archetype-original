/**
 * Public guest-facing show page — magic link access only.
 */
import React, { useEffect, useState } from 'react';
import SEO from '../components/SEO';
import PodcastGuestSubmissionContent from '../components/podcast/PodcastGuestSubmissionContent';

const inputClass =
  'w-full border border-[#1A1A1A]/15 bg-[#FAFAF9] px-4 py-3 font-sans text-[14px] text-[#1A1A1A] transition-colors placeholder:text-[#A8A9AD] focus:border-[#1A1A1A] focus:bg-white focus:outline-none';

export default function PodcastGuestView() {
  const guestId = window.location.pathname.replace('/podcast/guest/', '').replace(/\/$/, '');
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [requestStatus, setRequestStatus] = useState({ loading: false, sent: false, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!guestId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/podcast/guest-record?guest_id=${encodeURIComponent(guestId)}`);
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (res.ok && json.ok) {
            setGuest(json.guest);
            setAuthenticated(true);
          } else {
            setAuthenticated(false);
          }
        }
      } catch {
        if (!cancelled) setAuthenticated(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guestId]);

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    setRequestStatus({ loading: true, sent: false, error: null });
    try {
      const res = await fetch('/api/podcast/guest-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId, email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Could not send access link.');
      }
      setRequestStatus({ loading: false, sent: true, error: null });
    } catch (err) {
      setRequestStatus({ loading: false, sent: false, error: err.message || 'Could not send access link.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] px-6 py-24 font-inter antialiased">
        <p className="mx-auto max-w-[720px] font-sans text-[14px] text-[#6B6B6B]">Loading…</p>
      </div>
    );
  }

  if (!guestId) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] px-6 py-24 font-inter antialiased">
        <p className="mx-auto max-w-[720px] font-sans text-[14px] text-[#DB0812]">Guest page not found.</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <SEO pageKey="podcast-guest-intake" />
        <div className="min-h-screen bg-[#FAFAF9] font-inter antialiased">
          <section className="bg-[#2B2929] px-6 pb-16 pt-24 lg:px-10">
            <div className="mx-auto max-w-[560px]">
              <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
                The Archetype Original Podcast
              </p>
              <h1 className="mb-4 font-serif text-[clamp(28px,3.5vw,40px)] font-normal text-white">
                Request access
              </h1>
              <p className="font-sans text-[15px] leading-relaxed text-white/65">
                This is your private guest page. Enter the email you used on the intake form and we&apos;ll send you a
                secure link.
              </p>
            </div>
          </section>

          <section className="px-6 py-12 lg:px-10">
            <div className="mx-auto max-w-[560px] border border-[#1A1A1A]/08 bg-white p-8">
              {requestStatus.sent ? (
                <p className="font-sans text-[15px] leading-relaxed text-[#1A1A1A]">
                  Check your email for a secure link. It expires in 15 minutes.
                </p>
              ) : (
                <form onSubmit={handleRequestAccess} className="space-y-4">
                  <div>
                    <label className="mb-2 block font-sans text-[13px] font-medium text-[#1A1A1A]">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </div>
                  {requestStatus.error && (
                    <p className="font-sans text-[14px] text-[#DB0812]" role="alert">
                      {requestStatus.error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={requestStatus.loading}
                    className="inline-flex min-h-[44px] items-center justify-center bg-[#DB0812] px-8 py-3 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {requestStatus.loading ? 'Sending…' : 'Email me a link'}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO pageKey="podcast-guest-intake" />
      <div className="min-h-screen bg-[#FAFAF9] font-inter antialiased">
        <section className="bg-[#2B2929] px-6 pb-16 pt-24 lg:px-10">
          <div className="mx-auto max-w-[800px]">
            <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B7D72]">
              The Archetype Original Podcast — Your guest page
            </p>
            <p className="max-w-[560px] font-sans text-[15px] leading-relaxed text-white/65">
              This is exactly what you submitted. Bart uses this to prepare for your conversation.
            </p>
          </div>
        </section>

        <section className="px-6 py-12 lg:px-10">
          <div className="mx-auto max-w-[800px] border border-[#1A1A1A]/08 bg-white p-8 sm:p-10">
            <PodcastGuestSubmissionContent guest={guest} showPrivateNotice />
          </div>
        </section>
      </div>
    </>
  );
}
