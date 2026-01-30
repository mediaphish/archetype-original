import React, { useState, useEffect, memo } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Shows a persistent banner when the browser is offline.
 * Plan: "Show offline indicator when network unavailable"
 */
function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99] bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="w-5 h-5 flex-shrink-0" />
      <span>You're offline. Some features may be unavailable until you're back online.</span>
    </div>
  );
}

export default memo(OfflineBanner);
