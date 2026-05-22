import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

export type PushPermissionStatus =
  | 'loading'
  | 'granted'
  | 'denied'
  | 'undetermined';

/**
 * Tracks the OS-level push notification permission. Re-checks when the app
 * returns from background (e.g. user toggled permission in Settings.app).
 */
export function usePushPermission() {
  const [status, setStatus] = useState<PushPermissionStatus>('loading');
  const [canAskAgain, setCanAskAgain] = useState(true);

  async function refresh() {
    const perm = await Notifications.getPermissionsAsync();
    setStatus(
      perm.status === 'granted'
        ? 'granted'
        : perm.status === 'denied'
          ? 'denied'
          : 'undetermined',
    );
    setCanAskAgain(perm.canAskAgain ?? true);
  }

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });
    return () => sub.remove();
  }, []);

  async function requestPermission() {
    const perm = await Notifications.requestPermissionsAsync();
    setStatus(
      perm.status === 'granted'
        ? 'granted'
        : perm.status === 'denied'
          ? 'denied'
          : 'undetermined',
    );
    setCanAskAgain(perm.canAskAgain ?? true);
    return perm.status === 'granted';
  }

  function openSystemSettings() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Linking.openSettings();
    }
  }

  return {
    status,
    canAskAgain,
    refresh,
    requestPermission,
    openSystemSettings,
  };
}
