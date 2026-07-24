import { api } from '@convex-generated/api';
import { useQuery } from 'convex/react';
import { lazy, Suspense, useEffect, useState } from 'react';

import { abbreviateGrandPrix } from '@/lib/display';
import { getCountryCodeForRace } from '@/lib/raceCountries';

import { useClerkRuntimeControl } from './runtime-control';
import { useViewerSession } from './useViewerSession';

/** Keep in sync with the header's mobile breakpoint. */
const MOBILE_MENU_BREAKPOINT = '(max-width: 843px)';

const ClerkHeaderUser = lazy(() =>
  import('./runtime-bundle').then((module) => ({
    default: module.ClerkHeaderUser,
  })),
);
const signInButtonClasses =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-sm border border-border-strong bg-surface-elevated text-text hover:border-accent/55 hover:bg-accent-muted/35 hover:text-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50';

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
  const runtime = useClerkRuntimeControl();
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const nextRace = useQuery(api.races.getNextRace, isSignedIn ? {} : 'skip');
  const [isMobile, setIsMobile] = useState(false);
  const myPicksHref = me?.username ? `/p/${me.username}` : '/me';
  const nextRaceLink =
    nextRace && nextRace.status === 'upcoming'
      ? {
          href: `/races/${nextRace.slug}`,
          label: abbreviateGrandPrix(nextRace.name),
          countryCode: getCountryCodeForRace(nextRace) ?? undefined,
        }
      : undefined;

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
    if (runtime.active) {
      return (
        <Suspense fallback={<AnonymousSignInButton disabled />}>
          <ClerkHeaderUser
            isMobile={isMobile}
            isSignedIn={false}
            myPicksHref={myPicksHref}
            nextRaceLink={nextRaceLink}
            openSignInOnMount={runtime.openSignInOnMount}
            signInOpened={runtime.signInOpened}
          />
        </Suspense>
      );
    }

    return <AnonymousSignInButton />;
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
      <Suspense
        fallback={
          <span
            className="block h-7 w-7 animate-pulse rounded-full bg-surface-muted"
            aria-hidden="true"
          />
        }
      >
        <ClerkHeaderUser
          isMobile={isMobile}
          isSignedIn={true}
          myPicksHref={myPicksHref}
          nextRaceLink={nextRaceLink}
          openSignInOnMount={false}
          signInOpened={runtime.signInOpened}
        />
      </Suspense>
    </div>
  );
}

function AnonymousSignInButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <div data-testid="header-user-anonymous">
      <a
        href={disabled ? undefined : '/sign-in'}
        className={signInButtonClasses}
        data-testid="header-sign-in-button"
        aria-disabled={disabled}
      >
        Sign in
      </a>
    </div>
  );
}
