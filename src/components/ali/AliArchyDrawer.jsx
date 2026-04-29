import React from 'react';
import ChatApp from '../../app/ChatApp';
import { OptimizedImage } from '../OptimizedImage';

/**
 * Slide-out Archy panel aligned with site drawer width (FloatingArchyButton pattern).
 * Does not render the FAB — parent pages keep their existing floating button.
 */
export default function AliArchyDrawer({
  open,
  onClose,
  context = 'ali-dashboard',
  initialMessage = '',
  getContextPayload,
  title = 'Archy',
  subtitle = 'AI Leadership Assistant',
}) {
  if (!open) return null;

  return (
    <div
      className="fixed top-0 right-0 z-[9999] flex h-dvh w-[min(360px,calc(100vw-1rem))] max-w-[100vw] flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} chat`}
      id="ali-archy-drawer"
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3 min-h-[44px]">
          <div className="relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-[2px] border border-gray-200 bg-gray-50">
            <OptimizedImage
              src="/images/archy-avatar.png"
              alt=""
              className="h-full w-full object-cover"
              width={38}
              height={38}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div>
            <h3 className="font-inter text-sm font-semibold leading-tight text-gray-900">{title}</h3>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
              {subtitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-gray-200 text-lg leading-none text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
          aria-label="Close chat"
        >
          ×
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAF9]">
        <ChatApp
          context={context}
          initialMessage={initialMessage}
          getContextPayload={getContextPayload}
          variant="marketing"
        />
      </div>
    </div>
  );
}
