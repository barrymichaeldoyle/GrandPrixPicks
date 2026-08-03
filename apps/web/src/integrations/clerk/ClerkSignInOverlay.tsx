import { useAuth, useClerk } from '@clerk/react';
import { useEffect, useRef } from 'react';

import { AppClerkProvider } from './provider';

/**
 * Clerk mounted beside the page rather than around it.
 *
 * The landing page renders without Clerk so its first paint costs nothing, and
 * the old way of activating it — swapping the whole app onto an authenticated
 * provider tree — unmounted and remounted every node of the page underneath the
 * visitor at the exact moment they were waiting on a modal. Clerk portals its
 * modal to `document.body`, so none of that re-parenting bought anything: this
 * renders no DOM of its own and the page behind it is never touched.
 *
 * Mounting is also split from opening. `open` stays false while the provider
 * boots on an intent signal (hover, focus, touch), so the remote scripts and
 * the two client API calls are already done by the time the click arrives.
 */
export function ClerkSignInOverlay({
  open,
  onOpened,
  onSignedIn,
}: {
  open: boolean;
  /** The modal is on screen. Releases the trigger's pending state. */
  onOpened: () => void;
  onSignedIn: () => void;
}) {
  return (
    <AppClerkProvider darkMode={true}>
      <SignInModalController
        open={open}
        onOpened={onOpened}
        onSignedIn={onSignedIn}
      />
    </AppClerkProvider>
  );
}

function SignInModalController({
  open,
  onOpened,
  onSignedIn,
}: {
  open: boolean;
  onOpened: () => void;
  onSignedIn: () => void;
}) {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!open || !isLoaded || hasOpenedRef.current) {
      return;
    }
    hasOpenedRef.current = true;

    let settled = false;
    function release() {
      if (settled) {
        return;
      }
      settled = true;
      onOpened();
    }
    function releaseWhenModalExists() {
      if (document.querySelector('.cl-modalBackdrop')) {
        release();
      }
    }

    const observer = new MutationObserver(releaseWhenModalExists);
    observer.observe(document.body, { childList: true, subtree: true });
    clerk.openSignIn();
    releaseWhenModalExists();
    // Never strand the trigger in its pending state if Clerk fails to build a
    // modal. A normal second click can retry after this safety release.
    const timeout = window.setTimeout(release, 4_500);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [clerk, isLoaded, onOpened, open]);

  useEffect(() => {
    if (isSignedIn) {
      onSignedIn();
    }
  }, [isSignedIn, onSignedIn]);

  return null;
}
