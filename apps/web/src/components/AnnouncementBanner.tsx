import { api } from '@convex-generated/api';
import { useQuery } from 'convex/react';
import { Megaphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISSED_STORAGE_KEY = 'gpp-dismissed-announcement';

/**
 * Admin-managed site-wide banner (e.g. "results will be published late").
 * Dismissal is per-message: editing or reposting the announcement bumps
 * updatedAt, which invalidates earlier dismissals on every device.
 */
export function AnnouncementBanner() {
  const announcement = useQuery(api.announcements.getActive);
  // Read after mount — localStorage isn't available during SSR.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDismissedKey(localStorage.getItem(DISMISSED_STORAGE_KEY));
    setHydrated(true);
  }, []);

  if (!announcement || !hydrated) {
    return null;
  }

  const announcementKey = `${announcement._id}:${announcement.updatedAt}`;
  if (dismissedKey === announcementKey) {
    return null;
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_STORAGE_KEY, announcementKey);
    setDismissedKey(announcementKey);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="announcement-banner"
      className="flex items-start justify-center gap-2.5 border-b border-accent/25 bg-accent-muted/40 px-4 py-2.5 text-sm text-text"
    >
      <Megaphone
        size={16}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-accent"
      />
      <p className="min-w-0 whitespace-pre-line">{announcement.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 rounded-md p-0.5 text-text-muted transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
