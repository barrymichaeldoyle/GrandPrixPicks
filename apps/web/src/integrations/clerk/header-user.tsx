import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/clerk-react';
import { api } from '@convex-generated/api';
import { useQuery } from 'convex/react';
import { Settings, Trophy } from 'lucide-react';

const signInButtonClasses =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-full bg-button-accent text-white hover:bg-button-accent-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50';

/**
 * User avatar when signed in; Sign in button when signed out.
 * The Sign in button is hidden on mobile (min-[791px]:block) so it
 * only appears in the header on desktop, and lives in the mobile menu on small screens.
 */
export function HeaderUser() {
  const me = useQuery(api.users.me);
  const myPicksHref = me?.username ? `/p/${me.username}` : '/me';

  return (
    <>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              userButtonTrigger:
                'rounded-full border border-border bg-surface px-2 py-1 transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
            },
          }}
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="My Picks"
              labelIcon={<Trophy className="h-4 w-4" />}
              href={myPicksHref}
            />
            <UserButton.Link
              label="Settings"
              labelIcon={<Settings className="h-4 w-4" />}
              href="/settings"
            />
            <UserButton.Action label="manageAccount" />
            <UserButton.Action label="signOut" />
          </UserButton.MenuItems>
        </UserButton>
      </SignedIn>
      <SignedOut>
        <div className="hidden min-[791px]:block">
          <SignInButton mode="modal">
            <button type="button" className={signInButtonClasses}>
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>
    </>
  );
}
