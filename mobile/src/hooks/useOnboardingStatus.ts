import { useEffect, useState } from 'react';
import { readPreferences } from '@/onboarding/preferences';

export type OnboardingStatus =
  | { loading: true; completed: false }
  | { loading: false; completed: boolean };

/**
 * Loads onboarding completion state from AsyncStorage once at mount. Returns
 * { loading: true } until we know, so callers can show a spinner and avoid
 * flashing the figure screen before the Onboarding screen replaces it.
 */
export function useOnboardingStatus(): OnboardingStatus {
  const [status, setStatus] = useState<OnboardingStatus>({ loading: true, completed: false });

  useEffect(() => {
    let mounted = true;
    readPreferences()
      .then((prefs) => {
        if (!mounted) return;
        setStatus({ loading: false, completed: prefs.onboardingCompletedAt != null });
      })
      .catch(() => {
        if (!mounted) return;
        // If prefs can't be read, treat as completed rather than lock the user
        // out of the app behind a broken onboarding.
        setStatus({ loading: false, completed: true });
      });
    return () => {
      mounted = false;
    };
  }, []);

  return status;
}
