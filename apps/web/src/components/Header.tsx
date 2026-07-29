import { api } from '@convex-generated/api';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, Menu, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { HeaderUser } from '@/integrations/clerk/header-user.tsx';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { abbreviateGrandPrix } from '@/lib/display';
import { primaryNavLinks } from '@/lib/navigation';
import { Flag as CountryFlag } from './Flag.tsx';
import { BrandMark } from './BrandMark.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { getCountryCodeForRace } from '@/lib/raceCountries';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Mobile menu: viewport width <= 843px is "mobile". Keep min-[844px] classes below in sync. */
export const MEDIA_MATCH_BREAKPOINT = '(max-width: 843px)';

/**
 * Nav items are one of the two places uppercase is allowed (the other is a
 * micro label). Active state is the signature stripe rather than a filled
 * chip — one stripe per container, pinned to the thing that matters.
 */
const NAV_LINK_CLASS =
  'rounded-sm border border-transparent px-3 py-1.5 text-xs font-medium tracking-label uppercase whitespace-nowrap text-text-muted transition-colors duration-150 ease-out hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';
const NAV_LINK_ACTIVE_CLASS =
  'gpp-stripe rounded-sm border border-transparent py-1.5 pr-3 pl-2.5 text-xs font-medium tracking-label uppercase whitespace-nowrap text-text transition-colors';

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
        <span className="inline-flex h-3.5 shrink-0 overflow-hidden rounded-[2px]">
          <CountryFlag code={countryCode} size="full" />
        </span>
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

export function Header({
  mobileMenuOpen,
  onMobileMenuOpenChange,
  initialNextRace,
}: {
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
  initialNextRace: NextRace;
}) {
  // Auth state is resolved on the server (initialAuth) so the header renders the
  // correct nav on the first paint and doesn't flash "Sign in" while Clerk's
  // client SDK boots. See {@link useViewerSession}.
  const { isSignedIn } = useViewerSession();
  const showSignedInLinks = isSignedIn;
  // "My Results" falls back to /me until we know the username (the /me route
  // redirects to /p/$username).
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const myPicksHref = me?.username ? `/p/${me.username}` : '/me';

  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Keep mobile menu state in sync when crossing the mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia(MEDIA_MATCH_BREAKPOINT);

    function handleChange(event: MediaQueryListEvent) {
      if (!event.matches) {
        onMobileMenuOpenChange(false);
      }
    }

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [onMobileMenuOpenChange]);

  // Lock body scroll when mobile menu is open (mobile only)
  useEffect(() => {
    const mq = window.matchMedia(MEDIA_MATCH_BREAKPOINT);
    if (mobileMenuOpen && mq.matches) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Focus trap: cycle Tab only within header + menu when menu is open (mobile only)
  useEffect(() => {
    if (!mobileMenuOpen || !headerRef.current) {
      return;
    }

    const mq = window.matchMedia(MEDIA_MATCH_BREAKPOINT);
    if (!mq.matches) {
      return;
    }

    const headerEl = headerRef.current;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onMobileMenuOpenChange(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (e.key !== 'Tab') {
        return;
      }

      const allFocusable = Array.from(
        headerEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('inert') && el.offsetParent !== null);

      if (allFocusable.length === 0) {
        return;
      }

      const currentIndex = allFocusable.indexOf(
        document.activeElement as HTMLElement,
      );

      const isLeavingTrap =
        currentIndex === -1 ||
        (e.shiftKey && currentIndex === 0) ||
        (!e.shiftKey && currentIndex === allFocusable.length - 1);

      if (isLeavingTrap) {
        e.preventDefault();
        const nextIndex = e.shiftKey ? allFocusable.length - 1 : 0;
        allFocusable[nextIndex]?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, onMobileMenuOpenChange]);

  // Close mobile menu on any pointer down outside menu + menu button.
  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const mq = window.matchMedia(MEDIA_MATCH_BREAKPOINT);
    if (!mq.matches) {
      return;
    }

    function handleOutsidePointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) {
        return;
      }
      if (menuRef.current?.contains(target)) {
        return;
      }
      if (menuButtonRef.current?.contains(target)) {
        return;
      }
      onMobileMenuOpenChange(false);
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () =>
      document.removeEventListener(
        'pointerdown',
        handleOutsidePointerDown,
        true,
      );
  }, [mobileMenuOpen, onMobileMenuOpenChange]);

  // Focus first link when menu opens
  useEffect(() => {
    if (mobileMenuOpen && menuRef.current) {
      const firstLink = menuRef.current.querySelector<HTMLElement>('a');
      firstLink?.focus();
    }
  }, [mobileMenuOpen]);

  function closeMenu() {
    onMobileMenuOpenChange(false);
    menuButtonRef.current?.focus();
  }

  return (
    <header
      ref={headerRef}
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
            {/* Below 390px (iPhone SE / 12 mini) the wordmark shortens to
                "GP Picks" — with the next-race pill there isn't room for the
                full name, and the UserButton must stay visible (it's the only
                mobile nav when signed in). iPhone 14 Pro (393px) and wider
                fit the full wordmark alongside the flag-only pill. */}
            <span className="pr-1 text-lg font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors group-hover:text-accent min-[390px]:hidden">
              GP Picks
            </span>
            <span className="hidden pr-1 text-lg font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors group-hover:text-accent min-[390px]:inline">
              Grand Prix Picks
            </span>
          </Link>

          {/* Desktop nav — public links render immediately (auth-independent);
              the signed-in extras reveal once Clerk resolves, so there's no
              flash of the signed-out nav swapping to the signed-in one. */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 p-1.5 min-[844px]:flex"
          >
            {showSignedInLinks && <DesktopNavLink to="/feed" label="Feed" />}
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
          <HeaderUser />

          {/* Mobile menu button — signed-out only (auth state known from SSR).
              Rendered last so the toggle is the outermost control on the row
              and Sign in sits inboard of it, rather than the menu being
              sandwiched between the wordmark and the sign-in action. */}
          {!isSignedIn && (
            <motion.button
              ref={menuButtonRef}
              onClick={() => onMobileMenuOpenChange(!mobileMenuOpen)}
              className="rounded-sm border border-transparent p-2 text-accent transition-colors hover:border-border hover:bg-surface-muted/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 min-[844px]:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              whileTap={{ scale: 0.9 }}
            >
              {/* initial={false}: animate the Menu↔X swap only — the initial
                  rotate/fade would leave the icon invisible until hydration */}
              <AnimatePresence mode="wait" initial={false}>
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X size={24} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu size={24} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </div>
      </div>

      {/* Mobile nav - positioned absolute to overlay content */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-[--nav-height] z-40 min-[844px]:hidden"
              style={{ backgroundColor: 'var(--overlay)' }}
              onClick={closeMenu}
            />
            {/* Menu */}
            <motion.nav
              ref={menuRef}
              id="mobile-nav"
              aria-label="Mobile navigation"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute top-full right-0 left-0 z-50 border-b border-border bg-surface min-[844px]:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {primaryNavLinks.map((link, index) => (
                  <motion.div
                    key={link.to}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <Link
                      to={link.to}
                      onClick={closeMenu}
                      className="block rounded-sm border border-transparent px-3 py-2 text-xs font-medium tracking-label text-text-muted uppercase transition-colors hover:bg-surface-elevated hover:text-text"
                      activeProps={{
                        className:
                          'gpp-stripe block px-3 py-2 pl-4 rounded-sm text-text border border-transparent text-xs font-medium tracking-label uppercase transition-colors',
                        'aria-current': 'page' as const,
                      }}
                      activeOptions={
                        link.exact
                          ? { exact: true, includeSearch: false }
                          : { includeSearch: false }
                      }
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
