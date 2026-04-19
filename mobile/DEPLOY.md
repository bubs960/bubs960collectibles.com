# Deployment checklist

Ordered roughly by dependency — each step assumes earlier ones are done.
Every item has a clear owner so we don't play hot-potato when something
breaks mid-launch.

## Pre-flight (zero-cost, do now)

- [ ] **Decide which `figure_id` mint pattern is canonical** for
      post-2026-04-19 writes. Three live patterns; until you write the
      choice down, every new feature that mints a `figure_id` rolls the
      dice. Owner: **backend lead**. See `src/shared/figureId.ts` for
      the full taxonomy.
- [ ] **Pro decision locked at option (b)** — no gate, Market Panel
      fully unlocked, tip-jar in Settings. Revisit as a real product at
      ~50K MAU. Owner: **you**. Already implemented.
- [ ] **Extension hotfix for `companion.js:307-309`** (wrap the raw
      eBay URL in `affiliateWrap`). Not a mobile blocker but active
      revenue leak every hour it ships. Owner: **extension team**.
- [ ] **Reserve bundle id `com.bubs960.figurepinner`** in App Store
      Connect + Google Play Console. If someone squatted it, that's a
      full rename. Owner: **you**. ~5 min if the name is free.

## Backend (blocks v2 flag-flip)

- [ ] **Clerk JWT template** named `mobile` exists in Clerk dashboard.
      If named differently, set `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` in
      the EAS v2-preview profile. Owner: **you**, ~5 min.
- [ ] **Clerk publishable key** captured into the v2-preview profile
      as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. Owner: **you**, ~2 min.
- [ ] **Worker authenticated routes shipped** and verified against a
      test account:
      - `GET/POST /api/v1/vault`
      - `DELETE /api/v1/vault/items/:id` (soft-delete, plural)
      - `GET/POST /api/v1/wantlist`
      - `DELETE /api/v1/wantlist/items/:id` (soft-delete, plural — the
        spec carries a typo with singular `/item/`; mobile normalized
        to plural on both, worker should too)
      - `POST /api/v1/devices` for Expo push-token registration
      Owner: **backend**. Not a weekend; APNs + FCM + DB migration +
      send pipeline.
- [ ] **Worker `/api/v1/figure/:id` sibling-lookup fallback** on 404.
      Addresses the KB↔DB vocabulary drift — see Stage-4 report for
      scale. Without this, silent 404s ship to prod. Owner: **backend**.
- [ ] **Worker public search returns `image` field** per
      `SERVER-ENDPOINTS-NEEDED.md` item 5. Not bundle-worthy with
      mobile — ship on next worker deploy. Owner: **backend**, ~1 line.
- [ ] **Soft-delete TTL job** scheduled to hard-delete rows with
      `status='removed'` older than ~90 days. Plan now, cheap; plan
      in 6 months, painful. Owner: **backend**.

## Universal Links (host before TestFlight)

- [ ] **`apple-app-site-association`** at
      `https://figurepinner.com/.well-known/apple-app-site-association`
      - `APP_TEAM_ID` filled
      - Paths narrowed to `/open/*` (NOT `/figure/*` — see README risks)
      - `Content-Type: application/json`, no redirect, HTTP 200
      - Verify: `curl -I https://figurepinner.com/.well-known/apple-app-site-association`
      - Test with a fresh install on a device that has never had the
        app (iOS caches AASA hard)
- [ ] **`assetlinks.json`** at
      `https://figurepinner.com/.well-known/assetlinks.json`
      - Both debug + release SHA-256 fingerprints in the array
      - `Content-Type: application/json`
      - Android is less forgiving of redirects than iOS — check
        Cloudflare's default `.well-known` behavior

## EAS Build / store registration

- [ ] **EAS Build profiles set up**:
      ```json
      {
        "build": {
          "v1-production": { "env": {} },
          "v2-preview": {
            "env": {
              "EXPO_PUBLIC_V2_COLLECTION_SYNC": "true",
              "EXPO_PUBLIC_V2_ALERTS": "true",
              "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_…"
            }
          }
        }
      }
      ```
- [ ] **Apple Developer account** active + team ID captured (24–48h
      for first-time approval).
- [ ] **Google Play Console** identity verified.
- [ ] **App Store Connect app record** created under the reserved
      bundle id.

## Store-readable assets (~1–2 days if screens are final)

- [ ] Icon (1024×1024 iOS + adaptive Android).
- [ ] Screenshots for all required device classes.
- [ ] Marketing copy (short + long description).
- [ ] Privacy manifest (iOS 17+ requirement; declare data usage).
- [ ] Age rating questionnaire answers.
- [ ] Category + keywords.

## Pre-flight QA (hardware required)

- [ ] Pinch-zoom + outer-scroll gesture conflict on iOS + Android
      (spec §14 — flagged risk).
- [ ] 60fps scroll on mid-tier device.
- [ ] VoiceOver / TalkBack full sweep.
- [ ] Deep-link `figurepinner://open/:id` arrival.
- [ ] Light-mode device — forced dark actually takes.
- [ ] Dynamic Type XXL — no truncation regressions in list rows.
- [ ] Onboarding → skip → FigureDetail with back gesture not
      returning to onboarding.
- [ ] Pull-to-refresh on cached figure (stale pill → fresh data).
- [ ] Offline view of previously-viewed figure.

## Post-TestFlight (attribution + analytics)

- [ ] **EPN dashboard `customid` segmentation verified**. Log in,
      confirm `customid=figurepinner-mobile` shows as a filterable
      column. CSV-only exposure is "attribution theater" — switch to
      a custom tracking parameter via EPN API if so.
- [ ] **Analytics provider wired** — `setAnalyticsSink(...)` at app
      boot, replace the dev console logger with the real provider
      (Amplitude / PostHog / Segment). Event registry is already typed
      in `src/analytics/events.ts`.

## Example: wire Sentry without touching feature code

Per the engineer's recommendation. Requires `@sentry/react-native` as a
new runtime dep (not yet added — pick a provider first, then add).

```tsx
// App.tsx, at the top of the module (before the React tree mounts)
import * as Sentry from '@sentry/react-native';
import { setAnalyticsSink } from '@/analytics/dispatch';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableInExpoDevelopment: false,
  debug: __DEV__,
});

// Wire our typed event registry into Sentry breadcrumbs. Crashes from
// ErrorBoundary already post through `app_error` → this captures the
// full breadcrumb trail automatically.
setAnalyticsSink((name, props) => {
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: name,
    data: props as Record<string, unknown>,
    level: name === 'app_error' ? 'error' : 'info',
  });
  if (name === 'app_error') {
    Sentry.captureMessage(
      (props as { message: string }).message,
      'error',
    );
  }
});
```

Alternative providers follow the same pattern:
- **PostHog** — call `posthog.capture(name, props)` in the sink.
- **Amplitude** — `amplitude.track(name, props)`.
- **Segment** — `analytics.track(name, props)`.

`src/analytics/dispatch.ts` is the only file that needs editing;
components / hooks don't know which provider is downstream.
