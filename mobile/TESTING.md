# Testing — harness + conventions

The test suite splits into two halves because not all code can run under
the same Jest environment. This doc explains the split, how to run each,
and the mocking conventions so a new test slots in without surprises.

## The split

### Logic-tier (30 suites / 215 tests)

Anything in `__tests__/*.test.ts` (NOT under `__tests__/component/`).

Runs in both:
1. **Sandbox ts-jest harness** — fast, no Expo toolchain. Use
   `scripts/bootstrap-sandbox-tests.sh` when `node_modules` isn't
   installed (code review, CI pre-check). Installs a dozen tool deps
   into `/tmp/fp-test-harness` and drives Jest from there.
2. **jest-expo** via `npm test` — the standard path on dev machines.

Covers:
- Pure logic (`src/shared/**`, `src/collection/reconcile`, formatters)
- API clients (`src/api/**`) with `global.fetch` mocked
- Hooks that don't directly use RN primitives (via mocked modules + RTL
  jsdom) — `useSearch`, `useFigureDetail`, `useCollection`,
  `useCollectionSync`, `useAuthToken`, `useCollectionList`, `useSWR`,
  `useSearchHistory`, `useOnboardingStatus`
- Config (feature flags, linking)
- Analytics dispatch
- Auth helpers (`tokenCache`, `withAuthRetry`)
- Notifications setup (permission + token flow)

### Component-tier (30+ suites)

Anything in `__tests__/component/*.test.tsx` or `*.test.ts`.

Runs ONLY under jest-expo via `npm test` because it imports real
React Native primitives (Pressable, Text, FlatList, etc.). The sandbox
harness's `reactNativeShim` only stubs Platform + AccessibilityInfo
and can't render components.

Covers every screen, every figure-zone component, every presentation
primitive, plus a few hook-adapter tests that exercise the RN side
(`useReduceMotion`, `share`).

## Running

### Standard path

```bash
cd mobile
npm install
npm test            # all suites under jest-expo
npm test -- __tests__/component   # component tier only
npm test -- __tests__/useSWR      # single suite by name pattern
```

### Sandbox path (no `node_modules` required)

```bash
cd mobile
./scripts/bootstrap-sandbox-tests.sh
# Pass-through args go to jest:
./scripts/bootstrap-sandbox-tests.sh --testPathPattern=useCollection
```

## Mocks

All module mocks live under `__tests__/__mocks__/`:

| Module | Mock file | What it stubs |
|---|---|---|
| `@react-native-async-storage/async-storage` | `asyncStorage.ts` | In-memory Map with `__reset` / `__dump` helpers |
| `@clerk/clerk-expo` | `clerkExpo.ts` | `useAuth` / `useUser` / `useClerk` / `ClerkProvider`, plus `__mock.signIn` / `__getTokenCalls` helpers |
| `expo-secure-store` | `expoSecureStore.ts` | In-memory key-value store |
| `expo-notifications` | `expoNotifications.ts` | Permission state + token + channel + `__mock.setPermission` |
| `expo-device` | `expoDevice.ts` | Live `isDevice` getter (flip for simulator tests) |
| `expo-linking` | `expoLinking.ts` | `createURL` stub |
| `@react-navigation/native` | `reactNavigationNative.ts` | `LinkingOptions` type-only surface |
| `react-native` | `reactNativeShim.ts` | `Platform` + `AccessibilityInfo` only |

Both the Jest config's `moduleNameMapper` and the tsconfig's `paths`
point at each file, so test imports resolve at runtime AND type-check
at compile time.

## Conventions

### Name & location
- Pure logic / API / hook test → `__tests__/<name>.test.ts`
- Render / interaction test → `__tests__/component/<Name>.test.tsx`
- One suite per source file when feasible; a `*.v2.test.tsx` sibling
  exists for feature-flag variants (see `SettingsScreen.v2.test.tsx`).

### Structure
```ts
// 1. Imports
// 2. Mock declarations (jest.mock at file top, jest.isolateModules for
//    feature-flag variants)
// 3. Shared test fixtures (figure() helpers, beforeEach resets)
// 4. describe('what it does', () => {
//      it('one specific assertion — no "and" in the name', ...);
//    });
```

### Assertion style
- Prefer `getByLabelText` / `getByRole` / `getByText` over
  `getByTestId`. Accessibility-label assertions double as a11y audit.
- Comment WHY a non-obvious assertion exists. "locks the spec §10
  wording" > "checks label".
- For mocks, assert shape not call count unless the count is the
  contract (e.g. "debounce fires ONCE for 3 rapid rerenders").

### Mount-safety
Hooks that run async work MUST guard `setState` behind a mounted ref.
See `useSearch`, `useCollection`, `useCollectionSync`,
`useSearchHistory` for the pattern. The test for each of those
includes a `does not setState after unmount` case — copy that case
when adding a new hook.

### Flaky-test triage
If a test fails intermittently:
1. Check for missing `await waitFor(...)` around state updates.
2. Check for timers not wrapped in `act` (our `useSearch` debounce
   triggers this — see that test for the pattern).
3. Check for cross-test state leak: `beforeEach` should reset every
   singleton (AsyncStorage `__reset`, `collectionStore.reset`, Clerk
   `__mock.signOut`, `__clearTokenCalls`).

## Adding a new test

Example — adding a test for a new hook `useExample`:

```ts
/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import AsyncStorage from './__mocks__/asyncStorage';
import { useExample } from '../src/hooks/useExample';

const store = AsyncStorage as { __reset: () => void };

beforeEach(() => {
  store.__reset();
});

describe('useExample', () => {
  it('does the thing', async () => {
    const { result } = renderHook(() => useExample());
    await waitFor(() => expect(result.current.state).toBe(...));
  });
});
```

If the hook uses Clerk:
```ts
import { __mock as clerkMock } from './__mocks__/clerkExpo';
// ...
beforeEach(() => {
  clerkMock.signOut();
  clerkMock.resetTokenFactory();
});
```

If the hook uses fetch:
```ts
const originalFetch = global.fetch;
let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});
```

## Known non-coverage

These things are NOT unit-tested because the return on the test is
lower than the cost:

- **Gesture behavior on `ZoomableImage`** — runs on Reanimated's UI
  thread, unreachable from Jest without a worklet harness. Render
  contract IS tested (`ZoomableImage.test.tsx`).
- **`AppNavigator`'s full navigator shape at runtime** — we assert
  on "does it mount without throwing" per flag combination
  (`AppNavigator.test.tsx`), not on the registered route set, because
  React Navigation doesn't expose that.
- **`App.tsx` composition** — exercised transitively through every
  component test that mounts the screens under a `NavigationContainer`.
- **End-to-end flows** — would need Detox or Maestro. Not in scope for
  v1. The DEPLOY.md "Pre-flight QA" checklist is the hand-run replacement.
