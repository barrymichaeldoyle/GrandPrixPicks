import { Download, Share2, X } from 'lucide-react';

import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallBanner() {
  const { showBanner, isIOSSafari, install, onDismiss } = usePWAInstall();

  if (!showBanner) {
    return null;
  }

  return (
    <div className="bg-surface-raised flex items-center gap-3 border-b border-border px-4 py-2.5">
      <div className="min-w-0 flex-1 text-sm text-text">
        {isIOSSafari ? (
          <span>
            Install GP Picks — tap{' '}
            <Share2
              className="inline h-3.5 w-3.5 align-text-bottom text-accent"
              aria-hidden="true"
            />{' '}
            then <span className="font-medium">Add to Home Screen</span>
          </span>
        ) : (
          <span>
            <span className="font-medium">Install Grand Prix Picks</span>{' '}
            <span className="text-text-muted">
              for quick access on race weekends
            </span>
          </span>
        )}
      </div>

      {!isIOSSafari && (
        <button
          onClick={() => void install()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-button-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-button-accent-hover"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Install
        </button>
      )}

      <button
        onClick={onDismiss}
        className="shrink-0 rounded p-1 text-text-muted transition-colors hover:text-text"
        aria-label="Dismiss install banner"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
