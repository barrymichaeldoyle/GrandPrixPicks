import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, Menu, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { HeaderUser } from '../integrations/clerk/header-user.tsx';
import { useInitialAuth } from '../integrations/clerk/initial-auth';
import { abbreviateGrandPrix } from '../lib/display';
import { primaryNavLinks } from '../lib/navigation';
import { Flag as CountryFlag } from './Flag.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { getCountryCodeForRace } from '../lib/raceCountries';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Mobile menu: viewport width <= 843px is "mobile". Keep min-[844px] classes below in sync. */
export const MEDIA_MATCH_BREAKPOINT = '(max-width: 843px)';

const NAV_LINK_CLASS =
  'rounded-full border border-transparent px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-accent transition-colors duration-200 hover:bg-accent-muted/45 hover:text-accent-hover';
const NAV_LINK_ACTIVE_CLASS =
  'px-3 py-1.5 rounded-full text-accent-hover border nav-link-active bg-accent/15 transition-colors text-sm font-semibold whitespace-nowrap';

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

/**
 * Always-available shortcut to the next race's picks for signed-in users —
 * returning users shouldn't have to go via Races → find the round. Shows the
 * race flag everywhere; the race name joins it when there's room.
 */
function NextRaceQuickLink({ isSignedIn }: { isSignedIn: boolean }) {
  const nextRace = useQuery(api.races.getNextRace, isSignedIn ? {} : 'skip');

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
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 py-1.5 pr-2.5 pl-2 text-xs font-semibold whitespace-nowrap text-accent transition-colors hover:bg-accent/20 hover:text-accent-hover min-[844px]:hidden min-[900px]:flex"
      aria-label={`${nextRace.name} — your picks`}
      title={`${nextRace.name} — your picks`}
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
        {abbreviateGrandPrix(nextRace.name)}
      </span>
    </Link>
  );
}

export function Header({
  mobileMenuOpen,
  onMobileMenuOpenChange,
}: {
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
}) {
  const { isSignedIn: clientSignedIn, isLoaded } = useAuth();
  const initialAuth = useInitialAuth();
  // Auth state is resolved on the server (initialAuth) so the header renders the
  // correct nav on the first paint; once Clerk's client SDK loads it becomes the
  // source of truth (and corrects any stale cookie).
  const isSignedIn = isLoaded ? clientSignedIn : initialAuth.isSignedIn;
  const showSignedInLinks = isSignedIn;
  // "My Picks" falls back to /me until we know the username (the /me route
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
      className="relative sticky top-0 z-50 h-[61px] border-b border-border bg-surface/95 text-text shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/80"
    >
      <div
        aria-hidden
        className="header-grid-sheen pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="header-accent-rail pointer-events-none absolute inset-x-0 top-0 h-[2px]"
      />
      <div className="mx-auto flex h-full min-h-[61px] w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 ring-1 ring-accent/15 transition-colors group-hover:bg-accent/15">
              <Flag
                className="relative left-0.25 h-5 w-5 text-accent"
                aria-hidden="true"
              />
            </span>
            {/* Below 390px (iPhone SE / 12 mini) the wordmark shortens to
                "GP Picks" — with the next-race pill there isn't room for the
                full name, and the UserButton must stay visible (it's the only
                mobile nav when signed in). iPhone 14 Pro (393px) and wider
                fit the full wordmark alongside the flag-only pill. */}
            <span className="font-title pr-1 text-xl font-bold tracking-tight whitespace-nowrap transition-colors group-hover:text-accent min-[390px]:hidden">
              GP Picks
            </span>
            <span className="font-title hidden pr-1 text-xl font-bold tracking-tight whitespace-nowrap transition-colors group-hover:text-accent min-[390px]:inline">
              Grand Prix Picks
            </span>
          </Link>

          {/* Desktop nav — public links render immediately (auth-independent);
              the signed-in extras reveal once Clerk resolves, so there's no
              flash of the signed-out nav swapping to the signed-in one. */}
          <nav
            aria-label="Main navigation"
            className="font-title hidden items-center gap-1 rounded-full p-1.5 min-[844px]:flex"
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
              <DesktopNavLink to={myPicksHref} label="My Picks" />
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 min-[844px]:min-w-24 min-[844px]:shrink-0 min-[844px]:justify-end">
          {/* Mobile menu button — signed-out only (auth state known from SSR) */}
          {!isSignedIn && (
            <motion.button
              ref={menuButtonRef}
              onClick={() => onMobileMenuOpenChange(!mobileMenuOpen)}
              className="rounded-lg border border-transparent p-2 text-accent transition-colors hover:border-border hover:bg-surface-muted/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 min-[844px]:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
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

          {/* Quick link to the next race's picks — signed-in only */}
          <NextRaceQuickLink isSignedIn={!!isSignedIn} />

          {/* Notification bell — signed-in only */}
          {isLoaded && isSignedIn && <NotificationBell />}
          <HeaderUser />
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
              className="fixed inset-0 top-[57px] z-40 min-[844px]:hidden"
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
              className="font-title absolute top-[calc(100%-7px)] right-0 left-0 z-50 border-b border-border bg-surface/98 shadow-xl min-[844px]:hidden"
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
                      className="block rounded-full border-2 border-transparent px-3 py-2 font-semibold text-accent transition-colors hover:bg-accent-muted/50 hover:text-accent-hover"
                      activeProps={{
                        className:
                          'block px-3 py-2 rounded-full text-accent border-2 nav-link-active font-semibold transition-colors',
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
