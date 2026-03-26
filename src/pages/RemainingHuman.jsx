import React from 'react';
import SEO from '../components/SEO';

const SAMCART_CHECKOUT_URL = import.meta.env.VITE_REMAINING_HUMAN_SAMCART_URL || '';

const pressurePoints = [
  'Speed increases, but wisdom thins out.',
  'Data expands, but people feel less seen.',
  'Output grows, but trust erodes.',
];

const outcomes = [
  'Lead people, not just systems.',
  'Build clarity under pressure.',
  'Use servant leadership to restore trust, focus, and direction in the age of AI.',
];

function goToPath(event, path) {
  event.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function goToCheckout(event) {
  if (!SAMCART_CHECKOUT_URL) {
    event.preventDefault();
    return;
  }
}

function CheckoutButton({ className, children }) {
  const disabled = !SAMCART_CHECKOUT_URL;
  const mergedClassName = `${className} ${disabled ? 'opacity-55 cursor-not-allowed' : ''}`;

  return (
    <a
      href={SAMCART_CHECKOUT_URL || '#'}
      onClick={goToCheckout}
      target={disabled ? undefined : '_blank'}
      rel={disabled ? undefined : 'noopener noreferrer'}
      aria-disabled={disabled}
      className={mergedClassName}
      title={disabled ? 'Checkout link will be added when ready.' : undefined}
    >
      {children}
    </a>
  );
}

export default function RemainingHuman() {
  return (
    <>
      <SEO pageKey="remaining-human" />
      <main className="min-h-screen bg-[#041818] text-[#E9F5F3]">
        <section className="relative overflow-hidden border-b border-[#9ADBD2]/20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#7FD6C8]/20 blur-[130px]" />
            <div className="absolute bottom-[-8rem] right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-[#0A3D3A]/80 blur-[110px]" />
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 md:px-12 py-6">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-[#B6E4DE]">
                Remaining Human
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                <a
                  href="/"
                  onClick={(event) => goToPath(event, '/')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#9ADBD2]/35 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#D5F2EE] transition hover:border-[#9ADBD2]/70 hover:bg-[#0A2B2A]"
                >
                  AO Site
                </a>
                <a
                  href="/contact"
                  onClick={(event) => goToPath(event, '/contact')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#9ADBD2]/35 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#D5F2EE] transition hover:border-[#9ADBD2]/70 hover:bg-[#0A2B2A]"
                >
                  Contact
                </a>
                <CheckoutButton className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#7BE5D6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#02211F] transition hover:bg-[#9AF0E4]">
                  Buy Remaining Human
                </CheckoutButton>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(141,224,210,0.18),transparent_38%),radial-gradient(circle_at_82%_75%,rgba(91,164,153,0.2),transparent_45%)]" />
          <div className="relative container mx-auto px-4 sm:px-6 md:px-12 py-16 md:py-24">
            <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="mb-5 text-xs sm:text-sm uppercase tracking-[0.2em] text-[#A0D9D0]">
                  eBook by Bart Paden
                </p>
                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.04] text-[#ECFBF8]">
                  In the age of AI, the real risk is forgetting how to lead as humans.
                </h1>
                <p className="mt-8 max-w-xl text-base sm:text-lg leading-relaxed text-[#C9E6E1]">
                  <em>Remaining Human</em> is a leadership field guide for people who refuse
                  to let speed, automation, and pressure erase trust, clarity, and care.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <CheckoutButton className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[#8DE7DA] px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#02211F] transition hover:bg-[#A8EFE4]">
                    Buy Remaining Human
                  </CheckoutButton>
                  <a
                    href="#remaining-human-shift"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-[#9ADBD2]/45 px-7 py-3 text-sm font-medium uppercase tracking-[0.12em] text-[#D5F2EE] transition hover:bg-[#0A2B2A]"
                  >
                    Explore the Shift
                  </a>
                </div>
                {!SAMCART_CHECKOUT_URL && (
                  <p className="mt-4 text-sm text-[#A8D4CD]">
                    Checkout button is ready and will activate as soon as your SamCart link is added.
                  </p>
                )}
              </div>

              <div className="relative rounded-2xl border border-[#8CDCD0]/20 bg-[#052221]/70 p-5 sm:p-6 md:p-8 shadow-[0_0_80px_rgba(65,170,154,0.2)]">
                <img
                  src="/images/accidental-ceo/cover.png"
                  alt="Remaining Human cover art preview style"
                  className="w-full rounded-xl object-cover opacity-90 mix-blend-screen"
                  loading="eager"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-[#7FD6C8]/20" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#9ADBD2]/15 bg-[#031211] py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="mx-auto max-w-6xl">
              <p className="mb-6 text-xs sm:text-sm uppercase tracking-[0.18em] text-[#A0D9D0]">
                The pressure leaders feel now
              </p>
              <div className="grid gap-5 md:grid-cols-3">
                {pressurePoints.map((point) => (
                  <article
                    key={point}
                    className="rounded-xl border border-[#86DCCE]/20 bg-[#051E1D] px-5 py-6"
                  >
                    <p className="text-base leading-relaxed text-[#DBF4F0]">{point}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="remaining-human-shift" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="mx-auto max-w-6xl grid gap-10 md:grid-cols-2">
              <div>
                <p className="mb-5 text-xs sm:text-sm uppercase tracking-[0.18em] text-[#A0D9D0]">
                  Mid-book turn
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#EAF9F7]">
                  The answer is not rejecting AI.
                </h2>
                <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#CDE8E3]">
                  The answer is servant leadership: leaders who stay visible, present,
                  and accountable while technology accelerates around them.
                </p>
              </div>
              <div className="rounded-2xl border border-[#9ADBD2]/25 bg-[linear-gradient(135deg,#123b37_0%,#1c5a54_58%,#4c8479_100%)] px-6 py-7 md:px-8 md:py-9">
                <h3 className="text-lg sm:text-xl font-semibold text-[#F0FCFA] mb-5">
                  What this gives you
                </h3>
                <ul className="space-y-3 text-[#E1F5F1]">
                  {outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#C7FFF7]" />
                      <span className="text-base leading-relaxed">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#9ADBD2]/15 bg-[linear-gradient(180deg,#0A2826_0%,#113633_55%,#19413D_100%)] py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 md:px-12">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mb-4 text-xs sm:text-sm uppercase tracking-[0.18em] text-[#BBEDE6]">
                Remaining Human
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-white">
                Clarity is still possible. Human leadership still matters.
              </h2>
              <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#E6F9F5]/90">
                If you are leading through disruption, this book gives language, structure,
                and direction for what leadership must become next.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <CheckoutButton className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.11em] text-[#0D2E2B] transition hover:bg-[#E8FCF8]">
                  Buy Remaining Human
                </CheckoutButton>
                <a
                  href="/contact"
                  onClick={(event) => goToPath(event, '/contact')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-white/45 px-8 py-3 text-sm font-medium uppercase tracking-[0.11em] text-white transition hover:bg-white/10"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
