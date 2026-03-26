/**
 * Changelog — Remaining Human landing (AI as accelerant, not subject)
 * - Hero: supporting copy names AI-driven systems; keeps leadership frame.
 * - Agitation: opens with AI accelerating decisions; rest of rhythm matches spec.
 * - Reframe: AI as force accelerating everything; leadership exposed under that pressure.
 * - Intro, outcomes, author, qualification, final close: light AI mentions only where they add urgency/clarity.
 */
import React from 'react';
import SEO from '../components/SEO';

const SAMCART_CHECKOUT_URL =
  import.meta.env.VITE_REMAINING_HUMAN_SAMCART_URL ||
  'https://aobooks.mysamcart.com/archetype-original/';
const isCheckoutReady = Boolean(SAMCART_CHECKOUT_URL);

function goToPath(event, path) {
  event.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function goToCheckout(event) {
  if (!isCheckoutReady) {
    event.preventDefault();
  }
}

const heroCtaClasses =
  'inline-flex min-h-[54px] items-center justify-center rounded-md bg-[#8EE4D8] px-8 py-4 text-base font-semibold text-[#03211F] transition hover:bg-[#A4ECE2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8EE4D8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061312]';

const midCtaClasses =
  'inline-flex min-h-[54px] items-center justify-center rounded-md bg-[#8EE4D8] px-8 py-4 text-base font-semibold text-[#03211F] transition hover:bg-[#A4ECE2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8EE4D8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#102D2A]';

const finalCtaClasses =
  'inline-flex min-h-[54px] items-center justify-center rounded-md bg-[#2A8D80] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#24796F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A8D80] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EDF5F2]';

function CheckoutButton({ className, children }) {
  const mergedClassName = `${className} ${
    isCheckoutReady ? '' : 'opacity-60 cursor-not-allowed'
  }`;

  return (
    <a
      href={SAMCART_CHECKOUT_URL || '#'}
      onClick={goToCheckout}
      target={isCheckoutReady ? '_blank' : undefined}
      rel={isCheckoutReady ? 'noopener noreferrer' : undefined}
      aria-disabled={!isCheckoutReady}
      className={mergedClassName}
      title={isCheckoutReady ? undefined : 'Checkout link will be added when ready.'}
    >
      {children}
    </a>
  );
}

export default function RemainingHuman() {
  return (
    <>
      <SEO pageKey="remaining-human" />
      <main className="min-h-screen bg-[#061312] text-[#E7F1EE] [text-rendering:geometricPrecision]">
        {/* 1 — Hook: Hero */}
        <section className="relative overflow-hidden border-b border-[#95DACE]/20">
          <div className="absolute inset-0">
            <img
              src="/images/remaining-human/hero-echo.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,11,10,0.92)_0%,rgba(3,11,10,0.84)_45%,rgba(3,11,10,0.74)_100%)]" />
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 md:px-12 py-5 md:py-6">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-4 w-4 sm:h-5 sm:w-5 bg-[#A9D8D0]"
                  style={{
                    WebkitMaskImage: "url('/brand/ao-icon.svg')",
                    maskImage: "url('/brand/ao-icon.svg')",
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                  }}
                  aria-hidden="true"
                />
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[#A9D8D0]">
                  Remaining Human
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                <a
                  href="/"
                  onClick={(event) => goToPath(event, '/')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#9ADBD2]/30 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8E8E2] transition hover:border-[#9ADBD2]/55 hover:bg-[#0A2422]"
                >
                  AO Site
                </a>
                <a
                  href="/contact"
                  onClick={(event) => goToPath(event, '/contact')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#9ADBD2]/30 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8E8E2] transition hover:border-[#9ADBD2]/55 hover:bg-[#0A2422]"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 md:px-12 pb-16 pt-8 sm:pt-10 md:pt-12 md:pb-24">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
              <div className="max-w-xl">
                <p className="mb-4 text-[11px] sm:text-xs uppercase tracking-[0.19em] text-[#9DD3C9]">
                  New eBook by Bart Paden
                </p>
                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.04] text-[#F0FBF8]">
                  AI didn&apos;t remove the need for leadership.
                  <br />
                  It exposed it.
                </h1>
                <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#CFE5DF] max-w-[46ch]">
                  A field guide for leaders navigating speed, pressure, and AI-driven systems without losing clarity,
                  trust, or responsibility.
                </p>

                <div className="mt-8">
                  <CheckoutButton className={heroCtaClasses}>Get the eBook — $9.99</CheckoutButton>
                  <p className="mt-3 text-sm text-[#C3DFD8]">Launch price. Increasing to $19.99.</p>
                </div>

                {!isCheckoutReady && (
                  <p className="mt-4 text-sm text-[#9FC7BF]">
                    Checkout will activate as soon as your order link is live.
                  </p>
                )}
              </div>

              <div className="relative mx-auto w-full max-w-md rounded-xl border border-[#8CCFC4]/30 bg-[#081816]/60 p-4 sm:p-5 shadow-[0_0_0_1px_rgba(140,207,196,0.06),0_22px_70px_rgba(0,0,0,0.35)]">
                <img
                  src="/images/remaining-human/cover-front.png"
                  alt="Remaining Human book cover"
                  className="w-full rounded-lg object-cover"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2 — Agitation: Emotional recognition */}
        <section className="relative overflow-hidden border-y border-[#7DC7BC]/20 bg-[#050F0E] py-16 sm:py-20 md:py-24">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(141,228,214,0.10),transparent_40%),radial-gradient(circle_at_88%_70%,rgba(54,145,134,0.12),transparent_48%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,9,8,0.88)_0%,rgba(3,9,8,0.92)_100%)]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="relative mx-auto max-w-4xl">
              <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#E5F3F0]">
                You&apos;ve felt it. You just haven&apos;t named it yet.
              </h2>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <figure className="overflow-hidden rounded-lg border border-[#7DC7BC]/20 bg-black/20 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
                  <img
                    src="/images/remaining-human/problem-formation.png"
                    alt="A robot pointing at people in line"
                    className="aspect-[4/5] h-full w-full object-cover"
                    loading="lazy"
                  />
                </figure>
                <figure className="overflow-hidden rounded-lg border border-[#7DC7BC]/20 bg-black/20 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
                  <img
                    src="/images/remaining-human/problem-chase.png"
                    alt="A leader running under pressure as machines close in"
                    className="aspect-[4/5] h-full w-full object-cover"
                    loading="lazy"
                  />
                </figure>
                <figure className="overflow-hidden rounded-lg border border-[#7DC7BC]/20 bg-black/20 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
                  <img
                    src="/images/remaining-human/c06-sequence.png"
                    alt="People in formation with rising pressure and conformity"
                    className="aspect-[4/5] h-full w-full object-cover"
                    loading="lazy"
                  />
                </figure>
              </div>
              <p className="mt-10 text-lg sm:text-xl leading-relaxed text-[#D9ECE8] max-w-[52ch]">
                Speed increases as AI accelerates decisions. Wisdom gets thinner. Output grows. Trust erodes. Systems get
                smarter. Responsibility gets harder to see. Everything moves faster. People feel less seen.
              </p>
            </div>
          </div>
        </section>

        {/* 3 — Reframe */}
        <section className="relative overflow-hidden bg-[#0C1E1C] py-16 sm:py-20 md:py-24">
          <div className="absolute inset-0">
            <img
              src="/images/remaining-human/c04-turn.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-16"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,28,26,0.88)_0%,rgba(10,28,26,0.9)_100%)]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="relative mx-auto max-w-3xl space-y-5">
              <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#ECF8F5]">
                AI isn&apos;t the problem. It&apos;s the force accelerating everything.
              </h2>
              <p className="text-lg sm:text-xl leading-relaxed text-[#D5EAE5]">
                Leadership is what gets exposed inside it.
              </p>
            </div>
          </div>
        </section>

        {/* 4 — Introduce the book */}
        <section className="relative overflow-hidden bg-[#0E2A27] py-16 sm:py-20 md:py-24">
          <div className="absolute inset-0">
            <img
              src="/images/remaining-human/turn-conversation.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-12"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,42,39,0.92)_0%,rgba(14,42,39,0.94)_100%)]" />
          </div>

          <div className="container relative mx-auto px-4 sm:px-6 md:px-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#EAF8F5]">Remaining Human</h2>
              <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#D5EAE5]">
                Remaining Human is a field guide for leaders operating inside systems that move faster than
                clarity—especially as AI lifts the tempo across decisions, handoffs, and expectations. Not theory. Not
                tactics. A way to think clearly when everything else speeds up.
              </p>
              <div className="mt-8">
                <CheckoutButton className={midCtaClasses}>Get the eBook — $9.99</CheckoutButton>
                <p className="mt-3 text-sm text-[#B8DDD4]">Launch price. Increasing to $19.99.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5 — Outcomes */}
        <section className="bg-[#102D2A] py-16 sm:py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-start">
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#EAF8F5]">
                  What you&apos;ll walk away with
                </h2>
                <ul className="mt-8 space-y-3 text-base sm:text-lg leading-relaxed text-[#DCEEEA] max-w-[56ch]">
                  <li>Clarity when speed, pressure, and AI-shaped workflows stack together.</li>
                  <li>A way to lead people, not just systems.</li>
                  <li>Better decisions under pressure.</li>
                  <li>Language for what leadership must become.</li>
                </ul>
              </div>
              <figure className="overflow-hidden rounded-lg border border-[#9CD8CF]/25 bg-black/15 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
                <img
                  src="/images/remaining-human/c08-value-right.png"
                  alt="People in conversation under dim teal lighting"
                  className="aspect-[16/10] h-full w-full object-cover"
                  loading="lazy"
                />
              </figure>
            </div>
          </div>
        </section>

        {/* 6 — Author */}
        <section className="relative overflow-hidden bg-[#17423D] py-16 sm:py-20 md:py-24">
          <div className="absolute inset-0">
            <img
              src="/images/remaining-human/turn-conversation.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-24"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,66,61,0.86)_0%,rgba(23,66,61,0.9)_100%)]" />
          </div>

          <div className="container relative mx-auto px-4 sm:px-6 md:px-12">
            <div className="relative mx-auto max-w-4xl">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#F1FBF9]">
                    Built from experience, not theory
                  </h2>
                  <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#E4F1EE]">
                    Bart Paden has spent decades building organizations, leading teams, and living with decisions that
                    carried real consequences for people and culture—not as a story told later, but as daily weight.
                  </p>
                  <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#E4F1EE]">
                    Remaining Human isn&apos;t an abstract take on leadership. It&apos;s written from inside complexity:
                    incomplete information, constant pressure, and outcomes you still own after the moment passes.
                  </p>
                  <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#E4F1EE]">
                    When AI and the systems around it accelerate together, the risk isn&apos;t only a wrong call—it&apos;s
                    losing the clarity to know what &quot;right&quot; even means for the people you lead.
                  </p>
                </div>
                <figure className="mx-auto w-full max-w-[260px] shrink-0 overflow-hidden rounded-lg border border-[#A3D9D1]/35 bg-black/15 shadow-[0_18px_50px_rgba(0,0,0,0.24)] lg:mx-0 lg:max-w-[240px] lg:pt-1">
                  <img
                    src="/images/remaining-human/epilogue-a-right.png"
                    alt="Bart in conversation with leaders in a human-centered environment"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* 7 — Qualification */}
        <section className="bg-[#2A5851] py-16 sm:py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="mx-auto max-w-4xl">
              <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#F2FBF9]">This book is for you if:</h2>
              <ul className="mt-8 space-y-3 text-base sm:text-lg leading-relaxed text-[#EAF5F2]">
                <li className="border-b border-white/10 pb-3">
                  You lead where the pace is rising—and AI is part of why the tempo won&apos;t relax.
                </li>
                <li className="border-b border-white/10 pb-3">You feel pressure to move faster than clarity allows.</li>
                <li className="border-b border-white/10 pb-3">You do not want efficiency to quietly replace leadership.</li>
                <li>You believe trust, clarity, and responsibility still matter.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 8 — Final close */}
        <section className="relative overflow-hidden bg-[#EDF5F2] py-16 sm:py-20 md:py-24 text-[#102E2A]">
          <div className="absolute inset-0">
            <img
              src="/images/remaining-human/final-light.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-14"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(237,245,242,0.93)_0%,rgba(237,245,242,0.95)_100%)]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="relative mx-auto max-w-3xl text-center">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-[2.75rem] leading-tight text-[#123C37]">
                Clarity is still possible. But it will not happen by accident.
              </h2>
              <p className="mt-7 text-base sm:text-lg leading-relaxed text-[#2C504B]">
                If you&apos;ve felt that acceleration—including what AI is doing to the clock inside your
                organization—this book will help you see it and respond with intention.
              </p>
              <div className="mt-10">
                <CheckoutButton className={finalCtaClasses}>Get the eBook — $9.99</CheckoutButton>
                <p className="mt-3 text-sm text-[#3D625C]">Launch price. Increasing to $19.99.</p>
              </div>
              {!isCheckoutReady && (
                <p className="mt-4 text-sm text-[#4D716B]">
                  Checkout link coming next. Button is ready and will activate automatically.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
