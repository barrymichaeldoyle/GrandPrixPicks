import { useConvexConnectionState } from 'convex/react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

const OFFLINE_DELAY_MS = 3000;

function useIsOffline() {
  const [browserOffline, setBrowserOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  );
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();
  const [showBanner, setShowBanner] = useState(false);

  const isRawOffline =
    browserOffline || (hasEverConnected && !isWebSocketConnected);

  useEffect(() => {
    function handleOnline() {
      setBrowserOffline(false);
    }
    function handleOffline() {
      setBrowserOffline(true);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isRawOffline) {
      setShowBanner(false);
      return;
    }
    const timer = setTimeout(() => setShowBanner(true), OFFLINE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isRawOffline]);

  return showBanner;
}

export function OfflineBanner() {
  const isOffline = useIsOffline();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-2 border-b border-warning/25 bg-warning/10 px-4 py-2 text-sm font-medium text-warning"
          >
            <WifiOff size={14} aria-hidden="true" />
            <span>No internet connection — data may be outdated</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
