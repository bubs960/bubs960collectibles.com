/**
 * Web variant of NotificationsDriver. Browsers can do push via the
 * Web Push API + a service worker, but it's a different registration
 * flow than Expo's iOS/Android push tokens — the Worker would need
 * a separate `/devices/web` route accepting VAPID-signed subscriptions.
 *
 * Deferred to a follow-up: for now the desktop binary renders the
 * AlertsScreen UI (configure thresholds, see history) but doesn't
 * actually subscribe to push. Mobile clients continue to receive
 * alerts; desktop users see them on next page visit instead.
 */
export function NotificationsDriver(): null {
  return null;
}
