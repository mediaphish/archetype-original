/**
 * Books hub: Accidental CEO, Remaining Human, The Room, in the order Bart wrote them.
 */
import React from 'react';
import SEO from '../components/SEO';
import SchemaJsonLd from '../components/SchemaJsonLd';
import { buildBooksItemListSchema } from '../lib/schemaBuilders.js';
import { OptimizedImage } from '../components/OptimizedImage';

function goToPath(event, path) {
  event.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// In the order Bart wrote them (set 2026-10-20). Photos are his desk shots of each book.
const BOOKS = [
  {
    title: 'Accidental CEO',
    image: '/images/books/accidental-ceo-desk.jpg',
    alt: 'Accidental CEO by Bart Paden, standing on a desk',
    blurb:
      'A leadership story about building something real, carrying more than expected, and choosing to lead when the weight shows up before the clarity does.',
    href: '/accidental-ceo',
    cta: 'Learn more & order',
    eager: true,
  },
  {
    title: 'Remaining Human',
    image: '/images/books/remaining-human-desk.jpg',
    alt: 'Remaining Human by Bart Paden, standing on a desk',
    blurb: 'Servant leadership, clarity, and staying human while intelligent systems reshape how decisions are made.',
    href: '/remaining-human',
    cta: 'Read more & buy',
  },
  {
    title: 'The Room',
    image: '/images/books/the-room-desk.jpg',
    alt: 'The Room by Bart Paden, standing on a desk',
    blurb:
      'The structural limits of honest feedback inside authority, and why the conversation you need often cannot happen inside your own room.',
    href: '/the-room',
    cta: 'Learn more & buy',
  },
];

export default function Books() {
  return (
    <>
      <SEO pageKey="books" />
      <SchemaJsonLd schema={buildBooksItemListSchema()} />
      <div className="min-h-screen bg-[#FAFAF9]">
        <section className="border-b border-[#1A1A1A]/10 bg-white py-14 sm:py-18 md:py-22">
          <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6 md:px-12">
            <h1 className="font-serif text-5xl font-bold tracking-tight text-[#1A1A1A] sm:text-6xl md:text-7xl">
              Books
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6B6B6B] sm:text-xl">
              Three books on leadership pressure, organizational honesty, and staying human while the world accelerates.
            </p>
          </div>
        </section>

        <section className="py-14 sm:py-18 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 md:px-12">
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              {BOOKS.map((book) => (
                <article key={book.href} className="flex flex-col border border-[#1A1A1A]/10 bg-white p-6 md:p-7">
                  <div className="mb-6 aspect-square overflow-hidden rounded-sm">
                    <OptimizedImage
                      src={book.image}
                      alt={book.alt}
                      className="h-full w-full object-cover"
                      loading={book.eager ? 'eager' : 'lazy'}
                    />
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#1A1A1A] sm:text-3xl">{book.title}</h2>
                  <p className="mt-3 flex-1 text-base leading-relaxed text-[#6B6B6B]">{book.blurb}</p>
                  <a
                    href={book.href}
                    onClick={(e) => goToPath(e, book.href)}
                    className="mt-8 inline-flex min-h-[44px] items-center justify-center border border-[#1A1A1A] px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                  >
                    {book.cta}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#1A1A1A]/10 bg-[#FAFAF9] py-14 sm:py-18">
          <div className="container mx-auto max-w-3xl px-4 text-center sm:px-6 md:px-12">
            <h2 className="font-serif text-3xl font-bold text-[#1A1A1A] sm:text-4xl">Not sure where to start?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[#6B6B6B]">
              Read <em>The Room</em> first if you want the argument in thirty-nine pages, or start a conversation if you already know you want to talk with Bart.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/the-room"
                onClick={(e) => goToPath(e, '/the-room')}
                className="inline-flex min-h-[44px] w-full max-w-xs items-center justify-center bg-[#1A1A1A] px-8 py-4 text-sm font-medium text-white transition-colors hover:bg-[#1A1A1A]/90 sm:w-auto"
              >
                About The Room
              </a>
              <a
                href="/engagement-inquiry"
                onClick={(e) => goToPath(e, '/engagement-inquiry')}
                className="inline-flex min-h-[44px] w-full max-w-xs items-center justify-center border border-[#1A1A1A] px-8 py-4 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white sm:w-auto"
              >
                Start a conversation
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
