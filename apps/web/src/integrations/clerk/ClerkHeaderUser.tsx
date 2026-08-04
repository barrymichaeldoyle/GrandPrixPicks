import { SignInButton, useAuth, useClerk, UserButton } from '@clerk/react';
import { SlidersHorizontal, User } from 'lucide-react';
import { useEffect } from 'react';

const signInButtonClasses =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-sm border border-border-strong bg-surface-elevated text-text hover:border-accent/55 hover:bg-accent-muted/35 hover:text-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50';

export function ClerkHeaderUser({
  isMobile,
  isSignedIn,
  profileHref,
  openSignInOnMount,
  signInOpened,
}: {
  isMobile: boolean;
  isSignedIn: boolean;
  profileHref: string;
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

  // This menu is about *you*, not about the game: profile, preferences, the
  // account itself, out. Game destinations (leaderboard, leagues, calendar)
  // belong to the dashboard rail, which is one tap away on the Home tab — they
  // used to be duplicated here with the same labels and the same icons.
  //
  // Profile leads because that is what a "Me" menu is for, and because Clerk's
  // user preview above it is display-only, so without this row there is no door
  // to your own profile at all. It points at the public profile page (season
  // stats, followers, results), which is why it is not called "My Results".
  return (
    <UserButton key={isMobile ? 'mobile' : 'desktop'}>
      <UserButton.MenuItems>
        <UserButton.Link
          label="Profile"
          labelIcon={<User className="h-4 w-4" />}
          href={profileHref}
        />
        <UserButton.Link
          label="Settings"
          labelIcon={<SlidersHorizontal className="h-4 w-4" />}
          href="/settings"
        />
        {/* Clerk's own account modal: email, password, 2FA, devices, deletion.
            None of that lives in /settings, so this stays — relabelled from
            "Manage account" (see `localization` in the Clerk provider) because
            two doors called Settings and Manage account are indistinguishable. */}
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
