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
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
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
  await setStoredJson(TOKEN_KEY, tokenData.data);
  return tokenData.data;
}

/**
 * Fetches the token without ever showing the system prompt — used to keep an
 * already-granted device registered after sign-in or app reinstall.
 */
export async function obtainExpoPushTokenIfGranted(): Promise<string | null> {
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') {
    return null;
  }
  return obtainExpoPushToken();
}

export async function clearStoredExpoPushToken(): Promise<void> {
  await removeStoredValue(TOKEN_KEY);
}
