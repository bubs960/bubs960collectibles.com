import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Deep-link config (v1 read-only scope).
//
// Path narrowed from /figure/:id to /open/:id per reviewer note: the broader
// /figure/* AASA pattern hijacks every figurepinner.com/figure/:id link from
// the browser to the app on installed devices, which kills the web's
// engagement metrics + tanks SEO over time (Google sees pages with no
// dwell). /open/* is an explicit "this link belongs in the app" namespace.
//
// Action item NOT in this repo:
//   - Update mobile/native-templates/apple-app-site-association in the
//     Figure Pinner Dev workspace to declare /open/* (NOT /figure/*).
//   - Update assetlinks.json the same way.
//   - Re-host both at /.well-known/ on figurepinner.com with Content-Type
//     application/json + no redirect.
// Without those AASA edits, https://figurepinner.com/open/:id won't open
// the app even with the app installed — only figurepinner://open/:id will.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'figurepinner://', 'https://figurepinner.com'],
  config: {
    screens: {
      FigureDetail: 'open/:figureId',
      Search: 'search',
      Settings: 'settings',
    },
  },
};
