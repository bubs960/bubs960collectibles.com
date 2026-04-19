/**
 * Run with jest-expo only.
 *
 * NotificationsDriver is a headless hook-runner — no visible UI. Tests
 * assert the effect pipeline fires at the right moments and is guarded
 * against duplicate registration.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const registerForPushToken = jest.fn();
const registerDeviceWithWorker = jest.fn();
jest.mock('../../src/notifications/setup', () => ({
  registerForPushToken: (...args: unknown[]) => registerForPushToken(...args),
  registerDeviceWithWorker: (...args: unknown[]) =>
    registerDeviceWithWorker(...args),
}));

const authState = {
  isSignedIn: false as boolean,
  userId: null as string | null,
  token: 'jwt-current',
};
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({
    isSignedIn: authState.isSignedIn,
    userId: authState.userId,
    getToken: async () => authState.token,
  }),
}));

// useAuthToken reads the same useAuth stub above, so it returns the token
// when signed in and null otherwise without additional mocking.

import { NotificationsDriver } from '../../src/notifications/NotificationsDriver';

beforeEach(() => {
  registerForPushToken.mockReset();
  registerDeviceWithWorker.mockReset();
  authState.isSignedIn = false;
  authState.userId = null;
  authState.token = 'jwt-current';
});

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('NotificationsDriver', () => {
  it('renders null (no visible UI)', () => {
    const { toJSON } = render(<NotificationsDriver />);
    expect(toJSON()).toBeNull();
  });

  it('no-op when signed out (never calls push-token fetch)', async () => {
    render(<NotificationsDriver />);
    await flush();
    expect(registerForPushToken).not.toHaveBeenCalled();
    expect(registerDeviceWithWorker).not.toHaveBeenCalled();
  });

  it('on sign-in: fetches push token + registers with worker', async () => {
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    registerForPushToken.mockResolvedValueOnce('ExpoPush-xyz');
    registerDeviceWithWorker.mockResolvedValueOnce(undefined);

    render(<NotificationsDriver />);
    await flush();
    await flush();

    expect(registerForPushToken).toHaveBeenCalledTimes(1);
    expect(registerDeviceWithWorker).toHaveBeenCalledTimes(1);
    expect(registerDeviceWithWorker).toHaveBeenCalledWith('ExpoPush-xyz', 'jwt-current');
  });

  it('silently no-ops when registerForPushToken returns null (sim / denied)', async () => {
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    registerForPushToken.mockResolvedValueOnce(null);

    render(<NotificationsDriver />);
    await flush();
    await flush();

    expect(registerForPushToken).toHaveBeenCalledTimes(1);
    expect(registerDeviceWithWorker).not.toHaveBeenCalled();
  });

  it('swallows Worker registration failures without throwing', async () => {
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    registerForPushToken.mockResolvedValueOnce('ExpoPush-xyz');
    registerDeviceWithWorker.mockRejectedValueOnce(new Error('503 backend down'));

    // Must not throw during render — driver is fire-and-forget.
    expect(() => render(<NotificationsDriver />)).not.toThrow();
    await flush();
    await flush();
  });
});
