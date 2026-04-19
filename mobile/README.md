# FigurePinner Mobile

## Architecture at a glance

```
  ┌─────────────────┐   ┌─────────────────┐
  │ EAS Build profile│──▶│ process.env (  )│
  │  v1 / v2-preview │   │ EXPO_PUBLIC_*   │
  └─────────────────┘   └─────────────────┘
                                 │
                                 ▼
                       ┌─────────────────────┐
                       │ src/config/features │ ← reads once at boot
                       └──────────┬──────────┘
                                  │
      ┌───────────────────────────┼────────────────────────┐
      ▼                           ▼                        ▼
  ┌───────────┐         ┌───────────────┐          ┌────────────────┐
  │ AppNav     │         │ StickyAction   │          │ FigureDetailScr│
  │ conditional│         │ collectionSlot │          │ CTA list + Miss│
  │ Stack.Screen│        │ mounts v2      │          │ banner etc.    │
  └───────────┘         └───────────────┘          └────────────────┘
      │                           │                        │
      │ (v2 only)                 │ (v2 only)              │
      ▼                           ▼                        ▼
  Vault/Wantlist/             CollectionBar              useFigureDetail
  Alerts/SignIn             + useCollection              ↓
                                                     ┌───────────────┐
                                                     │ cache/useSWR   │
                                                     │ + persist      │
                                                     └───────┬───────┘
                                                             │
  ┌──────────────────────────────────────────────────────────┼──────┐
  │                        Worker HTTP                              │
  │ /api/v1/figure/:id    (alias layer, match_quality)              │
  │ /api/v1/figure-price  (best effort)                             │
  │ /api/v1/search        (anti-scrape projection; client synth id) │
  │ /api/v1/vault + /items/:id (v2 — auth'd)                        │
  │ /api/v1/wantlist + /items/:id (v2 — auth'd)                     │
  │ /api/v1/devices       (v2 — push registration)                  │
  └─────────────────────────────────────────────────────────────────┘

  Clerk (v2 only):
    mobile → Clerk.getToken({ template: 'mobile' })
           → Bearer <jwt>
           → Worker verifies against Clerk JWKS directly
             (clerk-jwt.cjs middleware, hand-rolled)

  Local-only state (always on):
    AsyncStorage │
      ├─ fp:v1:figure:*           (SWR cache, 24h stale)
      ├─ fp:v1:collection:*       (vault, wantlist — v2 surfaces, v1 unused)
      ├─ fp:v1:search_history     (recent queries, capped 10)
      ├─ fp:v1:preferences        (onboarding complete + home genre)
      └─ fp:v1:push_token         (Expo push token, v2)

  Secure store:
    expo-secure-store │
      └─ Clerk session token (v2)
```

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

1. **`figure_id` mint drift is a WORKER problem, not a mobile problem.**
   Three mint patterns live in production: v2 canonical
   (`fp_{fandom}_..._{hash6}` in `v1-to-v2-rules.cjs:438`), v1 pipe-
   separated (`matcher.js:943`), and legacy fp_ without a hash. The KB
   mints (1) and D1 listings mint (2) for the same figure — which is why
   Stage-4 reports 9/12 "missing" figures that actually exist under
   sibling IDs with 2500+ combined listings.
   Pasting `buildFigureId()` into mobile doesn't fix this. The fix is
   worker-side: `/api/v1/figure/:id` must fall back to sibling lookup on
   404 and return a `{ status: 'moved', canonical_id: '…' }` redirect.
   Mobile's synthesizer (`src/shared/figureId.ts`) is now documented as
   best-effort only; the soft-recovery is a "Search for this figure" CTA
   on 404 (see `FigureDetailError`).
   **Until the worker normalizes IDs, decide which mint pattern is
   canonical for post-2026-04-19 writes and write it down.** Every new
   feature that mints a `figure_id` (request-to-add, vault, wantlist)
   rolls the dice until that decision exists.

2. **AASA file not yet narrowed.** Deep-link config in
   `src/navigation/linking.ts` matches `/open/:figureId`. The matching
   `apple-app-site-association` and `assetlinks.json` files (in the Figure
   Pinner Dev workspace under `mobile/native-templates/`) still declare
   `/figure/*`. Update them to `/open/*` before hosting at
   `/.well-known/` on figurepinner.com. Two practical landmines:
   - iOS caches AASA aggressively. A wrong `APP_TEAM_ID` deployed once
     sticks with existing installs for days. Test with a fresh install
     on a device that has never had the app.
   - Android `assetlinks.json` is less forgiving of redirects than AASA.
     Cloudflare's default `.well-known` behavior has bitten people —
     `curl -I` before declaring done.

3. **Spec path inconsistency normalized (was a blocker; now fixed).**
   The spec carries an inherited typo where wantlist delete uses
   `/item/:id` singular and vault uses `/items/:id` plural. Mobile now
   posts to `/items/:id` on both. Worker should do the same when the
   endpoints ship — don't encode the typo.

4. **Soft-delete rows grow unbounded.** `status='removed'` preserves
   undo UX + delete-then-re-add analytics, but at 10M rows the cleanup
   gets painful. Plan a worker-side TTL cleanup job (hard-delete rows
   with `status='removed'` older than ~90 days) before the numbers
   matter — cheap now, not later.

## Environment variables (Expo)

### Always read

- `EXPO_PUBLIC_FIGUREPINNER_API` — Cloudflare Worker base URL.
  Defaults to `https://figurepinner-api.bubs960.workers.dev`.
- `EXPO_PUBLIC_EBAY_CAMPAIGN_ID` — eBay Partner Network campaign ID.
  Defaults to `5339147406`.

### Feature flags (v2 unlock)

Flags are captured at module load; set them on EAS Build profiles to ship a
v2 binary off this same branch without merging anything.

- `EXPO_PUBLIC_V2_COLLECTION_SYNC` — `"true"` enables Clerk auth surface,
  Own/Want pills, vault + wantlist screens, and the pull-sync driver that
  reconciles local state with the Worker on sign-in. Default off.
- `EXPO_PUBLIC_V2_ALERTS` — `"true"` enables the alerts screen, the
  price-alert CTA on figure detail, and Expo push token registration.
  Usually pairs with `V2_COLLECTION_SYNC=true`. Default off.

### Read only when the matching flag is on

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key.
  Required when `V2_COLLECTION_SYNC=true`.
- `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` — Clerk JWT template name the Worker
  accepts. Defaults to `mobile`.

### eas.json example

```json
{
  "build": {
    "v1-production": {
      "env": { "EXPO_PUBLIC_FIGUREPINNER_API": "https://..." }
    },
    "v2-preview": {
      "env": {
        "EXPO_PUBLIC_V2_COLLECTION_SYNC": "true",
        "EXPO_PUBLIC_V2_ALERTS": "true",
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_..."
      }
    }
  }
}
```

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
