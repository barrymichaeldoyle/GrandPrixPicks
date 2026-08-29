import { Download, Share2, X } from 'lucide-react';

import { usePWAInstall } from '@/hooks/usePWAInstall';

/** A quiet, dismissible path into the browser/OS install flow. */
export function PWAInstallBanner() {
  const {
    showBanner,
    isInstalling,
    requiresManualInstall,
    install,
    onDismiss,
  } = usePWAInstall();

  if (!showBanner) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="pwa-install-banner"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-border bg-surface px-4 py-2.5 text-sm text-text"
    >
      {requiresManualInstall ? (
        <>
          <Share2 className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <p className="min-w-56 flex-1 sm:flex-none">
            Install GP Picks from your browser&apos;s{' '}
            <span className="font-medium">Share</span> menu, then choose{' '}
            <span className="font-medium">Add to Home Screen</span>.
          </p>
        </>
      ) : (
        <p className="min-w-56 flex-1 sm:flex-none">
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
