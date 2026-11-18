import { SignInButton, useAuth, useClerk, UserButton } from '@clerk/react';
import { useNavigate } from '@tanstack/react-router';
import { ShieldCheck, SlidersHorizontal, User } from 'lucide-react';
import { useEffect } from 'react';

import { reportSignInOpened, reportSignInTimeout } from '@/lib/signInFunnel';

import { signInOptions } from './signInOptions';

const signInButtonClasses =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-sm border border-border-strong bg-surface-elevated text-text hover:border-accent/55 hover:bg-accent-muted/35 hover:text-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50';

export function ClerkHeaderUser({
  isSignedIn,
  isAdmin,
  profileHref,
  openSignInOnMount,
  signInOpened,
}: {
  isSignedIn: boolean;
  isAdmin: boolean;
  profileHref: string | null;
  openSignInOnMount: boolean;
  signInOpened: () => void;
}) {
  const navigate = useNavigate();
  if (!isSignedIn) {
    return (
      <>
        {openSignInOnMount && <OpenSignInOnMount signInOpened={signInOpened} />}
        <div data-testid="header-user-anonymous">
          <SignInButton mode="modal" withSignUp>
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
    <UserButton
      // Clerk's own wrapper around the trigger has to stretch too, or the tab
      // loses its full-height underline. It is set here rather than in
      // styles.css because a `.cl-userButton-root` selector would pin the
      // header's layout to Clerk's internal DOM (and Clerk warns about it);
      // `rootBox` is the supported hook for the same element. It stays local to
      // this component rather than going in the provider's shared `elements`,
      // where it would also stretch the sign-in modal's root box.
      appearance={{ elements: { rootBox: 'flex h-full items-stretch' } }}
    >
      {/* Actions that navigate, not `UserButton.Link`. Clerk awaits a link's
          navigation before it closes the menu, and the router resolves only
          once the next page's loaders finish, so on a phone the menu sat open
          and unchanged for the whole load and the tap read as broken. An
          action closes the menu at once and leaves the waiting to the router
          (and `NavigationProgress`). */}
      <UserButton.MenuItems>
        {profileHref ? (
          <UserButton.Action
            label="Profile"
            labelIcon={<User className="h-4 w-4" />}
            onClick={() => void navigate({ href: profileHref })}
          />
        ) : null}
        <UserButton.Action
          label="Settings"
          labelIcon={<SlidersHorizontal className="h-4 w-4" />}
          onClick={() => void navigate({ to: '/settings' })}
        />
        {/* Admins reach race management and result publishing from here: /admin
            is not in the nav rail (it is not a player destination) and it turns
            away non-admins anyway, so the row only exists when it leads
            somewhere. `isAdmin` comes from the server (`users.me`), so a client
            that fakes it still hits the same requireAdmin checks. */}
        {isAdmin && (
          <UserButton.Action
            label="Admin"
            labelIcon={<ShieldCheck className="h-4 w-4" />}
            onClick={() => void navigate({ to: '/admin' })}
          />
        )}
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
      if (!finished && document.querySelector('.cl-modalBackdrop')) {
        reportSignInOpened(() => Boolean(clerk.user));
        finish();
      }
    }

    const observer = new MutationObserver(finishWhenModalExists);
    observer.observe(document.body, { childList: true, subtree: true });
    clerk.openSignIn(signInOptions());
    finishWhenModalExists();
    // Never leave the anonymous shell disabled if Clerk fails to create its
    // modal. A normal second click can retry after this safety release.
    const timeout = window.setTimeout(() => {
      if (!finished) {
        reportSignInTimeout();
      }
      finish();
    }, 4_500);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [clerk, isLoaded, signInOpened]);

  return null;
}
