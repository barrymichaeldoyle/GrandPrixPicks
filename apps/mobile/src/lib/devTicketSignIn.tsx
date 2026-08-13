import { useClerk, useSignIn } from '@clerk/clerk-expo';
import { useEffect } from 'react';
import { Linking } from 'react-native';

/**
 * Signs the app in from a Clerk sign-in ticket delivered by deep link.
 *
 * The web has had this for a while: `pnpm --filter @grandprixpicks/web
 * dev:signin` mints a one-time Clerk token and prints a URL, so a scripted
 * browser can reach an authenticated session without anyone typing a password.
 * Mobile had no equivalent, which meant every authenticated screen was
 * unreachable to automation: no screenshots, no manual QA past the login wall,
 * nothing.
 *
 * The token is the same one. Only the delivery differs, because a simulator
 * cannot follow a browser redirect into the app:
 *
 *   TICKET=$(pnpm --filter @grandprixpicks/web dev:signin \
 *     | grep -o '__clerk_ticket=[^&]*' | cut -d= -f2)
 *   xcrun simctl openurl booted "grandprixpicks://dev-signin?ticket=$TICKET"
 *
 * iOS puts a confirmation sheet in front of custom-scheme opens, which needs a
 * tap. For unattended runs there is a second door: start Metro with the ticket
 * in the environment and the app signs itself in on mount, no tap involved.
 *
 *   EXPO_PUBLIC_DEV_SIGNIN_TICKET=$TICKET npx expo start --dev-client
 *
 * Tokens expire after 300 seconds, so mint one per attempt.
 *
 * Dev only, twice over: the hook returns immediately unless `__DEV__`, and it
 * is mounted by a component that renders nothing in a release build. A ticket
 * is a bearer credential for a whole account, and this must never be a
 * listener that a production binary carries.
 */
function useDevTicketSignIn() {
  const { signIn, isLoaded } = useSignIn();
  const clerk = useClerk();

  useEffect(() => {
    if (!__DEV__ || !isLoaded || !signIn) {
      return;
    }

    async function signInWithTicket(url: string) {
      const ticket = /[?&]ticket=([^&]+)/.exec(url)?.[1];
      if (!ticket || !url.includes('dev-signin')) {
        return;
      }
      try {
        const attempt = await signIn!.create({
          strategy: 'ticket',
          ticket: decodeURIComponent(ticket),
        });
        if (attempt.createdSessionId) {
          await clerk.setActive({ session: attempt.createdSessionId });
          console.log('[devTicketSignIn] signed in');
        }
      } catch (error) {
        console.warn('[devTicketSignIn] ticket rejected', error);
      }
    }

    // Unattended path: a ticket handed to Metro at start, so a screenshot run
    // needs no interaction at all.
    const fromEnv = process.env.EXPO_PUBLIC_DEV_SIGNIN_TICKET;
    if (fromEnv) {
      void signInWithTicket(`dev-signin?ticket=${fromEnv}`);
    }

    // Cold start: the URL that launched the app.
    void Linking.getInitialURL().then((url) => {
      if (url) {
        void signInWithTicket(url);
      }
    });

    // Already running: a second `uri-scheme open` while the app is foregrounded.
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void signInWithTicket(url);
    });
    return () => subscription.remove();
  }, [clerk, isLoaded, signIn]);
}

/** Renders nothing. Exists so the hook has somewhere to live inside Clerk. */
export function DevTicketSignIn() {
  useDevTicketSignIn();
  return null;
}
