import { SignInButton, useAuth, UserButton } from '@clerk/react';
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

/** Keep in sync with the header's mobile breakpoint. */
const MOBILE_MENU_BREAKPOINT = '(max-width: 843px)';

const signInButtonClasses =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-full bg-button-accent text-white hover:bg-button-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50';

/**
 * User avatar when signed in; Sign in button when signed out.
 *
 * Returns null while Clerk is loading so the parent's opacity-0 skeleton
 * can hold the layout width without a timing mismatch.
 */
export function HeaderUser() {
  const { isLoaded, isSignedIn } = useAuth();
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

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return (
      <div
        className="flex items-center"
        data-testid="header-user-authenticated"
      >
        <div className="flex items-center">
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
      </div>
    );
  }

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
