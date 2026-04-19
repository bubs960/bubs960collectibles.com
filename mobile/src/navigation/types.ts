// v1 scope: read-only browser. The vault/wantlist/alerts/auth surfaces ship
// in v2 once the Worker exposes the corresponding endpoints. Their screens
// + hooks live under src/screens, src/hooks, src/collection, src/auth, and
// src/notifications — they're just unreferenced here.

export type RootStackParamList = {
  Onboarding: undefined;
  FigureDetail: { figureId: string };
  Search: undefined;
  Settings: undefined;
};
