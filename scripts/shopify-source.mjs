// Fetches products from the Shopify Admin GraphQL API and normalizes them
// into the same shape the build script expects from local JSON shells.
// Returns:
//   - an array of normalized products (possibly empty) on success
//   - null if credentials are missing or the API call fails
// Empty array is a valid result (brand new store with no products) and
// the build script should NOT fall back to JSON in that case.
//
// GraphQL (not REST) because Shopify's modern app tokens won't authenticate
// against the legacy /products.json REST endpoint on new-platform stores.

const API_VERSION = '2024-10';

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        handle
        title
        descriptionHtml
        vendor
        productType
        tags
        status
        featuredImage { url }
        images(first: 20) { nodes { url } }
        variants(first: 1) {
          nodes {
            sku
            price
            compareAtPrice
            inventoryQuantity
          }
        }
      }
    }
  }
`;

async function shopifyGql(query, variables = {}) {
  const { SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN } = process.env;
  const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`, {
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

export async function fetchShopifyProducts() {
  const { SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN } = process.env;
  if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) {
    return null;
  }

  try {
    const all = [];
    let cursor = null;
    while (true) {
      const data = await shopifyGql(PRODUCTS_QUERY, { cursor });
      const conn = data.products;
      all.push(...conn.nodes);
      if (!conn.pageInfo.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }

    const normalized = all.map((p) => normalize(p, SHOPIFY_STORE)).filter(Boolean);

    // Drafts stay hidden from the public site, matching Shopify's own
    // storefront behavior. Log the split so workflow runs still show
    // that the pipeline fetched drafts (useful for verification).
    const live = normalized.filter((p) => p.status !== 'draft');
    const drafts = normalized.length - live.length;
    console.log(`[shopify-source] Fetched ${normalized.length} product(s): ${live.length} live, ${drafts} draft (hidden).`);
    return live;
  } catch (err) {
    console.error(`[shopify-source] fetch error: ${err.message}`);
    return null;
  }
}

function normalize(p, storeDomain) {
  // GraphQL returns status uppercase (ACTIVE/DRAFT/ARCHIVED). Normalize.
  const statusRaw = (p.status || 'DRAFT').toLowerCase();
  if (statusRaw === 'archived') return null;

  const tags = Array.isArray(p.tags) ? p.tags : (p.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const isSold = tags.some((t) => t.toLowerCase() === 'sold');

  const variant = p.variants?.nodes?.[0] ?? {};
  const imageUrls = [
    p.featuredImage?.url,
    ...(p.images?.nodes ?? []).map((img) => img.url),
  ].filter(Boolean);
  // Dedupe (featuredImage usually duplicates first image)
  const uniqueImages = [...new Set(imageUrls)];

  return {
    handle: p.handle,
    title: p.title,
    description: p.descriptionHtml ?? '',
    vendor: p.vendor,
    productType: p.productType || undefined,
    collection: p.productType || undefined,
    tags,
    status: isSold ? 'sold' : statusRaw,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice || undefined,
    sku: variant.sku || undefined,
    inventory: variant.inventoryQuantity,
    images: uniqueImages,
    buyLinks: {
      shopify: `https://${storeDomain}/products/${p.handle}`,
      // Derive eBay URL from SKU pattern BUBS-EB-<itemId> set by the import script.
      ebay: (() => {
        const m = (variant.sku ?? '').match(/^BUBS-EB-(\d+)$/);
        return m ? `https://www.ebay.com/itm/${m[1]}` : null;
      })(),
      whatnot: 'https://www.whatnot.com/user/bubs960',
    },
    featured: tags.some((t) => t.toLowerCase() === 'featured' || t.toLowerCase() === 'grail'),
    _localImages: [],
    _file: 'shopify',
    _source: 'shopify',
  };
}
