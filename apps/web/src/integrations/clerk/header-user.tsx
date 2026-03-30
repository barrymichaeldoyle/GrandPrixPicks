import { SignInButton, useAuth, UserButton } from '@clerk/react';
import { api } from '@convex-generated/api';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Flag, Gauge, Settings, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Keep in sync with the header's mobile breakpoint. */
const MOBILE_MENU_BREAKPOINT = '(max-width: 843px)';

const signInButtonClasses =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-full bg-button-accent text-white hover:bg-button-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50';

/**
 * User avatar when signed in; Sign in button when signed out.
 * The Sign in button is hidden on mobile (min-[844px]:block) so it
 * only appears in the header on desktop, and lives in the mobile menu on small screens.
 *
 * Returns null while Clerk is loading so the parent's opacity-0 skeleton
 * can hold the layout width without a timing mismatch.
 */
export function HeaderUser() {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useQuery(api.users.me);
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
      <div className="flex items-center" data-testid="header-user-authenticated">
        <Link
          to={myPicksHref}
          className="hidden rounded-full border border-transparent px-3 py-1.5 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent-muted/45 hover:text-accent-hover min-[844px]:inline-flex"
          activeProps={{
            className:
              'hidden min-[844px]:inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold text-accent-hover nav-link-active bg-accent/15 transition-colors',
            'aria-current': 'page' as const,
          }}
          activeOptions={{ includeSearch: false }}
        >
          My Picks
        </Link>
        <div className="flex items-center pl-1.5">
          <UserButton
            appearance={{
              elements: {
                userButtonTrigger:
                  'rounded-full border border-border bg-surface px-2 py-1 transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
              },
            }}
          >
            <UserButton.MenuItems>
              {isMobile ? (
                <UserButton.Link
                  label="My Picks"
                  labelIcon={<Trophy className="h-4 w-4" />}
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
                labelIcon={<Settings className="h-4 w-4" />}
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
    <div className="hidden min-[844px]:block" data-testid="header-user-anonymous">
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
