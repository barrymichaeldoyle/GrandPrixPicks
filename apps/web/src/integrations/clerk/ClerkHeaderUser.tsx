import { SignInButton, useAuth, useClerk, UserButton } from '@clerk/react';
import {
  Flag,
  History,
  House,
  SlidersHorizontal,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect } from 'react';

import { Flag as CountryFlag } from '@/components/Flag';

const signInButtonClasses =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-sm border border-border-strong bg-surface-elevated text-text hover:border-accent/55 hover:bg-accent-muted/35 hover:text-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50';

export function ClerkHeaderUser({
  isMobile,
  isSignedIn,
  myPicksHref,
  nextRaceLink,
  openSignInOnMount,
  signInOpened,
}: {
  isMobile: boolean;
  isSignedIn: boolean;
  myPicksHref: string;
  nextRaceLink?: {
    href: string;
    label: string;
    countryCode?: string;
  };
  openSignInOnMount: boolean;
  signInOpened: () => void;
}) {
  if (!isSignedIn) {
    return (
      <>
        {openSignInOnMount && <OpenSignInOnMount signInOpened={signInOpened} />}
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
      </>
    );
  }

  return (
    <UserButton key={isMobile ? 'mobile' : 'desktop'}>
      <UserButton.MenuItems>
        {isMobile && nextRaceLink ? (
          <UserButton.Link
            label={`My Picks · ${nextRaceLink.label}`}
            labelIcon={
              nextRaceLink.countryCode ? (
                <CountryFlag code={nextRaceLink.countryCode} size="xs" />
              ) : (
                <Flag className="h-4 w-4" />
              )
            }
            href={nextRaceLink.href}
          />
        ) : null}
        {isMobile ? (
          <UserButton.Link
            label="My Results"
            labelIcon={<History className="h-4 w-4" />}
            href={myPicksHref}
          />
        ) : null}
        {isMobile ? (
          <UserButton.Link
            label="Home"
            labelIcon={<House className="h-4 w-4" />}
            href="/"
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
  );
}

function OpenSignInOnMount({ signInOpened }: { signInOpened: () => void }) {
  const clerk = useClerk();
  const { isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let finished = false;
    function finish() {
      if (finished) {
        return;
      }
      finished = true;
      signInOpened();
    }
    function finishWhenModalExists() {
      if (document.querySelector('.cl-modalBackdrop')) {
        finish();
      }
    }

    const observer = new MutationObserver(finishWhenModalExists);
    observer.observe(document.body, { childList: true, subtree: true });
    clerk.openSignIn();
    finishWhenModalExists();
    // Never leave the anonymous shell disabled if Clerk fails to create its
    // modal. A normal second click can retry after this safety release.
    const timeout = window.setTimeout(finish, 4_500);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [clerk, isLoaded, signInOpened]);

  return null;
}
