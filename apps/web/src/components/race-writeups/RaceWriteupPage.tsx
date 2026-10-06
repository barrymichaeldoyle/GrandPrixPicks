import type { ReactNode } from 'react';

import { reviewedStamp } from '@/lib/lastReviewed';

import { RaceWriteupStoreLink } from './RaceWriteupStoreLink';

/**
 * The chrome every race write-up sits in: the hero band, the page frame,
 * source list, the F1 Store affiliate line, stamp.
 *
 * The affiliate line is the fallback placement. While the weekend's news grid
 * is on the page the store is a card in it (`RaceWriteupStoreCard`), and a
 * second link down here would be the same advert twice.
 *
 * The frame is `--page-max`, the same as the header and every other page. It
 * was `max-w-5xl` until October 2026, which left the hero 256px narrower than
 * the header above it: the title broke after "Grand" and the schedule card sat
 * well inside the header's right edge. Prose keeps its own 68ch measure, so
 * the wider frame changes the hero, news grid and picker, not line length.
 *
 * The hero is a separate slot because it is the one full-bleed band on the
 * page. Its surface runs edge to edge while its content keeps to the frame.
 */
export function RaceWriteupPage({
  hero,
  sources,
  reviewedAt,
  storeLinkInFooter,
  children,
}: {
  /** `RaceWriteupHero`. */
  hero: ReactNode;
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
      {hero}
      <div className="mx-auto max-w-(--page-max) px-4 pt-3 pb-5 sm:pt-4 sm:pb-8">
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
