import type { EventName, EventProps } from './events';

type Sink = <N extends EventName>(name: N, props: EventProps[N]) => void;

// Dev sink: console.log so events are visible in Metro logs. Swap via
// `setAnalyticsSink(...)` at app boot when we add the real provider (Segment,
// PostHog, Amplitude, etc.).
let sink: Sink = (name, props) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', name, props);
  }
};

export function setAnalyticsSink(next: Sink): void {
  sink = next;
}

export function track<N extends EventName>(name: N, props: EventProps[N]): void {
  sink(name, props);
}
