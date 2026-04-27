import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ArchyCompanionContext = createContext(null);

/** ALI SaaS, AO automation, Operators — no public marketing Archy */
export function shouldShowPublicArchy(pathname) {
  const p = pathname || '';
  if (p === '/ali' || p.startsWith('/ali/')) return false;
  if (p.startsWith('/ao')) return false;
  if (p.startsWith('/operators')) return false;
  return true;
}

export function ArchyCompanionProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((o) => !o), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggle,
      open,
      close,
    }),
    [isOpen, toggle, open, close]
  );

  return <ArchyCompanionContext.Provider value={value}>{children}</ArchyCompanionContext.Provider>;
}

export function useArchyCompanion() {
  const ctx = useContext(ArchyCompanionContext);
  if (!ctx) {
    throw new Error('useArchyCompanion must be used within ArchyCompanionProvider');
  }
  return ctx;
}

/** Optional: FloatingArchyButton outside provider (should not happen after wiring). */
export function useArchyCompanionOptional() {
  return useContext(ArchyCompanionContext);
}

/**
 * Mobile: two-panel horizontal slide (page | chat). Desktop: single column (slide unused).
 */
export function ArchySlideContainer({ children }) {
  const { isOpen } = useArchyCompanion();
  const [isMd, setIsMd] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const fn = () => setIsMd(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  return (
    <div className="overflow-x-hidden md:overflow-x-visible min-h-dvh md:min-h-0 bg-warm-offWhite">
      <div
        className={`archy-slide-track flex flex-row min-h-dvh md:min-h-0 md:block w-[200vw] md:w-full transition-transform duration-300 ease-out motion-reduce:transition-none ${
          !isMd && isOpen ? '-translate-x-1/2' : 'translate-x-0'
        }`}
      >
        <div className="w-screen shrink-0 md:w-full md:min-h-0">{children}</div>
        <div
          id="archy-mobile-drawer-slot"
          className="w-screen shrink-0 md:hidden min-h-dvh bg-[#fafaf9] border-l border-black/10"
          aria-hidden={!isOpen}
        />
      </div>
    </div>
  );
}
