import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Acceptance criterion: `figurepinner://figure/[figure_id]` opens the detail
// screen directly (spec §13).
//
// figurepinner.com is the MARKETING site (HTML-only), not the API. Listing it
// here is intentional — it enables iOS Universal Links / Android App Links so
// a tap on a marketing page link opens the native app directly. For this to
// actually work we still need apple-app-site-association + assetlinks.json
// hosted on figurepinner.com pointing at this bundle.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'figurepinner://', 'https://figurepinner.com'],
  config: {
    screens: {
      FigureDetail: 'figure/:figureId',
      SignIn: 'sign-in',
    },
  },
};
