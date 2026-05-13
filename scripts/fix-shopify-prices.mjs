// One-off (re-runnable) fix: walks every Shopify product tagged "from-ebay"
// and resets the variant pricing to the eBay-retail strategy:
//   - price          = previous compareAtPrice (the eBay retail value)
//   - compareAtPrice = null (no strikethrough — direct discount lives at checkout)
//
// Why: we switched from pre-discounting in Shopify (Shopify $85 / CompareAt $100)
// to full-retail in Shopify ($100, with a 15% direct-buyer Automatic Discount
// applied at checkout). That way non-Shopify channels like Whatnot pull an
// accurate market price instead of the pre-discounted one.
//
// Required env:
//   SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN
//
// Optional env:
//   DRY_RUN (set to "1" to print plan without writing)
//   TAG     (default "from-ebay" — change to target a different cohort)

const SHOPIFY_API_VERSION = '2024-10';

const {
  SHOPIFY_STORE,
  SHOPIFY_ADMIN_TOKEN,
  DRY_RUN,
  TAG = 'from-ebay',
} = process.env;

for (const key of ['SHOPIFY_STORE', 'SHOPIFY_ADMIN_TOKEN']) {
  if (!process.env[key]) {
    console.error(`[fix-prices] Missing required env: ${key}`);
    process.exit(1);
  }
}
const DRY = DRY_RUN === '1' || DRY_RUN === 'true';

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
        title
        handle
        variants(first: 1) {
          nodes {
            id
            price
            compareAtPrice
          }
        }
      }
    }
  }`;

const VARIANT_UPDATE = `
  mutation BulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
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
  }
  return all;
}

async function main() {
  console.log(`[fix-prices] tag=${TAG} dry-run=${DRY}`);
  const products = await fetchTaggedProducts();
  console.log(`[fix-prices] found ${products.length} product(s) tagged "${TAG}"`);

  let updated = 0, skipped = 0, failed = 0;

  for (const p of products) {
    const v = p.variants.nodes[0];
    if (!v) { skipped++; continue; }
    const price = Number(v.price);
    const compareAt = Number(v.compareAtPrice);
    // Skip if the product was never pre-discounted (no compare at, or
    // compare at <= price means there's no eBay-retail to restore).
    if (!Number.isFinite(compareAt) || compareAt <= price) {
      skipped++;
      console.log(`[fix-prices] skip ${p.handle} — already in target shape (price=${price}, compareAt=${v.compareAtPrice || 'null'})`);
      continue;
    }
    const newPrice = compareAt.toFixed(2);
    if (DRY) {
      console.log(`[fix-prices] DRY would set ${p.handle}: price ${price.toFixed(2)} -> ${newPrice}, compareAt ${compareAt.toFixed(2)} -> null`);
      updated++;
      continue;
    }
    try {
      const data = await shopifyGql(VARIANT_UPDATE, {
        productId: p.id,
        variants: [{ id: v.id, price: newPrice, compareAtPrice: null }],
      });
      const errs = data.productVariantsBulkUpdate.userErrors;
      if (errs.length) throw new Error(JSON.stringify(errs));
      updated++;
      console.log(`[fix-prices] FIXED ${p.handle}: price -> ${newPrice}, compareAt -> null`);
    } catch (err) {
      failed++;
      console.error(`[fix-prices] FAIL ${p.handle}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`[fix-prices] Done. updated=${updated} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(`[fix-prices] FATAL: ${err.message}`);
  process.exit(1);
});
