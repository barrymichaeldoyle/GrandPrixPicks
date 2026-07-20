import { lazy, Suspense } from 'react';

import type { ClerkSignInButtonProps } from './ClerkSignInButton';

const ClerkSignInButton = lazy(() =>
  import('./runtime-bundle').then((module) => ({
    default: module.ClerkSignInButton,
  })),
);

/**
 * Keeps Clerk out of the route-tree bundle while preserving Clerk's modal
 * sign-in behavior on pages that need an authentication prompt.
 */
export function AppSignInButton(props: ClerkSignInButtonProps) {
  return (
    <Suspense fallback={props.children}>
      <ClerkSignInButton {...props} />
    </Suspense>
  );
}
