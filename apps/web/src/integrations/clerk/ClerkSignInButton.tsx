import { SignInButton } from '@clerk/react';
import type { ComponentProps } from 'react';

export type ClerkSignInButtonProps = ComponentProps<typeof SignInButton>;

export function ClerkSignInButton(props: ClerkSignInButtonProps) {
  return <SignInButton {...props} />;
}
