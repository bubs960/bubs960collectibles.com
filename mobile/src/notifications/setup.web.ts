// Web variant of notifications setup. expo-notifications + expo-device
// have no browser API surface, so this module exposes the same names
// as the native variant but routes them to no-ops or web-push stubs.
//
// Web Push integration (VAPID-signed subscription handed to a separate
// Worker route) is a v3 follow-up — see CHANGELOG Phase 13. For week-1
// the desktop binary renders the alerts UI but does not subscribe.

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getPermissionStatus(): Promise<PermissionStatus> {
  if (typeof Notification === 'undefined') return 'undetermined';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'undetermined';
}

export async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission().catch(() => 'denied');
  return result === 'granted';
}

/**
 * No-op on web — we don't have an Expo push token equivalent. Returns
 * null so the NotificationsDriver early-bails and AlertsScreen renders
 * "subscribed on this device" as false until web push lands.
 */
export async function registerForPushToken(
  _onToken?: (token: string) => void | Promise<void>,
): Promise<string | null> {
  return null;
}

export async function getCachedPushToken(): Promise<string | null> {
  return null;
}

/**
 * Kept for API parity. Native callers POST a push token here; on web
 * we never have one, so this is unreachable in normal flow. If a web
 * caller somehow invokes it, no-op rather than throw — same drop-on-
 * failure ethos as analytics.
 */
export async function registerDeviceWithWorker(): Promise<void> {
  // intentional no-op
}
