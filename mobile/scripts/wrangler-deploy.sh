#!/usr/bin/env bash
# One-command Cloudflare Pages deploy of the Expo Web build.
#
# Flow:
#   1. Sanity-check wrangler is installed and the session is live.
#   2. `npm run web:build` produces ./dist (Expo Web export).
#   3. Copy public/ assets into dist/ so _headers + _redirects +
#      manifest.json + sw.js end up in the deploy.
#   4. `wrangler pages deploy ./dist` uploads + returns the
#      *.pages.dev URL and (if custom domain attached) promotes it
#      to app.figurepinner.com on the production branch.
#
# Usage:
#   ./scripts/wrangler-deploy.sh                     # production
#   ./scripts/wrangler-deploy.sh --preview           # preview branch
#   ./scripts/wrangler-deploy.sh --project foo       # override project
#
# Prereqs (per machine):
#   npm install -g wrangler && wrangler login

set -euo pipefail

PROJECT="figurepinner-app"
BRANCH="main"
MODE="production"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --preview) MODE="preview"; BRANCH="$(git branch --show-current)"; shift ;;
    --project) PROJECT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$MOBILE_DIR"

# 1. wrangler installed?
if ! command -v wrangler >/dev/null 2>&1; then
  echo "✗ wrangler not found. Install with: npm install -g wrangler" >&2
  exit 1
fi

# 2. wrangler logged in? `wrangler whoami` exits non-zero when not.
if ! wrangler whoami >/dev/null 2>&1; then
  echo "✗ wrangler not logged in. Run: wrangler login" >&2
  exit 1
fi

# 3. Build the web bundle.
echo "▸ Building Expo Web bundle..."
npm run web:build

# 4. Stage public/ assets into dist/. Expo's `expo export --platform
#    web` doesn't auto-copy the public folder — _headers and
#    _redirects need to be alongside index.html for Cloudflare Pages
#    to pick them up.
if [[ -d public ]]; then
  echo "▸ Copying public/ → dist/"
  cp -R public/. dist/
fi

# 5. Deploy.
echo "▸ Deploying to project=$PROJECT branch=$BRANCH"
wrangler pages deploy ./dist \
  --project-name "$PROJECT" \
  --branch "$BRANCH" \
  --commit-dirty=true

echo
echo "✓ Done. Check the printed *.pages.dev URL above; on production it"
echo "  also propagates to app.figurepinner.com within ~30s if the"
echo "  custom domain is attached."
