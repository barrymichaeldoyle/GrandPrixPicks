import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getStoredJson, removeStoredValue, setStoredJson } from './storage';

const TOKEN_KEY = 'push.expoToken';
const PRE_PROMPT_KEY = 'push.prePromptHandled';

export async function getStoredExpoPushToken(): Promise<string | null> {
  return await getStoredJson<string>(TOKEN_KEY);
}

export async function hasHandledPushPrePrompt(): Promise<boolean> {
  return (await getStoredJson<boolean>(PRE_PROMPT_KEY)) === true;
}

export async function markPushPrePromptHandled(): Promise<void> {
  await setStoredJson(PRE_PROMPT_KEY, true);
}

/**
 * Requests OS permission (if needed), fetches the Expo push token, and
 * persists it locally so sign-out can unregister it later. Returns the token
 * to save server-side, or null when permission was not granted.
 */
export async function obtainExpoPushToken(): Promise<string | null> {
  await prepareNotificationChannels();
  let permission = await Notifications.getPermissionsAsync();
  if (!hasPushPermission(permission) && permission.canAskAgain !== false) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!hasPushPermission(permission)) {
    return null;
  }
  return await getAndStoreToken();
}

export function hasPushPermission(
  permission: Notifications.NotificationPermissionsStatus,
): boolean {
  if (permission.ios) {
    return [
      Notifications.IosAuthorizationStatus.AUTHORIZED,
      Notifications.IosAuthorizationStatus.PROVISIONAL,
      Notifications.IosAuthorizationStatus.EPHEMERAL,
    ].includes(permission.ios.status);
  }
  return permission.status === 'granted';
}

async function getAndStoreToken(): Promise<string> {
  const tokenData = await Notifications.getExpoPushTokenAsync();
  await setStoredJson(TOKEN_KEY, tokenData.data);
  return tokenData.data;
}

/**
 * Fetches the token without ever showing the system prompt — used to keep an
 * already-granted device registered after sign-in or app reinstall.
 */
export async function obtainExpoPushTokenIfGranted(): Promise<string | null> {
  const perm = await Notifications.getPermissionsAsync();
  if (!hasPushPermission(perm)) {
    return null;
  }
  await prepareNotificationChannels();
  return await getAndStoreToken();
}

export async function clearStoredExpoPushToken(): Promise<void> {
  await removeStoredValue(TOKEN_KEY);
  await forgetTokenSave();
}

/**
 * When this device last saved its token for an account. Foregrounding used to
 * re-save the same token every time; once a day keeps the row current.
 */
const TOKEN_SAVE_KEY = 'push.lastTokenSave';
const TOKEN_RESAVE_MS = 24 * 60 * 60 * 1000;

export async function wasTokenSavedRecently(
  token: string,
  userId: string,
): Promise<boolean> {
  const last = await getStoredJson<{
    token: string;
    userId: string;
    at: number;
  }>(TOKEN_SAVE_KEY);
  return (
    last?.token === token &&
    last.userId === userId &&
    Date.now() - last.at < TOKEN_RESAVE_MS
  );
}

export async function recordTokenSave(token: string, userId: string) {
  await setStoredJson(TOKEN_SAVE_KEY, { token, userId, at: Date.now() });
}

/**
 * Forget the save, so the next signed-in launch saves the token again. Called
 * on every sign-out: its server-side delete may still be queued offline, and a
 * remembered save would then skip the re-save that turns push back on.
 */
export async function forgetTokenSave() {
  await removeStoredValue(TOKEN_SAVE_KEY);
}

export async function prepareNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Promise.all([
    Notifications.setNotificationChannelAsync('reminders', {
      name: 'Pick reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
    Notifications.setNotificationChannelAsync('results', {
      name: 'Results',
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
    Notifications.setNotificationChannelAsync('social', {
      name: 'News',
      importance: Notifications.AndroidImportance.LOW,
    }),
  ]);
}
