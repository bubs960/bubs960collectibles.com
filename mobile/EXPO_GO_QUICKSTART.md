# See it on your phone in 15 minutes (Expo Go preview)

Zero accounts required. No EAS Build, no $99 fee, no signing
certificate. You scan a QR code and the app loads on your real phone
straight from this checked-out branch.

## What you need

- Your laptop on the same wifi as your phone (corporate / hotel
  networks with client isolation will block this — fall back to a
  hotspot from your phone if needed).
- **Expo Go** installed on your phone:
  - iOS: <https://apps.apple.com/app/expo-go/id982107779>
  - Android: <https://play.google.com/store/apps/details?id=host.exp.exponent>
- Node 18+ and npm on the laptop (you already have these — sandbox
  tests are running).

## Steps

```bash
cd /home/user/bubs960collectibles.com/mobile

# One-time install (~2-4 min depending on cache state — Expo modules
# pull native iOS/Android folders even in Expo Go mode)
npm install

# Start the dev server
npx expo start

# When prompted, press 's' to switch to "Expo Go mode" if the
# default lands on dev-build mode instead.
```

A QR code prints to the terminal. On your phone:

- **iOS:** open the Camera app, point at the QR. iOS shows a
  notification "Open in Expo Go" — tap it.
- **Android:** open the Expo Go app, tap "Scan QR Code", point at
  the terminal.

The bundler downloads the JS bundle to your phone (~5-15 seconds
first time, then incremental). The app boots through Onboarding →
FigureDetailScreen.

## What you'll see

This is v1 (read-only browser, default flags). On launch:

1. Three onboarding slides ("Hunt like a collector" → "Search
   anything" → "Ready to hunt?"). Tap **Skip** or swipe through.
2. FigureDetailScreen for `mattel-elite-11-rey-mysterio`.
3. Likely outcome: the worker doesn't have a figure under that exact
   id (the alias patch hasn't deployed yet), so you'll see the
   `not_found_but_logged` state with "We don't have this figure yet
   — your query was logged" banner. Tap the **Search** button in
   the top right.
4. Search screen — type any character name. With the worker's
   public-search projection still stripping `figure_id`, results
   show but tapping any of them likely 404s because of the same
   alias-patch gap.
5. Tap **Find on eBay** in the sticky bar — opens an in-app browser
   with a real eBay search query containing the affiliate params.

## Things to verify on a real screen

- **Pinch-zoom works smoothly** on the hero image (60fps,
  no stutter). Spec §14 flagged this as the biggest gesture-conflict
  risk.
- **Pull-to-refresh** at the top of FigureDetailScreen — should
  show the spinner + a haptic tick on release.
- **VoiceOver** (iOS Settings → Accessibility → VoiceOver) — turn
  it on, swipe through the figure detail. Hero image should
  announce as "Photo of [name] [line] Series [N] action figure",
  value cells as "Median price, $X, from N sold comps".
- **Reduce Motion** (iOS Settings → Accessibility → Motion → Reduce
  Motion) — turn it on, scroll. Hero collapse should snap, not fade.
- **Deep link**: have a friend text you `figurepinner://open/some-id`
  — tapping it should open Expo Go directly to FigureDetailScreen.

## Things that WON'T work in Expo Go (only matter in EAS Build)

- **Universal links** (`https://figurepinner.com/open/:id`) — Expo
  Go doesn't claim that domain. Custom-scheme `figurepinner://`
  works fine.
- **Push notifications** to a real APNs / FCM channel — Expo Go's
  push token works against Expo's own servers, not the Worker. v2
  alerts surface is gated behind `EXPO_PUBLIC_V2_ALERTS=true`
  anyway, so this doesn't break v1 preview.
- **App icon as it'll appear** — Expo Go shows the Expo Go icon
  on the springboard, not the FigurePinner icon. EAS Build is
  where you see the real icon.
- **Native crash reporter** — Expo Go has its own crash logging,
  not ours. (Sentry isn't wired anyway per phase 8.)
- **Production worker behaviour** — for v1 the worker is real, but
  expect the alias-patch + image-strip-fix gap to surface as the
  things described above. That's a backend gate, not a mobile bug.

## If something breaks

### "Failed to download remote update"
Phone and laptop aren't on the same network, or the network blocks
client-to-client. Try tethering phone to laptop hotspot.

### "Unable to resolve module ..."
Run `rm -rf node_modules && npm install` to rebuild the native
graph. Sometimes Expo's dep resolution gets stale.

### Bundling errors mentioning specific files
`npx expo start --clear` clears Metro's bundler cache. ~95% of "the
code looks right but the bundler disagrees" issues fix here.

### "Network request failed" on every figure
Confirm `figurepinner-api.bubs960.workers.dev` is reachable from
your phone:
  - Open Safari / Chrome on the phone
  - Visit `https://figurepinner-api.bubs960.workers.dev/api/v1/figure/test`
  - You should get a JSON response (probably 404 or
    `not_found_but_logged`) — anything other than a "can't reach
    server" page is fine.

### App opens to a white screen forever
Check the Metro terminal output for stack traces. Most common
cause: a font URL fetch hung. Reload by shaking the phone (or
Cmd+D in iOS sim) → "Reload".

### "redbox" error overlay with a stack
Read the top frame. If it's in `src/`, it's our bug — capture and
file. If it's in `node_modules/`, it's a version mismatch — the
fix is usually `expo install --fix`.

## What to test that DOES work in Expo Go

- Onboarding flow (3 slides, skip, get-started)
- Search screen (debounce, recent searches, history clear)
- Hero pinch-zoom (the big one — §14 risk)
- Pull-to-refresh
- Settings → Privacy / Terms / Support links open in-app browser
- Stale-cache pill (force a 24h+ stale by changing your device clock)
- Reduce Motion + Dynamic Type variations
- Deep-link arrival via `figurepinner://open/anything`

## When you're done

`Ctrl-C` in the Metro terminal. The app on your phone keeps
running with whatever was last bundled — close Expo Go to kill it.

## What this preview does NOT prove

- **Performance on a release build.** Expo Go runs the dev bundle,
  which is JS-only and ~5x slower than a Hermes-compiled release.
  60fps in dev = 60fps in release; sluggish in dev usually =
  smooth in release.
- **App size.** Expo Go itself is the app you're seeing; our bundle
  is downloaded as JS. Real binary size shows on EAS Build.
- **Native crashes / OS-version issues.** Expo Go targets a fixed
  set of OS versions; our EAS Build will target a wider range.

## Next step after this works

Once you've eyeballed the app on a real screen and it doesn't make
you wince, you're ready to commit to the $99 Apple Developer fee.
The Expo Go preview is the cheapest possible "is this actually
worth shipping" check.
