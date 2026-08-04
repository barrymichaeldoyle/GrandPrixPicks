import type { PropsWithChildren, ReactNode } from 'react';

import {
  HEADER_NAV_TAB_CLASS,
  HEADER_NAV_TAB_ICON_CLASS,
} from '@/components/headerNavTabStyles';
import { renderSignedInOnly, useStorybookMockState } from './mockAppRuntime';

export function useAuth() {
  return useStorybookMockState().auth;
}

/**
 * Stable singleton: consumers put the clerk object in useEffect dep arrays, so
 * returning a fresh object per render would re-fire those effects every render.
 */
const MOCK_CLERK = {
  openSignIn: async () => {},
  signOut: async () => {},
};

export function useClerk() {
  return MOCK_CLERK;
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

/**
 * Shaped like the real header account tab (avatar over a "Me" label), because
 * Storybook renders the Header for real and a bare round avatar would preview a
 * bar that no longer exists. The label comes from `.gpp-header-me-tab::after`,
 * the same pseudo-element the live trigger uses.
 */
function UserButtonRoot({
  children,
}: PropsWithChildren<{ appearance?: unknown }>) {
  const { user } = useStorybookMockState();
  const label = user?.username?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="flex h-full items-stretch">
      <button
        type="button"
        className={`${HEADER_NAV_TAB_CLASS} gpp-header-me-tab`}
      >
        <span className={HEADER_NAV_TAB_ICON_CLASS}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-semibold text-text">
            {label}
          </span>
        </span>
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

/*
 * Clerk's full-page components. Nothing in Storybook renders them, but
 * `@clerk/react` is aliased to this file for the whole graph, and a missing
 * export is a hard build error even on a code path no story reaches. Same rule
 * as the Convex mock: add a Clerk component to the app, add a stub here.
 */
function ClerkPagePlaceholder({ name }: { name: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-4 text-sm text-text-muted">
      {name} (Clerk-hosted, not rendered in Storybook)
    </div>
  );
}

export function SignIn() {
  return <ClerkPagePlaceholder name="SignIn" />;
}

export function SignUp() {
  return <ClerkPagePlaceholder name="SignUp" />;
}

export function UserProfile() {
  return <ClerkPagePlaceholder name="UserProfile" />;
}

export function OrganizationProfile() {
  return <ClerkPagePlaceholder name="OrganizationProfile" />;
}

export function OrganizationList() {
  return <ClerkPagePlaceholder name="OrganizationList" />;
}
