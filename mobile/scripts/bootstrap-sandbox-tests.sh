#!/usr/bin/env bash
# Bootstrap a throwaway ts-jest harness outside node_modules/ so the
# logic-tier suite (28+ files, 200+ tests) can be re-run WITHOUT going
# through jest-expo + the full RN install.
#
# When to use: code review, CI pre-check, or a quick "did I break the
# shared-logic contract" during a refactor. NOT a replacement for the
# full `npm test` — component tests require jest-expo's RN runtime.
#
# Output: prints pass/fail summary + exits non-zero on any failure.

set -euo pipefail

HARNESS_DIR="${HARNESS_DIR:-/tmp/fp-test-harness}"
MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "▸ Bootstrapping ts-jest harness at $HARNESS_DIR"
mkdir -p "$HARNESS_DIR"
cd "$HARNESS_DIR"

if [[ ! -f package.json ]]; then
  npm init -y >/dev/null
fi

# Install only the toolchain deps — no RN, no Expo, no Clerk.
# React + @testing-library/react cover the hook-layer tests that use
# jsdom; the rest is pure TS + ts-jest.
npm install --no-save --silent \
  jest@29 \
  ts-jest@29 \
  typescript@5 \
  @types/jest@29 \
  @types/node \
  react@18 \
  react-dom@18 \
  @testing-library/react@14 \
  jest-environment-jsdom@29 \
  @types/react@18 \
  @types/react-dom@18 \
  >/dev/null

cat > "$HARNESS_DIR/tsconfig.test.json" <<TSC
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2020",
    "jsx": "react",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["jest", "node"],
    "typeRoots": [
      "$HARNESS_DIR/node_modules/@types",
      "$MOBILE_DIR/node_modules/@types"
    ],
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "baseUrl": "$MOBILE_DIR",
    "paths": {
      "@/*": ["src/*"],
      "@react-native-async-storage/async-storage": ["./__tests__/__mocks__/asyncStorage"],
      "@clerk/clerk-expo": ["./__tests__/__mocks__/clerkExpo"],
      "expo-secure-store": ["./__tests__/__mocks__/expoSecureStore"],
      "expo-notifications": ["./__tests__/__mocks__/expoNotifications"],
      "expo-device": ["./__tests__/__mocks__/expoDevice"],
      "expo-linking": ["./__tests__/__mocks__/expoLinking"],
      "@react-navigation/native": ["./__tests__/__mocks__/reactNavigationNative"],
      "react-native": ["./__tests__/__mocks__/reactNativeShim"],
      "@testing-library/react": ["$HARNESS_DIR/node_modules/@testing-library/react"],
      "@testing-library/*": ["$HARNESS_DIR/node_modules/@testing-library/*"],
      "react": ["$HARNESS_DIR/node_modules/react"],
      "react-dom": ["$HARNESS_DIR/node_modules/react-dom"]
    }
  },
  "include": [
    "$MOBILE_DIR/src/shared/**/*",
    "$MOBILE_DIR/src/api/**/*",
    "$MOBILE_DIR/src/cache/**/*",
    "$MOBILE_DIR/src/hooks/**/*",
    "$MOBILE_DIR/src/auth/**/*",
    "$MOBILE_DIR/src/collection/**/*",
    "$MOBILE_DIR/src/onboarding/**/*",
    "$MOBILE_DIR/src/analytics/**/*",
    "$MOBILE_DIR/src/config/**/*",
    "$MOBILE_DIR/src/notifications/**/*",
    "$MOBILE_DIR/src/search/**/*",
    "$MOBILE_DIR/src/types/**/*",
    "$MOBILE_DIR/__tests__/**/*"
  ]
}
TSC

cat > "$HARNESS_DIR/ci.jest.config.cjs" <<CFG
module.exports = {
  rootDir: '$MOBILE_DIR',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)\$': '<rootDir>/src/\$1',
    '^@react-native-async-storage/async-storage\$': '<rootDir>/__tests__/__mocks__/asyncStorage.ts',
    '^@clerk/clerk-expo\$': '<rootDir>/__tests__/__mocks__/clerkExpo.ts',
    '^expo-secure-store\$': '<rootDir>/__tests__/__mocks__/expoSecureStore.ts',
    '^expo-notifications\$': '<rootDir>/__tests__/__mocks__/expoNotifications.ts',
    '^expo-device\$': '<rootDir>/__tests__/__mocks__/expoDevice.ts',
    '^expo-linking\$': '<rootDir>/__tests__/__mocks__/expoLinking.ts',
    '^@react-navigation/native\$': '<rootDir>/__tests__/__mocks__/reactNavigationNative.ts',
    '^react-native\$': '<rootDir>/__tests__/__mocks__/reactNativeShim.ts',
  },
  transform: {
    '^.+\\\\.tsx?\$': ['ts-jest', { tsconfig: '$HARNESS_DIR/tsconfig.test.json' }],
  },
};
CFG

echo "▸ Running logic-tier suite (skipping __tests__/component — requires jest-expo)"
cd "$MOBILE_DIR"
NODE_PATH="$HARNESS_DIR/node_modules" \
  "$HARNESS_DIR/node_modules/.bin/jest" \
    --config "$HARNESS_DIR/ci.jest.config.cjs" \
    --no-coverage \
    --testPathIgnorePatterns=__tests__/component \
    "$@"
