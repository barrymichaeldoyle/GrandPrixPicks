import { SignInButton, useAuth, useClerk, UserButton } from '@clerk/react';
import {
  Flag,
  Gauge,
  ListChecks,
  SlidersHorizontal,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect } from 'react';

const signInButtonClasses =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-full bg-button-accent text-white hover:bg-button-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50';

export function ClerkHeaderUser({
  isMobile,
  isSignedIn,
  myPicksHref,
  openSignInOnMount,
  signInOpened,
}: {
  isMobile: boolean;
  isSignedIn: boolean;
  myPicksHref: string;
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
  );
}

function OpenSignInOnMount({ signInOpened }: { signInOpened: () => void }) {
  const clerk = useClerk();
  const { isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void clerk.openSignIn();
    signInOpened();
  }, [clerk, isLoaded, signInOpened]);

  return null;
}
