import AsyncStorage from './__mocks__/asyncStorage';
import { __mock as notifMock } from './__mocks__/expoNotifications';
import { __mock as deviceMock } from './__mocks__/expoDevice';
import {
  ensurePermission,
  getCachedPushToken,
  getPermissionStatus,
  registerForPushToken,
} from '../src/notifications/setup';

const store = AsyncStorage as { __reset: () => void };

beforeEach(() => {
  store.__reset();
  notifMock.reset();
  deviceMock.reset();
});

describe('notifications/setup', () => {
  describe('getPermissionStatus', () => {
    it('maps Clerk-style status to the normalized enum', async () => {
      notifMock.setPermission({ status: 'granted', canAskAgain: true });
      await expect(getPermissionStatus()).resolves.toBe('granted');
      notifMock.setPermission({ status: 'denied', canAskAgain: false });
      await expect(getPermissionStatus()).resolves.toBe('denied');
      notifMock.setPermission({ status: 'undetermined', canAskAgain: true });
      await expect(getPermissionStatus()).resolves.toBe('undetermined');
    });
  });

  describe('ensurePermission', () => {
    it('returns true immediately when already granted (no re-prompt)', async () => {
      notifMock.setPermission({ status: 'granted', canAskAgain: true });
      await expect(ensurePermission()).resolves.toBe(true);
    });

    it('prompts and returns true on grant', async () => {
      notifMock.setPermission({ status: 'undetermined', canAskAgain: true });
      await expect(ensurePermission()).resolves.toBe(true);
    });

    it('returns false without prompting when the user previously denied + blocked future prompts', async () => {
      notifMock.setPermission({ status: 'denied', canAskAgain: false });
      await expect(ensurePermission()).resolves.toBe(false);
    });
  });

  describe('registerForPushToken', () => {
    it('returns null on a simulator (Device.isDevice=false) — never calls the API', async () => {
      deviceMock.setIsDevice(false);
      const token = await registerForPushToken();
      expect(token).toBeNull();
      await expect(getCachedPushToken()).resolves.toBeNull();
    });

    it('returns null when the user denies permission', async () => {
      notifMock.setPermission({ status: 'denied', canAskAgain: false });
      await expect(registerForPushToken()).resolves.toBeNull();
    });

    it('fetches + persists the Expo token when permission is granted', async () => {
      notifMock.setPermission({ status: 'granted', canAskAgain: true });
      notifMock.setToken('ExponentPushToken[test-abc]');
      const token = await registerForPushToken();
      expect(token).toBe('ExponentPushToken[test-abc]');
      await expect(getCachedPushToken()).resolves.toBe('ExponentPushToken[test-abc]');
    });

    it('calls the onToken callback with the fetched token', async () => {
      notifMock.setPermission({ status: 'granted', canAskAgain: true });
      const onToken = jest.fn();
      await registerForPushToken(onToken);
      expect(onToken).toHaveBeenCalledWith('ExponentPushToken[mock-token]');
    });

    it('returns null and does not throw when the token fetch errors', async () => {
      notifMock.setPermission({ status: 'granted', canAskAgain: true });
      notifMock.setToken(null); // triggers "token fetch failed" in the mock
      await expect(registerForPushToken()).resolves.toBeNull();
    });
  });

  describe('getCachedPushToken', () => {
    it('returns null before any token is cached', async () => {
      await expect(getCachedPushToken()).resolves.toBeNull();
    });

    it('returns null on AsyncStorage read error', async () => {
      // Simulate read failure by mocking getItem to throw.
      const spy = jest
        .spyOn(AsyncStorage, 'getItem')
        .mockRejectedValueOnce(new Error('read failed'));
      await expect(getCachedPushToken()).resolves.toBeNull();
      spy.mockRestore();
    });
  });
});
