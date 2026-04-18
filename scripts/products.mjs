import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const PRODUCTS_DIR = join(here, '..', 'products');
export const SHOP_DIR = join(here, '..', 'shop');

export async function loadProducts() {
  const files = (await readdir(PRODUCTS_DIR))
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'));

  const products = [];
  for (const file of files) {
    const raw = await readFile(join(PRODUCTS_DIR, file), 'utf8');
    const data = JSON.parse(raw);
    if (!data.handle) throw new Error(`${file}: missing "handle"`);
    if (!data.title) throw new Error(`${file}: missing "title"`);
    products.push({ _file: file, ...data });
  }
  return products;
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
