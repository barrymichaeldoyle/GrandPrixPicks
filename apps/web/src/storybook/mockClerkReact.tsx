import type { PropsWithChildren, ReactNode } from 'react';

import {
  renderSignedInOnly,
  useStorybookMockState,
} from './mockAppRuntime';

export function useAuth() {
  return useStorybookMockState().auth;
}

export function useUser() {
  const { auth, user } = useStorybookMockState();
  return {
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    user,
  };
}

export function SignInButton({
  children,
}: PropsWithChildren<{ mode?: string }>) {
  return <>{children}</>;
}

export function Show({
  when,
  children,
}: PropsWithChildren<{ when: 'signed-in' | 'signed-out' }>) {
  const { auth } = useStorybookMockState();
  const shouldRender =
    when === 'signed-in'
      ? auth.isLoaded && auth.isSignedIn
      : auth.isLoaded && !auth.isSignedIn;
  return shouldRender ? <>{children}</> : null;
}

function UserButtonRoot({
  children,
}: PropsWithChildren<{ appearance?: unknown }>) {
  const { user } = useStorybookMockState();
  const label = user?.username?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold text-text"
      >
        {label}
      </button>
      {children}
    </div>
  );
}

function UserButtonMenuItems({ children }: PropsWithChildren) {
  return <>{children}</>;
}

function UserButtonLink(_props: {
  label: string;
  labelIcon?: ReactNode;
  href: string;
}) {
  return null;
}

function UserButtonAction(_props: { label: string }) {
  return null;
}

export const UserButton = Object.assign(UserButtonRoot, {
  MenuItems: UserButtonMenuItems,
  Link: UserButtonLink,
  Action: UserButtonAction,
});

export function SignedIn({ children }: PropsWithChildren) {
  return renderSignedInOnly(useStorybookMockState().auth.isSignedIn, children);
}

export function SignedOut({ children }: PropsWithChildren) {
  return useStorybookMockState().auth.isSignedIn ? null : <>{children}</>;
}
