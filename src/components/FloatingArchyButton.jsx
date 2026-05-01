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
      } else if (path === '/consulting') {
        setContext('methods-consulting');
      } else if (path === '/fractional-roles/cco') {
        setContext('methods-fractional-cco');
      } else if (path === '/fractional-roles') {
        setContext('methods-fractional-roles');
      } else if (path.includes('scoreboard-leadership')) {
        setContext('scoreboard-leadership');
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
  const isRemainingHumanDrawer = context === 'remaining-human';

  const drawerInner = (
    <div
      className={`flex h-full min-h-0 flex-col ${
        isRemainingHumanDrawer ? 'bg-[#061312]' : 'bg-white shadow-soft'
      }`}
    >
      <div
        className={`flex flex-shrink-0 items-center justify-between border-b px-5 py-4 pt-[max(0.75rem,env(safe-area-inset-top))] ${
          isRemainingHumanDrawer
            ? 'border-[#95DACE]/20 bg-[#0A2422]'
            : 'border-[rgba(26,26,26,0.08)] bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-[2px] ${
              isRemainingHumanDrawer
                ? 'border border-[#95DACE]/25 bg-[#061312]'
                : 'border border-[rgba(26,26,26,0.1)] bg-[#FAFAF9]'
            }`}
          >
            <OptimizedImage
              src={avatarSrc}
              alt="Archy"
              className="h-full w-full object-cover"
              width={38}
              height={38}
            />
          </div>
          <div>
            <h3
              className={`font-inter text-sm font-semibold leading-tight tracking-[0.02em] ${
                isRemainingHumanDrawer ? 'text-[#E7F1EE]' : 'text-[#1A1A1A]'
              }`}
            >
              Archy
            </h3>
            <p
              className={`mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                isRemainingHumanDrawer ? 'text-[#A9D8D0]' : 'text-ao-brown'
              }`}
            >
              AI Leadership Assistant
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border text-base leading-none transition-colors ${
            isRemainingHumanDrawer
              ? 'border-[#9ADBD2]/35 text-[#C8E8E2] hover:border-[#9ADBD2]/55 hover:bg-[#061312] hover:text-[#E7F1EE]'
              : 'border-[rgba(26,26,26,0.12)] text-[#6B6B6B] hover:border-[rgba(26,26,26,0.2)] hover:bg-[#FAFAF9] hover:text-[#1A1A1A]'
          }`}
          aria-label="Close chat"
        >
          ×
        </button>
      </div>
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
          isRemainingHumanDrawer ? 'bg-[#061312]' : 'bg-[#FAFAF9]'
        }`}
      >
        <ChatApp context={context} quickPrompts={quickPrompts} variant="marketing" />
      </div>
    </div>
  );

  const desktopDrawer = isMd && (
    <div
      className={`fixed top-0 right-0 z-[60] flex h-dvh w-[min(360px,calc(100vw-1rem))] max-w-[100vw] flex-col border-l shadow-soft ${
        isRemainingHumanDrawer
          ? 'border-[#95DACE]/25 bg-[#061312]'
          : 'border-[rgba(26,26,26,0.1)] bg-white'
      } ${
        isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
      } transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none`}
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
