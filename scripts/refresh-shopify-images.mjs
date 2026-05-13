// One-off (re-runnable) refresh: walks every Shopify product whose SKU
// matches BUBS-EB-<itemId>, re-fetches that item's images from eBay at
// high resolution (s-l1600), and replaces the product's Shopify media
// with the higher-res versions.
//
// Why: earlier imports pulled images from eBay's default s-l500 URL and
// uploaded those thumbnail-grade versions to Shopify. This script swaps
// them out for the higher-res originals without needing to re-import the
// products (which would change their handles and lose any manual edits).
//
// Required env:
//   EBAY_APP_ID, EBAY_CERT_ID
//   SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN
//
// Optional env:
//   DRY_RUN        ("1" = print plan, no writes)
//   MAX_PRODUCTS   (cap, useful for first-run test)
//   TAG            (Shopify tag to target, default "from-ebay")

const EBAY_TOKEN_URL  = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_ITEM_URL   = 'https://api.ebay.com/buy/browse/v1/item';
const EBAY_SCOPE      = 'https://api.ebay.com/oauth/api_scope';
const SHOPIFY_API_VERSION = '2024-10';

const {
  EBAY_APP_ID, EBAY_CERT_ID,
  SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN,
  DRY_RUN, MAX_PRODUCTS,
  TAG = 'from-ebay',
} = process.env;

const REQUIRED = ['EBAY_APP_ID', 'EBAY_CERT_ID', 'SHOPIFY_STORE', 'SHOPIFY_ADMIN_TOKEN'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[refresh-images] Missing required env: ${key}`);
    process.exit(1);
  }
}
const DRY = DRY_RUN === '1' || DRY_RUN === 'true';
const MAX = MAX_PRODUCTS ? Number(MAX_PRODUCTS) : Infinity;

// ---------- eBay ----------
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
  return (await res.json()).access_token;
}

async function fetchEbayItemImages(token, itemId) {
  // Browse API item lookup. Item ID may need the v1| prefix Browse uses internally.
  const itemRef = itemId.startsWith('v1|') ? itemId : `v1|${itemId}|0`;
  const url = `${EBAY_ITEM_URL}/${encodeURIComponent(itemRef)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  });
  if (!res.ok) {
    console.warn(`[refresh-images]   eBay item ${itemId} not reachable (${res.status})`);
    return [];
  }
  const data = await res.json();
  const urls = new Set();
  if (data?.image?.imageUrl) urls.add(data.image.imageUrl);
  for (const a of data?.additionalImages ?? []) if (a?.imageUrl) urls.add(a.imageUrl);
  return [...urls].map(upgradeEbayImageUrl);
}

function upgradeEbayImageUrl(url) {
  if (typeof url !== 'string') return url;
  return url.replace(/(\/s-l)\d+(\.(?:jpg|jpeg|png|webp))/i, '$11600$2');
}

// ---------- Shopify ----------
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
  if (!res.ok) throw new Error(`Shopify GraphQL HTTP ${res.status}: ${text.slice(0, 400)}`);
  const data = JSON.parse(text);
  if (data.errors) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(data.errors).slice(0, 400)}`);
  return data.data;
}

const PRODUCTS_QUERY = `
  query Products($cursor: String, $query: String!) {
    products(first: 100, after: $cursor, query: $query) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        handle
        title
        variants(first: 1) { nodes { sku } }
        media(first: 50) { nodes { id mediaContentType } }
      }
    }
  }`;

const CREATE_MEDIA = `
  mutation CreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { id }
      mediaUserErrors { field message }
    }
  }`;

const DELETE_MEDIA = `
  mutation DeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      userErrors { field message }
    }
  }`;

async function fetchTaggedProducts() {
  const all = [];
  let cursor = null;
  while (true) {
    const data = await shopifyGql(PRODUCTS_QUERY, { cursor, query: `tag:${TAG}` });
    const conn = data.products;
    all.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
    if (all.length >= MAX) break;
  }
  return all.slice(0, MAX);
}

// ---------- main ----------
async function main() {
  console.log(`[refresh-images] tag=${TAG} dry-run=${DRY} max=${MAX === Infinity ? 'all' : MAX}`);
  const products = await fetchTaggedProducts();
  console.log(`[refresh-images] found ${products.length} product(s) tagged "${TAG}"`);

  const ebayToken = await getEbayAppToken();
  let refreshed = 0, skipped = 0, failed = 0;

  for (const p of products) {
    const sku = p.variants.nodes[0]?.sku ?? '';
    const m = sku.match(/^BUBS-EB-(\d+)$/);
    if (!m) {
      skipped++;
      console.log(`[refresh-images] skip ${p.handle} — SKU doesn't match BUBS-EB-<itemId>`);
      continue;
    }
    const itemId = m[1];

    try {
      const newImageUrls = await fetchEbayItemImages(ebayToken, itemId);
      if (newImageUrls.length === 0) {
        skipped++;
        console.log(`[refresh-images] skip ${p.handle} — no images returned from eBay (item may be ended)`);
        continue;
      }

      const oldMediaIds = p.media.nodes
        .filter((n) => n.mediaContentType === 'IMAGE')
        .map((n) => n.id);

      if (DRY) {
        console.log(`[refresh-images] DRY would refresh ${p.handle}: ${oldMediaIds.length} old img -> ${newImageUrls.length} new img`);
        refreshed++;
        continue;
      }

      // 1. Add new high-res images first
      const createInput = newImageUrls.map((url) => ({
        originalSource: url,
        mediaContentType: 'IMAGE',
      }));
      const created = await shopifyGql(CREATE_MEDIA, { productId: p.id, media: createInput });
      const cErrs = created.productCreateMedia.mediaUserErrors;
      if (cErrs.length) throw new Error(`createMedia errors: ${JSON.stringify(cErrs)}`);

      // 2. Brief pause for Shopify to start processing the new media
      await new Promise((r) => setTimeout(r, 1000));

      // 3. Delete the old low-res images
      if (oldMediaIds.length > 0) {
        const deleted = await shopifyGql(DELETE_MEDIA, { productId: p.id, mediaIds: oldMediaIds });
        const dErrs = deleted.productDeleteMedia.userErrors;
        if (dErrs.length) console.warn(`[refresh-images]   ${p.handle} delete warnings: ${JSON.stringify(dErrs)}`);
      }

      refreshed++;
      console.log(`[refresh-images] REFRESHED ${p.handle}: -${oldMediaIds.length} old, +${newImageUrls.length} new`);
    } catch (err) {
      failed++;
      console.error(`[refresh-images] FAIL ${p.handle}: ${err.message}`);
    }

    // Rate limit pause
    await new Promise((r) => setTimeout(r, 700));
  }

  console.log(`[refresh-images] Done. refreshed=${refreshed} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(`[refresh-images] FATAL: ${err.message}`);
  process.exit(1);
});
