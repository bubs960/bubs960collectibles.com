import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notifications bootstrap.
 *
 * Price-drop alerts are a Pro-tier feature per the design spec. This module
 * sets up the permission + token flow so the UI surface is ready whenever the
 * Worker starts accepting per-device registrations. Today we:
 *   1. Configure the in-app notification handler (foreground display).
 *   2. Expose ensurePermission() to request authorisation when the user
 *      enables alerts.
 *   3. Expose registerForPushToken() to fetch an Expo push token, persist
 *      it, and hand it to a server-registration callback that's currently
 *      a stub.
 *
 * The server registration endpoint (POST /api/v1/devices) doesn't exist yet;
 * tokens are captured and cached until it does.
 */

const TOKEN_KEY = 'fp:v1:push_token';

// Always called at module load — safe; the handler is only invoked when a
// notification arrives.
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

  // Android requires an explicit channel for display.
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
