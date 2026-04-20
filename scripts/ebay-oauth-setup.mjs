// One-time local helper: walks the eBay OAuth consent flow and prints
// a refresh token (valid ~18 months) to copy into GitHub Secrets.
//
// Prereqs:
//   1. Sign up at https://developer.ebay.com/ (free)
//   2. Create a Production keyset
//   3. In the keyset, set "Auth accepted URL" to http://localhost:8787/callback
//      Copy the generated RuName (e.g. Bubs960-Bubs960Co-PRD-abc123-4e8a2b1c)
//   4. Note your App ID and Cert ID from the keyset
//
// Usage:
//   EBAY_APP_ID=... EBAY_CERT_ID=... EBAY_RUNAME=... node scripts/ebay-oauth-setup.mjs
//
// Or omit env and the script will prompt interactively.
//
// After running:
//   Add 4 secrets to GitHub -> Settings -> Secrets -> Actions:
//     EBAY_APP_ID          (from keyset)
//     EBAY_CERT_ID         (from keyset)
//     EBAY_RUNAME          (from keyset)
//     EBAY_REFRESH_TOKEN   (printed by this script)

import { createServer } from 'node:http';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
].join(' ');

const PORT = 8787;
const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const AUTH_URL = 'https://auth.ebay.com/oauth2/authorize';

async function prompt(q) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(q)).trim();
  rl.close();
  return answer;
}

async function main() {
  let appId = process.env.EBAY_APP_ID;
  let certId = process.env.EBAY_CERT_ID;
  let ruName = process.env.EBAY_RUNAME;

  if (!appId)  appId  = await prompt('EBAY_APP_ID (Client ID from keyset): ');
  if (!certId) certId = await prompt('EBAY_CERT_ID (Client Secret from keyset): ');
  if (!ruName) ruName = await prompt('EBAY_RUNAME (e.g. Bubs960-Bubs960-PRD-abc123-4e8a2b1c): ');

  if (!appId || !certId || !ruName) {
    console.error('All three are required. Aborting.');
    process.exit(1);
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: ruName,
    response_type: 'code',
    scope: SCOPES,
    prompt: 'login',
  });
  const authUrl = `${AUTH_URL}?${params.toString()}`;

  console.log('\nOpen this URL in your browser, log in to eBay, and approve the scopes:');
  console.log(`\n  ${authUrl}\n`);
  console.log(`Waiting for eBay to redirect to http://localhost:${PORT}/callback ...\n`);

  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const code = url.searchParams.get('code');
      const err = url.searchParams.get('error');
      if (err) {
        res.writeHead(400, { 'content-type': 'text/html' });
        res.end(`<h1>eBay auth failed</h1><p>${err}</p>`);
        server.close();
        reject(new Error(`eBay returned error: ${err}`));
        return;
      }
      if (!code) {
        res.writeHead(400);
        res.end('no code in callback');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html><html><head><title>Bubs960 eBay auth</title>
        <style>body{font-family:system-ui;background:#0a0e17;color:#f4f4f4;padding:3rem;text-align:center}
        h1{color:#f1c40f;text-shadow:2px 2px 0 #e62429}</style></head>
        <body><h1>✅ Got it — you can close this tab</h1>
        <p>Return to the terminal to see your refresh token.</p></body></html>`);
      server.close();
      resolve(code);
    });
    server.listen(PORT, () => {});
    setTimeout(() => {
      server.close();
      reject(new Error('Timeout waiting for eBay callback (5 min).'));
    }, 5 * 60 * 1000);
  });

  console.log('Got auth code. Exchanging for refresh token...\n');

  const basic = Buffer.from(`${appId}:${certId}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: ruName,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Token exchange failed (${res.status}): ${text}`);
    process.exit(1);
  }
  const tokens = JSON.parse(text);

  console.log('============================================================');
  console.log('SUCCESS. Copy the refresh token below into GitHub Secrets as:');
  console.log('  Name:  EBAY_REFRESH_TOKEN');
  console.log('  Value: (the string below)');
  console.log('============================================================');
  console.log(tokens.refresh_token);
  console.log('============================================================');
  console.log(`Access token expires in ${tokens.expires_in}s (refresh token lasts ~18 months).`);
  console.log(`Also add these 3 secrets (if you haven't already):`);
  console.log(`  EBAY_APP_ID     = ${appId}`);
  console.log(`  EBAY_CERT_ID    = ${certId}`);
  console.log(`  EBAY_RUNAME     = ${ruName}`);
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
