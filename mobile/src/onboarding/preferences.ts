import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistent user preferences set during / after onboarding. Intentionally
 * kept minimal — the less state we gate the app behind on first launch, the
 * fewer ways onboarding can break when we iterate on it.
 */
export interface Preferences {
  onboardingCompletedAt: number | null;
  /** Optional genre preference to bias discovery (e.g. 'wrestling', 'marvel'). */
  homeGenre: string | null;
}

const KEY = 'fp:v1:preferences';

const DEFAULTS: Preferences = {
  onboardingCompletedAt: null,
  homeGenre: null,
};

export async function readPreferences(): Promise<Preferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export async function writePreferences(next: Partial<Preferences>): Promise<Preferences> {
  const current = await readPreferences();
  const merged: Preferences = { ...current, ...next };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    // Non-fatal.
  }
  return merged;
}

export async function markOnboardingComplete(homeGenre: string | null = null): Promise<void> {
  await writePreferences({
    onboardingCompletedAt: Date.now(),
    homeGenre,
  });
}

/** Dev-only: resets onboarding so the flow can be re-verified. */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
