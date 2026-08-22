import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { primaryButtonStyles } from '@/components/Button/Button';
import { HeaderUser } from '@/integrations/clerk/header-user.tsx';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { BrandMark } from './BrandMark.tsx';
import { APP_NAV_TABS, NavTab } from './NavTab.tsx';
import { NotificationBell } from './NotificationBell.tsx';

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

export function Header() {
  // Auth state is resolved on the server (initialAuth) so the header renders the
  // correct chrome on the first paint and doesn't flash "Sign in" while Clerk's
  // client SDK boots. See {@link useViewerSession}.
  const { isSignedIn } = useViewerSession();
  const showSignedOutNav = !isSignedIn;

  return (
    <header
      data-app-header
      // Full-bleed, on the page background, with a hairline bottom border and
      // nothing else — the previous diagonal sheen texture and 2px accent rail
      // were decoration in empty space, which this direction does not do.
      className="sticky top-0 z-50 h-(--nav-height) border-b border-border bg-page text-text"
    >
      {/* Same frame as every page container (`max-w-(--page-max) px-4`) so the
          nav tabs sit on the same gutters as the content below. */}
      <div className="mx-auto flex h-full w-full max-w-(--page-max) items-stretch justify-between px-4">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            // Wide but only as tall as the wordmark, so on a phone the "go
            // home" affordance was a 28px band. The header has room for the
            // full touch target without moving anything.
            className="group flex shrink-0 items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none pointer-coarse:min-h-11"
          >
            {/* The brand mark, replacing the generic Lucide flag. Three bars
                descending like a timing tower, sheared to echo the stripe. */}
            <BrandMark className="h-5 w-[1.875rem] shrink-0 text-accent" />
            {/* Below 440px the signed-out header hides both wordmarks, and the
                brand mark is aria-hidden — which left this link with no
                accessible name at all on every page but the landing one. This
                carries the name through that window and switches off at 440px,
                where the compact wordmark takes over.

                A name in the markup rather than an `aria-label`, because the
                label would replace the visible text at wider widths: "Grand
                Prix Picks" does not contain "GP Picks", so voice control would
                lose the visible name (WCAG 2.5.3). `.gpp-wordmark-fallback`
                drops it on the landing page, where the override below keeps a
                wordmark visible from 320px. */}
            {showSignedOutNav && (
              <span className="gpp-wordmark-fallback sr-only min-[440px]:hidden">
                Grand Prix Picks
              </span>
            )}
            {/* The signed-out header carries sign-in plus the primary CTA, and
                at 360px those two leave only ~90px for the name — so the
                compact wordmark waits for 440px. On the landing page the hero
                owns the CTA, which leaves room for the full wordmark from
                360px and the compact one below that (see
                `.gpp-public-wordmark` in styles.css).

                Below 844px the signed-in header is only the brand and Me — the
                destinations are in the bottom bar — so the full wordmark fits
                from 360px, with the compact one covering 320px-class screens. */}
            <span
              className={`pr-1 text-lg font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors group-hover:text-accent ${
                showSignedOutNav
                  ? 'gpp-public-wordmark hidden min-[440px]:inline min-[844px]:hidden'
                  : 'min-[360px]:hidden'
              }`}
            >
              GP Picks
            </span>
            <span
              className={`pr-1 text-lg font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors group-hover:text-accent ${
                showSignedOutNav
                  ? 'gpp-public-wordmark-full hidden min-[844px]:inline'
                  : 'hidden min-[360px]:inline'
              }`}
            >
              Grand Prix Picks
            </span>
          </Link>
        </div>

        <div className="flex items-stretch gap-1 min-[844px]:min-w-24 min-[844px]:shrink-0 min-[844px]:justify-end">
          {isSignedIn ? (
            <>
              {/* Five labelled tabs need ~732px of bar, so below 844px this
                  whole landmark goes and {@link MobileTabBar} takes over — it
                  reuses this label, and the two are never in the accessibility
                  tree at the same time.

                  Me is deliberately outside the landmark: it opens a menu
                  rather than going anywhere, and it is the one piece of header
                  chrome that survives below 844px. Leaving it in here made
                  "Main navigation" resolve to a single account button on every
                  phone. It still reads as the last tab visually. */}
              <nav
                aria-label="Main navigation"
                className="hidden items-stretch min-[844px]:flex"
              >
                {APP_NAV_TABS.map((tab) => (
                  <NavTab key={tab.to} tab={tab} variant="header" />
                ))}
                {/* Reserved from first paint so the tab doesn't pop in when the
                    notifications query resolves. */}
                <NotificationBell />
              </nav>
              <HeaderUser />
            </>
          ) : null}

          <div className="flex items-center gap-2">
            {showSignedOutNav && (
              <nav
                aria-label="Signed-out navigation"
                className="hidden min-[844px]:block"
              >
                <DesktopNavLink to="/how-to-play" label="How it works" />
              </nav>
            )}
            {showSignedOutNav ? <HeaderUser /> : null}
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
      </div>
    </header>
  );
}
