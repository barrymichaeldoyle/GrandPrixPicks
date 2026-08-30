import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';
import { Loader2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';

import {
  HEADER_NAV_TAB_CLASS,
  HEADER_NAV_TAB_ICON_CLASS,
} from '@/components/headerNavTabStyles';
import {
  useClerkRuntimeControl,
  useClerkWarmHandlers,
} from './runtime-control';
import { useViewerSession } from './useViewerSession';

/** Keep in sync with the header's mobile breakpoint. */
const MOBILE_MENU_BREAKPOINT = '(max-width: 843px)';

const ClerkHeaderUser = lazy(() =>
  import('./runtime-bundle').then((module) => ({
    default: module.ClerkHeaderUser,
  })),
);

/**
 * The account slot's own floor, matching `min-w-16 sm:min-w-20` on the tabs
 * beside it.
 *
 * The placeholder inside is already the same width as Clerk's real trigger,
 * but that only holds while *something* is rendered: `UserButton` paints one
 * empty frame as it mounts, and for that frame the slot collapsed and the
 * header cluster went 68px wide to 4px and back. Two shifts of 0.001 — the
 * entire remaining CLS on the signed-in home page once the install banner
 * moved out of the flow. The floor is on the slot rather than the child so it
 * holds no matter what the child does.
 */
const ME_SLOT_CLASS = 'gpp-header-me-slot min-w-16 sm:min-w-20';

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
  const [isMobile, setIsMobile] = useState(false);
  const profileHref = me?.username ? `/p/${me.username}` : '/me';
  const isAdmin = me?.isAdmin ?? false;

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
        <Suspense fallback={<AnonymousSignInButton />}>
          <ClerkHeaderUser
            isMobile={isMobile}
            isSignedIn={false}
            isAdmin={false}
            profileHref={profileHref}
            openSignInOnMount={runtime.openSignInOnMount}
            signInOpened={runtime.signInOpened}
          />
        </Suspense>
      );
    }

    return <AnonymousSignInButton />;
  }

  // Both signed-in states share one slot so the nav never reflows during the
  // hand-off: the loading pulse, and Clerk's UserButton — which can render a
  // frame empty on mount, or briefly remount when its `key` (mobile/desktop)
  // resolves — always sit in a stable-width box. The placeholder carries the
  // same tab classes as Clerk's real trigger, including the `Me` pseudo-element
  // label, so the two are the same width down to the pixel and the sibling tabs
  // never bounce while the avatar is mid-mount.
  const tabPlaceholder = (
    <div
      className={`${HEADER_NAV_TAB_CLASS} gpp-header-me-tab`}
      aria-hidden="true"
    >
      <span className={HEADER_NAV_TAB_ICON_CLASS}>
        <span className="block h-6 w-6 animate-pulse rounded-full bg-surface-muted" />
      </span>
    </div>
  );

  if (!confirmedSignedIn) {
    return (
      <div className={ME_SLOT_CLASS} data-testid="header-user-loading">
        {tabPlaceholder}
      </div>
    );
  }

  return (
    <div className={ME_SLOT_CLASS} data-testid="header-user-authenticated">
      <Suspense fallback={tabPlaceholder}>
        <ClerkHeaderUser
          isMobile={isMobile}
          isSignedIn={true}
          isAdmin={isAdmin}
          profileHref={profileHref}
          openSignInOnMount={false}
          signInOpened={runtime.signInOpened}
        />
      </Suspense>
    </div>
  );
}

/**
 * The button used to go `disabled` (and so half-opacity) while Clerk booted,
 * which reads as "this broke" rather than "this is opening". It stays enabled
 * and swaps its label for a spinner in the same box instead, so the click is
 * acknowledged immediately and nothing around it moves.
 */
function AnonymousSignInButton() {
  const { requestSignIn, signInPending } = useClerkRuntimeControl();
  const warmHandlers = useClerkWarmHandlers();

  return (
    <div data-testid="header-user-anonymous">
      <button
        type="button"
        {...warmHandlers}
        onClick={() => requestSignIn()}
        className={signInButtonClasses}
        data-testid="header-sign-in-button"
        aria-busy={signInPending || undefined}
      >
        <span className="relative inline-flex items-center justify-center">
          <span className={signInPending ? 'invisible' : undefined}>
            Sign in
          </span>
          {signInPending ? (
            <Loader2
              size={16}
              className="absolute top-1/2 left-1/2 shrink-0 -translate-x-1/2 -translate-y-1/2 animate-spin"
              aria-hidden="true"
            />
          ) : null}
        </span>
      </button>
    </div>
  );
}
