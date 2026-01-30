import React, { memo } from 'react';

/**
 * Skip-to-content link for keyboard and screen reader users.
 * Renders as the first focusable element; visible on focus.
 */
function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={href}
      className="absolute left-[-9999px] w-px h-px overflow-hidden focus:left-4 focus:top-4 focus:z-[100] focus:w-auto focus:h-auto focus:overflow-visible focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
      tabIndex={0}
    >
      {children}
    </a>
  );
}

export default memo(SkipLink);
