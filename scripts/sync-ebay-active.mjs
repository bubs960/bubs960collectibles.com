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
const SHOPIFY_API_VERSION = '2024-10';

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
  // Filter out auctions (only import Buy It Now / fixed-price listings).
  // "1"/"true" excludes auctions, anything else includes them.
  EXCLUDE_AUCTIONS = '1',
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
const FILTER_AUCTIONS = EXCLUDE_AUCTIONS === '1' || EXCLUDE_AUCTIONS === 'true';

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
// Browse API constraint: when combined with a seller filter, only ONE
// category_id is allowed per call (errorId 12030 otherwise). So we loop
// each top-level category, paginate within it, dedupe by item id.
async function fetchAllSellerItems(token) {
  const seen = new Map(); // itemId -> summary
  const filter = `sellers:{${EBAY_SELLER_USERNAME}}`;
  const limit = 200;
  const categories = EBAY_CATEGORIES.split(',').map((s) => s.trim()).filter(Boolean);

  outer:
  for (const cat of categories) {
    let offset = 0;
    while (true) {
      const url = `${EBAY_SEARCH_URL}?category_ids=${encodeURIComponent(cat)}&filter=${encodeURIComponent(filter)}&limit=${limit}&offset=${offset}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
      });
      if (!res.ok) throw new Error(`eBay search failed cat=${cat} (${res.status}): ${await res.text()}`);
      const data = await res.json();
      const batch = data.itemSummaries ?? [];
      for (const it of batch) {
        const id = String(it.itemId ?? '');
        if (seen.has(id)) continue;
        if (FILTER_AUCTIONS) {
          const opts = it.buyingOptions ?? [];
          if (!opts.includes('FIXED_PRICE')) continue; // skip auction-only listings
        }
        seen.set(id, it);
      }
      const total = data.total ?? batch.length;
      console.log(`[sync-ebay-active] eBay cat=${cat} offset=${offset} got=${batch.length} total=${total} uniq=${seen.size}`);
      if (batch.length === 0 || offset + batch.length >= total) break;
      offset += batch.length;
      if (seen.size >= MAX) break outer;
    }
    if (seen.size >= MAX) break;
  }
  return [...seen.values()].slice(0, MAX);
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

// ---------- Shopify GraphQL helpers ----------
// New-style Shopify apps (Dev Dashboard / atkn_ tokens) speak GraphQL Admin API,
// not REST. Header X-Shopify-Access-Token is unchanged.
async function shopifyGql(query, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Shopify GraphQL HTTP ${res.status}: ${text.slice(0, 500)}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Shopify GraphQL non-JSON: ${text.slice(0, 500)}`); }
  if (data.errors) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(data.errors).slice(0, 800)}`);
  return data.data;
}

async function indexShopifyBySku() {
  const index = new Map();
  let cursor = null;
  let pages = 0;
  const QUERY = `
    query Products($cursor: String) {
      products(first: 250, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          handle
          variants(first: 10) { nodes { sku } }
        }
      }
    }`;
  while (true) {
    const data = await shopifyGql(QUERY, { cursor });
    const conn = data.products;
    for (const p of conn.nodes) {
      for (const v of p.variants.nodes) {
        if (v.sku) index.set(v.sku, p);
      }
    }
    pages++;
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  console.log(`[sync-ebay-active] Shopify indexed (gql): ${index.size} SKUs across ${pages} page(s).`);
  return index;
}

async function getPrimaryLocationId() {
  const QUERY = `{ locations(first: 5) { nodes { id name isActive } } }`;
  const data = await shopifyGql(QUERY);
  const active = (data.locations.nodes ?? []).filter((l) => l.isActive);
  if (active.length === 0) throw new Error('No active Shopify locations found.');
  return active[0].id;
}

// Create product (no variants in input — GraphQL creates a default variant we then update).
// Returns { productId, variantId, inventoryItemId, handle }.
async function shopifyCreateProduct({ title, descriptionHtml, vendor, productType, handle, tags, status, imageUrls }) {
  const MUT = `
    mutation ProductCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
      productCreate(input: $input, media: $media) {
        product {
          id
          handle
          variants(first: 1) { nodes { id inventoryItem { id } } }
        }
        userErrors { field message }
      }
    }`;
  const input = {
    title,
    descriptionHtml,
    vendor,
    productType: productType || null,
    handle,
    tags,
    status: status.toUpperCase(), // ACTIVE | DRAFT | ARCHIVED
  };
  const media = (imageUrls || []).map((u) => ({
    originalSource: u,
    mediaContentType: 'IMAGE',
  }));
  const data = await shopifyGql(MUT, { input, media });
  const errs = data.productCreate.userErrors;
  if (errs.length) throw new Error(`productCreate userErrors: ${JSON.stringify(errs)}`);
  const p = data.productCreate.product;
  const v = p.variants.nodes[0];
  return {
    productId: p.id,
    variantId: v.id,
    inventoryItemId: v.inventoryItem.id,
    handle: p.handle,
  };
}

async function shopifyUpdateVariant({ productId, variantId, sku, price, compareAtPrice }) {
  const MUT = `
    mutation BulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }`;
  const variants = [{
    id: variantId,
    price: String(price),
    compareAtPrice: String(compareAtPrice),
    inventoryItem: { sku, tracked: true },
  }];
  const data = await shopifyGql(MUT, { productId, variants });
  const errs = data.productVariantsBulkUpdate.userErrors;
  if (errs.length) throw new Error(`variantsBulkUpdate userErrors: ${JSON.stringify(errs)}`);
}

async function shopifySetInventory({ inventoryItemId, locationId, quantity }) {
  const MUT = `
    mutation InvSet($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message }
      }
    }`;
  const input = {
    name: 'available',
    reason: 'correction',
    ignoreCompareQuantity: true,
    quantities: [{ inventoryItemId, locationId, quantity }],
  };
  const data = await shopifyGql(MUT, { input });
  const errs = data.inventorySetQuantities.userErrors;
  if (errs.length) throw new Error(`inventorySetQuantities userErrors: ${JSON.stringify(errs)}`);
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

// ---------- diagnostics ----------
async function diagnoseShopifyAuth() {
  const tokenLen = (SHOPIFY_ADMIN_TOKEN ?? '').length;
  const tokenPrefix = (SHOPIFY_ADMIN_TOKEN ?? '').slice(0, 6);
  const storeHost = (SHOPIFY_STORE ?? '').trim();
  console.log(`[diag] SHOPIFY_STORE host=${storeHost.replace(/^.{0,3}/, '***')} len=${storeHost.length}`);
  console.log(`[diag] SHOPIFY_ADMIN_TOKEN prefix=${tokenPrefix.replace(/./g, (c, i) => i < 4 ? c : '*')} len=${tokenLen}`);
  console.log(`[diag] Shopify API: GraphQL Admin ${SHOPIFY_API_VERSION}`);

  // Minimum-scope auth probe via GraphQL.
  const data = await shopifyGql(`{ shop { name primaryDomain { url } } }`);
  console.log(`[diag] shop.name="${data.shop.name}" primaryDomain=${data.shop.primaryDomain?.url}`);
}

// ---------- main ----------
async function main() {
  console.log(`[sync-ebay-active] seller=${EBAY_SELLER_USERNAME} discount=${DISCOUNT_PCT}% dry-run=${DRY} max=${MAX === Infinity ? 'all' : MAX} exclude-auctions=${FILTER_AUCTIONS}`);

  // Sanity-check Shopify auth BEFORE doing eBay work, so failures are fast and obvious.
  await diagnoseShopifyAuth();

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
    const imageUrls = collectImages(detail, summary);
    const tagList = [
      productType && productType.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      condition && `condition-${condition.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      'from-ebay',
    ].filter(Boolean);
    const descriptionHtml = buildBodyHtml(detail, summary, summary.itemWebUrl);

    if (DRY) {
      console.log(`[sync-ebay-active] DRY would create: ${sku} — ${title.slice(0, 60)} — $${shopifyPrice.toFixed(2)} (was $${ebayPrice.toFixed(2)}) — ${imageUrls.length} img`);
      created++;
      continue;
    }

    try {
      // 1. Create the product (default variant + media in one shot)
      const { productId, variantId, inventoryItemId, handle: newHandle } = await shopifyCreateProduct({
        title,
        descriptionHtml,
        vendor: 'Bubs960 Collectibles',
        productType,
        handle,
        tags: tagList,
        status: PRODUCT_STATUS,
        imageUrls,
      });

      // 2. Update the default variant with sku/price/compareAt/track-inventory
      await shopifyUpdateVariant({
        productId,
        variantId,
        sku,
        price: shopifyPrice.toFixed(2),
        compareAtPrice: ebayPrice.toFixed(2),
      });

      // 3. Set inventory to 1 at primary location
      if (locationId && inventoryItemId) {
        await shopifySetInventory({
          inventoryItemId,
          locationId,
          quantity: 1,
        });
      }

      created++;
      console.log(`[sync-ebay-active] CREATED ${sku} (${newHandle}) — ${title.slice(0, 60)} — $${shopifyPrice.toFixed(2)}`);
    } catch (err) {
      failed++;
      console.error(`[sync-ebay-active] FAIL ${sku}: ${err.message}`);
    }

    // Light rate-limit pause. GraphQL Admin is cost-based — we do ~3 calls per item.
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[sync-ebay-active] Done. created=${created} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(`[sync-ebay-active] FATAL: ${err.message}`);
  process.exit(1);
});
