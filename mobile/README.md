# FigurePinner Mobile

Phase 1 scaffold of the FigurePinner mobile app. Consumes the same API as
`figurepinner-site` (`/api/v1/figure/:id` + `/api/v1/figure-price`).

## Stack

- Expo (React Native) + TypeScript
- Dark-mode only
- Fonts via `@expo-google-fonts` (no local font files needed)
- Backend: Cloudflare Worker / Pages (same as web)

## Shared logic

Ported verbatim from `figurepinner-site`:

- `src/shared/kb.ts` — `KBFigure` type + `deriveName` (mirror of `src/data/kb.ts`)
- `src/api/figureApi.ts#buildEbayUrl` — affiliate URL builder (mirror of `figure/[figure_id]/page.tsx`)

Mobile-only, defensive:

- `src/shared/cleanFigureName.ts` — strips literal `(None)` / `(null)` tokens that `deriveName`
  can emit when `character_variant` is the string "None"
- `src/shared/renderLoreBand.ts` — content renderer for zone 3; the web doesn't ship one yet,
  lands with the content files near launch

## Structure

```
src/
  theme/        design tokens (colors, type scale, spacing)
  shared/       types.ts, kb.ts, cleanFigureName, renderLoreBand, formatters
  api/          figureApi — figure + price endpoints, buildEbayUrl
  hooks/        useFigureDetail (stale-while-revalidate TODO)
  screens/      FigureDetailScreen (long-scroll, 8 zones, sticky bar)
  components/   zone components
__tests__/      deriveName (ported), cleanFigureName, renderLoreBand
```

## Running

```
cd mobile
npm install
npm run ios      # or: npm run android
npm test
npm run typecheck
```

## Environment variables (Expo)

Set in `.env` or via EAS build secrets:

- `EXPO_PUBLIC_FIGUREPINNER_API` — Cloudflare Worker base URL.
  Defaults to `https://figurepinner-api.bubs960.workers.dev`.
  **Important**: `figurepinner.com` is the marketing site (HTML only) — it does
  NOT proxy to the API. Never point this at the bare domain.
- `EXPO_PUBLIC_EBAY_CAMPAIGN_ID` — eBay Partner Network campaign ID.
  Defaults to `5339147406` (the live Bubs960 EPN campaign).
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key for mobile auth.

## Open items

- [ ] `apple-app-site-association` + `assetlinks.json` hosted on figurepinner.com
      to make `https://figurepinner.com/figure/:id` links open the app.
- [ ] Confirm Clerk JWT template for mobile. Backend (`@clerk/nextjs/server`
      `auth()`) should accept `Authorization: Bearer <jwt>` — may need a
      "mobile" JWT template enabled in the Clerk dashboard.
- [ ] Consider custom-domain route `api.figurepinner.com` → Worker (cleaner
      public-facing URL, not blocking TestFlight).
- [ ] Wire Own/Want mutations (currently no-op; backend endpoints TBD).
- [ ] Auth: Clerk integration (web uses Clerk under `/sign-in` + `/sign-up`).
- [ ] Offline / stale-while-revalidate caching (spec §11).
- [ ] Analytics event dispatch (spec §12 names).
- [ ] Aspirational fields (rarity, lore, series_siblings, character_thread,
      collection) hide via null-matrix today; populate when backend returns them.
- [ ] Phase 2: share image generator, zone 6/7 interactions, long-press preview.
