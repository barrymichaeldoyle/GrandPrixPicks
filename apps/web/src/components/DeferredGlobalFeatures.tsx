import { AnnouncementBanner } from './AnnouncementBanner';
import { CookieConsent } from './CookieConsent';
import { ErrorBoundary } from './error/ErrorBoundary';

/**
 * Global features that do not need to compete with the initial page render.
 * This module is loaded from an idle-time client boundary in the root shell.
 */
export function DeferredShellFeatures() {
  return (
    <>
      <ErrorBoundary fallback={null}>
        <AnnouncementBanner />
      </ErrorBoundary>
      <CookieConsent />
    </>
  );
}
