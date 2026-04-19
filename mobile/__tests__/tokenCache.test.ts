import * as SecureStore from './__mocks__/expoSecureStore';
import { tokenCache } from '../src/auth/tokenCache';

beforeEach(() => {
  SecureStore.__reset();
});

describe('tokenCache', () => {
  it('saveToken persists and getToken reads back the same value', async () => {
    await tokenCache.saveToken('clerk-session', 'jwt-abc');
    await expect(tokenCache.getToken('clerk-session')).resolves.toBe('jwt-abc');
  });

  it('getToken returns null on a missing key', async () => {
    await expect(tokenCache.getToken('never-set')).resolves.toBeNull();
  });

  it('getToken swallows read errors (returns null) — losing the token just forces re-sign-in', async () => {
    const spy = jest
      .spyOn(SecureStore, 'getItemAsync')
      .mockRejectedValueOnce(new Error('keychain locked'));
    await expect(tokenCache.getToken('k')).resolves.toBeNull();
    spy.mockRestore();
  });

  it('saveToken swallows write errors (no throw) — Clerk will re-persist next refresh', async () => {
    const spy = jest
      .spyOn(SecureStore, 'setItemAsync')
      .mockRejectedValueOnce(new Error('disk full'));
    await expect(tokenCache.saveToken('k', 'v')).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it('round-trip survives multiple keys without cross-talk', async () => {
    await tokenCache.saveToken('a', '1');
    await tokenCache.saveToken('b', '2');
    await expect(tokenCache.getToken('a')).resolves.toBe('1');
    await expect(tokenCache.getToken('b')).resolves.toBe('2');
  });
});
