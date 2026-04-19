# Changelog

All notable changes on `claude/figure-pinner-mobile-app-rpGZU` since it
diverged from `main`. Grouped by phase, newest phase first.

Format is loosely based on Keep a Changelog. Each bullet ends with the
commit SHA of the change that introduced it, so reviewers can jump to a
diff without guessing.

---

## Phase 7 — Engineer contract alignment (current)

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
