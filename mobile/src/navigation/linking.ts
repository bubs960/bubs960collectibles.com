import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Deep-link config.
//
// Figure path narrowed from /figure/:id to /open/:id per reviewer note so
// web engagement on figurepinner.com/figure/:id survives (AASA /figure/*
// would hijack every such link to the app on installed devices, tanking
// web SEO metrics).
//
// Prefixes:
//   - Linking.createURL('/') → expo dev URLs + custom scheme for native
//   - figurepinner:// → custom scheme (iOS / Android)
//   - https://figurepinner.com → marketing-site deep links (AASA / App Links)
//   - https://app.figurepinner.com → the PWA / Tauri-wrapped web origin
//   - tauri://localhost + https://tauri.localhost → Tauri webview origins
//     (Windows/Linux use tauri://, macOS uses https://tauri.localhost).
//     React Navigation strips these to match config.screens paths so an
//     intra-app `Linking.openURL('https://app.figurepinner.com/open/X')`
//     routes via FigureDetail rather than spawning a browser window.
//
// Other routes are kept at their intuitive paths (/vault, /wantlist,
// /sign-in, /alerts). When FEATURES.collectionSync / .alerts are off those
// screens aren't registered in AppNavigator, so an incoming deep link to
// them resolves to no-op (React Navigation drops the deep-link event
// rather than crashing).
//
// Action items NOT in this repo:
//   - Update mobile/native-templates/apple-app-site-association in the
//     Figure Pinner Dev workspace to declare /open/* (NOT /figure/*) for
//     figure detail. Keep /vault, /wantlist, /alerts in the AASA list for
//     v2 cohort installs.
//   - Update assetlinks.json the same way.
//   - Host both at /.well-known/ on figurepinner.com with Content-Type
//     application/json + no redirect.
//   - For app.figurepinner.com (PWA), no AASA needed; the browser handles
//     direct navigation, and the SPA-fallback redirect in public/_redirects
//     ensures /open/:id reaches the React Navigation router.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'figurepinner://',
    'https://figurepinner.com',
    'https://app.figurepinner.com',
    'tauri://localhost',
    'https://tauri.localhost',
  ],
  config: {
    screens: {
      FigureDetail: 'open/:figureId',
      Search: 'search',
      Settings: 'settings',
      Vault: 'vault',
      Wantlist: 'wantlist',
      SignIn: 'sign-in',
      Alerts: 'alerts',
    },
  },
};
