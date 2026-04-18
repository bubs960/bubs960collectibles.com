# FigurePinner Mobile

Phase 1 scaffold of the FigurePinner mobile app.

## Stack

- Expo (React Native) + TypeScript
- Dark-mode only
- Fonts via `@expo-google-fonts` (no local font files needed)
- Backend: Cloudflare Worker (`figurepinner-api.bubs960.workers.dev`)

## Backend model

Mobile talks to ONE backend — the Cloudflare Worker. The Next site at
`figurepinner.com` is marketing HTML only; it does not proxy to any API.

Endpoints the mobile app hits (all on the Worker):

- `GET  /api/v1/figure/:id` — figure metadata
- `GET  /api/v1/figure-price?figureId=` — best-effort pricing
- `GET  /api/v1/search?q=&limit=` — search; public projection omits
  `figure_id` + `image` as anti-scrape (mobile synthesizes `figure_id`
  client-side via `src/shared/figureId.ts`; authed callers sending
  `X-FP-Key` get the full projection).
- `POST /api/v1/vault`, `DELETE /api/v1/vault/items/:id` — owned list
- `POST /api/v1/wantlist`, `DELETE /api/v1/wantlist/item/:id` — wantlist
  (both soft-delete → `status='removed'`, not hard delete)

The wantlist/vault routes are **planned, not yet shipped** in the reference
mobile client (`mobile/src/js/lib/storage.js` in the Figure Pinner Dev
workspace is localStorage-only, with a comment saying these will swap to
authed POST/DELETE once auth lands).

## Auth

Clerk via `@clerk/clerk-expo`. The Worker is expected to verify the JWT
directly via Clerk's JWKS — so mobile calls
`getToken({ template: 'mobile' })` and sends `Authorization: Bearer <jwt>`.

The JWT template name must be configured in the Clerk dashboard — override
via `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` if you name it differently. On the
server, use `authenticateRequest()` with an explicit template allowlist —
not bare `auth()`, which was built for cookie verification.

## Shared logic

Ported from the Figure Pinner Dev reference:

- `src/shared/kb.ts` — `KBFigure` + `deriveName`
- `src/api/figureApi.ts#buildEbayUrl` — affiliate URL (`customid=figurepinner-mobile`
  for EPN segmentation vs. extension's `figurepinner`)
- `src/shared/figureId.ts` — client-side figure_id synthesizer (best-effort
  mirror; when the canonical JS version from `mobile/src/js/lib/api.js` is
  shared, port it verbatim)

Mobile-only:

- `src/shared/cleanFigureName.ts` — defensive `(None)` / `(null)` stripper
- `src/shared/renderLoreBand.ts` — lore content renderer (stub until
  content files land)

## Structure

```
src/
  theme/        design tokens
  shared/       types, kb, figureId, cleanFigureName, renderLoreBand, formatters, share
  api/          figureApi, collectionApi, searchApi
  auth/         Clerk token cache + JWT-template hook
  cache/        AsyncStorage + SWR
  hooks/        useFigureDetail, useCollection, useReduceMotion, useSearch
  analytics/    typed event registry + swap-able sink
  navigation/   stack + deep-link config
  screens/      FigureDetail, Search, SignIn, Stub/Waitlist
  components/   zone components
__tests__/      9 suites, 70+ tests (see below)
```

## Running

```
cd mobile
npm install
npm run ios        # or: npm run android
npm test
npm run typecheck
```

## Environment variables (Expo)

- `EXPO_PUBLIC_FIGUREPINNER_API` — Cloudflare Worker base URL.
  Defaults to `https://figurepinner-api.bubs960.workers.dev`.
- `EXPO_PUBLIC_EBAY_CAMPAIGN_ID` — eBay Partner Network campaign ID.
  Defaults to `5339147406` (live Bubs960 EPN campaign).
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key.
- `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` — name of the Clerk JWT template the
  Worker accepts. Defaults to `mobile`.

## Open business / product decisions

- **Pro tier** doesn't exist in the extension (`freemium-gate.js` explicitly
  has no subscription tier). Mobile ships the 3-free-comps gate per the
  design handoff; the "Unlock" CTA currently routes to a `Waitlist` stub
  screen. Choose one before shipping publicly: (a) waitlist CTA only,
  (b) remove the gate + ship Market Panel unlocked, (c) actually spec Pro
  (price, features, payment, refunds) and wire it. Option (a) is the
  current default — change by editing `MarketPanel.tsx` + the
  `Waitlist` screen in `StubScreen.tsx`.
- **Universal Links** require `.well-known/apple-app-site-association`
  and `assetlinks.json` hosted on figurepinner.com by the site worker.
  Staged placeholders live at `mobile/native-templates/` in the reference
  workspace; APP_TEAM_ID and release SHA-256 fingerprint need filling.
  AASA currently routes `/figure/*` — once live, every figurepinner.com
  figure link opens the app (not the browser) when installed; if any web
  flow needs to stay in-browser, narrow AASA to `/open/*` instead.

## Test suites (9 suites, 70+ tests)

Logic-layer coverage. Run with `npm test` (jest-expo preset) or via the
sandbox ts-jest harness documented in PRs.

- `cleanFigureName`, `deriveName`, `renderLoreBand`, `formatters` — shared logic
- `buildFigureId` — client-side figure_id synthesis (must match KB)
- `buildEbayUrl` — affiliate template + `customid=figurepinner-mobile`
- `searchApi` — Worker URL, X-FP-Key header, figure_id synthesis fallback
- `collectionApi` — POST + DELETE, exact spec paths (`/vault/items/:id`
  vs. `/wantlist/item/:id`), Bearer auth, error wrapping
- `persist`, `useSWR` — AsyncStorage cache + stale-while-revalidate;
  fetch-failure does NOT clobber cached data (§11 offline guarantee)
