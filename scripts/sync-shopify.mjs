// Pushes every products/*.json shell to Shopify via the Admin REST API.
// Idempotent upsert by handle: creates if missing, updates if found.
// Required env: SHOPIFY_STORE (e.g. bubs960.myshopify.com), SHOPIFY_ADMIN_TOKEN.
// Missing secrets -> logs and exits 0 so CI doesn't fail before Shopify is set up.

import { loadProducts } from './products.mjs';

const API_VERSION = '2024-01';
const { SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN } = process.env;

if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) {
  console.log('[sync-shopify] SHOPIFY_STORE or SHOPIFY_ADMIN_TOKEN not set — skipping sync.');
  process.exit(0);
}

const BASE = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;

async function shopify(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} failed ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function findByHandle(handle) {
  const data = await shopify('GET', `/products.json?handle=${encodeURIComponent(handle)}&limit=1`);
  return data.products?.[0] ?? null;
}

function toShopifyProduct(p, existing) {
  const variant = {
    price: String(p.price ?? '0.00'),
    sku: p.sku ?? '',
    compare_at_price: p.compareAtPrice != null ? String(p.compareAtPrice) : null,
  };
  if (p.inventory != null) {
    variant.inventory_management = 'shopify';
    variant.inventory_quantity = Number(p.inventory);
  }
  if (existing?.variants?.[0]?.id) {
    variant.id = existing.variants[0].id;
  }

  return {
    title: p.title,
    handle: p.handle,
    body_html: p.description ?? '',
    vendor: p.vendor ?? 'Bubs960 Collectibles',
    product_type: p.productType ?? '',
    tags: (p.tags ?? []).join(', '),
    status: (p.status ?? 'draft').toLowerCase(),
    variants: [variant],
    images: (p.images ?? []).map((src) => ({ src })),
  };
}

async function syncOne(p) {
  const existing = await findByHandle(p.handle);
  const payload = { product: toShopifyProduct(p, existing) };

  if (existing) {
    await shopify('PUT', `/products/${existing.id}.json`, payload);
    console.log(`[sync] updated  ${p.handle}`);
  } else {
    await shopify('POST', `/products.json`, payload);
    console.log(`[sync] created  ${p.handle}`);
  }
}

const products = await loadProducts();
console.log(`[sync] ${products.length} product(s) to sync.`);

let failed = 0;
for (const p of products) {
  try {
    await syncOne(p);
  } catch (err) {
    failed++;
    console.error(`[sync] FAILED ${p.handle}: ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`[sync] ${failed} product(s) failed.`);
  process.exit(1);
}
console.log('[sync] done.');
