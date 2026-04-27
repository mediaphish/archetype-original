import React, { useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import ChatApp from '../app/ChatApp';
import { OptimizedImage } from './OptimizedImage';
import { getQuickPromptsForContext } from '../config/archyQuickPrompts';
import {
  shouldShowPublicArchy,
  useArchyCompanionOptional,
} from '../contexts/ArchyCompanionContext.jsx';

const DEFAULT_FLOATING_BTN_CLASSES =
  'archy-fab-shift fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[55] h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-ao-red shadow-lg hover:shadow-xl hover:opacity-95 transition-all hover:scale-105 flex items-center justify-center overflow-hidden ring-2 ring-white/25';
const REMAINING_HUMAN_FLOATING_BTN_CLASSES =
  'archy-fab-shift fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[55] h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-[#061312] ring-2 ring-[#8EE4D8]/55 shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center overflow-hidden';

function useMatchMd() {
  const [isMd, setIsMd] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const fn = () => setIsMd(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return isMd;
}

export default function FloatingArchyButton() {
  const companion = useArchyCompanionOptional();
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const isOpen = companion ? companion.isOpen : fallbackOpen;
  const setIsOpen = companion ? companion.setIsOpen : setFallbackOpen;

  const [context, setContext] = useState('default');
  const [avatarSrc, setAvatarSrc] = useState('/images/archy-avatar.png');
  const [floatingButtonClassName, setFloatingButtonClassName] = useState(DEFAULT_FLOATING_BTN_CLASSES);
  const [mobileSlot, setMobileSlot] = useState(null);
  const isMd = useMatchMd();

  const [showChrome, setShowChrome] = useState(true);

  useLayoutEffect(() => {
    const el = document.getElementById('archy-mobile-drawer-slot');
    setMobileSlot(el);
  }, []);

  useEffect(() => {
    const tick = () => setShowChrome(shouldShowPublicArchy(window.location.pathname));
    tick();
    window.addEventListener('popstate', tick);
    return () => window.removeEventListener('popstate', tick);
  }, []);

  useEffect(() => {
    const updateContext = () => {
      const path = window.location.pathname;

      setAvatarSrc(
        path === '/remaining-human'
          ? '/images/remaining-human/archy-floating-neo.png'
          : '/images/archy-avatar.png'
      );
      setFloatingButtonClassName(
        path === '/remaining-human' ? REMAINING_HUMAN_FLOATING_BTN_CLASSES : DEFAULT_FLOATING_BTN_CLASSES
      );

      if (path === '/') {
        setContext('home');
      } else if (path === '/remaining-human') {
        setContext('remaining-human');
      } else if (path === '/faith') {
        setContext('faith');
      } else if (path === '/journal' || path.startsWith('/journal/')) {
        setContext('journal');
      } else if (path === '/methods/mentorship') {
        setContext('methods-mentorship');
      } else if (path === '/methods/consulting') {
        setContext('methods-consulting');
      } else if (path === '/methods/fractional-roles') {
        setContext('methods-fractional-roles');
      } else if (path === '/methods/fractional-roles/cco') {
        setContext('methods-fractional-cco');
      } else if (path === '/methods' || path.startsWith('/methods/')) {
        setContext('methods');
      } else if (path === '/culture-science' || path.startsWith('/culture-science/')) {
        setContext('culture-science');
      } else if (path === '/archy' || path.startsWith('/archy/')) {
        setContext('archy');
      } else if (path === '/advisory' || path === '/the-room') {
        setContext('advisory');
      } else if (path === '/meet-bart') {
        setContext('about');
      } else if (path === '/contact') {
        setContext('contact');
      } else if (path === '/engagement-inquiry') {
        setContext('engagement-inquiry');
      } else {
        setContext('default');
      }
    };

    updateContext();
    window.addEventListener('popstate', updateContext);

    return () => {
      window.removeEventListener('popstate', updateContext);
    };
  }, []);

  useEffect(() => {
    const onOpenChat = () => setIsOpen(true);
    window.addEventListener('ao-open-chat', onOpenChat);
    return () => window.removeEventListener('ao-open-chat', onOpenChat);
  }, [setIsOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!showChrome) {
      document.body.classList.remove('archy-drawer-open');
      return;
    }
    if (isMd && isOpen) {
      document.body.classList.add('archy-drawer-open');
    } else {
      document.body.classList.remove('archy-drawer-open');
    }
    return () => document.body.classList.remove('archy-drawer-open');
  }, [isMd, isOpen, showChrome]);

  useEffect(() => {
    if (!showChrome || !isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, setIsOpen, showChrome]);

  const quickPrompts = getQuickPromptsForContext(context);

  const drawerInner = (
    <div className="flex h-full min-h-0 flex-col bg-warm-offWhite shadow-soft">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-warm-border bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 ring-2 ring-ao-cream/80">
            <OptimizedImage
              src={avatarSrc}
              alt="Archy"
              className="h-10 w-10 rounded-full border-0"
              width={40}
              height={40}
            />
          </div>
          <div>
            <h3 className="font-playfair text-[1.25rem] font-normal leading-tight text-[#1A1A1A]">Archy</h3>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ao-brown">AI Leadership Assistant</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-warm-grey transition-colors hover:bg-warm-offWhite hover:text-ao-red"
          aria-label="Close chat"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-offWhite">
        <ChatApp context={context} quickPrompts={quickPrompts} variant="marketing" />
      </div>
    </div>
  );

  const desktopDrawer = isMd && (
    <div
      className={`fixed top-0 right-0 z-[60] flex h-dvh w-[min(420px,calc(100vw-1rem))] max-w-[100vw] flex-col border-l border-warm-border bg-warm-offWhite shadow-soft ${
        isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
      } transition-transform duration-300 ease-out motion-reduce:transition-none`}
      aria-hidden={!isOpen}
      id="archy-desktop-drawer"
    >
      {drawerInner}
    </div>
  );

  const mobileDrawer =
    !isMd &&
    mobileSlot &&
    createPortal(<div className="flex h-dvh min-h-0 flex-col">{drawerInner}</div>, mobileSlot);

  if (!showChrome) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={floatingButtonClassName}
        aria-expanded={isOpen}
        aria-controls={isMd ? 'archy-desktop-drawer' : 'archy-mobile-drawer-slot'}
        aria-label={isOpen ? 'Close Archy chat' : 'Chat with Archy'}
      >
        <OptimizedImage
          src={avatarSrc}
          alt="Archy"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </button>

      {desktopDrawer}
      {mobileDrawer}
    </>
  );
}
