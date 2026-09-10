import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  permission: vi.fn(),
  request: vi.fn(),
  token: vi.fn(),
  store: vi.fn(),
}));
vi.mock('expo-notifications', () => ({
  setNotificationChannelAsync: mocks.channel,
  getPermissionsAsync: mocks.permission,
  requestPermissionsAsync: mocks.request,
  getExpoPushTokenAsync: mocks.token,
  AndroidImportance: { DEFAULT: 3, LOW: 2 },
  IosAuthorizationStatus: { AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('./storage', () => ({
  getStoredJson: vi.fn(),
  removeStoredValue: vi.fn(),
  setStoredJson: mocks.store,
}));
import {
  obtainExpoPushToken,
  obtainExpoPushTokenIfGranted,
} from './pushRegistration';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.channel.mockResolvedValue(null);
  mocks.permission.mockResolvedValue({ status: 'undetermined' });
  mocks.request.mockResolvedValue({ status: 'granted' });
  mocks.token.mockResolvedValue({ data: 'ExponentPushToken[test]' });
});
it('creates Android channels before requesting permission', async () => {
  expect(await obtainExpoPushToken()).toBe('ExponentPushToken[test]');
  expect(mocks.channel).toHaveBeenCalledTimes(3);
  expect(mocks.channel.mock.invocationCallOrder[2]).toBeLessThan(
    mocks.request.mock.invocationCallOrder[0],
  );
  expect(mocks.store).toHaveBeenCalledWith(
    'push.expoToken',
    'ExponentPushToken[test]',
  );
});
it('silent registration never prompts denied users', async () => {
  mocks.permission.mockResolvedValue({ status: 'denied' });
  expect(await obtainExpoPushTokenIfGranted()).toBeNull();
  expect(mocks.request).not.toHaveBeenCalled();
  expect(mocks.token).not.toHaveBeenCalled();
});
it('does not register after permission is declined', async () => {
  mocks.request.mockResolvedValue({ status: 'denied' });
  expect(await obtainExpoPushToken()).toBeNull();
  expect(mocks.token).not.toHaveBeenCalled();
});

it('silently registers provisional iOS permission without prompting', async () => {
  mocks.permission.mockResolvedValue({
    status: 'undetermined',
    ios: { status: 3 },
  });
  expect(await obtainExpoPushTokenIfGranted()).toBe('ExponentPushToken[test]');
  expect(mocks.request).not.toHaveBeenCalled();
});
