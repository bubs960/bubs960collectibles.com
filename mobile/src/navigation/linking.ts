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
// Other routes are kept at their intuitive paths (/vault, /wantlist,
// /sign-in, /alerts). When FEATURES.collectionSync / .alerts are off those
// screens aren't registered in AppNavigator, so an incoming deep link to
// them resolves to no-op (React Navigation drops the deep-link event
// rather than crashing).
//
// Action item NOT in this repo:
//   - Update mobile/native-templates/apple-app-site-association in the
//     Figure Pinner Dev workspace to declare /open/* (NOT /figure/*) for
//     figure detail. Keep /vault, /wantlist, /alerts in the AASA list for
//     v2 cohort installs.
//   - Update assetlinks.json the same way.
//   - Host both at /.well-known/ on figurepinner.com with Content-Type
//     application/json + no redirect.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'figurepinner://', 'https://figurepinner.com'],
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
