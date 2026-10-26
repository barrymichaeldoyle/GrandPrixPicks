import { AppState } from 'react-native';
import { useUser } from '@clerk/expo';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { useQuery } from '../integrations/convex/query';

import { api } from '../integrations/convex/api';
import { captureAnalyticsEvent } from '../lib/analytics';
import {
  obtainExpoPushTokenIfGranted,
  getStoredExpoPushToken,
  clearStoredExpoPushToken,
  recordTokenSave,
  wasTokenSavedRecently,
} from '../lib/pushRegistration';
import { routePushUrl } from '../lib/pushRouting';
import { useMobileConfig } from './mobile-config';

// Configure how notifications are displayed when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

function urlFromResponse(
  response: Notifications.NotificationResponse | null,
): string | null {
  const data = response?.notification.request.content.data as
    | { url?: unknown }
    | undefined;
  return typeof data?.url === 'string' ? data.url : null;
}

/**
 * Keeps an already-permitted device registered after sign-in and routes
 * notification taps to their destination. Never triggers the system
 * permission prompt itself — that happens via the pre-prompt after the
 * user's first pick save (or from Settings).
 */
export function NotificationsProvider() {
  const { clerkEnabled } = useMobileConfig();
  if (!clerkEnabled) {
    return null;
  }
  return <ClerkAwareNotifications />;
}

function ClerkAwareNotifications() {
  const { isSignedIn, user } = useUser();
  const saveToken = useMutation(api.push.saveExpoPushToken);
  const deleteToken = useMutation(api.push.deleteExpoPushToken);
  const releaseToken = useMutation(api.push.releaseExpoPushToken);
  const markOpened = useMutation(api.notificationDelivery.markOpened);

  // Mirror the in-app unread count on the home-screen icon badge. The count
  // query reads only unread rows, so the badge never depends on how much of
  // the history the notifications screen has paged in.
  const unread = useQuery(
    api.inAppNotifications.getMyUnreadCount,
    isSignedIn ? {} : 'skip',
  );
  const unreadCount = isSignedIn ? (unread?.count ?? 0) : 0;
  useEffect(() => {
    void Notifications.setBadgeCountAsync(unreadCount).catch(() => {
      // Badge permission not granted — nothing to do.
    });
  }, [unreadCount]);

  // Signed out with a token still stored means sign-out never reached the
  // server: the session was revoked from another device, or sign-out gave up
  // waiting offline. Without this the phone kept getting the old player's
  // pushes. The release needs no session, and Convex holds it until online.
  const signedInRef = useRef(isSignedIn);
  useEffect(() => {
    signedInRef.current = isSignedIn;
    if (isSignedIn !== false) {
      return;
    }
    void (async () => {
      const token = await getStoredExpoPushToken();
      if (!token) {
        return;
      }
      await releaseToken({ token });
      // A queued release can land after the next sign-in has saved the same
      // token again; forgetting it then would leave the next sign-out unable
      // to unregister it.
      if (signedInRef.current === false) {
        await clearStoredExpoPushToken();
      }
    })().catch((err) => {
      console.warn('[notifications] token release failed', err);
    });
  }, [isSignedIn, releaseToken]);

  // Refresh on account/permission changes. Cache only successful persistence.
  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      return;
    }
    let cancelled = false;
    let running = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function register() {
      if (cancelled || running) {
        return;
      }
      running = true;
      try {
        const previous = await getStoredExpoPushToken();
        const token = await obtainExpoPushTokenIfGranted();
        if (cancelled) {
          return;
        }
        if (!token) {
          if (previous && !cancelled) {
            await deleteToken({ token: previous });
            await clearStoredExpoPushToken();
          }
          return;
        }
        if (!(await wasTokenSavedRecently(token, user!.id))) {
          await saveToken({ token });
          await recordTokenSave(token, user!.id);
        }
        if (previous && previous !== token && !cancelled) {
          await deleteToken({ token: previous });
        }
        attempts = 0;
      } catch (err) {
        console.warn('[notifications] registration failed', err);
        if (!cancelled && attempts < 5) {
          retry = setTimeout(
            () => void register(),
            Math.min(1000 * 2 ** attempts++, 30000),
          );
        }
      } finally {
        running = false;
      }
    }
    void register();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        attempts = 0;
        void register();
      }
    });
    const rotation = Notifications.addPushTokenListener(() => void register());
    return () => {
      cancelled = true;
      clearTimeout(retry);
      appState.remove();
      rotation.remove();
    };
  }, [isSignedIn, user?.id, saveToken, deleteToken]);

  // Notification taps: warm-state listener + the response that may have
  // cold-started the app. pushRouting buffers until the navigator is ready.
  // A cold-start tap can surface through both paths, so dedupe by id.
  const handledResponseIdRef = useRef<string | null>(null);
  // A tap that cold-starts the app is handled before Clerk knows who is
  // signed in, and `markOpened` needs a viewer. Held here until it does, or
  // the most common way a notification is opened was never counted.
  const pendingOpenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isSignedIn || !pendingOpenRef.current) {
      return;
    }
    const deliveryId = pendingOpenRef.current;
    pendingOpenRef.current = null;
    void markOpened({
      deliveryId: deliveryId as Parameters<typeof markOpened>[0]['deliveryId'],
    }).catch(() => {});
  }, [isSignedIn, markOpened]);
  useEffect(() => {
    function handle(response: Notifications.NotificationResponse | null) {
      if (!response) {
        return;
      }
      const id = response.notification.request.identifier;
      if (handledResponseIdRef.current === id) {
        return;
      }
      handledResponseIdRef.current = id;
      const url = urlFromResponse(response);
      captureAnalyticsEvent('notification_opened', { url });
      const deliveryId = response.notification.request.content.data?.deliveryId;
      if (typeof deliveryId === 'string') {
        if (isSignedIn) {
          void markOpened({
            deliveryId: deliveryId as Parameters<
              typeof markOpened
            >[0]['deliveryId'],
          }).catch(() => {});
        } else if (isSignedIn === undefined) {
          pendingOpenRef.current = deliveryId;
        }
      }
      routePushUrl(url);
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }

    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then(handle);

    return () => sub.remove();
  }, [isSignedIn, markOpened]);

  return null;
}
