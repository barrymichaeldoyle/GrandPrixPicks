import { useUser } from '@clerk/clerk-expo';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { api } from '../integrations/convex/api';
import { captureAnalyticsEvent } from '../lib/analytics';
import { obtainExpoPushTokenIfGranted } from '../lib/pushRegistration';
import { routePushUrl } from '../lib/pushRouting';
import { useMobileConfig } from './mobile-config';

// Configure how notifications are displayed when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
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
  const { isSignedIn } = useUser();
  const saveToken = useMutation(api.push.saveExpoPushToken);
  const tokenRef = useRef<string | null>(null);

  // Mirror the in-app unread count on the home-screen icon badge.
  const notifications = useQuery(
    api.inAppNotifications.getMyNotifications,
    isSignedIn ? {} : 'skip',
  );
  const unreadCount = isSignedIn ? (notifications?.unreadCount ?? 0) : 0;
  useEffect(() => {
    void Notifications.setBadgeCountAsync(unreadCount).catch(() => {
      // Badge permission not granted — nothing to do.
    });
  }, [unreadCount]);

  // Silent re-registration: refreshes the server-side token for devices that
  // already granted permission (reinstalls, token rotation). No prompt.
  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let cancelled = false;

    void obtainExpoPushTokenIfGranted()
      .then((token) => {
        if (cancelled || !token || tokenRef.current === token) {
          return;
        }
        tokenRef.current = token;
        void saveToken({ token }).catch((err: unknown) => {
          console.warn('[notifications] saveExpoPushToken failed', err);
        });
      })
      .catch((err: unknown) => {
        // Best-effort — most commonly fails when the EAS projectId is
        // missing/invalid. Swallow so it doesn't surface as unhandled.
        console.warn('[notifications] push token registration failed', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, saveToken]);

  // Notification taps: warm-state listener + the response that may have
  // cold-started the app. pushRouting buffers until the navigator is ready.
  // A cold-start tap can surface through both paths, so dedupe by id.
  const handledResponseIdRef = useRef<string | null>(null);
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
      routePushUrl(url);
    }

    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then(handle);

    return () => sub.remove();
  }, []);

  return null;
}
