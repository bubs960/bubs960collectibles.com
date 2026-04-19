import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthToken } from '@/auth/useAuthToken';
import { withAuthRetry } from '@/auth/withAuthRetry';
import { registerForPushToken, registerDeviceWithWorker } from './setup';

/**
 * Headless driver — on sign-in, fetches the Expo push token and POSTs
 * it to the Worker. Only mounted when FEATURES.alerts is true (the
 * importer in App.tsx handles that gate).
 *
 * Re-fires only when userId changes so account switches re-register.
 * If permission is denied or token fetch fails, silently no-ops —
 * AlertsScreen's permission banner is the recovery path for user-
 * visible re-prompting.
 */
export function NotificationsDriver(): null {
  const { isSignedIn, userId } = useAuth();
  const getToken = useAuthToken();
  const lastRegisteredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      lastRegisteredFor.current = null;
      return;
    }
    if (userId === lastRegisteredFor.current) return;
    lastRegisteredFor.current = userId;

    // Fire-and-forget; the driver renders null regardless of outcome.
    // Failures in this chain are non-fatal (alerts are a nice-to-have,
    // not a blocker for the rest of the app).
    void (async () => {
      const pushToken = await registerForPushToken();
      if (!pushToken) return;
      try {
        await withAuthRetry(getToken, (jwt) =>
          registerDeviceWithWorker(pushToken, jwt),
        );
      } catch {
        // Swallow — next launch will retry via the userId-change effect.
      }
    })();
  }, [isSignedIn, userId, getToken]);

  return null;
}
