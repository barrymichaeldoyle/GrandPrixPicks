import { Download, Share2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';

/**
 * A quiet, dismissible path into the browser/OS install flow.
 *
 * Pinned to the bottom of the viewport rather than sitting in the flow under
 * the header. Whether it appears at all is only knowable on the client:
 * Chromium fires `beforeinstallprompt` about a second after load, and the
 * dismissal is in `localStorage`, so no server render can reserve room for it.
 * In the flow that made it the page's largest layout shift by a wide margin —
 * 117px of content pushed down at ~0.9s, measured at 0.128 of a 0.130 CLS on a
 * signed-in phone reload, dwarfing everything the picks card does. Out of the
 * flow it costs nothing, and an install prompt is a footnote to the page
 * anyway, not the first thing to read.
 *
 * It clears the mobile tab bar when there is one, and publishes its own height
 * as `--bottom-overlay-offset` so the footer can pad itself past the banner
 * instead of ending underneath it.
 */
export function PWAInstallBanner() {
  const {
    showBanner,
    isInstalling,
    requiresManualInstall,
    install,
    onDismiss,
  } = usePWAInstall();
  const { isSignedIn } = useViewerSession();
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = bannerRef.current;
    const root = document.documentElement;
    if (!node) {
      root.style.removeProperty('--bottom-overlay-offset');
      return;
    }
    const banner = node;
    // Height varies with wrapping (the iOS copy runs to two lines on a narrow
    // phone), so it is measured rather than assumed.
    function publish() {
      root.style.setProperty(
        '--bottom-overlay-offset',
        `${Math.round(banner.getBoundingClientRect().height)}px`,
      );
    }
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--bottom-overlay-offset');
    };
  }, [showBanner]);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      data-testid="pwa-install-banner"
      /* One row, not a wrapping group: at the bottom of the viewport the
         wrapped version stacked the dismiss button onto a third line and stood
         117px tall, which is a lot of phone for a footnote. */
      className={`fixed inset-x-0 z-40 mx-auto flex w-full max-w-(--page-max) items-center gap-3 border-t border-border bg-surface px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-sm text-text ${
        // The tab bar owns the bottom edge for signed-in phones, so sit on top
        // of it there. Auth comes from the SSR-resolved session, the same
        // source the bar itself uses, so the two can never disagree.
        isSignedIn
          ? 'bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] min-[844px]:bottom-0'
          : 'bottom-0'
      }`}
    >
      {requiresManualInstall ? (
        <>
          <Share2 className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <p className="min-w-0 flex-1">
            Install GP Picks from your browser&apos;s{' '}
            <span className="font-medium">Share</span> menu, then choose{' '}
            <span className="font-medium">Add to Home Screen</span>.
          </p>
        </>
      ) : (
        <p className="min-w-0 flex-1">
          <span className="font-medium">Install Grand Prix Picks</span>{' '}
          <span className="text-text-muted">
            for quick access on race weekends.
          </span>
        </p>
      )}

      {!requiresManualInstall ? (
        <button
          type="button"
          onClick={() => void install()}
          disabled={isInstalling}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm bg-accent px-4 font-semibold text-text-on-accent transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:cursor-wait disabled:bg-surface-elevated disabled:text-text-disabled"
        >
          <Download className="h-4 w-4" aria-hidden />
          {isInstalling ? 'Opening…' : 'Install'}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss install suggestion"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
