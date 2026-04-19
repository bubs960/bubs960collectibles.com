/**
 * Type-surface stand-in for @react-navigation/native. Only exports the
 * pieces sandbox-tested source files reference (LinkingOptions type).
 * Component-layer tests use the real package via jest-expo.
 */

export interface LinkingOptions<ParamList extends Record<string, unknown>> {
  prefixes: string[];
  config?: {
    screens: Partial<Record<keyof ParamList, string>>;
  };
}
