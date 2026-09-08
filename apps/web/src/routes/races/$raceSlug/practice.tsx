import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * The practice pages are gone. Every one redirects to the race it belonged to.
 *
 * Thirteen URLs, 22% of the sitemap, carrying a free-practice classification
 * and nothing else: driver codes, lap counts, lap times, gaps. No original
 * sentence on any of them, and the same table thirteen times over, which is
 * the scaled-content shape `docs/seo-content-policy.md` exists to keep off
 * this site.
 *
 * Three measurements agreed before this was touched. Not one of the thirteen
 * has ever appeared in a Google search result: zero impressions across the
 * whole of Search Console's history, while `/f1-standings` alone has 730. They
 * took 8 pageviews from 3 people in 60 days. And at 30% sibling overlap they
 * were the second most duplicated template on the site. They were failing at
 * search and at players simultaneously.
 *
 * The data survives where it is actually read: `PracticeResultsCard` on the
 * race page, the modal behind it, and `WeekendPracticeSection` on the
 * write-ups, all of which show the full classification inline. What went is
 * the copy of it that had its own URL.
 *
 * A 301 rather than a 404, which is the `circuits/$circuitSlug` pattern. The
 * target is the race page rather than the calendar because unlike the circuit
 * pages the mapping is exact: the slug is already the race.
 */
export const Route = createFileRoute('/races/$raceSlug/practice')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/races/$raceSlug',
      params: { raceSlug: params.raceSlug },
      statusCode: 301,
    });
  },
});
