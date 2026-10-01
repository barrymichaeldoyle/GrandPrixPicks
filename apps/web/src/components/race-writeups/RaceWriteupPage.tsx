import type { ReactNode } from 'react';

import { reviewedStamp } from '@/lib/lastReviewed';

import { RaceWriteupStoreLink } from './RaceWriteupStoreLink';

/**
 * The chrome every race write-up sits in: reading measure, source list, the
 * F1 Store affiliate line, stamp.
 *
 * The affiliate line is the fallback placement. While the weekend's news grid
 * is on the page the store is a card in it (`RaceWriteupStoreCard`), and a
 * second link down here would be the same advert twice.
 *
 * The prose stays in the page. This is only the frame, so a change to the
 * footer's measure or the last-reviewed line lands once instead of five
 * times.
 */
export function RaceWriteupPage({
  sources,
  reviewedAt,
  storeLinkInFooter,
  children,
}: {
  /** The attribution paragraph. Each claim still names its own source. */
  sources: ReactNode;
  /** Editorial review timestamp, from `lastReviewedAt`. */
  reviewedAt: number;
  /** False while `WeekendNewsSection` is rendered, which carries the card. */
  storeLinkInFooter: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        {children}
        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>{sources}</p>
          {storeLinkInFooter ? <RaceWriteupStoreLink /> : null}
          <p className="gpp-mono mt-2 text-xs">
            Last reviewed {reviewedStamp(reviewedAt)}
          </p>
        </footer>
      </div>
    </div>
  );
}
