import { Link } from '@tanstack/react-router';
import { CheckCircle2, LoaderCircle, X } from 'lucide-react';

export function PurchaseSuccessBanner({
  season,
  hasSeasonPass,
  onDismiss,
}: {
  season: number;
  hasSeasonPass: boolean | undefined;
  onDismiss: () => void;
}) {
  return (
    <div className="reveal-up reveal-delay-1 mb-6 rounded-sm border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {hasSeasonPass === true ? (
            <div className="flex items-start gap-2 text-success">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Season Pass is active</p>
                <p className="text-sm text-text-muted">
                  Your {season} season pass is now active. Premium league limits
                  are unlocked.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-accent">
              <LoaderCircle className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
              <div>
                <p className="font-semibold">Payment received</p>
                <p className="text-sm text-text-muted">
                  Activating your {season} season pass. This can take a few
                  seconds after checkout closes.
                </p>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex rounded-md p-1 text-text-muted hover:bg-surface-muted hover:text-text"
          aria-label="Dismiss purchase banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        <Link to="/leagues" className="text-accent hover:underline">
          Go to leagues
        </Link>{' '}
        to create or join leagues with your new limits.
      </p>
    </div>
  );
}
