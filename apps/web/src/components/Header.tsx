import { api } from '@convex-generated/api';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight, Flag } from 'lucide-react';

import { primaryButtonStyles } from '@/components/Button/Button';
import { HeaderUser } from '@/integrations/clerk/header-user.tsx';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { abbreviateGrandPrix } from '@/lib/display';
import { primaryNavLinks } from '@/lib/navigation';
import { Flag as CountryFlag } from './Flag.tsx';
import { BrandMark } from './BrandMark.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { getCountryCodeForRace } from '@/lib/raceCountries';

/**
 * Nav items are one of the two places uppercase is allowed (the other is a
 * micro label). Active state is the signature stripe rather than a filled
 * chip — one stripe per container, pinned to the thing that matters.
 */
export const NAV_LINK_CLASS =
  'rounded-sm border border-transparent px-3 py-1.5 text-xs font-medium tracking-label uppercase whitespace-nowrap text-text-muted transition-colors duration-150 ease-out hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';
export const NAV_LINK_ACTIVE_CLASS =
  'gpp-stripe rounded-sm border border-transparent px-3 py-1.5 text-xs font-medium tracking-label uppercase whitespace-nowrap text-text transition-colors';

function DesktopNavLink({
  to,
  label,
  exact,
}: {
  to: string;
  label: string;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      className={NAV_LINK_CLASS}
      activeProps={{
        className: NAV_LINK_ACTIVE_CLASS,
        'aria-current': 'page' as const,
      }}
      activeOptions={
        exact ? { exact: true, includeSearch: false } : { includeSearch: false }
      }
    >
      {label}
    </Link>
  );
}

type NextRace = FunctionReturnType<typeof api.races.getNextRace>;

/**
 * Always-available shortcut to the next race's picks for signed-in users —
 * returning users shouldn't have to go via Races → find the round. Shows the
 * race flag everywhere; the race name joins it when there's room.
 */
function NextRaceQuickLink({
  isSignedIn,
  initialNextRace,
}: {
  isSignedIn: boolean;
  initialNextRace: NextRace;
}) {
  // Fall back to the SSR-seeded race so the link is present on the first paint
  // (the loader only seeds it when signed in); the live query keeps it current.
  const nextRace =
    useQuery(api.races.getNextRace, isSignedIn ? {} : 'skip') ??
    initialNextRace;

  if (!isSignedIn || !nextRace || nextRace.status !== 'upcoming') {
    return null;
  }

  const countryCode = getCountryCodeForRace(nextRace);

  // Width tiers (measured against logo + desktop nav + bell + avatar; the
  // avatar must never be pushed out — it's the only nav when signed in):
  //   <500px: flag-only pill
  //   500–843px: flag + race name (no desktop nav yet, plenty of room)
  //   844–899px: hidden — the desktop nav appears at 844 and fills the bar
  //   900–959px: flag-only
  //   ≥960px: flag + race name
  return (
    <Link
      to="/races/$raceSlug"
      params={{ raceSlug: nextRace.slug }}
      className="flex shrink-0 items-center gap-1.5 rounded-sm border border-accent-hairline bg-accent-quiet py-1.5 pr-2.5 pl-2 text-xs font-medium tracking-label whitespace-nowrap text-accent uppercase transition-colors hover:border-accent hover:text-accent-hover min-[844px]:hidden min-[900px]:flex"
      aria-label={`My picks for ${nextRace.name}`}
      title={`My picks for ${nextRace.name}`}
      data-testid="header-next-race-link"
    >
      {countryCode ? (
        <CountryFlag code={countryCode} size="xs" />
      ) : (
        <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="hidden min-[500px]:inline min-[844px]:hidden min-[960px]:inline">
        My Picks
        <span className="hidden min-[1100px]:inline">
          {' · '}
          {abbreviateGrandPrix(nextRace.name)}
        </span>
      </span>
    </Link>
  );
}

export function Header({ initialNextRace }: { initialNextRace: NextRace }) {
  // Auth state is resolved on the server (initialAuth) so the header renders the
  // correct nav on the first paint and doesn't flash "Sign in" while Clerk's
  // client SDK boots. See {@link useViewerSession}.
  const { isSignedIn } = useViewerSession();
  const showSignedInLinks = isSignedIn;
  const showSignedOutNav = !isSignedIn;
  // "My Results" falls back to /me until we know the username (the /me route
  // redirects to /p/$username).
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const myPicksHref = me?.username ? `/p/${me.username}` : '/me';

  return (
    <header
      // Full-bleed, on the page background, with a hairline bottom border and
      // nothing else — the previous diagonal sheen texture and 2px accent rail
      // were decoration in empty space, which this direction does not do.
      className="sticky top-0 z-50 h-[--nav-height] border-b border-border bg-page text-text"
    >
      <div className="mx-auto flex h-full w-full max-w-[--page-max] items-center justify-between px-4 min-[844px]:px-8">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
          >
            {/* The brand mark, replacing the generic Lucide flag. Three bars
                descending like a timing tower, sheared to echo the stripe. */}
            <BrandMark className="h-5 w-[1.875rem] shrink-0 text-accent" />
            {/* In the signed-out header the mark stands alone on mobile so
                sign-in and the primary action remain single-line touch
                targets. The signed-in header gains the compact name from
                360px and the full wordmark from 390px. */}
            <span
              className={`pr-1 text-lg font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors group-hover:text-accent ${
                showSignedOutNav
                  ? 'hidden'
                  : 'max-[359px]:hidden min-[390px]:hidden'
              }`}
            >
              GP Picks
            </span>
            <span
              className={`pr-1 text-lg font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors group-hover:text-accent ${
                showSignedOutNav
                  ? 'hidden min-[844px]:inline'
                  : 'hidden min-[390px]:inline'
              }`}
            >
              Grand Prix Picks
            </span>
          </Link>

          {/* The product navigation belongs to the signed-in app. Signed-out
              visitors get the focused conversion header on every route. */}
          {!showSignedOutNav && (
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-1 p-1.5 min-[844px]:flex"
            >
              {showSignedInLinks && (
                <DesktopNavLink to="/" label="Home" exact />
              )}
              {primaryNavLinks.map((link) => (
                <DesktopNavLink
                  key={link.to}
                  to={link.to}
                  label={link.label}
                  exact={link.exact}
                />
              ))}
              {showSignedInLinks && (
                <DesktopNavLink to={myPicksHref} label="My Results" />
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 min-[844px]:min-w-24 min-[844px]:shrink-0 min-[844px]:justify-end">
          {/* Quick link to the next race's picks — signed-in only */}
          <NextRaceQuickLink
            isSignedIn={!!isSignedIn}
            initialNextRace={initialNextRace}
          />

          {/* Notification bell — mounted from the SSR-resolved signed-in state
              so its slot is reserved on the first paint (no layout shift). The
              bell renders empty until its query resolves. */}
          {isSignedIn && <NotificationBell />}
          {showSignedOutNav && (
            <nav
              aria-label="Signed-out navigation"
              className="hidden min-[844px]:block"
            >
              <DesktopNavLink to="/how-to-play" label="How it works" />
            </nav>
          )}
          <HeaderUser />
          {showSignedOutNav ? (
            <a
              href="/#make-picks"
              aria-label="Make your picks"
              className={`${primaryButtonStyles('sm')} gpp-public-header-cta px-2.5 whitespace-nowrap min-[390px]:px-4`}
              onClick={() => {
                captureAnalyticsEvent('public_header_cta_clicked', {
                  source_path: window.location.pathname,
                });
                if (window.location.pathname === '/') {
                  captureAnalyticsEvent('landing_hero_cta_clicked', {
                    placement: 'header',
                  });
                }
              }}
            >
              <span aria-hidden="true">Make your picks</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
