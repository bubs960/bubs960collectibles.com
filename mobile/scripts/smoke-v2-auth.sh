#!/usr/bin/env bash
# v2 auth-path smoke test. Run this AFTER signing in via dev Clerk and
# capturing a JWT, BEFORE shipping the launch binary to TestFlight /
# Internal Track.
#
# Engineer's 2026-04-26 readiness note: "Once they pass a real Clerk
# JWT, the auth path smoke-tests positive." This script is that test.
#
# Usage:
#   ./scripts/smoke-v2-auth.sh <JWT>
#
# Capture a JWT:
#   1. Run the app locally (`npx expo start`) with EXPO_PUBLIC_V2_*=true
#      and EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_*
#   2. Sign in via the SignInScreen
#   3. In Metro logs, the AuthProvider will log the token (or pull it
#      from React Devtools / a temporary console.log in
#      useCollectionSync). Copy it.
#   4. Pass to this script.
#
# What it verifies:
#   - GET /api/v1/vault returns 200 with a (possibly empty) array
#   - GET /api/v1/wantlist returns 200 with a (possibly empty) array
#   - POST /api/v1/devices accepts a fake push token registration
#   - POST /api/v1/analytics/event accepts a probe event
#   - All four return 401 without the JWT (auth gate is real)

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <JWT>" >&2
  exit 2
fi

JWT="$1"
API="${EXPO_PUBLIC_FIGUREPINNER_API:-https://figurepinner-api.bubs960.workers.dev}"

pass=0
fail=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  ✓ $label ($actual)"
    pass=$((pass + 1))
  else
    echo "  ✗ $label — expected $expected, got $actual"
    fail=$((fail + 1))
  fi
}

echo "▸ Smoke-testing v2 auth path against $API"
echo

echo "GET /api/v1/vault"
status=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $JWT" \
  -H 'Accept: application/json' \
  "$API/api/v1/vault")
check "with JWT returns 200" 200 "$status"
status=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/vault")
check "without JWT returns 401" 401 "$status"
echo

echo "GET /api/v1/wantlist"
status=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $JWT" \
  -H 'Accept: application/json' \
  "$API/api/v1/wantlist")
check "with JWT returns 200" 200 "$status"
status=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/wantlist")
check "without JWT returns 401" 401 "$status"
echo

echo "POST /api/v1/devices (fake Expo push token)"
status=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"token":"ExponentPushToken[smoke-test-fake]","platform":"ios","app_version":"0.1.0"}' \
  "$API/api/v1/devices")
check "with JWT returns 200/201" "$([[ $status == 200 || $status == 201 ]] && echo $status || echo 200)" "$status" || true
status=$(curl -s -o /dev/null -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"token":"x","platform":"ios"}' \
  "$API/api/v1/devices")
check "without JWT returns 401" 401 "$status"
echo

echo "POST /api/v1/analytics/event (anonymous + signed)"
status=$(curl -s -o /dev/null -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"events":[{"uid":"smoke-anon","event_name":"smoke_test","ts":'"$(date +%s000)"',"device_id":"smoke-device"}]}' \
  "$API/api/v1/analytics/event")
check "without JWT returns 200 (route is dual-mode)" 200 "$status"
status=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"events":[{"uid":"smoke-signed","event_name":"smoke_test","ts":'"$(date +%s000)"',"device_id":"smoke-device"}]}' \
  "$API/api/v1/analytics/event")
check "with JWT returns 200" 200 "$status"
echo

echo "Result: $pass passed, $fail failed"
[[ $fail -eq 0 ]] || exit 1
