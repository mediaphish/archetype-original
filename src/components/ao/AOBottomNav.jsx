import React from 'react';

const DEFAULT_TABS = [
  { key: 'analyst', path: '/ao/analyst', label: 'Auto' },
  { key: 'library', path: '/ao/library', label: 'Library' },
  { key: 'queue', path: '/ao/library/review-queue', label: 'Queue' },
  { key: 'podcast', path: '/ao/podcast', label: 'Podcast' },
  { key: 'settings', path: '/ao/settings', label: 'Settings' },
];

// Tailwind needs the class written out, so the count maps to a literal.
const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export default function AOBottomNav({
  active,
  onNavigate,
  tabs = DEFAULT_TABS,
  keyboardInset = 0,
}) {
  // When the keyboard is open, hiding the bottom nav reduces clutter and prevents “double bars”.
  const hidden = keyboardInset > 24;
  if (hidden) return null;

  return (
    <nav
      className="md:hidden fixed left-0 right-0 z-30 border-t border-gray-200 bg-white shadow-[0_-4px_14px_rgba(0,0,0,0.07)]"
      role="navigation"
      aria-label="AO Mobile Navigation"
      style={{
        bottom: 'var(--aoKeyboardInset, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2px)',
      }}
    >
      <div className="mx-auto max-w-7xl px-3">
        <div className={`grid gap-1 py-2 ${COLUMNS[Math.min(tabs.length, 6)] || 'grid-cols-6'}`}>
          {tabs.slice(0, 6).map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onNavigate?.(t.path)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'min-h-[44px] rounded-lg px-1.5 py-2 text-xs leading-tight',
                  'flex items-center justify-center text-center',
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

