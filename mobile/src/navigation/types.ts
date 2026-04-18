// Route params. Keep in sync with linking.ts and mobile/native-templates/
// apple-app-site-association — every path declared in AASA must have a route
// here or the deep-link resolver will no-op on arrival.

export type RootStackParamList = {
  Onboarding: undefined;
  FigureDetail: { figureId: string };
  Search: undefined;
  Vault: undefined;
  Wantlist: undefined;
  Sets: undefined;
  Waitlist: undefined;
  SignIn: undefined;
  Settings: undefined;
  Alerts: undefined;
};
