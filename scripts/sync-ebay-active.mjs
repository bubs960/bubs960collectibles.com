// One-shot (re-runnable) seeder: pulls all of your active eBay listings via the
// Browse API and creates matching Shopify products. Skips any listing whose
// SKU (BUBS-EB-<eBayItemId>) already exists in Shopify, so you can re-run
// safely after listing new items on eBay.
//
// Shopify price = eBay price × (1 - DISCOUNT_PCT/100).  Default 15% off.
// eBay price is preserved as the Shopify "Compare At" price so the savings
// render on product pages.
//
// Required env:
//   EBAY_APP_ID, EBAY_CERT_ID, EBAY_SELLER_USERNAME
//   SHOPIFY_STORE  (e.g. bubs960-collectibles.myshopify.com)
//   SHOPIFY_ADMIN_TOKEN
//
// Optional env:
//   DISCOUNT_PCT          (default 15)
//   PRODUCT_STATUS        (default "active" — set to "draft" to stage in Shopify)
//   DRY_RUN               (set to "1" to skip Shopify writes; just print plan)
//   MAX_ITEMS             (cap total items processed — useful for first-run test)
//
// Usage (local):
//   $env:EBAY_APP_ID="..."; $env:EBAY_CERT_ID="..."; $env:EBAY_SELLER_USERNAME="bubs960";
//   $env:SHOPIFY_STORE="bubs960-collectibles.myshopify.com"; $env:SHOPIFY_ADMIN_TOKEN="shpat_...";
//   node scripts/sync-ebay-active.mjs
//
// First-run smoke test (5 items, no writes):
//   $env:MAX_ITEMS="5"; $env:DRY_RUN="1"; node scripts/sync-ebay-active.mjs

const EBAY_TOKEN_URL  = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const EBAY_ITEM_URL   = 'https://api.ebay.com/buy/browse/v1/item';
const EBAY_SCOPE      = 'https://api.ebay.com/oauth/api_scope';
const SHOPIFY_API_VERSION = '2024-01';

const {
  EBAY_APP_ID, EBAY_CERT_ID, EBAY_SELLER_USERNAME,
  SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN,
  DISCOUNT_PCT = '15',
  PRODUCT_STATUS = 'active',
  DRY_RUN, MAX_ITEMS,
  // Browse API requires q/category_ids/etc. alongside seller filter. Default
  // covers Toys & Hobbies (220), Collectibles (1), Sports Mem (64482),
  // Coins & Paper Money (11116), Video Games (1249). Override per run with
  // EBAY_CATEGORIES env var (comma-separated top-level eBay category IDs).
  EBAY_CATEGORIES = '220,1,64482,11116,1249',
} = process.env;

const REQUIRED = ['EBAY_APP_ID', 'EBAY_CERT_ID', 'EBAY_SELLER_USERNAME', 'SHOPIFY_STORE', 'SHOPIFY_ADMIN_TOKEN'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[sync-ebay-active] Missing required env: ${key}`);
    process.exit(1);
  }
}

const DISCOUNT_MULT = 1 - Number(DISCOUNT_PCT) / 100;
if (!Number.isFinite(DISCOUNT_MULT) || DISCOUNT_MULT <= 0 || DISCOUNT_MULT > 1) {
  console.error(`[sync-ebay-active] Invalid DISCOUNT_PCT: ${DISCOUNT_PCT}`);
  process.exit(1);
}
const DRY = DRY_RUN === '1' || DRY_RUN === 'true';
const MAX = MAX_ITEMS ? Number(MAX_ITEMS) : Infinity;

// ---------- eBay app token (client_credentials) ----------
async function getEbayAppToken() {
  const basic = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'client_credentials', scope: EBAY_SCOPE });
  const res = await fetch(EBAY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`eBay token failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

// ---------- eBay: page through seller's active listings ----------
async function fetchAllSellerItems(token) {
  const items = [];
  const filter = `sellers:{${EBAY_SELLER_USERNAME}}`;
  const limit = 200;
  let offset = 0;

  while (true) {
    // Browse API requires q/category_ids/etc. even with a seller filter — use top-level categories.
    const url = `${EBAY_SEARCH_URL}?category_ids=${encodeURIComponent(EBAY_CATEGORIES)}&filter=${encodeURIComponent(filter)}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    });
    if (!res.ok) throw new Error(`eBay search failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const batch = data.itemSummaries ?? [];
    items.push(...batch);
    const total = data.total ?? items.length;
    console.log(`[sync-ebay-active] eBay page offset=${offset} got=${batch.length} total=${total}`);
    if (batch.length === 0 || items.length >= total) break;
    offset += batch.length;
    if (items.length >= MAX) break;
  }
  return items.slice(0, MAX);
}

// ---------- eBay: fetch one item's full detail (for description + all images) ----------
async function fetchItemDetail(token, itemId) {
  const url = `${EBAY_ITEM_URL}/${encodeURIComponent(itemId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  });
  if (!res.ok) {
    console.warn(`[sync-ebay-active]   detail fetch failed for ${itemId} (${res.status}) — using summary only`);
    return null;
  }
  return res.json();
}

// ---------- Shopify helpers ----------
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

async function indexShopifyBySku() {
  const index = new Map();
  let pageUrl = `/products.json?limit=250&fields=id,handle,variants`;
  while (pageUrl) {
    const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}${pageUrl}`, {
      headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Shopify index failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    for (const p of data.products ?? []) {
      for (const v of p.variants ?? []) {
        if (v.sku) index.set(v.sku, p);
      }
    }
    const link = res.headers.get('Link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = next ? next[1].replace(`https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}`, '') : null;
  }
  return index;
}

async function getPrimaryLocationId() {
  const data = await shopify('GET', '/locations.json');
  const active = (data.locations ?? []).filter((l) => l.active);
  if (active.length === 0) throw new Error('No active Shopify locations found.');
  return active[0].id;
}

// ---------- mapping helpers ----------
function slugify(s) {
  return (s ?? '').toString()
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function guessProductType(title = '') {
  const t = title.toLowerCase();
  if (/\b(wwe|wwf|aew|nwa|wcw|njpw|wrestling)\b/.test(t)) return 'Wrestling Figures';
  if (/\b(funko|pop\s*!|bobblehead)\b/.test(t)) return 'Pop Culture & Exclusives';
  if (/\bsealed\b|\bcase\b|\bbox\s*lot\b/.test(t)) return 'Sealed & Boxed';
  if (/\b(1980s|1990s|vintage|g1|kenner|hasbro classic|loose vintage)\b/.test(t)) return 'Vintage Grails';
  return '';
}

function buildBodyHtml(detail, summary, itemUrl) {
  const parts = [];
  const desc = detail?.description || detail?.shortDescription || summary?.shortDescription;
  if (desc) {
    if (/</.test(desc)) parts.push(desc);
    else parts.push(`<p>${desc.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`);
  }
  const specs = detail?.localizedAspects ?? [];
  if (specs.length) {
    parts.push('<h4>Details</h4><ul>' +
      specs.slice(0, 20).map((s) => `<li><strong>${s.name}:</strong> ${s.value}</li>`).join('') +
      '</ul>');
  }
  if (itemUrl) parts.push(`<p><a href="${itemUrl}" rel="noopener">View original eBay listing</a></p>`);
  return parts.join('\n');
}

function collectImages(detail, summary) {
  const urls = new Set();
  if (summary?.image?.imageUrl) urls.add(summary.image.imageUrl);
  for (const a of summary?.additionalImages ?? []) if (a?.imageUrl) urls.add(a.imageUrl);
  if (detail?.image?.imageUrl) urls.add(detail.image.imageUrl);
  for (const a of detail?.additionalImages ?? []) if (a?.imageUrl) urls.add(a.imageUrl);
  return [...urls];
}

// ---------- main ----------
async function main() {
  console.log(`[sync-ebay-active] seller=${EBAY_SELLER_USERNAME} discount=${DISCOUNT_PCT}% dry-run=${DRY} max=${MAX === Infinity ? 'all' : MAX}`);

  const token = await getEbayAppToken();
  const summaries = await fetchAllSellerItems(token);
  console.log(`[sync-ebay-active] eBay active listings fetched: ${summaries.length}`);

  if (summaries.length === 0) {
    console.log('[sync-ebay-active] Nothing to import.');
    return;
  }

  const shopifyIndex = await indexShopifyBySku();
  console.log(`[sync-ebay-active] Shopify products indexed by SKU: ${shopifyIndex.size}`);

  const locationId = DRY ? null : await getPrimaryLocationId();
  if (!DRY) console.log(`[sync-ebay-active] Shopify primary location id: ${locationId}`);

  let created = 0, skipped = 0, failed = 0;

  for (const summary of summaries) {
    const rawId = String(summary.itemId ?? '');
    const itemId = rawId.replace(/^v1\|/, '').replace(/\|\d+$/, ''); // "v1|123456|0" -> "123456"
    const sku = `BUBS-EB-${itemId}`;

    if (shopifyIndex.has(sku)) {
      skipped++;
      console.log(`[sync-ebay-active] skip (exists): ${sku} — ${summary.title?.slice(0, 60)}`);
      continue;
    }

    const ebayPrice = Number(summary.price?.value);
    if (!Number.isFinite(ebayPrice) || ebayPrice <= 0) {
      failed++;
      console.warn(`[sync-ebay-active] no price on ${itemId} — skipping`);
      continue;
    }
    const shopifyPrice = Math.round(ebayPrice * DISCOUNT_MULT * 100) / 100;

    const detail = await fetchItemDetail(token, summary.itemId);
    const title = summary.title?.trim() || `eBay item ${itemId}`;
    const condition = summary.condition || detail?.condition || '';
    const productType = guessProductType(title);
    const handle = slugify(`${title}-${itemId}`);
    const images = collectImages(detail, summary).map((src, i) => ({
      src, position: i + 1, alt: `${title}${i === 0 ? '' : ' photo ' + (i + 1)}`,
    }));
    const tagList = [
      productType && productType.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      condition && `condition-${condition.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      'from-ebay',
    ].filter(Boolean);

    const productPayload = {
      product: {
        title,
        body_html: buildBodyHtml(detail, summary, summary.itemWebUrl),
        vendor: 'Bubs960 Collectibles',
        product_type: productType,
        handle,
        tags: tagList.join(', '),
        status: PRODUCT_STATUS,
        published: PRODUCT_STATUS === 'active',
        variants: [{
          sku,
          price: shopifyPrice.toFixed(2),
          compare_at_price: ebayPrice.toFixed(2),
          inventory_management: 'shopify',
          inventory_policy: 'deny',
          requires_shipping: true,
          taxable: true,
        }],
        images,
      },
    };

    if (DRY) {
      console.log(`[sync-ebay-active] DRY would create: ${sku} — ${title.slice(0, 60)} — $${shopifyPrice.toFixed(2)} (was $${ebayPrice.toFixed(2)}) — ${images.length} img`);
      created++;
      continue;
    }

    try {
      const res = await shopify('POST', '/products.json', productPayload);
      const newProduct = res.product;
      const variant = newProduct?.variants?.[0];
      if (variant?.inventory_item_id && locationId) {
        await shopify('POST', '/inventory_levels/set.json', {
          location_id: locationId,
          inventory_item_id: variant.inventory_item_id,
          available: 1,
        });
      }
      created++;
      console.log(`[sync-ebay-active] CREATED ${sku} — ${title.slice(0, 60)} — $${shopifyPrice.toFixed(2)}`);
    } catch (err) {
      failed++;
      console.error(`[sync-ebay-active] FAIL ${sku}: ${err.message}`);
    }

    // light rate-limit pause (Shopify REST is 2/sec on standard plans)
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`[sync-ebay-active] Done. created=${created} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(`[sync-ebay-active] FATAL: ${err.message}`);
  process.exit(1);
});
