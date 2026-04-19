# FigurePinner Mobile

## v1 scope: read-only browser

Mobile v1 ships **without** vault, wantlist, alerts, or sign-in. The Worker
endpoints those features depend on (`POST/DELETE /api/v1/vault`,
`POST/DELETE /api/v1/wantlist`, `POST /api/v1/devices`, etc.) don't exist
yet — shipping local-only sync would train users to expect persistence we
can't deliver across devices, and shipping a waitlist CTA for a Pro tier
that hasn't been spec'd is fake friction.

What v1 ships:

- Universal-Link arrival (`/open/:figure_id` — narrowed from `/figure/*` to
  preserve web SEO + affiliate engagement)
- Onboarding (3-slide welcome, skippable)
- Figure detail screen (hero with pinch-zoom, value strip, lore band when
  content lands, market panel **with full price history**, details card,
  series + character carousels when data lands)
- Search (Worker-backed, client-side `figure_id` synthesis)
- Settings (Privacy, Terms, version, dev-only onboarding reset)
- Pull-to-refresh, offline cache (24h SWR), reduce-motion support

What's preserved-but-not-shipped (lives in `src/` for v2 re-enable):

- `src/auth/` — Clerk token cache + JWT-template hook
- `src/collection/` — local store + sync reconciliation
- `src/notifications/` — Expo push token registration
- `src/screens/{VaultScreen,WantlistScreen,AlertsScreen,SignInScreen,StubScreen}.tsx`
- `src/hooks/{useCollection,useCollectionSync,useCollectionList}.ts`
- `src/api/collectionApi.ts`

These are all unreferenced from `AppNavigator` + `linking.ts`, so they don't
add user-visible surface but the work isn't lost.

## Stack

- Expo (React Native) + TypeScript
- Dark-mode only
- Fonts via `@expo-google-fonts`
- Backend: Cloudflare Worker (`figurepinner-api.bubs960.workers.dev`) — read-only

## Open KNOWN risks (read before shipping)

1. **`buildFigureId` is a guess.** The KB's `figure_id` mint algorithm is
   NOT in `figurepinner-site` — `src/data/kb.ts` says the file is `cp`'d in
   from an extension repo. Mobile's synthesizer in
   `src/shared/figureId.ts` matches the sample id `mattel-elite-11-rey-mysterio`
   but might silently disagree with the canonical mint on edge cases.
   The `KBFigure.v1_figure_id` field is a smoking gun that the algorithm
   changed at some point — there may already be drift in production.
   **Find the upstream mint script and port it verbatim before TestFlight.**

2. **AASA file not yet narrowed.** Deep-link config in
   `src/navigation/linking.ts` matches `/open/:figureId`. The matching
   `apple-app-site-association` and `assetlinks.json` files (in the Figure
   Pinner Dev workspace under `mobile/native-templates/`) still declare
   `/figure/*`. Update them to `/open/*` before hosting at
   `/.well-known/` on figurepinner.com, otherwise the broader pattern
   hijacks every web-engagement / SEO link to the app on installed devices.

3. **`companion.js:307-309` affiliate leak.** Lives in the extension repo,
   not here. Every "active listings" click ships unattributed —
   `activeListingsUrl()` returns a raw `ebay.com/sch/i.html` URL with no
   EPN params. Wrap in `affiliateWrap()` and ship a hotfix. This is an
   active revenue leak today, not a future-mobile concern.

## Environment variables (Expo)

- `EXPO_PUBLIC_FIGUREPINNER_API` — Cloudflare Worker base URL.
  Defaults to `https://figurepinner-api.bubs960.workers.dev`.
- `EXPO_PUBLIC_EBAY_CAMPAIGN_ID` — eBay Partner Network campaign ID.
  Defaults to `5339147406`.

(No Clerk or notification env vars in v1 — those re-enable in v2.)

## Running

```
cd mobile
npm install
npm run ios      # or: npm run android
npm test
npm run typecheck
```

## Tests

13 logic suites + 5 component suites. Logic suites run under both jest-expo
and the sandbox ts-jest harness; component suites require jest-expo's RN
runtime. See `__tests__/component/README.md`.

## What's deferred to v2 (and why each is blocked today)

| Feature | Blocker |
|---|---|
| Vault / Wantlist sync | Worker `POST/DELETE /api/v1/{vault,wantlist}` not built |
| Pull-sync GET endpoints | Same |
| Sign-in (Clerk) | No surface to sign into until vault/wantlist are real |
| Push price alerts | Worker `POST /api/v1/devices` + APNs/FCM pipe + send loop |
| Pro tier UI | Pro doesn't have a price, feature set, or payment pipe yet |
| Account deletion | Returns with sign-in (Apple delete-parity required) |
