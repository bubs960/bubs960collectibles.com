#!/usr/bin/env bash
# Probes the Worker from a fake web origin to verify the CORS headers
# allow our PWA / Tauri shell to call it. Run this once you deploy
# the PWA, before you let real users near it, to catch CORS
# misconfigurations the moment they would actually bite.
#
# Background: the worker's CORS policy needs to include the
# production PWA origin (default: app.figurepinner.com) in its
# Access-Control-Allow-Origin allowlist. If it's not there, every
# fetch from the PWA fails preflight and the screen shows
# "Network request failed" with no useful console message.
#
# Usage:
#   ./scripts/smoke-web.sh                        # checks app.figurepinner.com
#   ./scripts/smoke-web.sh https://my-preview.pages.dev
#
# What it checks:
#   1. Preflight (OPTIONS) on /api/v1/search succeeds and includes
#      the expected Access-Control-Allow-Origin echo of our origin.
#   2. Preflight on /api/v1/vault includes Authorization in
#      Access-Control-Allow-Headers (signed routes).
#   3. Actual GET /api/v1/figure/:id from the origin returns the
#      figure shape (proxy for "CORS doesn't strip the body").
#   4. POST preflight to /api/v1/analytics/event includes the right
#      Content-Type allow-header.

set -euo pipefail

ORIGIN="${1:-https://app.figurepinner.com}"
API="${EXPO_PUBLIC_FIGUREPINNER_API:-https://figurepinner-api.bubs960.workers.dev}"

pass=0
fail=0

check_header() {
  local label="$1"
  local headers="$2"
  local needle="$3"
  if grep -i -q "$needle" <<< "$headers"; then
    echo "  ✓ $label (matched $needle)"
    pass=$((pass + 1))
  else
    echo "  ✗ $label — expected header matching '$needle'"
    echo "    Headers:"
    echo "$headers" | sed 's/^/    /'
    fail=$((fail + 1))
  fi
}

echo "▸ Smoke-testing CORS from $ORIGIN against $API"
echo

# 1. Preflight on /api/v1/search
echo "OPTIONS /api/v1/search"
hdrs=$(curl -s -X OPTIONS -D - -o /dev/null \
  -H "Origin: $ORIGIN" \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: x-client' \
  "$API/api/v1/search?q=test")
check_header "Access-Control-Allow-Origin echoes $ORIGIN" "$hdrs" "access-control-allow-origin: \($ORIGIN\|\*\)"
check_header "Access-Control-Allow-Methods includes GET" "$hdrs" 'access-control-allow-methods:.*GET'
echo

# 2. Preflight on /api/v1/vault (signed route — needs Authorization)
echo "OPTIONS /api/v1/vault"
hdrs=$(curl -s -X OPTIONS -D - -o /dev/null \
  -H "Origin: $ORIGIN" \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: authorization,x-client' \
  "$API/api/v1/vault")
check_header "Access-Control-Allow-Origin allowed" "$hdrs" "access-control-allow-origin: \($ORIGIN\|\*\)"
check_header "Allow-Headers includes Authorization" "$hdrs" 'access-control-allow-headers:.*[Aa]uthorization'
echo

# 3. Actual GET from the origin
echo "GET /api/v1/figure/fp_wrestling_mattel_elite_3_the-miz_7770c5"
resp=$(curl -s -H "Origin: $ORIGIN" -H 'X-Client: smoke-web' \
  "$API/api/v1/figure/fp_wrestling_mattel_elite_3_the-miz_7770c5")
if grep -q '"figure_id"\|"match_quality"' <<< "$resp"; then
  echo "  ✓ Response carries figure body (CORS didn't strip it)"
  pass=$((pass + 1))
else
  echo "  ✗ Response missing figure_id / match_quality"
  echo "    Body: $resp"
  fail=$((fail + 1))
fi
echo

# 4. Preflight on the analytics POST
echo "OPTIONS /api/v1/analytics/event"
hdrs=$(curl -s -X OPTIONS -D - -o /dev/null \
  -H "Origin: $ORIGIN" \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' \
  "$API/api/v1/analytics/event")
check_header "Allow-Methods includes POST" "$hdrs" 'access-control-allow-methods:.*POST'
check_header "Allow-Headers includes Content-Type" "$hdrs" 'access-control-allow-headers:.*[Cc]ontent-[Tt]ype'
echo

echo "Result: $pass passed, $fail failed"
[[ $fail -eq 0 ]] || exit 1
