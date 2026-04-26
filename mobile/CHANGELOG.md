# Changelog

All notable changes on `claude/figure-pinner-mobile-app-rpGZU` since it
diverged from `main`. Grouped by phase, newest phase first.

Format is loosely based on Keep a Changelog. Each bullet ends with the
commit SHA of the change that introduced it, so reviewers can jump to a
diff without guessing.

---

## Phase 10 — Worker P0s LIVE: alias-aware /figure/:id + search projection (current)

Engineer's 2026-04-25 "update big" confirmed both backend P0s are live in
production. Mobile is now realigned to the actual contract.

### Worker contract changes absorbed
- **Match quality literal is `'direct'`, not `'exact'`.** Earlier mobile
  copies guessed at `'exact'`; the worker has shipped with `'direct'`
  since the alias patch deployed. This is a string-only rename in
  responses, but the type system propagates it through every analytics
  payload, fixture, and test.
- **`/figure/:id` returns one of three discriminated shapes:**
  - `direct` → canonical hit; full figure record.
  - `moved` → alias resolved; carries `original_figure_id`,
    `alias_source`, `alias_confidence` so analytics can describe HOW
    the request was matched.
  - `not_found_but_logged` → ONLY `{ match_quality, original_figure_id,
    figure_id: null, canonical_image_url: null }`; no name / brand /
    line / etc. The miss must be branched BEFORE any code reads
    `figure.*`.
- **`/api/v1/search` returns `figure_id` + `image` in the public
  projection.** No mobile code change needed (search already routed
  through the Worker's projection); the `buildFigureId` synthesizer is
  retained as a defensive fallback only.

### Changed
- **`src/shared/types.ts`** — `ApiFigureV1` split into a discriminated
  union (`ApiFigureHit | ApiFigureMiss`) under the umbrella
  `ApiFigureResponse`. `FigureDetail` likewise becomes
  `FigureDetailHit | FigureDetailMiss`. `isFigureMiss` and
  `isFigureDetailMiss` type guards added. `ApiFigureV1` is kept as a
  backward-compat alias for `ApiFigureHit` so consumer call sites
  (Hero, DetailsCard, CollectionBar, share, useCollection, localStore,
  collectionApi) keep type-checking unchanged — those surfaces only
  ever receive the hit variant after the screen narrows.
- **`src/api/figureApi.ts`**
  - `fetchFigure` now returns `ApiFigureResponse` (the union).
  - `fetchFigureDetail` branches: a miss returns
    `FigureDetailMiss` and SKIPS the price call entirely (no canonical
    id to key by); a hit keys the price call off the canonical id the
    worker resolved to (correct for `'moved'` — the requested id may
    have been an alias).
- **`src/screens/FigureDetailScreen.tsx`** — early returns on
  `isFigureDetailMiss(data)` to render a Search-only nav + the miss
  banner, NEVER reaching code that reads `figure.*` / `price.*`. The
  `figure_id_resolved` analytics event now also carries
  `alias_source` / `alias_confidence` on `'moved'` / `'cluster'`, and
  fires with `canonical_id: null` on a miss. Route-param swap is
  skipped on a miss (no canonical to swap to).
- **`src/components/figure/FigureMissBanner.tsx`** — accepts
  `originalFigureId` prop and renders it as a copyable "Reference:"
  line so support tickets can quote the exact id we logged. VoiceOver
  reads it as part of the alert.
- **`src/analytics/events.ts`** — `figure_id_resolved`'s
  `canonical_id` is now `string | null`; new optional
  `alias_source` / `alias_confidence` fields.
- **`src/api/collectionApi.ts`** — `match_quality_at_insert` literal
  union renamed `'exact'` → `'direct'`.

### Test fixture rotation
- **The-Miz alias pair** replaces the obsolete Ultimate Warrior pair.
  Engineer flagged the original pair direction was reversed AND that
  the pair is no longer a valid canary post Tier-5 ship. The new
  fixture (`__tests__/fixtures/aliasPairs.ts`) exposes two scenarios:
  `THE_MIZ_DIRECT_FIXTURE` (canonical → `'direct'`) and
  `THE_MIZ_ALIAS_FIXTURE` (`miz` alias → `the-miz` canonical, expected
  `'moved'`, `alias_source: 'figure_id_alias'`).
  `__tests__/aliasPair.test.ts` rewritten to lock both.
- **`figureApi.test.ts`** — added explicit `direct`, `moved` (price
  keyed off canonical), and `miss` (skips the price call) cases.
- **`FigureDetailScreen.matchQuality.test.tsx`** rewritten: every
  `'exact'` → `'direct'`; `'moved'` case asserts the new alias_source +
  alias_confidence payload; `'not_found_but_logged'` case asserts
  `canonical_id: null`.
- **`renderLoreBand.test.ts`** + **`useFigureDetail.test.ts`** updated
  to construct `FigureDetailHit` (with `match_quality: 'direct'`)
  rather than the old flat shape.

### Sandbox suite
- **32 / 32 suites green, 227 / 227 tests passing** post-rewrite (up
  from 221 — 6 new assertions covering the moved-keyed-by-canonical
  pricing path and the miss-skips-price-call branch).

---

## Phase 9 — Handoff update post-engineer-standdown

Engineer's 2026-04-19 standdown note brought four decisions. Mobile-side
actions below; most were no-ops.

### Decisions absorbed
- **Dev worker + dev D1 → GO.** `.env.example` now shows
  `figurepinner-api-dev.bubs960.workers.dev` as the v2-preview target
  URL; v1-production profile keeps the live Worker. No source change.
- **price_snapshots rip-out** — no mobile-side change. Response shape
  on `/api/v1/price-history` unchanged.
- **JWT template stays "no template"** — matches what I already shipped
  in Phase 8. `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` escape hatch retained.
- **Extension EPN fix deferred** — real leak is NOT in
  `companion.js` shipped as v11.2.0; lives in ui-deals / ui-priceboard
  / affiliate-engine. Engineer flagged the "activeListingsUrl" pattern
  for mobile's attention IF mobile ever ships a companion view.

### Added
- **eBay URL invariant regression guard** (`__tests__/ebayUrlInvariant.test.ts`).
  Walks `src/` looking for `ebay.com` strings; allowlists only
  `api/figureApi.ts`. Second case sanity-checks the builder still has
  `mkrid=711-53200-19255-0` + `customid=...figurepinner-mobile`. If a
  future surface (companion view, alerts banner) writes a raw eBay URL
  the test catches the leak before it ships.
- **Ultimate Warrior alias fixture** (`__tests__/fixtures/aliasPairs.ts`).
  Canonical Mint A id + DB sibling id documented for the backend's
  alias-patch smoke test. `aliasPair.test.ts` locks the fixture shape
  (both ids match `fp_..._<hash6>`, they differ, expected
  match_quality is `'moved'`). Drop-in device smoke test instructions
  live in the fixture header.

### Documentation
- `figureApi.ts` gained an INVARIANT block above `buildEbayUrl` stating
  it's the only place in `src/` that writes an `ebay.com/sch` URL, with
  the callsite list that routes through it. New contributors can't miss
  it on reading the file.

### Not done (deliberate)
- **Compound-character-name tokenizer** — downstream of API, no mobile
  change. Queued post-#55 dict rebuild per engineer note.
- **Mobile companion view** — not in v1 or v2 scope. Engineer's
  "activeListingsUrl pattern to watch for" is noted in the buildEbayUrl
  header so it's impossible to miss IF the view ever ships.

Suite: 32 logic suites / 221 tests / green.

---

## Phase 8 — Engineer punch-list update

Steve brought updated answers on 2026-04-19. Working the resolved
items; unblocked items below.

### Changed
- **No JWT template for v1.** Per engineer: the default session token
  claims (sub, sid, iss, iat, exp) are enough for v1 auth — the
  Worker's JWKS middleware verifies those directly. Previously
  `useAuthToken` defaulted to `{ template: 'mobile' }`; now it calls
  `getToken()` bare unless `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` is
  explicitly set. One-line escape hatch for future custom-claim
  features.
- **Store category locked at Reference** (NOT Shopping — Shopping
  implies in-app checkout). Keywords locked at "collectible, action
  figure, price check, eBay, WWE, Marvel Legends, grail".
- **Store-asset timeline revised** from "1–2 days if screens final"
  to "plan a week" per engineer's wall-clock reality check on App
  Store rejection cycles.
- **Sentry deferred to post-launch** per engineer. Keeps the dev
  console sink; wiring block preserved in `DEPLOY.md` for the
  ~½ day drop-in later.

### Added
- **401 refresh-and-retry** per engineer Q4. New
  `src/auth/withAuthRetry.ts` wraps any authed operation: on
  `CollectionApiError(401)` it force-refreshes the Clerk token via
  `getToken({ forceRefresh: true })` and retries once. Second failure
  surfaces to `error`. Non-401 errors propagate without retry.
- **useAuthToken force-refresh support**. Accepts
  `{ forceRefresh?: boolean }` → passes `skipCache: true` to Clerk.
- **withAuthRetry test suite (7 cases)**: happy path, not-signed-in
  shortcut, one 401 → refreshed success, two 401s → surface original,
  non-401 CollectionApiError no-retry, non-CollectionApiError
  (network) no-retry, null-refresh-token no-retry.
- **`.env.example` now has the confirmed dev Clerk values** inline:
  `pk_test_Zml0dGluZy1wZW5ndWluLTcwLmNsZXJrLmFjY291bnRzLmRldiQ` +
  Frontend API `fitting-penguin-70.clerk.accounts.dev`. Prod `pk_live_*`
  swap-in noted.
- **`TESTING.md`** — explains the two-tier split (logic sandbox vs.
  jest-expo component tests), mock conventions, mount-safety pattern,
  flaky-test triage, "how to add a new hook test" template.

### Tests
- `useAuthToken.test.ts` gained a case that explicitly asserts
  `getToken()` is called with NO template argument in v1 default
  (via the `__getTokenCalls` mock helper) — regression guard against
  an accidental template re-introduction.
- `useCollection` now uses `withAuthRetry` internally; existing
  useCollection tests still pass (the retry wrapper is transparent
  when mocks return 2xx).

Suite: 30 logic suites / 215 tests / green.

---

## Phase 7 — Engineer contract alignment

Engineer answered the open questions on 2026-04-19. This phase wires the
mobile client against the decided contracts.

### Added
- **`match_quality` response handling.** `ApiFigureV1.match_quality` is
  now a typed optional field (`exact | moved | cluster |
  not_found_but_logged`) matching the Worker's alias-layer contract per
  `docs/v3/FIGURE-ID-MINT-CANONICAL-DECISION-2026-04-19.md §5`. On non-
  exact resolution, mobile emits the new `figure_id_resolved` analytics
  event (drift observability) and swaps the route param to the canonical
  id so back-gesture-then-relink doesn't re-resolve a stale id.
- **`FigureMissBanner`** — renders when `match_quality='not_found_but_logged'`
  to tell the user the miss was captured. Factual placeholder without a
  request-to-add button (v3 mobile scope per Q9); the data pipe already
  exists via the miss log.
- **v1 "Coming soon" CTAs** — Vault + Wantlist appear in the CTA list
  with `Coming soon` copy per engineer Q3 ("train the mental model
  early"). Tap is a no-op. When `FEATURES.collectionSync=true` flips in
  v2, real linked CTAs replace the placeholders.
- **`registerDeviceWithWorker`** — POST /api/v1/devices body uses
  `{ token, platform, app_version }`, NOT `{ expo_push_token, platform }`.
  Platform-agnostic column name per engineer Q4.7 — leaves room for direct
  FCM later without a D1 migration.
- **Server item metadata** — `ServerCollectionItem.removed_at?` (TTL
  cleanup pivot) and `match_quality_at_insert?` (drift badge later)
  added to the type per engineer Q7 + optional addition.

### Tests
- `registerDeviceWithWorker.test.ts`: locks the body shape contract,
  Bearer-JWT header, 401 bubble-up, env + apiBase overrides.
- `FigureMissBanner.test.tsx`: copy + alert role lock.
- Updated `FigureDetailScreen.test.tsx` v1 CTA assertions to expect
  the Coming-soon placeholders.

---

## Phase 6 — Reviewer corrections

### Changed
- **`figure_id` drift reframed** — `src/shared/figureId.ts` header
  documents the three mint patterns (v2 canonical with hash6, v1
  matcher pipe-separated, legacy fp_) and makes the real fix explicit:
  the worker must normalize on `/api/v1/figure/:id` 404 with sibling
  lookup. Pasting `buildFigureId` into mobile is NOT the fix; mobile
  carries best-effort synthesis with a soft-recovery UX instead.
- **DELETE path inconsistency normalized** — mobile now hits
  `/api/v1/wantlist/items/:id` (plural) instead of `/item/:id`
  (singular). The spec carries an inherited typo; encoding it into
  code taxes every future dev. Worker should normalize to plural
  when the endpoints ship.

### Added
- **404 soft-recovery UX** — `FigureDetailError` on 404 now shows a
  `"Search for this figure"` CTA instead of `Try again` (retrying the
  same bad id is pointless). Copy changed to "We might know this
  figure by another name… may exist under a sibling id" to match the
  actual failure mode.
- **Tip-jar in Settings** — `Support FigurePinner` link under a new
  Support section. Per reviewer: tip-jar over Pro-waitlist theater
  until Pro has a price / feature set / payment pipe. Revisit Pro
  as a real product at ~50K MAU.
- **Soft-delete TTL note** — `src/collection/reconcile.ts` header
  flags that `status='removed'` rows grow unbounded; plan a 90-day
  TTL cleanup job on the worker before the numbers matter.

### Removed from blockers
- `companion.js:307-309` affiliate leak — correctly re-scoped to
  the extension repo. It's a v1 extension hotfix, not a mobile
  blocker. Conflated with mobile work earlier.

---

## Phase 5 — Test hardening

### Added
- Logic tests: `useCollectionList`, `useSearchHistory` (hook), `useAuthToken`,
  `analytics/dispatch`, `navigation/linking` (3ded21f)
- Component tests: `CollectionPanel`, `SeriesContext`, `CharacterThread`,
  `FigureDetailSkeleton`, `settings/primitives` (3ded21f)
- `useCollectionSync` tests covering sign-in auto-sync, reconciliation,
  soft-delete filter, account switch, Bearer-token propagation (bf25148)
- `tokenCache` tests + `expo-secure-store` mock; `__DEV__` ambient type
  declaration so analytics can be compiled outside jest-expo (bf25148, 3ded21f)
- Skeleton shimmer hero on first fetch with reduce-motion fallback (bf25148)
- `useCollectionList` + `useSearchHistory` + `useAuthToken` + analytics
  dispatch + linking shape tests (3ded21f)
- `FigureDetailError` with 4 message variants (404, 5xx, offline,
  unknown) + Try-again button wired to SWR `refetch` (1c2e0b4)
- 5 more component suites: ErrorBoundary, Settings, Search, Vault,
  Wantlist, Alerts (7843b60)
- Integration test for FigureDetailScreen with mocked `useFigureDetail`
  covering 9 render states (315738d)
- `CollectionSyncDriver` + `SignInScreen` tests (4ba1f16)
- Clerk + expo-secure-store + expo-notifications + expo-device +
  expo-linking + react-navigation test mocks (bf25148, cb1be0a, 3ded21f)
- Search history: `src/search/history.ts` + `useSearchHistory` hook,
  recent-searches UI on empty query, record-on-result-tap, per-row
  remove + clear-all (cb1be0a)
- `useReduceMotion` component test (cb1be0a)
- Notifications permission + token-registration tests with Device
  simulator gate (cb1be0a)

### Fixed
- **`localStore` load race** — writes now await `load()` so `addOwned`
  can't be clobbered by a late-arriving disk read (6b39112)
- **`useSearch` unmount leak** — cleanup aborts in-flight fetch, mounted
  ref guards all `setState` from the response chain (6b39112)
- **`useCollection` + `useCollectionSync` unmount leaks** — same
  mount-safe pattern; round-trips that outlast navigation can't fire
  `setState` on dead components (bf25148)
- `tokenCache` interface moved inline so Clerk mocks don't need to stub
  `@clerk/clerk-expo/dist/cache` subpath (6b39112)

---

## Phase 4 — v2 re-enable behind flags

### Added
- `src/config/features.ts` — build-time flag registry read from
  `EXPO_PUBLIC_V2_COLLECTION_SYNC` and `EXPO_PUBLIC_V2_ALERTS`. Defaults
  false; strict `"true"` match so typos don't silently enable (add5df7)
- `src/auth/AuthProvider.tsx` — conditionally wraps tree in
  `ClerkProvider` only when `collectionSync=true`; no-op passthrough
  otherwise (add5df7)
- `src/auth/CollectionSyncDriver.tsx` — headless component that invokes
  `useCollectionSync` (only mounted under ClerkProvider) (add5df7)
- `src/components/figure/CollectionBar.tsx` — Own/Want pills with
  haptics + auth-modal gating + analytics. Slotted into
  `StickyActionBar` via `collectionSlot` prop so the bar itself never
  touches Clerk (add5df7)
- `src/screens/settings/AccountSection.tsx` — sign-in / sign-out /
  delete-account (Apple delete-parity) (cb75147, add5df7)
- v2 CTAs on FigureDetailScreen gated behind flags: Vault + Wantlist
  when `collectionSync`, Alerts when `alerts` (add5df7)
- EAS build profile example in README showing how to ship v1 and v2
  off the same branch (add5df7)
- `features.ts` test suite with defaults, strict `"true"` parsing, flag
  independence (add5df7)

---

## Phase 3 — Reviewer reality-check

### Changed
- **Mobile v1 re-scoped to read-only** — removed Vault, Wantlist, Alerts,
  SignIn, Sets, Waitlist from the navigator + linking + FigureDetail
  CTAs. Code preserved under `src/` for v2 flag-flip (f13face)
- **Pro gate removed from MarketPanel** — full price history ships
  unlocked. No "waitlist theater" for a feature that doesn't exist
  (f13face)
- **eBay `customid` changed** from `figurepinner` to `figurepinner-mobile`
  to match the extension's `affiliate.js` and enable EPN segmentation
  (955dbc9)
- **Deep-link path narrowed** from `/figure/*` to `/open/*` per reviewer
  note — broader AASA pattern would hijack web SEO engagement on
  figurepinner.com/figure/:id (f13face)
- **API hostname corrected** to the Cloudflare Worker
  (`figurepinner-api.bubs960.workers.dev`). Marketing site serves HTML
  only and was never a proxy (955dbc9)
- **Clerk `getToken` now uses a JWT template** (`mobile` by default,
  overridable via `EXPO_PUBLIC_CLERK_JWT_TEMPLATE`) — Worker JWKS
  verification requires a named template, not bare `auth()` (955dbc9)
- **DELETE paths at spec literal**: `/api/v1/vault/items/:id` (plural
  "items") vs. `/api/v1/wantlist/item/:id` (singular "item") — matches
  `specs/screen-02` / `screen-03` verbatim (955dbc9)
- **Search switched to Worker** with client-side `figure_id`
  synthesis via new `src/shared/figureId.ts` — Worker strips id for
  anti-scrape, mobile reconstructs from returned fields. Marked as a
  DRIFT RISK in the source until the canonical mint script lands (955dbc9)
- Post-cut sweep: fixed stale `RootStackParamList` refs in v2 screens,
  added `figureApi` tests, prefetch parity for `CharacterThread`
  (b7205c4)

### Added
- Error boundary at root with `app_error` analytics event on catch
  (b39c08d)
- `SeriesContext` thumbnail prefetch up to 8 URLs (b39c08d)
- `Settings + account deletion + pull-sync + expo-image migration +
  Expo notifications infra + reconcile` from Phase 2's broader batch,
  later re-scoped out of v1 but preserved for v2 (cb75147)
- Onboarding flow: `src/screens/OnboardingScreen.tsx`, 3-slide welcome,
  Skip / Get started, animated pill dots, haptic on page change,
  `AsyncStorage`-backed completion flag via
  `src/onboarding/preferences.ts` (d7daf22)
- Local-first collection store (`src/collection/localStore.ts`),
  `useCollectionList`, `VaultScreen`, `WantlistScreen` (940deb0)

---

## Phase 2 — Compliance & polish

### Added
- VoiceOver / TalkBack labels per spec §10 — chart label, value-cell
  phrasing, lore-band disclosure state, all interactive targets ≥44pt
  (3ed439a)
- Dynamic Type XXL audit — fixed heights → `minHeight` so text scales
  without clipping (3ed439a)
- Offline cache (`src/cache/persist.ts` + `src/cache/useSWR.ts`) — 24h
  stale-while-revalidate, fetch failures preserve cached data for
  offline viewing (260e384)
- Pull-to-refresh + stale indicator pill (260e384)
- Reduce Motion support across animations (260e384)
- System share sheet via `src/shared/share.ts` (260e384)
- Pinch-to-zoom hero (`src/components/figure/ZoomableImage.tsx`) with
  gesture-conflict resolution (scroll disables while zoomed) (56f1c3a)
- Shared-logic unit tests: `buildEbayUrl`, `persist`, `searchApi`,
  `collectionApi`, `useSWR` (4dc3c37)

---

## Phase 1 — Scaffold & port

### Added
- Expo + TypeScript scaffold, design tokens, `FigureDetailScreen` with
  all 8 zones, null-matrix rendering, sticky bottom action bar, 8
  shared-logic suites (a93f4b7)
- Real types + `deriveName` ported from `figurepinner-site/src/data/kb.ts`
  (b97e99e)
- React Navigation native-stack + deep linking config (adebf33)
- Clerk auth scaffold + token cache + collection API client + typed
  analytics registry (adebf33)
- Search screen hitting Worker's `/api/v1/search` with debounce + abort
  (56993a2)
- Font bundling via `@expo-google-fonts` — Bebas Neue + Inter, no local
  `.otf` assets required (b97e99e)

---

## Known limitations (not bugs — work not yet possible)

- **Canonical `buildFigureId`** is a best-effort guess until the
  upstream mint script is shared. Mobile matches the sample id
  `mattel-elite-11-rey-mysterio` but may silently disagree on edge
  cases. Flagged loudly in `src/shared/figureId.ts`.
- **AASA + assetlinks** need hosting on figurepinner.com's
  `/.well-known/` with real `APP_TEAM_ID` + release SHA-256
  fingerprint. Mobile matches `/open/*` today.
- **Worker endpoints for vault/wantlist/devices** not yet built. v2
  degrades gracefully to local-only when they 404.
- **Gesture behavior for pinch/double-tap/pan** runs on Reanimated's
  UI thread and is unreachable from jest. Render contract is locked;
  interaction is device-QA.
- **AppNavigator conditional stack** (per flag combination) isn't unit
  tested — exercised transitively through screen tests.
