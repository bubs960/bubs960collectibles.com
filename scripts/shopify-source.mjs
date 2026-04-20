// Fetches products from the Shopify Admin REST API and normalizes them
// into the same shape the build script expects from local JSON shells.
// Returns:
//   - an array of normalized products (possibly empty) on success
//   - null if credentials are missing or the API call fails
// Empty array is a valid result (brand new store with no products) and
// the build script should NOT fall back to JSON in that case.

const API_VERSION = '2024-01';

export async function fetchShopifyProducts() {
  const { SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN } = process.env;
  if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) {
    return null;
  }

  const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/products.json?limit=250&status=any`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(`[shopify-source] fetch failed ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const normalized = (data.products ?? [])
      .map((p) => normalize(p, SHOPIFY_STORE))
      .filter(Boolean);

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
  // Skip archived — they shouldn't render on the site.
  if (p.status === 'archived') return null;

  const tags = (p.tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const isSold = tags.some((t) => t.toLowerCase() === 'sold');

  const variant = p.variants?.[0] ?? {};

  return {
    handle: p.handle,
    title: p.title,
    description: p.body_html ?? '',
    vendor: p.vendor,
    productType: p.product_type || undefined,
    collection: p.product_type || undefined,
    tags,
    status: isSold ? 'sold' : (p.status || 'draft'),
    price: variant.price,
    compareAtPrice: variant.compare_at_price || undefined,
    sku: variant.sku || undefined,
    inventory: variant.inventory_quantity,
    images: (p.images ?? []).map((img) => img.src),
    buyLinks: {
      shopify: `https://${storeDomain}/products/${p.handle}`,
      ebay: null,
      whatnot: null,
    },
    featured: tags.some((t) => t.toLowerCase() === 'featured' || t.toLowerCase() === 'grail'),
    // No local-image auto-discovery for Shopify products — images come from Shopify CDN.
    _localImages: [],
    _file: 'shopify',
    _source: 'shopify',
  };
}
