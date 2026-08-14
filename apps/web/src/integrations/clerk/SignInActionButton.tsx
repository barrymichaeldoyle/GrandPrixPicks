import type { ComponentProps } from 'react';

import { Button } from '@/components/Button/Button';

import {
  useClerkRuntimeControl,
  useClerkWarmHandlers,
} from './runtime-control';

type SignInActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  'onClick' | 'type'
>;

/**
 * A button that opens the sign-in modal without putting Clerk on the page.
 *
 * The alternative is `AppSignInButton`, which renders Clerk's own
 * `SignInButton` and therefore needs a provider around it — which in turn means
 * every anonymous visitor to the route downloads the auth runtime before they
 * have asked for anything. This goes through `requestSignIn` instead, the same
 * path `SignInPrompt` and the pick forms use: the modal boots on demand and the
 * page it was opened from is never re-parented.
 *
 * Sign-in happens in place. `clerk.openSignIn()` takes no redirect, the URL
 * does not change, and the page re-renders as its signed-in self once the
 * session lands — so a caller that used to pass `fallbackRedirectUrl` to come
 * back where it started needs nothing here.
 *
 * The button stays enabled while Clerk boots, wearing `loading` instead. A
 * disabled control reads as "this broke" rather than "this is opening".
 */
export function SignInActionButton({
  children,
  ...props
}: SignInActionButtonProps) {
  const { requestSignIn, signInPending } = useClerkRuntimeControl();
  const warmHandlers = useClerkWarmHandlers();

  return (
    <Button
      type="button"
      {...warmHandlers}
      {...props}
      loading={signInPending}
      aria-busy={signInPending || undefined}
      onClick={() => requestSignIn()}
    >
      {children}
    </Button>
  );
}
