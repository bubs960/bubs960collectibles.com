/**
 * Flags are captured at module load from process.env. Tests reload the
 * module fresh per assertion with jest.isolateModules so they can vary
 * process.env without affecting each other.
 */
describe('FEATURES', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    // Rebuild process.env from the captured original so test ordering
    // doesn't leak state.
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    for (const [k, v] of Object.entries(origEnv)) {
      process.env[k] = v as string;
    }
    jest.resetModules();
  });

  it('defaults to all flags false (v1 read-only browser)', () => {
    delete process.env.EXPO_PUBLIC_V2_COLLECTION_SYNC;
    delete process.env.EXPO_PUBLIC_V2_ALERTS;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FEATURES } = require('../src/config/features');
      expect(FEATURES.collectionSync).toBe(false);
      expect(FEATURES.alerts).toBe(false);
    });
  });

  it('enables collectionSync when EXPO_PUBLIC_V2_COLLECTION_SYNC=true', () => {
    process.env.EXPO_PUBLIC_V2_COLLECTION_SYNC = 'true';
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FEATURES } = require('../src/config/features');
      expect(FEATURES.collectionSync).toBe(true);
    });
  });

  it('only accepts the exact string "true" — any other value stays off', () => {
    for (const val of ['1', 'TRUE', 'yes', 'on', '', 'false']) {
      process.env.EXPO_PUBLIC_V2_COLLECTION_SYNC = val;
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { FEATURES } = require('../src/config/features');
        expect(FEATURES.collectionSync).toBe(false);
      });
    }
  });

  it('flips alerts independently of collectionSync', () => {
    process.env.EXPO_PUBLIC_V2_COLLECTION_SYNC = 'false';
    process.env.EXPO_PUBLIC_V2_ALERTS = 'true';
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FEATURES } = require('../src/config/features');
      expect(FEATURES.collectionSync).toBe(false);
      expect(FEATURES.alerts).toBe(true);
    });
  });
});
