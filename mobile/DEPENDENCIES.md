# Dependencies — what each is for and what it costs

Audit of every runtime dependency in `package.json` with the reason
we added it and the alternatives we considered. Useful when a reviewer
asks "why do we ship X" or "can we drop Y before launch".

## Runtime (ships to users)

### Expo SDK core
- **`expo` (~51)** — Expo runtime. Required for everything else in the
  `expo-*` family. Locked to the same minor as `jest-expo`.
- **`react` (18.2), `react-native` (0.74.5)** — pinned to versions
  `expo@51` expects. Don't bump independently.
- **`expo-status-bar`** — StatusBar shim that respects dark/light. Tiny.

### Fonts
- **`@expo-google-fonts/bebas-neue`** — Bebas Neue display face (hero
  title, H2, price values).
- **`@expo-google-fonts/inter`** — Inter body + medium + bold.
- **`expo-font`** — runtime font loader. Required by both above.
  *Alternatives rejected:* bundling `.ttf` files locally would shave ~10 KB
  but adds an asset-management step every time fonts update.

### Storage / persistence
- **`@react-native-async-storage/async-storage`** — backs the collection
  store, figure cache, search history, onboarding prefs, push-token
  cache. One storage layer for everything device-local.
- **`expo-secure-store`** — Keychain / Keystore wrapper for the Clerk
  session token. Only used when `V2_COLLECTION_SYNC=true`; imported
  unconditionally because moving an import behind a flag isn't worth
  the tree-shaking bytes.

### Networking / media
- **`expo-image`** — memory + disk LRU cache for thumbnails (series
  carousel, character thread, search results, vault/wantlist rows).
  Drop-in for `<Image>` with better caching; chosen per spec §11's
  SDWebImage / Coil / Glide / FastImage recommendation.
- **`expo-web-browser`** — opens eBay listings + legal links in
  SFSafariViewController / Custom Tabs. Keeps affiliate params intact,
  stays within app context.

### Gestures / animation
- **`react-native-gesture-handler`** — pinch / pan / double-tap on the
  hero image.
- **`react-native-reanimated`** — UI-thread transforms for the zoom
  gesture + skeleton shimmer. 60fps without bridge round-trips.
- **`react-native-svg`** — the MarketPanel sparkline. ~60 KB; could be
  replaced with a canvas implementation but the SVG path is two lines.
- **`expo-haptics`** — taps on sticky action bar, zoom, page swipe.

### Navigation
- **`@react-navigation/native`** + **`native-stack`** — the stack
  navigator. `native-stack` uses `UINavigationController` / Android
  fragment transitions for native feel.
- **`react-native-screens`** — backing native view container required
  by native-stack.
- **`react-native-safe-area-context`** — notch / home-indicator safe
  area. Sticky bar positioning depends on it.
- **`expo-linking`** — deep-link URL parsing for `figurepinner://` and
  universal links.

### Auth (v2)
- **`@clerk/clerk-expo`** — only loaded in the tree when
  `FEATURES.collectionSync=true`. Handles sign-in, sign-out, session
  refresh, JWT templates, user delete.

### Device / platform (v2)
- **`expo-device`** — `Device.isDevice` gate on push-token
  registration (simulators have no APNs token).
- **`expo-notifications`** — permission prompt, channel setup, Expo
  push-token fetch. Wired but Worker-side `/api/v1/devices` endpoint
  doesn't exist yet.

## Dev / test (does NOT ship)

- **`jest`**, **`jest-expo`**, **`ts-jest`** — test runners.
- **`@testing-library/react-native`** — component tests (v12 exposes
  `renderHook` for hook tests too).
- **`@testing-library/react`** — hook tests that don't need RN
  primitives (runs under jsdom).
- **`jest-environment-jsdom`** — required by hook tests using
  `@testing-library/react`.
- **`react-test-renderer`** — peer dep of RN testing library.
- **`@types/jest`**, **`@types/react`**, **`typescript`**,
  **`@babel/core`** — type + transform toolchain.

## Not currently depended on (flagged as hypothetical adds)

If a reviewer asks about these, the answer for each is below.

| Package | Why we're NOT adding it |
|---|---|
| `@tanstack/react-query` | Would be ~50KB to solve the one thing `src/cache/useSWR.ts` solves in ~80 lines. Revisit if we need dedup across multiple list views. |
| `@sentry/react-native` | Keep the analytics sink abstraction — wire Sentry via `setAnalyticsSink(...)` when a provider is picked. Don't ship the SDK before the decision. |
| `react-native-mmkv` | Faster than AsyncStorage, but requires a native module rebuild + clashes with Expo managed workflow until we eject. AsyncStorage is fine for the volumes we'll see in v1. |
| `lottie-react-native` | No Lottie animations in scope. |
| `react-native-vector-icons` | No icons in scope — we use Unicode (×, ›, ←, ▲/▼) everywhere. Revisit when the design asks for icons. |
| `react-native-mmkv-storage` | Same as MMKV above. |
| `react-native-modal` | RN's built-in `Modal` + native-stack's `presentation: 'modal'` option cover every modal we show. |

## Size expectations (rough, not measured)

Unminified JS bundle at current dep set: expected ~2.2–2.6 MB before
tree-shaking, ~0.9–1.1 MB after with Hermes enabled (Expo 51 default).
Native side (iOS `.ipa` with Hermes + new arch) expected 18–22 MB
including fonts + app icon assets. Numbers unverified — actual sizing
happens on EAS Build.
