import { api } from '@convex-generated/api';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';
import { Megaphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useNow } from '@/lib/testing/now';

const DISMISSED_STORAGE_KEY = 'gpp-dismissed-announcement';

/** Site-wide manual announcements and scheduled unattended-results notices. */
export function AnnouncementBanner() {
  const manualAnnouncement = useQuery(api.announcements.getActive);
  const unattendedNotices = useQuery(
    api.openF1Results.getUnattendedDelayBanners,
  );
  // Coarse tick: appearing/disappearing within ~30s of the boundary is fine.
  const now = useNow(30_000);
  // Read after mount — localStorage isn't available during SSR.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDismissedKey(localStorage.getItem(DISMISSED_STORAGE_KEY));
    setHydrated(true);
  }, []);

  const manualIsActive =
    manualAnnouncement != null &&
    (manualAnnouncement.startsAt == null ||
      now >= manualAnnouncement.startsAt) &&
    (manualAnnouncement.expiresAt == null ||
      now < manualAnnouncement.expiresAt);
  const unattendedNotice = unattendedNotices?.find(
    (notice) => now >= notice.startsAt && now < notice.expiresAt,
  );
  // A deliberate site-wide admin announcement takes priority if both overlap.
  const announcement = manualIsActive ? manualAnnouncement : unattendedNotice;

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
      className="flex items-center justify-center gap-2.5 border-b border-accent/25 bg-accent-muted/40 px-4 py-2.5 text-sm text-text"
    >
      <Megaphone
        size={16}
        aria-hidden="true"
        className="shrink-0 text-accent"
      />
      <p className="min-w-0 whitespace-pre-line">
        {announcement.message}
        {'linkPath' in announcement && announcement.linkPath ? (
          <>
            {' '}
            <Link
              to={announcement.linkPath}
              className="font-medium text-accent underline underline-offset-2"
            >
              {announcement.linkLabel ?? 'Read more'}
            </Link>
          </>
        ) : null}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
