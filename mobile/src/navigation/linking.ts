import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Deep-link config.
//
// Paths here MUST match mobile/native-templates/apple-app-site-association
// and mobile/native-templates/assetlinks.json in the Figure Pinner Dev
// workspace — any mismatch means a shared link opens the browser instead of
// the app. The AASA declares: /figure/*, /vault, /wantlist, /sets, /search*,
// and a catch-all /*/*/* for SEO URLs. The catch-all is not routed here; it
// should fall through to a 404 / deep-link-not-recognized screen once we add
// error handling.
//
// Hosting the AASA is done on the figurepinner-site worker at
// /.well-known/apple-app-site-association — see docs/SERVER-ENDPOINTS-NEEDED.md §7.
// Two launch gotchas to verify before shipping:
//   1. AASA must return Content-Type: application/json, status 200, no
//      redirect, no file extension.
//   2. assetlinks.json needs both debug + release SHA-256 fingerprints in the
//      array or dev builds won't open links.
// Also note: AASA /figure/* routing means once shipped, ANY tap on a
// figurepinner.com/figure/:id link with the app installed goes straight to
// the app, never to the web. If you need a subset of links to stay in the
// browser (e.g. for SEO or affiliate landing), narrow AASA to /open/* and
// mint app-specific URLs deliberately.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'figurepinner://', 'https://figurepinner.com'],
  config: {
    screens: {
      FigureDetail: 'figure/:figureId',
      Search: 'search',
      Vault: 'vault',
      Wantlist: 'wantlist',
      Sets: 'sets',
      Waitlist: 'waitlist',
      SignIn: 'sign-in',
      Settings: 'settings',
      Alerts: 'alerts',
    },
  },
};
