import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchShopifyProducts } from './shopify-source.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const PRODUCTS_DIR = join(here, '..', 'products');
export const IMAGES_DIR = join(PRODUCTS_DIR, 'images');
export const SHOP_DIR = join(here, '..', 'shop');

const IMG_EXT = /\.(jpe?g|png|webp|gif)$/i;

async function listLocalImages() {
  try {
    return (await readdir(IMAGES_DIR)).filter((f) => IMG_EXT.test(f)).sort();
  } catch {
    return [];
  }
}

// Shopify-first: fetch from Shopify Admin API when credentials are present.
// Falls back to local products/*.json shells when Shopify is unreachable
// (fetch error). An empty array from Shopify is a valid result (new store)
// and is returned as-is — we do NOT fall back to JSON in that case.
export async function loadProducts() {
  const shopifyResult = await fetchShopifyProducts();
  if (shopifyResult !== null) {
    console.log(`[products] Source: Shopify (${shopifyResult.length} product${shopifyResult.length === 1 ? '' : 's'}).`);
    return shopifyResult;
  }
  console.log('[products] Source: local JSON shells (Shopify credentials missing or fetch failed).');
  return loadLocalProducts();
}

async function loadLocalProducts() {
  const files = (await readdir(PRODUCTS_DIR))
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'));

  const localImages = await listLocalImages();

  const products = [];
  for (const file of files) {
    const raw = await readFile(join(PRODUCTS_DIR, file), 'utf8');
    const data = JSON.parse(raw);
    if (!data.handle) throw new Error(`${file}: missing "handle"`);
    if (!data.title) throw new Error(`${file}: missing "title"`);
    const auto = localImages.filter((f) => f.toLowerCase().startsWith(data.handle.toLowerCase()));
    data._localImages = auto;
    products.push({ _file: file, _source: 'local', ...data });
  }
  return products;
}

// Resolves a mixed image list (URLs + bare filenames) into renderable strings.
// - Absolute URLs pass through unchanged.
// - Bare filenames get the caller-supplied prefix (e.g. "/products/images/").
export function resolveImages(product, pathPrefix) {
  const declared = Array.isArray(product.images) ? product.images : [];
  const locals = (product._localImages ?? []).map((f) => f);
  const combined = [...locals, ...declared];
  const seen = new Set();
  return combined
    .filter((src) => src && (seen.has(src) ? false : seen.add(src)))
    .map((src) => /^https?:\/\//i.test(src) ? src : `${pathPrefix}${src}`);
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
