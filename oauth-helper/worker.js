// Bubs960 eBay-Sync — Shopify OAuth handler
//
// Tiny Cloudflare Worker that catches the OAuth install callback when you
// install your Shopify Partner app on your store. Outputs the long-lived
// Admin API access token (shpat_*) so you can paste it into GitHub Secrets.
//
// Deploy via Cloudflare's Workers dashboard or `wrangler deploy`.
// Requires two secrets:
//   SHOPIFY_API_KEY     (Client ID from your Shopify Partner app)
//   SHOPIFY_API_SECRET  (Client Secret from your Shopify Partner app)
//
// Routes:
//   GET /                       -> static help text
//   GET /install?shop=...       -> redirect user to Shopify consent screen
//   GET /callback?code=...      -> Shopify redirects here; we exchange code for token

const SCOPES = 'read_products,write_products,read_inventory,write_inventory,read_locations';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/install') return handleInstall(url, env);
    if (url.pathname === '/callback') return handleCallback(url, env);

    return new Response(
      `Bubs960 Shopify OAuth helper.\n\nTo install on your store:\n  ${url.origin}/install?shop=YOUR-STORE.myshopify.com\n`,
      { status: 200, headers: { 'Content-Type': 'text/plain' } }
    );
  },
};

function handleInstall(url, env) {
  const shop = url.searchParams.get('shop');
  if (!shop || !/^[a-z0-9-]+\.myshopify\.com$/i.test(shop)) {
    return new Response('Invalid ?shop param. Format: YOUR-STORE.myshopify.com', { status: 400 });
  }
  if (!env.SHOPIFY_API_KEY) {
    return new Response('SHOPIFY_API_KEY not configured on the worker.', { status: 500 });
  }
  const redirectUri = `${url.origin}/callback`;
  const state = crypto.randomUUID();
  const consentUrl = `https://${shop}/admin/oauth/authorize?` + new URLSearchParams({
    client_id: env.SHOPIFY_API_KEY,
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
    'grant_options[]': 'per-user' ? '' : '', // offline access token by default
  }).toString();
  return Response.redirect(consentUrl, 302);
}

async function handleCallback(url, env) {
  const shop = url.searchParams.get('shop');
  const code = url.searchParams.get('code');
  if (!shop || !code) {
    return new Response('Missing ?shop or ?code in callback.', { status: 400 });
  }
  if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET) {
    return new Response('Worker secrets not configured.', { status: 500 });
  }

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    return new Response(`Token exchange failed (${tokenRes.status}):\n${errText}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const data = await tokenRes.json();
  const token = data.access_token || '';
  const scope = data.scope || '';

  const html = `<!doctype html>
<html><head><title>Bubs960 — Token Captured</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0a0e17; color: #f4f4f4; padding: 2rem; max-width: 760px; margin: auto; line-height: 1.5; }
  h1 { color: #f1c40f; text-shadow: 2px 2px 0 #e62429; }
  code { background: #1a2233; color: #f4f4f4; padding: 0.6rem 0.8rem; display: block; word-break: break-all; border: 2px solid #f1c40f; border-radius: 6px; margin: 1rem 0; font-size: 0.95rem; }
  .warn { color: #ff6b6b; font-weight: bold; }
  .ok { color: #2ecc71; }
  a { color: #f1c40f; }
  ol { line-height: 1.8; }
</style>
</head><body>
<h1>✅ Token captured</h1>
<p>Copy this token <strong>now</strong> and paste it into GitHub Secrets as <code style="display:inline;padding:0.2rem 0.4rem;">SHOPIFY_ADMIN_TOKEN</code>:</p>
<code>${token}</code>
<p class="warn">⚠️ This page will not show the token again. Save it before navigating away.</p>
<p class="ok">Scopes granted: ${scope}</p>
<h3>Next steps</h3>
<ol>
<li>Open <a href="https://github.com/bubs960/bubs960collectibles.com/settings/secrets/actions" target="_blank">GitHub Secrets</a></li>
<li>Click <strong>SHOPIFY_ADMIN_TOKEN</strong> → Update → paste the token above → Save</li>
<li>Run the workflow: <a href="https://github.com/bubs960/bubs960collectibles.com/actions/workflows/ebay-active-sync.yml" target="_blank">Sync eBay Active Listings to Shopify</a></li>
</ol>
</body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
