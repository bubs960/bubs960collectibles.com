# Component render tests

These tests exercise the component layer via `@testing-library/react-native`.
They require the full `jest-expo` preset (React Native runtime + module
mocks) and are intentionally excluded from the sandbox ts-jest harness used
for pure-logic suites.

Run them with:

```
cd mobile
npm install
npm test -- __tests__/component
```

If you only see `Test Suites:` output without these running, check:

1. `jest-expo` preset is set in `package.json` (it is).
2. `@testing-library/react-native` is installed (added as a devDep).
3. Metro / jest isn't caching a stale transform — try `jest --clearCache`.
