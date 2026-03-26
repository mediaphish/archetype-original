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
      <main className="min-h-screen bg-[#061312] text-[#E7F1EE]">
        {/* 1) HERO */}
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

          <div className="relative container mx-auto px-4 sm:px-6 md:px-12 py-5">
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

          <div className="relative container mx-auto px-4 sm:px-6 md:px-12 pb-20 pt-10 md:pt-14 md:pb-24">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
              <div className="max-w-xl">
                <p className="mb-4 text-xs uppercase tracking-[0.19em] text-[#9DD3C9]">New eBook by Bart Paden</p>
                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.06] text-[#F0FBF8]">
                  AI didn&apos;t remove the need for leadership.
                  <br />
                  It exposed it.
                </h1>
                <p className="mt-7 text-base sm:text-lg leading-relaxed text-[#CFE5DF]">
                  Remaining Human is a field guide for leaders navigating speed, pressure, and automation - without losing clarity, trust, or responsibility.
                </p>

                <div className="mt-10">
                  <CheckoutButton className="inline-flex min-h-[54px] items-center justify-center rounded-md bg-[#8EE4D8] px-8 py-4 text-base font-semibold text-[#03211F] transition hover:bg-[#A4ECE2]">
                    Get the eBook - $9.99
                  </CheckoutButton>
                  <p className="mt-3 text-sm text-[#C3DFD8]">Launch price. Increasing to $19.99.</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#AFCFC7]">
                    For leaders who feel the pressure of faster systems and thinner human connection.
                  </p>
                </div>

                {!isCheckoutReady && (
                  <p className="mt-4 text-sm text-[#9FC7BF]">
                    Checkout will activate as soon as your order link is live.
                  </p>
                )}
              </div>

              <div className="relative mx-auto w-full max-w-md rounded-xl border border-[#8CCFC4]/30 bg-[#081816]/75 p-4 sm:p-5">
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

        {/* 2) PROBLEM */}
        <section className="relative overflow-hidden border-y border-[#7DC7BC]/20 bg-[#050F0E] py-20 md:py-24">
          <div className="absolute inset-0">
            <img
              src="/images/remaining-human/problem-chase.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-18"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,9,8,0.9)_0%,rgba(3,9,8,0.92)_100%)]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="relative mx-auto max-w-4xl">
              <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#E5F3F0]">
                You can feel the shift, even if you haven&apos;t named it yet.
              </h2>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                <figure className="overflow-hidden rounded-lg border border-[#7DC7BC]/20">
                  <img
                    src="/images/remaining-human/problem-formation.png"
                    alt="A robot pointing at people in line"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </figure>
                <figure className="overflow-hidden rounded-lg border border-[#7DC7BC]/20">
                  <img
                    src="/images/remaining-human/problem-chase.png"
                    alt="A leader running under pressure as machines close in"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </figure>
                <figure className="overflow-hidden rounded-lg border border-[#7DC7BC]/20">
                  <img
                    src="/images/remaining-human/c06-sequence.png"
                    alt="People in formation with rising pressure and conformity"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </figure>
              </div>
              <div className="mt-12 space-y-8 md:space-y-10">
                <p className="text-2xl sm:text-3xl leading-tight text-[#D9ECE8]">Speed increases. Wisdom gets thinner.</p>
                <p className="text-2xl sm:text-3xl leading-tight text-[#D9ECE8]">Output grows. Trust erodes.</p>
                <p className="text-2xl sm:text-3xl leading-tight text-[#D9ECE8]">
                  Systems get smarter. Responsibility gets harder to see.
                </p>
                <p className="text-2xl sm:text-3xl leading-tight text-[#D9ECE8]">Everything moves faster. People feel less seen.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3) THE TURN */}
        <section className="relative overflow-hidden bg-[#0C1E1C] py-20 md:py-24">
          <div className="absolute inset-0">
            <img
              src="/images/remaining-human/c04-turn.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-14"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,28,26,0.88)_0%,rgba(10,28,26,0.9)_100%)]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="relative mx-auto max-w-4xl">
              <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#ECF8F5]">
                AI isn&apos;t the problem. Leadership is being exposed.
              </h2>
              <div className="mt-8 space-y-6 text-lg leading-relaxed text-[#D5EAE5]">
                <p>
                  The answer isn&apos;t slowing down technology.
                  It&apos;s becoming the kind of leader who can remain clear, present, and accountable while everything accelerates.
                </p>
                <p>
                  When systems become more powerful, leadership does not become less important.
                  It becomes more visible.
                  And more costly when it is absent.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4) VALUE */}
        <section className="bg-[#102D2A] py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#EAF8F5]">
                  What you&apos;ll walk away with
                </h2>
                <ul className="mt-9 space-y-4 text-lg leading-relaxed text-[#DCEEEA]">
                  <li>Clarity when everything feels fast</li>
                  <li>A way to lead people, not just systems</li>
                  <li>A grounded approach to decision-making under pressure</li>
                  <li>Language for what leadership must become next</li>
                </ul>
              </div>
              <figure className="overflow-hidden rounded-lg border border-[#9CD8CF]/25">
                <img
                  src="/images/remaining-human/c08-value-right.png"
                  alt="People in conversation under dim teal lighting"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </figure>
            </div>
          </div>
        </section>

        {/* 5) AUTHOR AUTHORITY */}
        <section className="relative overflow-hidden bg-[#17423D] py-20 md:py-24">
          <div className="absolute inset-0">
            <img
              src="/images/remaining-human/turn-conversation.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-24"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,66,61,0.86)_0%,rgba(23,66,61,0.9)_100%)]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="relative mx-auto grid max-w-5xl gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#F1FBF9]">
                  Built from experience, not theory
                </h2>
                <p className="mt-7 text-lg leading-relaxed text-[#E4F1EE]">
                  Written by Bart Paden, an entrepreneur and leader with over three decades of experience building organizations, leading teams, making decisions that carried real consequences, and living with the outcomes of those decisions long after they were made.
                </p>
                <p className="mt-6 text-lg leading-relaxed text-[#E4F1EE]">
                  This is not a perspective formed in isolation or hindsight. It comes from operating inside complexity, where pressure is constant, information is incomplete, and the cost of getting it wrong is not abstract. It affects people, culture, and the direction of everything you are responsible for.
                </p>
                <p className="mt-6 text-lg leading-relaxed text-[#E4F1EE]">
                  Remaining Human is not abstract leadership thinking. It is a response to what leadership becomes when systems get stronger, faster, and more dominant, and people risk becoming secondary without anyone explicitly choosing that outcome.
                </p>
                <p className="mt-6 text-lg leading-relaxed text-[#E4F1EE]">
                  It does not offer frameworks or step-by-step tools. It offers something more foundational. It helps you recognize what is already happening beneath the surface, what often goes unspoken, and what becomes visible only after the damage is done.
                </p>
                <p className="mt-6 text-lg leading-relaxed text-[#E4F1EE]">
                  If you have ever felt the tension between what is efficient and what is right, between what scales and what actually matters, this book is written for you.
                </p>
                <p className="mt-6 text-lg leading-relaxed text-[#E4F1EE]">
                  It is meant to sharpen awareness, challenge assumptions, and give language to things you may already sense but have not fully articulated.
                </p>
                <p className="mt-6 text-lg leading-relaxed text-[#E4F1EE]">
                  Because the real risk is not making the wrong decision.
                  <br />
                  The real risk is no longer seeing clearly enough to know the difference.
                </p>
              </div>
              <figure className="w-full max-w-[250px] justify-self-center overflow-hidden rounded-lg border border-[#A3D9D1]/35 lg:justify-self-end">
                <img
                  src="/images/remaining-human/epilogue-a-right.png"
                  alt="Bart in conversation with leaders in a human-centered environment"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </figure>
            </div>
          </div>
        </section>

        {/* 6) WHO THIS IS FOR */}
        <section className="bg-[#2A5851] py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="mx-auto max-w-4xl">
              <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#F2FBF9]">
                This book is for you if:
              </h2>
              <ul className="mt-9 space-y-4 text-lg leading-relaxed text-[#EAF5F2]">
                <li>You lead people in a high-speed environment</li>
                <li>You feel the pressure to move faster than wisdom allows</li>
                <li>You don&apos;t want efficiency to quietly replace leadership</li>
                <li>You believe trust, clarity, and responsibility still matter</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 7) FINAL CLOSE */}
        <section className="relative overflow-hidden bg-[#EDF5F2] py-20 md:py-24 text-[#102E2A]">
          <div className="absolute inset-0">
            <img
              src="/images/remaining-human/final-light.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-18"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(237,245,242,0.93)_0%,rgba(237,245,242,0.95)_100%)]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="relative mx-auto max-w-4xl text-center">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-[#123C37]">
                Clarity is still possible. Human leadership still matters.
              </h2>
              <p className="mt-7 text-base sm:text-lg leading-relaxed text-[#2C504B]">
                If AI is exposing the quality of leadership already in the room, this book will help you see that clearly - and respond with intention.
              </p>
              <div className="mt-10">
                <CheckoutButton className="inline-flex min-h-[54px] items-center justify-center rounded-md bg-[#2A8D80] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#24796F]">
                  Get the eBook - $9.99
                </CheckoutButton>
                <p className="mt-3 text-sm text-[#3D625C]">Immediate access. Price increasing soon.</p>
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
