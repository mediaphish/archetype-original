import React from 'react';

export default function AOStickyActions({
  children,
  className = '',
}) {
  return (
    <div
      className={[
        'md:hidden fixed left-0 right-0 z-30',
        'border-t border-gray-200 bg-white/95 backdrop-blur',
        className,
      ].join(' ')}
      style={{
        bottom: 'var(--aoKeyboardInset, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        {children}
      </div>
    </div>
  );
}

