import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start';
import { dark } from '@clerk/ui/themes';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

import { useInitialAuth } from './initial-auth';
import {
  deriveViewerSession,
  ViewerSessionProvider,
} from './viewer-session-context';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env.local file');
}

interface AppClerkProviderProps extends PropsWithChildren {
  /** When true, Clerk components use the dark theme. */
  darkMode?: boolean;
  /**
   * A sign-in has already happened on this page load, so treat the viewer as
   * signed in until Clerk's own boot catches up. See
   * {@link ClerkViewerSessionBridge}.
   */
  assumeSignedIn?: boolean;
}

const clerkElements = {
  userButtonTrigger:
    'rounded-full !border-transparent bg-transparent px-2 py-1 text-text transition-colors hover:bg-surface-muted/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 data-[state=open]:bg-surface-muted/45',
  userButtonAvatarBox: 'ring-0',
  userButtonPopoverRootBox: 'z-[120]',
  userButtonPopoverCard:
    'overflow-hidden rounded-lg border border-border bg-surface text-text',
  userButtonPopoverMain: 'bg-transparent',
  userButtonPopoverFooter: 'border-t border-border/50 bg-surface-muted/20',
  userButtonPopoverActions: 'border-border/50 bg-transparent',
  userButtonPopoverActionButton:
    'rounded-none text-text-muted transition-colors hover:bg-surface-muted/55 hover:text-text focus:bg-surface-muted/55 focus:text-text',
  userButtonPopoverCustomItemButton:
    'rounded-none text-text-muted transition-colors hover:bg-surface-muted/55 hover:text-text focus:bg-surface-muted/55 focus:text-text',
  userButtonPopoverActionButtonIconBox: 'text-accent',
  userButtonPopoverCustomItemButtonIconBox: 'text-accent',
  userButtonPopoverActionItemButtonIcon: 'text-accent',
  userButtonPopoverActionButton__signOut:
    'text-text-muted hover:bg-error/10 hover:text-error focus:bg-error/10 focus:text-error',
  userButtonPopoverActionButtonIconBox__signOut: 'text-error',
  userPreviewMainIdentifier: 'text-text',
  userPreviewMainIdentifierText: 'font-semibold text-text',
  userPreviewSecondaryIdentifier: 'text-text-muted',
  badge:
    '!rounded-sm !border !border-border-strong !bg-surface-muted !px-2 !py-0.5 !text-xs !font-semibold !text-text',
  badge__primary: '!border-accent !bg-accent !text-page',
  badge__actionRequired: '!border-warning !bg-warning !text-page',
  activeDevice:
    '!rounded-none !border-0 !bg-transparent !text-text !shadow-none',
  activeDeviceListItem:
    '!rounded-none !border-0 !bg-transparent !text-text !shadow-none',
  activeDeviceIcon: '!text-text-muted',
  notificationBadge: 'border border-error/45 bg-error-muted text-error',
};

export function AppClerkProvider({
  children,
  darkMode = false,
  assumeSignedIn = false,
}: AppClerkProviderProps) {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{
        theme: darkMode ? dark : undefined,
        variables: {
          colorPrimary: 'var(--accent)',
          colorPrimaryForeground: '#ffffff',
          colorDanger: 'var(--error)',
          colorSuccess: 'var(--success)',
          colorWarning: 'var(--warning)',
          colorBackground: 'var(--page)',
          colorForeground: 'var(--text)',
          colorMuted: 'var(--surface)',
          colorMutedForeground: 'var(--text-muted)',
          colorBorder: 'var(--border)',
          colorInput: 'var(--surface-elevated)',
          colorInputForeground: 'var(--text)',
          colorRing: 'var(--accent)',
          colorShadow: '#000000',
          fontFamily: 'inherit',
          fontFamilyButtons: 'inherit',
        },
        elements: clerkElements,
      }}
      localization={{
        userProfile: {
          deletePage: {
            messageLine1:
              'Deleting your account will permanently remove all your data, including your predictions, scores, and profile.',
          },
        },
      }}
    >
      <ClerkViewerSessionBridge assumeSignedIn={assumeSignedIn}>
        {children}
      </ClerkViewerSessionBridge>
    </ClerkProvider>
  );
}

/**
 * `assumeSignedIn` covers the one case the SSR signal cannot: signing in from a
 * page that was server-rendered signed *out*. Activating the authenticated
 * runtime swaps the provider tree, so this bridge mounts fresh with
 * `hasConfirmedSession` back at false and `initialAuth.isSignedIn` still
 * reporting the (now stale) signed-out SSR answer. Without the override the app
 * renders its logged-out self for a beat before Clerk finishes booting, which is
 * exactly the landing-page flash the curtain is there to hide.
 */
function ClerkViewerSessionBridge({
  children,
  assumeSignedIn,
}: PropsWithChildren<{ assumeSignedIn: boolean }>) {
  const { isLoaded, isSignedIn: clientSignedIn } = useAuth();
  const initialAuth = useInitialAuth();
  // Sticky: once Clerk confirms a session on this page load, a later
  // signed-out report is a real sign-out rather than its boot transient.
  const [hasConfirmedSession, setHasConfirmedSession] = useState(false);
  const confirmedSignedIn = isLoaded && !!clientSignedIn;

  useEffect(() => {
    if (confirmedSignedIn) {
      setHasConfirmedSession(true);
    }
  }, [confirmedSignedIn]);

  return (
    <ViewerSessionProvider
      value={deriveViewerSession({
        isLoaded,
        clientSignedIn,
        initialSignedIn: initialAuth.isSignedIn || assumeSignedIn,
        hasConfirmedSession,
      })}
    >
      {children}
    </ViewerSessionProvider>
  );
}
