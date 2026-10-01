import { captureAnalyticsEvent } from '@/lib/analytics';

/**
 * Impact tracking link for the F1 Store partner programme (8%, 7-day
 * referral). Generated on the impact.com partner dashboard; it redirects to
 * f1store2.formula1.com with the click id attached.
 */
export const F1_STORE_AFFILIATE_URL = 'https://f1.pxf.io/PzNVMe';

/**
 * The one affiliate placement on the site: a line in the write-up footer.
 *
 * Kept to the footer on purpose. The write-ups are the pages search ranks and
 * AdSense reviews, so the link sits beside the sources rather than in the
 * prose, and there is no shop page (see `docs/seo-content-policy.md`).
 *
 * `rel="sponsored"` is Google's required marking for a paid link. The
 * disclosure sits next to the link because a reader has to see it before they
 * click, not on a policy page.
 *
 * The click is measured because the case for keeping it is a number: Impact
 * reports sales, PostHog reports whether anyone clicks at all. The event has
 * no race property because PostHog already records the page's URL on it.
 */
export function RaceWriteupStoreLink() {
  return (
    <p className="mt-2">
      Team kit and caps are on the{' '}
      <a
        href={F1_STORE_AFFILIATE_URL}
        target="_blank"
        rel="sponsored noopener"
        className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
        onClick={() => captureAnalyticsEvent('race_writeup_store_link_clicked')}
      >
        F1 Store
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      . We earn a commission on purchases made through this link.
    </p>
  );
}
