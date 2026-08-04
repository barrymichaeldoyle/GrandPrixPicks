import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Link } from '@tanstack/react-router';

/**
 * Rail card pointing at the delivery preferences. The page itself only reads
 * the in-app bell feed, so anything about push or email belongs in settings.
 */
export function NotificationSettingsCard() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <SlidersHorizontal
          className="h-3.5 w-3.5 text-text-muted"
          aria-hidden
        />
        <h2 className="gpp-label text-text-muted">Delivery</h2>
      </div>
      <p className="text-xs leading-relaxed text-text-muted">
        Choose what reaches you by push and email: session locks, published
        results, and reactions to your picks.
      </p>
      <Link
        to="/settings"
        hash="notifications"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
      >
        Notification settings
        <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}
