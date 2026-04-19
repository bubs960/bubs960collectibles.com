/**
 * Locks the POST /api/v1/devices body shape decided on 2026-04-19:
 * field is `token` (platform-agnostic), NOT `expo_push_token`. That
 * leaves room for direct FCM later without a D1 schema migration.
 */
import { registerDeviceWithWorker } from '../src/notifications/setup';

const WORKER = 'https://figurepinner-api.bubs960.workers.dev';
const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});

describe('registerDeviceWithWorker', () => {
  it('POSTs { token, platform, app_version } — NOT { expo_push_token, ... }', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await registerDeviceWithWorker('ExpoPush-abc', 'jwt-tok');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${WORKER}/api/v1/devices`);
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body as string);
    expect(body).toHaveProperty('token', 'ExpoPush-abc');
    expect(body).toHaveProperty('platform');
    expect(body).toHaveProperty('app_version');
    // Engineer correction — NOT the expo_push_token field name.
    expect(body).not.toHaveProperty('expo_push_token');
  });

  it('sends the Clerk JWT as a Bearer token', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    await registerDeviceWithWorker('tok', 'the-jwt');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer the-jwt');
  });

  it('throws when the server rejects (caller handles 401 → refresh-and-retry)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(registerDeviceWithWorker('tok', 'bad')).rejects.toThrow(
      /devices registration failed \(401\)/,
    );
  });

  it('allows overriding apiBase for staging / dev builds', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    await registerDeviceWithWorker('tok', 'jwt', {
      apiBase: 'https://staging-api.example.com',
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://staging-api.example.com/api/v1/devices');
  });

  it('falls back to EXPO_PUBLIC_FIGUREPINNER_API env', async () => {
    process.env.EXPO_PUBLIC_FIGUREPINNER_API = 'https://env-api.example.com';
    fetchMock.mockResolvedValueOnce({ ok: true });
    await registerDeviceWithWorker('tok', 'jwt');
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://env-api.example.com/api/v1/devices');
    delete process.env.EXPO_PUBLIC_FIGUREPINNER_API;
  });
});
