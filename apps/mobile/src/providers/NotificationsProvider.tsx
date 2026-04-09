import { useUser } from '@clerk/clerk-expo';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useMutation } from 'convex/react';

import { api } from '../integrations/convex/api';
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

async function requestAndGetToken(): Promise<string | null> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      importance: Notifications.AndroidImportance.MAX,
      name: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

/**
 * Registers for push notifications after sign-in and saves the Expo push
 * token to the backend. Must be mounted inside both Clerk and Convex providers.
 * When Clerk is not configured, renders nothing.
 */
export function NotificationsProvider() {
  const { clerkEnabled } = useMobileConfig();
  if (!clerkEnabled) {return null;}
  return <ClerkAwareNotifications />;
}

function ClerkAwareNotifications() {
  const { isSignedIn } = useUser();
  const saveToken = useMutation(api.push.saveExpoPushToken);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {return;}

    let cancelled = false;

    void requestAndGetToken().then((token) => {
      if (cancelled || !token || tokenRef.current === token) {return;}
      tokenRef.current = token;
      void saveToken({ token });
    });

    const sub = Notifications.addNotificationReceivedListener(() => {
      // No-op — notifications shown automatically via handler above
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isSignedIn, saveToken]);

  return null;
}
