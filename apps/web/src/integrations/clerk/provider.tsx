import {
  ClerkProvider,
  useAuth,
} from '@clerk/tanstack-react-start';
import { dark } from '@clerk/ui/themes';
import type { PropsWithChildren } from 'react';

import { useInitialAuth } from './initial-auth';
import { ViewerSessionProvider } from './viewer-session-context';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env.local file');
}

interface AppClerkProviderProps extends PropsWithChildren {
  /** When true, Clerk components use the dark theme. */
  darkMode?: boolean;
}

const clerkElements = {
  userButtonTrigger:
    'rounded-full !border-transparent bg-transparent px-2 py-1 text-text transition-colors hover:bg-surface-muted/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 data-[state=open]:bg-surface-muted/45',
  userButtonAvatarBox: 'ring-0',
  userButtonPopoverRootBox: 'z-[120]',
  userButtonPopoverCard:
    'overflow-hidden rounded-xl border border-white/10 bg-surface/95 text-text shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-md',
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
    '!rounded-sm !border !border-border-strong !bg-surface-muted !px-2 !py-0.5 !text-[11px] !font-semibold !text-text',
  badge__primary: '!border-accent !bg-accent !text-slate-950',
  badge__actionRequired: '!border-warning !bg-warning !text-slate-950',
  activeDevice:
    '!rounded-none !border-0 !bg-transparent !text-text !shadow-none',
  activeDeviceListItem:
    '!rounded-none !border-0 !bg-transparent !text-text !shadow-none',
  activeDeviceIcon: '!text-text-muted',
  notificationBadge:
    'border border-error/45 bg-error/15 text-error shadow-[0_0_0_1px_rgba(248,113,113,0.1)]',
};

export function AppClerkProvider({
  children,
  darkMode = false,
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
      <ClerkViewerSessionBridge>{children}</ClerkViewerSessionBridge>
    </ClerkProvider>
  );
}

function ClerkViewerSessionBridge({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn: clientSignedIn } = useAuth();
  const initialAuth = useInitialAuth();
  const confirmedSignedIn = isLoaded && !!clientSignedIn;

  return (
    <ViewerSessionProvider
      value={{
        isLoaded,
        isSignedIn: initialAuth.isSignedIn || confirmedSignedIn,
        confirmedSignedIn,
      }}
    >
      {children}
    </ViewerSessionProvider>
  );
}
