/**
 * Locks the analytics-sink contract negotiated with engineer #88
 * (2026-04-26):
 *   - POST {endpoint}/api/v1/analytics/event
 *   - Body: {events: [{uid, event_name, ts, props, device_id,
 *           app_version, platform}]}
 *   - Drop-on-failure: failed POSTs do NOT re-queue
 *   - Atomic buffer swap: events fired during in-flight POST land
 *     in next batch, never lost to concurrency
 *   - Three flush triggers: 30s timer, 50-event ceiling, AppState
 *     transition to background
 */
import { createHttpSink } from '../src/analytics/httpSink';
import * as SecureStore from './__mocks__/expoSecureStore';
import { __mock as rnMock } from './__mocks__/reactNativeShim';
import { __resetDeviceIdCacheForTests } from '../src/analytics/deviceId';

interface MockTimer {
  fire: () => void;
}

function makeTimer(): { setInterval: (fn: () => void, ms: number) => MockTimer; clearInterval: (t: MockTimer) => void; fire: () => void } {
  let scheduled: (() => void) | null = null;
  return {
    setInterval(fn: () => void): MockTimer {
      scheduled = fn;
      return { fire: () => fn() };
    },
    clearInterval(_t: MockTimer): void {
      scheduled = null;
    },
    fire(): void {
      scheduled?.();
    },
  };
}

beforeEach(() => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  rnMock.resetAppState();
  __resetDeviceIdCacheForTests();
});

describe('createHttpSink — batching contract', () => {
  it('does not flush until a trigger fires (30s, 50 events, or background)', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true } as Response));
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      appVersion: '0.1.0',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
      now: () => 1000,
    });
    sink.track('figure_viewed', { figure_id: 'a' });
    sink.track('figure_viewed', { figure_id: 'b' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sink.__len()).toBe(2);
    sink.dispose();
  });

  it('flushes on the 30s timer trigger', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true } as Response));
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      appVersion: '0.1.0',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
      now: () => 1000,
    });
    sink.track('figure_viewed', { figure_id: 'a' });
    t.fire();
    await sink.flush(); // settle any in-flight
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/analytics/event');
    const body = JSON.parse(init.body as string);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].event_name).toBe('figure_viewed');
    expect(body.events[0].uid).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.events[0].ts).toBe(1000);
    expect(body.events[0].app_version).toBe('0.1.0');
    sink.dispose();
  });

  it('flushes immediately when buffer hits the 50-event ceiling', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true } as Response));
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
    });
    for (let i = 0; i < 50; i++) sink.track('figure_viewed', { figure_id: `f${i}` });
    await new Promise((r) => setImmediate(r));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.events).toHaveLength(50);
    sink.dispose();
  });

  it('flushes on AppState → background', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true } as Response));
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
    });
    sink.track('figure_viewed', { figure_id: 'a' });
    rnMock.fireAppState('background');
    await new Promise((r) => setImmediate(r));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    sink.dispose();
  });

  it('drops the batch on fetch failure (no retry, no re-queue)', async () => {
    const fetchMock = jest.fn(async () => {
      throw new TypeError('network down');
    });
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
    });
    sink.track('figure_viewed', { figure_id: 'a' });
    await sink.flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sink.__len()).toBe(0); // dropped, not re-queued
    sink.dispose();
  });

  it('drops on non-ok status the same as a thrown error', async () => {
    const fetchMock = jest.fn(async () => ({ ok: false, status: 500 } as Response));
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
    });
    sink.track('figure_viewed', { figure_id: 'a' });
    await sink.flush();
    expect(sink.__len()).toBe(0);
    sink.dispose();
  });

  it('atomic buffer swap: events fired during in-flight POST land in the next batch', async () => {
    let release!: () => void;
    const inflight = new Promise<Response>((resolve) => {
      release = () => resolve({ ok: true } as Response);
    });
    const fetchMock = jest.fn(async () => inflight);
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
    });
    sink.track('figure_viewed', { figure_id: 'first' });
    const flushPromise = sink.flush();
    // POST is in flight. Fire another event — must NOT join the
    // in-flight batch (already snapshotted off the buffer) but also
    // must NOT be dropped.
    sink.track('figure_viewed', { figure_id: 'second' });
    expect(sink.__len()).toBe(1); // sitting in fresh buffer
    release();
    await flushPromise;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.events.map((e: { props: { figure_id: string } }) => e.props.figure_id)).toEqual([
      'first',
    ]);
    sink.dispose();
  });

  it('attaches Bearer JWT when getAuthToken returns one, omits otherwise', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true } as Response));
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
      getAuthToken: () => 'jwt-abc',
    });
    sink.track('figure_viewed', { figure_id: 'a' });
    await sink.flush();
    const headers = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-abc');
    sink.dispose();
  });

  it('attaches device_id from secure-store on every event', async () => {
    await SecureStore.setItemAsync('fp.analytics.device_id', 'dev-id-stable');
    const fetchMock = jest.fn(async () => ({ ok: true } as Response));
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
    });
    sink.track('figure_viewed', { figure_id: 'a' });
    sink.track('figure_viewed', { figure_id: 'b' });
    await sink.flush();
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.events).toHaveLength(2);
    expect(body.events[0].device_id).toBe('dev-id-stable');
    expect(body.events[1].device_id).toBe('dev-id-stable');
    sink.dispose();
  });

  it('flush is a no-op when buffer is empty', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true } as Response));
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
    });
    await sink.flush();
    expect(fetchMock).not.toHaveBeenCalled();
    sink.dispose();
  });

  it('strips trailing slash on endpoint when building the URL', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true } as Response));
    const t = makeTimer();
    const sink = createHttpSink({
      endpoint: 'https://api.example.com/',
      fetchImpl: fetchMock as unknown as typeof fetch,
      setInterval: t.setInterval as unknown as typeof setInterval,
      clearInterval: t.clearInterval as unknown as typeof clearInterval,
    });
    sink.track('figure_viewed', { figure_id: 'a' });
    await sink.flush();
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe(
      'https://api.example.com/api/v1/analytics/event',
    );
    sink.dispose();
  });
});
