import { ArrowUpRight } from 'lucide-react';
import type { CSSProperties } from 'react';

import { primaryButtonStyles } from '@/components/Button/Button';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { TEAM_COLORS } from '@/lib/teamColors';

/**
 * Our redirect to the F1 Store, not the Impact link itself. The store is five
 * regional shops and the bare Impact link always opened the EU one, in French,
 * whoever clicked. `server/routes/go/f1-store.get.ts` picks the shop for the
 * visitor's country and wraps it in the tracking link.
 */
export const F1_STORE_LINK = '/go/f1-store';

type StorePlacement = 'news' | 'footer' | 'guide';

/**
 * Store pages the redirect will open, mirroring `F1_STORE_PAGES` in
 * `server/lib/f1Store.ts`. A key the server does not know falls back to the
 * front page, so a mismatch costs the deep link, never the click.
 */
export type F1StorePage = 'esteban-ocon';

/**
 * Shared by both placements. `rel="sponsored"` is Google's required marking for
 * a paid link, and the redirect hop does not change that.
 *
 * The click is measured because the case for keeping it is a number: Impact
 * reports sales, PostHog reports whether anyone clicks at all, and `placement`
 * says which of the two placements earned it. The event has no race property
 * because PostHog already records the page's URL on it.
 */
function storeLinkProps(placement: StorePlacement, page?: F1StorePage) {
  return {
    href: page ? `${F1_STORE_LINK}?page=${page}` : F1_STORE_LINK,
    target: '_blank',
    rel: 'sponsored noopener',
    onClick: () =>
      captureAnalyticsEvent('race_writeup_store_link_clicked', {
        placement,
        ...(page ? { page } : {}),
      }),
  } as const;
}

const DISCLOSURE = 'We earn a commission on purchases made through this link.';

/**
 * The store as one card in the weekend news grid, where a reader is already
 * scanning. It looks like its neighbours on purpose (same surface, same edge
 * bar) and says it is an affiliate link before the headline, because a reader
 * has to know that before they click, not after.
 *
 * `wide` takes both grid columns, for when a single cell would leave the
 * grid's last row half empty.
 *
 * Eleven team colours in the house lean are the card's picture: the grid is
 * what the store sells, and it is the one decoration that needs no asset.
 *
 * Not a shop page and not a section: the write-ups are the pages search ranks
 * and AdSense reviews (see `docs/seo-content-policy.md`).
 */
export function RaceWriteupStoreCard({ wide = false }: { wide?: boolean }) {
  return (
    <article
      className={`gpp-team-bar gpp-team-bar-lean flex flex-col bg-surface p-4 sm:p-6 ${
        wide ? 'sm:col-span-2 sm:flex-row sm:items-end sm:gap-10' : ''
      }`}
      style={{ '--team-colour': 'var(--accent)' } as CSSProperties}
    >
      <div className={wide ? 'sm:flex-1' : ''}>
        <p className="gpp-mono text-xs text-text-muted">Affiliate link</p>
        <h3 className="font-title mt-1 text-lg font-medium text-text">
          Team kit at the F1 Store
        </h3>
        <div className="mt-3 flex gap-1" aria-hidden>
          {Object.entries(TEAM_COLORS).map(([team, colour]) => (
            <span
              key={team}
              className="h-7 w-3.5 [clip-path:polygon(var(--stripe-lean)_0,100%_0,calc(100%-var(--stripe-lean))_100%,0_100%)]"
              style={{ background: colour }}
            />
          ))}
        </div>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Caps, shirts and driver merch for every team on the grid, from the
          official store for your country.
        </p>
      </div>
      <div
        className={
          wide ? 'mt-4 sm:mt-0 sm:shrink-0' : 'mt-4 sm:mt-auto sm:pt-4'
        }
      >
        <a
          {...storeLinkProps('news')}
          className={`${primaryButtonStyles('sm')} w-full sm:w-auto`}
        >
          Shop the F1 Store
          <ArrowUpRight aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <p className="mt-2 text-xs text-text-muted">{DISCLOSURE}</p>
      </div>
    </article>
  );
}

/**
 * The footer line, for write-ups that have no news grid to hold the card: a
 * finished race, or a weekend with nothing published yet.
 */
export function RaceWriteupStoreLink() {
  return (
    <p className="mt-2">
      Team kit and caps are on the{' '}
      <a
        {...storeLinkProps('footer')}
        className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
      >
        F1 Store
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      . {DISCLOSURE}
    </p>
  );
}

/**
 * One store page inside a guide's driver card: a line saying what is there and
 * a button to it. The copy is the guide's, because only the guide knows why
 * the merch is worth mentioning (Ocon's, for one, is a leaving driver's last
 * Haas stock).
 *
 * No product photo. Each regional shop stocks a different selection under the
 * same page, so one picture would be wrong for some readers, and clearance
 * stock sells out under an evergreen page.
 */
export function F1StorePageLink({
  page,
  text,
  label,
}: {
  page: F1StorePage;
  text: string;
  label: string;
}) {
  return (
    <div className="clear-both mt-5 border-t border-border pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text">{text}</p>
        <a
          {...storeLinkProps('guide', page)}
          className={`${primaryButtonStyles('sm')} shrink-0`}
        >
          {label}
          <ArrowUpRight aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Affiliate link. {DISCLOSURE}
      </p>
    </div>
  );
}
