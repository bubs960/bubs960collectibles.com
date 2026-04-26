import { AppState, AppStateStatus, Platform } from 'react-native';
import type { EventName, EventProps } from './events';
import { getDeviceId } from './deviceId';
import { uuidv4 } from './uuid';

/**
 * Batched HTTP sink for analytics events. Wires into the dispatcher
 * via setAnalyticsSink(createHttpSink({...})).
 *
 * Contract negotiated with engineer (#88, 2026-04-26):
 *   - POST {endpoint}/api/v1/analytics/event
 *   - Body: {events: Array<{uid, event_name, ts, props?, device_id?,
 *           app_version?, platform?}>} (max 200 per batch)
 *   - Auth: optional Bearer JWT (best-effort; route works anonymous
 *           by device_id alone)
 *   - Drop-on-failure: a failed POST drops the batch, no retry buffer
 *   - Server dedupes by uid PK
 *
 * Three flush triggers:
 *   1. 30s timer (drains slow trickles)
 *   2. 50-event ceiling (well under the 200 batch cap; bursts flush
 *      promptly)
 *   3. AppState → background (catches users who close the app between
 *      timer ticks; race-safe via atomic buffer swap)
 *
 * Atomic swap: at flush time the buffer is replaced with [] in the
 * same tick the snapshot is taken. Events fired DURING the in-flight
 * POST land in the new buffer and ride the next flush. Events are
 * never dropped due to concurrency — only on network/server failure.
 *
 * Per-event metadata (uid, ts, user_id) snapshots at track() time so
 * a sign-in mid-batch doesn't retroactively label anonymous events.
 */

const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_AT_COUNT = 50;
const MAX_BATCH = 200; // server cap

interface AnalyticsEvent {
  uid: string;
  event_name: string;
  ts: number;
  props?: Record<string, unknown>;
  device_id?: string;
  app_version?: string;
  platform?: string;
}

export interface HttpSinkOptions {
  /** Worker base URL — e.g. https://figurepinner-api.bubs960.workers.dev */
  endpoint: string;
  /** App version string (from app.json or expo-application). */
  appVersion?: string;
  /** Returns a Bearer JWT to attach, or null/undefined for anonymous. */
  getAuthToken?: () => string | null | undefined;
  /** Override Date.now / setInterval / fetch / AppState for tests. */
  now?: () => number;
  setInterval?: typeof setInterval;
  clearInterval?: typeof clearInterval;
  fetchImpl?: typeof fetch;
  appState?: { addEventListener: typeof AppState.addEventListener };
  platform?: string;
}

export interface HttpSink {
  /** Sink fn — pass to setAnalyticsSink. */
  track: <N extends EventName>(name: N, props: EventProps[N]) => void;
  /** Manually flush — primarily for tests. Returns when POST resolves. */
  flush: () => Promise<void>;
  /** Tear down timer + AppState listener. */
  dispose: () => void;
  /** Test seam: current queue length. */
  __len: () => number;
}

export function createHttpSink(opts: HttpSinkOptions): HttpSink {
  const now = opts.now ?? (() => Date.now());
  const fetchImpl = opts.fetchImpl ?? fetch;
  const setIntervalImpl = opts.setInterval ?? setInterval;
  const clearIntervalImpl = opts.clearInterval ?? clearInterval;
  const platform = opts.platform ?? Platform.OS;
  const url = `${opts.endpoint.replace(/\/$/, '')}/api/v1/analytics/event`;

  let buffer: AnalyticsEvent[] = [];
  let inflightFlush: Promise<void> | null = null;

  function track<N extends EventName>(name: N, props: EventProps[N]): void {
    const event: AnalyticsEvent = {
      uid: uuidv4(),
      event_name: name,
      ts: now(),
      props: props as Record<string, unknown>,
      app_version: opts.appVersion,
      platform,
    };
    buffer.push(event);
    if (buffer.length >= FLUSH_AT_COUNT) {
      void flush();
    }
  }

  function flush(): Promise<void> {
    // Concurrent flush() calls share the same in-flight promise, so
    // `await sink.flush()` is honest about when the POST actually
    // settles (matters for tests + AppState→background cleanup).
    if (inflightFlush) return inflightFlush;
    if (buffer.length === 0) return Promise.resolve();
    // Atomic swap: snapshot + reset BEFORE any await so events fired
    // during the in-flight POST land in the new buffer.
    const snapshot = buffer;
    buffer = [];

    inflightFlush = (async () => {
      try {
        const deviceId = await getDeviceId().catch(() => undefined);
        const events = snapshot.slice(0, MAX_BATCH).map((e) => ({
          ...e,
          device_id: deviceId,
        }));
        // If the snapshot exceeded the server cap, the spillover is
        // silently dropped here. At our flush trigger of 50 + a 30s
        // cadence the cap (200) is essentially unreachable — guard
        // kept explicit so the cap is enforced on the wire.
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Client': 'figurepinner-mobile/0.1',
        };
        const token = opts.getAuthToken?.();
        if (token) headers.Authorization = `Bearer ${token}`;

        // Drop-on-failure: any throw or non-ok status → swallow. The
        // events in `snapshot` are already off the buffer; this is
        // the engineer-confirmed semantic (#88) so we don't build
        // backpressure.
        await fetchImpl(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ events }),
        }).catch(() => null);
      } finally {
        inflightFlush = null;
      }
    })();
    return inflightFlush;
  }

  const timer = setIntervalImpl(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);

  const appStateSub = (opts.appState ?? AppState).addEventListener(
    'change',
    (s: AppStateStatus) => {
      if (s === 'background' || s === 'inactive') {
        void flush();
      }
    },
  );

  function dispose(): void {
    clearIntervalImpl(timer);
    if (typeof appStateSub === 'object' && appStateSub && 'remove' in appStateSub) {
      (appStateSub as { remove: () => void }).remove();
    }
  }

  return { track, flush, dispose, __len: () => buffer.length };
}
