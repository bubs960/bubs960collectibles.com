// v1 ships only the screens registered in AppNavigator: Onboarding,
// FigureDetail, Search, Settings.
//
// The other route names below are declared so the unreferenced v2 screens
// + hooks (vault, wantlist, alerts, sign-in) keep type-checking. They are
// NOT routed in the navigator today — `navigation.navigate('Vault')` would
// throw at runtime in v1. Re-enable them in v2 by adding the matching
// `<Stack.Screen>` lines back into AppNavigator.

export type RootStackParamList = {
  // ── v1 active ───
  Onboarding: undefined;
  FigureDetail: { figureId: string };
  Search: undefined;
  Settings: undefined;
  // ── v2 declared-but-unrouted ───
  Vault: undefined;
  Wantlist: undefined;
  Sets: undefined;
  Waitlist: undefined;
  Alerts: undefined;
  SignIn: undefined;
};
