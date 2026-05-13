# Desktop launch playbook — PWA + Tauri binaries

Two distribution surfaces ship together:

1. **PWA** at `app.figurepinner.com` — installable from any modern
   browser. The default route for the 95%+ of users who'll arrive
   via a link.
2. **Tauri-wrapped `.dmg` / `.msi` / `.deb`** — direct-download
   binaries from `figurepinner.com/download` (or a GitHub Releases
   page). For power users who want a true OS-installed app.

This document covers what's specific to the desktop launch — signing,
SmartScreen, the download page, support flow. Apple-review-style
considerations for the binary live below.

## 1. The download page

Recommended URL: `figurepinner.com/download`. Page should expose:

- Three big buttons: **macOS** / **Windows** / **Linux**, each linking
  to the latest GitHub Release asset (or self-hosted file).
- Below each button: minimum OS version + binary size + SHA-256
  checksum so paranoid users can verify integrity.
- A "try the web version first" PWA install banner at the top — most
  users don't need a binary; the PWA install via the address bar's
  Install button is identical UX and zero download size.

Suggested copy for the page header:

```
Get FigurePinner on your computer.

Three options, ordered by simplicity:

1. Install the PWA — fastest, no download.
   Visit app.figurepinner.com → click Install in your browser's
   address bar (Chrome / Edge / Brave / Arc / Safari 16.4+).

2. Download the native app — same features, a real Dock /
   Start-Menu icon, no browser dependency.

3. Use it in your browser — bookmark app.figurepinner.com and
   skip the install entirely.
```

## 2. Code signing — what each OS expects

### macOS (`.dmg`)

| Posture | What happens on first launch | Cost |
|---|---|---|
| **Unsigned** (current default) | macOS shows "Unverified developer" — user must right-click → Open the first time. Subsequent launches work normally. | $0 |
| **Apple Developer signed** | Clean install via double-click. Still shows "From an identified developer" prompt once. | $99/yr (same as mobile) |
| **Signed + notarized** | Clean install, no prompts. | $99/yr + ~10 min/release |

For week-1: ship unsigned. Update the download page with a note:
"macOS users: right-click the `.dmg` and choose Open the first
time. This is a one-time prompt because the app isn't notarized
yet — we're using the same Apple Developer cert as our mobile app
once that's active."

When Apple Developer access lands:
1. `tauri.conf.json` → `app.macOS.signingIdentity` = your "Developer ID Application: ..." identity name from Keychain Access.
2. Set `APPLE_ID` and `APPLE_PASSWORD` (app-specific password) env vars in the GitHub Actions workflow secrets so the CI build runs `notarize` automatically.

### Windows (`.msi`)

| Posture | What happens on first launch | Cost |
|---|---|---|
| **Unsigned** | SmartScreen blocks the installer with "Windows protected your PC" — user must click More info → Run anyway. Damages install conversion. | $0 |
| **Self-signed** | Same SmartScreen warning. Self-signed gets you nothing on Windows. | $0 |
| **Standard cert** | SmartScreen warning gradually disappears as enough users install successfully ("reputation build"). Process can take weeks. | ~$80–$200/yr |
| **EV cert** | No SmartScreen warning from day one. Hardware-key bound. | ~$300/yr |

For week-1: ship unsigned. Add a clear "click More info → Run
anyway" line on the download page next to the Windows button, with
a screenshot. Cheap-and-cheerful EV cert (~$300/yr from SSL.com or
Comodo) is the next step if Windows installs feel like the
conversion bottleneck after launch.

### Linux (`.deb`)

No signing infrastructure exists for `.deb` files in the desktop
ecosystem the way it does for macOS/Windows. Apt repos use GPG-signed
release files, but for direct-download `.deb` distribution that's
overhead users don't expect. Ship as-is.

If linux installs become significant, the cleaner long-term move is
publishing to **Flathub** (Flatpak) — automatic updates, sandboxed,
and the install-friction conversation goes away. Tauri has Flatpak
build instructions; ~half-day to wire.

## 3. SHA-256 manifest

Every release should publish a `SHASUMS.txt` file alongside the
binaries, generated as part of the GitHub Actions workflow. The
download page links to it so users can verify they got the real
file:

```
sha256sum -c SHASUMS.txt
# (Linux/macOS)

certutil -hashfile FigurePinner_0.1.0_x64_en-US.msi SHA256
# (Windows — compare manually)
```

## 4. Auto-update strategy

Tauri's built-in updater isn't wired in the current `tauri.conf.json`.
For week-1 launch users update by re-downloading. That's fine for the
first 1–4 weeks of low-cadence releases.

When release cadence climbs:
1. Generate a signing key pair (`npx tauri signer generate`).
2. Add `app.security.updater` to `tauri.conf.json` with the public
   key + the update-feed URL (host a JSON manifest on Cloudflare
   Pages or R2).
3. CI publishes the new binary + the signed manifest on release.
4. Existing installs poll the manifest on launch and prompt to update.

## 5. Telemetry differences vs mobile

The same `figure_id_resolved`, `figure_viewed`, etc. events fire on
desktop via the same `POST /api/v1/analytics/event` route. Desktop
events include `platform: 'web'` so the worker's analytics tables
can split desktop / iOS / Android in queries.

What's different on desktop:
- No push token registration (web push deferred to v3 with VAPID).
- No haptics (no-ops on web — events not emitted because the
  callsite isn't reached).
- No Reduce Motion preference from `AccessibilityInfo` — instead
  the CSS `prefers-reduced-motion` media query (`useReduceMotion`
  honors it on web automatically).

## 6. Support flow

Same support inbox (bubs960toys@gmail.com). The desktop install
adds two FAQ-able pain points worth pre-empting:

> **macOS won't open the app — "unverified developer"**
> Right-click the FigurePinner app icon (in Applications), choose
> Open. macOS will ask once; click Open. After that it launches
> normally on double-click. This is a one-time prompt because we're
> waiting on Apple Developer enrollment to ship a signed build.

> **Windows says "Windows protected your PC"**
> Click "More info" then "Run anyway". This is SmartScreen's default
> for new apps without a code-signing certificate. We're still
> small; once enough users install we'll either build reputation
> on the existing build OR purchase an EV certificate.

> **Where's my data after I sign in?**
> Vault and wantlist sync through the same Cloudflare Worker as
> mobile. Sign in on desktop and you see the same figures you
> tracked on your phone. Sign out clears the local cache but the
> server-side data stays until you delete your account.

## 7. Release checklist

When cutting a release:

- [ ] Bump version in `app.json` (`expo.version`) AND
      `src-tauri/tauri.conf.json` (`version`) AND
      `src-tauri/Cargo.toml` (`package.version`). They must match.
- [ ] `git tag v0.1.0 && git push --tags` — triggers the desktop
      build CI (`.github/workflows/desktop-release.yml`).
- [ ] CI uploads three binaries to a draft GitHub Release. Review
      and publish.
- [ ] `./scripts/wrangler-deploy.sh` — pushes the matching PWA to
      `app.figurepinner.com`.
- [ ] `./scripts/smoke-web.sh https://app.figurepinner.com` —
      verifies CORS hasn't regressed.
- [ ] Update `figurepinner.com/download` with the new version
      numbers + SHA-256 checksums.
- [ ] Optional: tweet / email the release; the PWA users get the
      update automatically on next visit via the service worker's
      cache-version bump.

## 8. What this launch does NOT do (yet)

Listed here so they're tracked, not lost:

- **Auto-update from inside the app** — deferred (see §4).
- **Code signing for macOS / Windows** — pending Apple Dev cert
  + EV cert decision (see §2).
- **Microsoft Store / Mac App Store distribution** — direct
  download first; revisit once 1-month signal shows install
  friction is the bottleneck.
- **Web push notifications** — needs VAPID + a separate worker
  route; v3 work.
- **System-tray integration / always-on** — Tauri supports it
  with a tray plugin, but for a price-checker (intermittent use)
  the value is low.
- **Multi-window** — current Tauri config is single-window.
  Multi-window collector workflows (compare two figures side by
  side?) are worth measuring demand for first.
