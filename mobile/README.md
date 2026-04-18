# FigurePinner Mobile

Phase 1 scaffold of the FigurePinner mobile app. Built per
`FigurePinner-Character-Card-Design-Plan` (mobile handoff).

## Stack

- Expo (React Native) + TypeScript
- Dark-mode only
- Targets iOS and Android from one codebase

## Structure

```
src/
  theme/        design tokens (colors, type scale, spacing)
  shared/       logic shared with web: types, cleanFigureName, renderLoreBand, formatters
  api/          figureApi — Cloudflare Worker / API client
  hooks/        useFigureDetail (stale-while-revalidate TODO)
  screens/      FigureDetailScreen (long-scroll, 8 zones, sticky bar)
  components/   zone components (Hero, ValueStrip, LoreBand, Market, ...)
__tests__/      unit tests for shared logic
assets/fonts/   bundle Bebas Neue + Inter here (files not yet committed)
```

## Running

```
cd mobile
npm install
npm run ios      # or: npm run android
npm test
npm run typecheck
```

## Open items before merging

- [ ] Drop Bebas Neue + Inter font files into `assets/fonts/` and wire them in `App.tsx`.
- [ ] Replace stub `cleanFigureName` / `renderLoreBand` with ports from `figurepinner-dev`.
- [ ] Point `EXPO_PUBLIC_FIGUREPINNER_API` at the real Cloudflare Worker URL.
- [ ] Wire Own/Want mutations through the real API (currently no-op).
- [ ] Auth: connect to Clerk (same provider as web).
- [ ] Analytics event dispatch (events are named per spec §12, not yet emitted).
- [ ] Offline/stale-while-revalidate caching (spec §11).
- [ ] Phase 2: share image generator, zone 6/7 interactions, long-press preview.
