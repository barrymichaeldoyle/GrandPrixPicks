import { SignInButton, UserButton } from '@clerk/react';
import { api } from '@convex-generated/api';
import { useQuery } from 'convex/react';
import {
  Flag,
  Gauge,
  ListChecks,
  SlidersHorizontal,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useViewerSession } from './useViewerSession';

/** Keep in sync with the header's mobile breakpoint. */
const MOBILE_MENU_BREAKPOINT = '(max-width: 843px)';

const signInButtonClasses =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-full bg-button-accent text-white hover:bg-button-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50';

/**
 * User avatar when signed in; Sign in button when signed out.
 *
 * Uses the SSR-resolved auth state (initialAuth) for the first paint: the real
 * Sign in button for signed-out viewers, and a neutral avatar placeholder for
 * signed-in viewers that is swapped for Clerk's real UserButton once its client
 * SDK loads. This keeps the header layout stable (no shift) and flash-free.
 */
export function HeaderUser() {
  const { isSignedIn, confirmedSignedIn } = useViewerSession();
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const [isMobile, setIsMobile] = useState(false);
  const myPicksHref = me?.username ? `/p/${me.username}` : '/me';

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MENU_BREAKPOINT);
    function sync(matches: boolean) {
      setIsMobile(matches);
    }

    sync(mediaQuery.matches);

    function handleChange(event: MediaQueryListEvent) {
      sync(event.matches);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Signed-out renders identically before and after Clerk loads, so show the
  // real Sign in button immediately (correct from SSR).
  if (!isSignedIn) {
    return (
      <div data-testid="header-user-anonymous">
        <SignInButton mode="modal">
          <button
            type="button"
            className={signInButtonClasses}
            data-testid="header-sign-in-button"
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    );
  }

  // Both signed-in states share one fixed 28x28 slot (shrink-0) so the nav never
  // reflows during the hand-off: the loading pulse, and Clerk's UserButton —
  // which can render a frame empty on mount, or briefly remount when its `key`
  // (mobile/desktop) resolves — always sit in a stable-width box. Reserving the
  // slot means the sibling nav items never bounce even while the avatar itself
  // is mid-mount.
  const avatarSlotClasses = 'flex h-7 w-7 shrink-0 items-center justify-center';

  if (!confirmedSignedIn) {
    return (
      <div className={avatarSlotClasses} data-testid="header-user-loading">
        <span
          className="block h-7 w-7 animate-pulse rounded-full bg-surface-muted"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className={avatarSlotClasses} data-testid="header-user-authenticated">
      <UserButton key={isMobile ? 'mobile' : 'desktop'}>
        <UserButton.MenuItems>
          {isMobile ? (
            <UserButton.Link
              label="My Picks"
              labelIcon={<ListChecks className="h-4 w-4" />}
              href={myPicksHref}
            />
          ) : null}
          {isMobile ? (
            <UserButton.Link
              label="Feed"
              labelIcon={<Gauge className="h-4 w-4" />}
              href="/feed"
            />
          ) : null}
          {isMobile ? (
            <UserButton.Link
              label="Races"
              labelIcon={<Flag className="h-4 w-4" />}
              href="/races"
            />
          ) : null}
          {isMobile ? (
            <UserButton.Link
              label="Leagues"
              labelIcon={<Users className="h-4 w-4" />}
              href="/leagues"
            />
          ) : null}
          {isMobile ? (
            <UserButton.Link
              label="Leaderboard"
              labelIcon={<Trophy className="h-4 w-4" />}
              href="/leaderboard"
            />
          ) : null}
          <UserButton.Link
            label="Settings"
            labelIcon={<SlidersHorizontal className="h-4 w-4" />}
            href="/settings"
          />
          <UserButton.Action label="manageAccount" />
          <UserButton.Action label="signOut" />
        </UserButton.MenuItems>
      </UserButton>
    </div>
  );
}
