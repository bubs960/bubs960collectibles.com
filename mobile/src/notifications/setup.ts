import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notifications bootstrap.
 *
 * Price-drop alerts wire up to the Worker's `POST /api/v1/devices`
 * endpoint (v2). This module:
 *   1. Configures the in-app notification handler (foreground display).
 *   2. Exposes `ensurePermission()` to prompt for authorisation.
 *   3. Exposes `registerForPushToken()` to fetch an Expo push token and
 *      cache it locally.
 *   4. Exposes `registerDeviceWithWorker(token, jwt)` to post the token
 *      to the Worker with the decided-on schema (per engineer Q4.7):
 *         { token, platform, app_version? }
 *      NOT { expo_push_token, platform } — the platform-agnostic `token`
 *      field leaves room for direct FCM later without a schema migration.
 */

const TOKEN_KEY = 'fp:v1:push_token';
const APP_VERSION = '0.1.0';

// Always called at module load — safe; the handler only runs on arrival.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/** Request permission; returns true on grant. Safe to call multiple times. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: false },
  });
  return status === 'granted';
}

/**
 * Fetches the Expo push token, persists it, and hands it to the optional
 * callback. Only works on physical devices; returns null on simulators.
 */
export async function registerForPushToken(
  onToken?: (token: string) => void | Promise<void>,
): Promise<string | null> {
  if (!Device.isDevice) return null;

  const granted = await ensurePermission();
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('price_alerts', {
      name: 'Price alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (onToken) await onToken(token);
    return token;
  } catch {
    return null;
  }
}

export async function getCachedPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

interface RegisterDeviceOptions {
  apiBase?: string;
  appVersion?: string;
  signal?: AbortSignal;
}

/**
 * POST /api/v1/devices with the Worker-accepted body shape. The server-side
 * schema column is `token` (platform-agnostic), NOT `expo_push_token` — this
 * leaves room for direct FCM later without a migration.
 *
 * Auth: Bearer JWT from Clerk (the user must be signed in for the device
 * row to belong to them). 401 → caller retries after a Clerk token refresh.
 * 429 → rate limited by the Worker; caller backs off.
 */
export async function registerDeviceWithWorker(
  token: string,
  jwt: string,
  opts: RegisterDeviceOptions = {},
): Promise<void> {
  const base =
    opts.apiBase ??
    process.env.EXPO_PUBLIC_FIGUREPINNER_API ??
    'https://figurepinner-api.bubs960.workers.dev';
  const platform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  const res = await fetch(`${base}/api/v1/devices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${jwt}`,
      'X-Client': 'figurepinner-mobile/0.1',
    },
    body: JSON.stringify({
      token,
      platform,
      app_version: opts.appVersion ?? APP_VERSION,
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`devices registration failed (${res.status})`);
  }
}
