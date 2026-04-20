// Polls eBay's Fulfillment API for recent orders and marks matching
// Shopify products sold (adds the "sold" tag, sets inventory to 0).
// Our site treats status=sold OR tag=sold as SOLD — so the product
// page renders the SOLD stamp and buy buttons disable.
//
// Runs on a 15-minute cron via .github/workflows/ebay-sold-sync.yml.
// Can also be run locally for testing once all env is set.
//
// Required env:
//   EBAY_APP_ID, EBAY_CERT_ID, EBAY_RUNAME, EBAY_REFRESH_TOKEN
//   SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN
//
// Optional env:
//   EBAY_LOOKBACK_MINUTES  (default 120 — how far back to scan)

const SHOPIFY_API_VERSION = '2024-01';
const EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_ORDERS_URL = 'https://api.ebay.com/sell/fulfillment/v1/order';
const SCOPES = 'https://api.ebay.com/oauth/api_scope/sell.fulfillment';

const {
  EBAY_APP_ID, EBAY_CERT_ID, EBAY_REFRESH_TOKEN,
  SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN,
  EBAY_LOOKBACK_MINUTES = '120',
} = process.env;

const REQUIRED = ['EBAY_APP_ID', 'EBAY_CERT_ID', 'EBAY_REFRESH_TOKEN', 'SHOPIFY_STORE', 'SHOPIFY_ADMIN_TOKEN'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.log(`[sync-ebay-sold] ${key} not set — skipping sync.`);
    process.exit(0);
  }
}

// ---------- eBay access token (refresh-token flow) ----------
async function getEbayAccessToken() {
  const basic = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: EBAY_REFRESH_TOKEN,
    scope: SCOPES,
  });
  const res = await fetch(EBAY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`eBay token refresh failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

// ---------- eBay: fetch recent orders + extract sold SKUs ----------
async function fetchRecentSoldSkus(accessToken) {
  const lookbackMs = Number(EBAY_LOOKBACK_MINUTES) * 60 * 1000;
  const since = new Date(Date.now() - lookbackMs).toISOString();
  const filter = `creationdate:[${since}..]`;

  const skus = new Set();
  let offset = 0;
  let total = 0;

  while (true) {
    const url = `${EBAY_ORDERS_URL}?filter=${encodeURIComponent(filter)}&limit=200&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    });
    if (!res.ok) throw new Error(`eBay orders fetch failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const orders = data.orders ?? [];
    total = data.total ?? orders.length;

    for (const order of orders) {
      // Skip cancelled orders — don't mark those sold.
      if (order.cancelStatus?.cancelState === 'CANCELED') continue;
      for (const item of order.lineItems ?? []) {
        if (item.sku) skus.add(item.sku);
      }
    }

    offset += orders.length;
    if (orders.length === 0 || offset >= total) break;
  }

  console.log(`[sync-ebay-sold] eBay orders scanned: ${total}. Unique sold SKUs: ${skus.size}.`);
  return skus;
}

// ---------- Shopify: find products by SKU, mark sold ----------
async function shopify(method, path, body) {
  const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}${path}`, {
    method,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Shopify ${method} ${path} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

// Build a SKU -> product index by paging all products.
async function indexShopifyProductsBySku() {
  const index = new Map();
  let pageUrl = `/products.json?limit=250&fields=id,handle,title,tags,variants,status`;
  let pageCount = 0;

  while (pageUrl) {
    const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}${pageUrl}`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Shopify product index failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    for (const p of data.products ?? []) {
      for (const v of p.variants ?? []) {
        if (v.sku) index.set(v.sku, p);
      }
    }
    pageCount++;

    // Shopify paginates via Link header.
    const link = res.headers.get('Link') || '';
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = nextMatch ? nextMatch[1].replace(`https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}`, '') : null;
  }

  console.log(`[sync-ebay-sold] Shopify products indexed: ${index.size} SKUs across ${pageCount} page(s).`);
  return index;
}

async function markSold(product) {
  const tagList = (product.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const alreadySold = tagList.some((t) => t.toLowerCase() === 'sold');
  if (alreadySold) return false;

  tagList.push('sold');
  const newTags = tagList.join(', ');

  await shopify('PUT', `/products/${product.id}.json`, {
    product: { id: product.id, tags: newTags },
  });
  return true;
}

// ---------- main ----------
async function main() {
  console.log(`[sync-ebay-sold] Lookback window: ${EBAY_LOOKBACK_MINUTES} min.`);

  const accessToken = await getEbayAccessToken();
  const soldSkus = await fetchRecentSoldSkus(accessToken);

  if (soldSkus.size === 0) {
    console.log('[sync-ebay-sold] No recent eBay orders with SKUs. Nothing to sync.');
    return;
  }

  const productIndex = await indexShopifyProductsBySku();

  let updated = 0;
  let missingInShopify = 0;
  let alreadyMarked = 0;

  for (const sku of soldSkus) {
    const product = productIndex.get(sku);
    if (!product) {
      missingInShopify++;
      console.log(`[sync-ebay-sold]   (no Shopify match for SKU ${sku})`);
      continue;
    }
    try {
      const changed = await markSold(product);
      if (changed) {
        updated++;
        console.log(`[sync-ebay-sold]   marked sold: ${product.handle} (SKU ${sku})`);
      } else {
        alreadyMarked++;
      }
    } catch (err) {
      console.error(`[sync-ebay-sold]   FAILED to mark ${sku}: ${err.message}`);
    }
  }

  console.log(`[sync-ebay-sold] Done. Marked sold: ${updated}. Already sold: ${alreadyMarked}. Not in Shopify: ${missingInShopify}.`);
}

main().catch((err) => {
  console.error(`[sync-ebay-sold] FATAL: ${err.message}`);
  process.exit(1);
});
