import { SignedOut, SignInButton } from '@clerk/clerk-react';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, Menu, Moon, Sun, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../../convex/_generated/api';
import {
  HeaderUser,
  signInButtonClasses,
} from '../integrations/clerk/header-user.tsx';

type NavLink = {
  to: string;
  params?: Record<string, string>;
  label: string;
  exact?: boolean;
};

const staticNavLinks: Array<NavLink> = [
  { to: '/', label: 'Home', exact: true },
  { to: '/races', label: 'Races' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Mobile menu: viewport width <= 790px is "mobile". Keep min-[749px] classes below in sync. */
export const MEDIA_MATCH_BREAKPOINT = '(max-width: 790px)';

export function Header({
  mobileMenuOpen,
  onMobileMenuOpenChange,
  themeKey = 'grand-prix-picks-theme',
  isDark = false,
  onThemeChange,
}: {
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
  themeKey?: string;
  /** Current theme; when provided with onThemeChange, theme is controlled by parent. */
  isDark?: boolean;
  /** Called when user toggles theme; when provided, parent owns theme state. */
  onThemeChange?: (dark: boolean) => void;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Local theme state only when parent doesn't control it (e.g. Storybook)
  const [localDark, setLocalDark] = useState(false);
  const dark = onThemeChange !== undefined ? isDark : localDark;

  const me = useQuery(api.users.me);
  const navLinks = useMemo<Array<NavLink>>(() => {
    const myPicksLink: NavLink = me?.username
      ? {
          to: '/p/$username',
          params: { username: me.username },
          label: 'My Picks',
        }
      : { to: '/me', label: 'My Picks' };
    return [...staticNavLinks, myPicksLink];
  }, [me?.username]);

  useEffect(() => {
    if (onThemeChange !== undefined) return;
    const syncTheme = () => {
      const saved = localStorage.getItem(themeKey);
      const next =
        saved === 'dark'
          ? true
          : saved === 'light'
            ? false
            : window.matchMedia('(prefers-color-scheme: dark)').matches;
      setLocalDark(next);
    };
    syncTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', syncTheme);
    return () => mq.removeEventListener('change', syncTheme);
  }, [themeKey, onThemeChange]);

  const toggleTheme = useCallback(() => {
    if (onThemeChange) {
      onThemeChange(!dark);
    } else {
      const next = document.documentElement.classList.toggle('dark');
      document.documentElement.setAttribute(
        'data-theme',
        next ? 'dark' : 'light',
      );
      localStorage.setItem(themeKey, next ? 'dark' : 'light');
      setLocalDark(next);
    }
  }, [themeKey, dark, onThemeChange]);

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
    if (!mq.matches) return;

    const headerEl = headerRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
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

      if (allFocusable.length === 0) return;

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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, onMobileMenuOpenChange]);

  // Focus first link when menu opens
  useEffect(() => {
    if (mobileMenuOpen && menuRef.current) {
      const firstLink = menuRef.current.querySelector<HTMLElement>('a');
      firstLink?.focus();
    }
  }, [mobileMenuOpen]);

  const closeMenu = useCallback(() => {
    onMobileMenuOpenChange(false);
    menuButtonRef.current?.focus();
  }, [onMobileMenuOpenChange]);

  return (
    <header
      ref={headerRef}
      className="relative sticky top-0 z-50 border-b border-border bg-surface text-text shadow-sm"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="-mt-1 -mb-1 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
              <Flag
                className="relative left-0.25 h-5 w-5 text-accent"
                aria-hidden="true"
              />
            </span>
            <span className="pr-1 text-xl font-bold tracking-tight">
              Grand Prix Picks
            </span>
          </Link>

          {/* Desktop nav - accent link style, thick border for selected, full-area hover highlight */}
          <nav className="hidden items-center gap-1 min-[791px]:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                params={link.params as Record<string, string>}
                className="rounded-lg border-2 border-transparent px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-muted/50 hover:text-accent-hover"
                activeProps={{
                  className:
                    'pointer-events-none px-3 py-2 rounded-lg text-accent border-2 nav-link-active transition-colors text-sm font-semibold',
                }}
                activeOptions={link.exact ? { exact: true } : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-accent transition-colors hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <HeaderUser />

          {/* Mobile menu button */}
          <motion.button
            ref={menuButtonRef}
            onClick={() => onMobileMenuOpenChange(!mobileMenuOpen)}
            className="rounded-lg p-2 transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 min-[791px]:hidden"
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
              className="fixed inset-0 top-[57px] z-40 min-[791px]:hidden"
              style={{ backgroundColor: 'var(--overlay)' }}
              onClick={closeMenu}
            />
            {/* Menu */}
            <motion.nav
              ref={menuRef}
              id="mobile-nav"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute top-[calc(100%-7px)] right-0 left-0 z-50 border-b border-border bg-surface shadow-xl min-[791px]:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.to}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <Link
                      to={link.to}
                      params={link.params as Record<string, string>}
                      onClick={closeMenu}
                      className="block rounded-lg border-2 border-transparent px-3 py-2 font-semibold text-accent transition-colors hover:bg-accent-muted/50 hover:text-accent-hover"
                      activeProps={{
                        className:
                          'pointer-events-none block px-3 py-2 rounded-lg text-accent border-2 nav-link-active font-semibold transition-colors',
                      }}
                      activeOptions={link.exact ? { exact: true } : undefined}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <SignedOut>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      delay: navLinks.length * 0.05,
                      duration: 0.2,
                    }}
                  >
                    <SignInButton mode="modal">
                      <button
                        type="button"
                        onClick={closeMenu}
                        className={`block w-full text-left ${signInButtonClasses}`}
                      >
                        Sign in
                      </button>
                    </SignInButton>
                  </motion.div>
                </SignedOut>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
