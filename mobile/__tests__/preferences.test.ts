import AsyncStorage from './__mocks__/asyncStorage';
import {
  readPreferences,
  writePreferences,
  markOnboardingComplete,
  resetOnboarding,
} from '../src/onboarding/preferences';

const store = AsyncStorage as { __reset: () => void; __dump: () => Record<string, string> };

beforeEach(() => {
  store.__reset();
});

describe('preferences', () => {
  it('returns defaults on fresh install', async () => {
    await expect(readPreferences()).resolves.toEqual({
      onboardingCompletedAt: null,
      homeGenre: null,
    });
  });

  it('readPreferences tolerates corrupt storage', async () => {
    await AsyncStorage.setItem('fp:v1:preferences', 'not json');
    await expect(readPreferences()).resolves.toEqual({
      onboardingCompletedAt: null,
      homeGenre: null,
    });
  });

  it('writePreferences merges onto existing values and persists under the namespaced key', async () => {
    await writePreferences({ homeGenre: 'wrestling' });
    const prefs = await readPreferences();
    expect(prefs.homeGenre).toBe('wrestling');
    expect(prefs.onboardingCompletedAt).toBeNull();

    const dumped = store.__dump();
    expect(dumped['fp:v1:preferences']).toBeDefined();
    expect(JSON.parse(dumped['fp:v1:preferences']).homeGenre).toBe('wrestling');
  });

  it('writePreferences preserves fields not touched in the update', async () => {
    await writePreferences({ homeGenre: 'wrestling' });
    await writePreferences({ onboardingCompletedAt: 12345 });
    const prefs = await readPreferences();
    expect(prefs).toEqual({ onboardingCompletedAt: 12345, homeGenre: 'wrestling' });
  });

  it('markOnboardingComplete stamps a timestamp and clears it with resetOnboarding', async () => {
    const before = Date.now();
    await markOnboardingComplete('marvel');
    const after = Date.now();

    const prefs = await readPreferences();
    expect(prefs.homeGenre).toBe('marvel');
    expect(prefs.onboardingCompletedAt).toBeGreaterThanOrEqual(before);
    expect(prefs.onboardingCompletedAt).toBeLessThanOrEqual(after);

    await resetOnboarding();
    await expect(readPreferences()).resolves.toEqual({
      onboardingCompletedAt: null,
      homeGenre: null,
    });
  });

  it('markOnboardingComplete defaults homeGenre to null when not passed', async () => {
    await markOnboardingComplete();
    const prefs = await readPreferences();
    expect(prefs.homeGenre).toBeNull();
    expect(prefs.onboardingCompletedAt).not.toBeNull();
  });
});
