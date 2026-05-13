# Tauri desktop shell

Wraps the Expo Web build output into a real `.exe` / `.dmg` / `.deb`
desktop binary. Runs the same React tree as iOS / Android / PWA —
no separate codebase.

## First-time setup (per machine)

1. Install Rust toolchain:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
2. Platform-specific deps:
   - **macOS:** `xcode-select --install` (Xcode CLI tools).
   - **Windows:** Microsoft C++ Build Tools (installer at
     <https://visualstudio.microsoft.com/visual-cpp-build-tools/>),
     plus the WebView2 runtime if not already installed.
   - **Linux:** `sudo apt install libwebkit2gtk-4.1-dev build-essential
     curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev
     librsvg2-dev` (Debian/Ubuntu; equivalent packages on other
     distros).
3. Generate the icon set from a 1024×1024 PNG:
   ```bash
   cd mobile
   npx tauri icon assets/icon-1024.png
   ```
   This writes 32x32 / 128x128 / @2x / `icon.icns` / `icon.ico` into
   `src-tauri/icons/`. Re-run when the source icon changes.

## Run the dev shell

```bash
cd mobile
npm run tauri:dev
```

This boots `expo start --web` on port 8081, then launches the Tauri
window pointed at it. Hot reload works — edits in `src/` rebuild
the React bundle and the Tauri window reloads automatically.

## Build the production binaries

```bash
cd mobile
npm run tauri:build
```

Output:
- **macOS:** `src-tauri/target/release/bundle/dmg/FigurePinner_0.1.0_<arch>.dmg`
- **Windows:** `src-tauri/target/release/bundle/msi/FigurePinner_0.1.0_x64_en-US.msi`
- **Linux:** `src-tauri/target/release/bundle/deb/figurepinner_0.1.0_amd64.deb`

You can only build the platform you're currently on (cross-compilation
is a separate Tauri topic — for v1 we build on each platform we ship).

## Distribution

- **Direct download** (week-1 default): host the .dmg / .msi / .deb on
  `figurepinner.com/download` or a GitHub release. Users right-click →
  Open on macOS (unsigned) to bypass Gatekeeper on first launch.
- **Microsoft Store** (optional, later): submit the .msi via Partner
  Center. Free for free apps.
- **Mac App Store** (optional, later): requires the same Apple
  Developer cert mobile is waiting on. Notarization step adds ~10
  min to the build.
- **Linux**: direct .deb is the lowest-friction. Snap / Flatpak are
  optional.

## Configuration

- **Window size, decorations, CSP:** `tauri.conf.json` → `app.windows[]`
  and `app.security.csp`.
- **Permissions:** `capabilities/default.json` (Tauri v2 capability
  system). Add new permissions here as the app needs them.
- **Bundle metadata** (name, description, copyright, identifier):
  `tauri.conf.json` → `bundle` + `identifier`.

## Common pitfalls

- **CSP blocks Clerk / the worker:** if sign-in fails with a CSP
  violation in the devtools console, add the offending origin to
  `app.security.csp` → `connect-src` or `frame-src`.
- **White screen on launch (production build):** usually means
  `frontendDist` doesn't match where `npm run web:build` actually
  outputs. Default is `../dist`; if Expo changes it, edit
  `tauri.conf.json` → `build.frontendDist`.
- **`failed to find webview2`** on Windows: install the WebView2
  runtime evergreen bootstrapper from Microsoft. Tauri docs link.
- **Rust toolchain "command not found"** in a fresh terminal:
  `source $HOME/.cargo/env` or restart the shell.
