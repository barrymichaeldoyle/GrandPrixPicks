import { useEffect, useState } from 'react';

import { canManageConsent, openConsentManager } from '@/lib/consent';

/**
 * Footer control that re-opens Google's CMP so EEA/UK/CH visitors can change
 * their consent choices. Google's CMP is only present for in-scope visitors, so
 * this renders nothing (and never shows a dead button) for everyone else.
 */
export function PrivacyChoicesButton({ className }: { className?: string }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    // Google's CMP loads asynchronously after the AdSense script, so poll
    // briefly until its revocation API is present, then stop.
    if (canManageConsent()) {
      setAvailable(true);
      return;
    }
    const interval = window.setInterval(() => {
      if (canManageConsent()) {
        setAvailable(true);
        window.clearInterval(interval);
      }
    }, 500);
    const stop = window.setTimeout(() => window.clearInterval(interval), 6000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, []);

  if (!available) {
    return null;
  }

  return (
    <button type="button" className={className} onClick={openConsentManager}>
      Privacy choices
    </button>
  );
}
