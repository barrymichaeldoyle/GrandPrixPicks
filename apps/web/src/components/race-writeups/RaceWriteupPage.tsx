import type { ReactNode } from 'react';

import { reviewedStamp } from '@/lib/lastReviewed';

/**
 * The chrome every race write-up sits in: reading measure, source list, stamp.
 *
 * The prose stays in the page. This is only the frame, so a change to the
 * footer's measure or the last-reviewed line lands once instead of five
 * times.
 */
export function RaceWriteupPage({
  sources,
  reviewedAt,
  children,
}: {
  /** The attribution paragraph. Each claim still names its own source. */
  sources: ReactNode;
  /** Editorial review timestamp, from `lastReviewedAt`. */
  reviewedAt: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        {children}
        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>{sources}</p>
          <p className="gpp-mono mt-2 text-xs">
            Last reviewed {reviewedStamp(reviewedAt)}
          </p>
        </footer>
      </div>
    </div>
  );
}
