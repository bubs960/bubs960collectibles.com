// Marks Shopify products sold from an eBay Orders CSV export.
// Use this as a fallback when the eBay API / dev account isn't available.
//
// Workflow:
//   1. eBay Seller Hub -> Orders -> Download report (CSV)
//   2. node scripts/mark-sold-from-csv.mjs path/to/orders.csv
//   3. Site rebuilds on next cron and matching products show SOLD
//
// Required env:
//   SHOPIFY_STORE          e.g. bubs960-collectibles.myshopify.com
//   SHOPIFY_ADMIN_TOKEN    Admin API token with read/write_products
//
// What matches:
//   - Shopify variant SKU == eBay "Custom label (SKU)" from the CSV
//   - Our ebay-to-shopify-csv.mjs transformer uses BUBS-EB-<itemId>
//     so this lines up by default
//
// What gets skipped:
//   - Orders with cancel/refund/return statuses
//   - Rows with no SKU (unimported eBay listings)
//   - Products already tagged 'sold' in Shopify

import { readFile } from 'node:fs/promises';

const SHOPIFY_API_VERSION = '2024-01';
const { SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN } = process.env;
const [, , inputPath] = process.argv;

if (!inputPath) {
  console.error('Usage: node scripts/mark-sold-from-csv.mjs <ebay-orders.csv>');
  process.exit(1);
}
if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) {
  console.error('Missing SHOPIFY_STORE or SHOPIFY_ADMIN_TOKEN env vars.');
  process.exit(1);
}

// ---------- CSV parser (quoted fields, escaped quotes) ----------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else { field += c; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

// ---------- Column variants eBay uses across different reports ----------
const COLUMN_MAP = {
  sku: ['Custom label', 'Custom label (SKU)', 'SKU', 'CustomLabel'],
  itemId: ['Item number', 'Item ID', 'ItemID', 'Listing ID'],
  title: ['Item title', 'Title'],
  status: ['Order status', 'Sale status', 'Status', 'Fulfillment status'],
  cancelled: ['Cancel status', 'Cancelled'],
  quantity: ['Quantity', 'Qty', 'Quantity sold'],
};

function findCol(header, names) {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const name of names) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

const CANCELLED_STATUS = /cancel|refund|return|void/i;

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

async function indexShopifyProductsBySku() {
  const index = new Map();
  let pageUrl = `/products.json?limit=250&fields=id,handle,title,tags,variants,status`;
  let pages = 0;
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
    pages++;
    const link = res.headers.get('Link') || '';
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = nextMatch ? nextMatch[1].replace(`https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}`, '') : null;
  }
  console.log(`[mark-sold] Shopify products indexed: ${index.size} SKUs across ${pages} page(s).`);
  return index;
}

async function markSold(product) {
  const tagList = (product.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  if (tagList.some((t) => t.toLowerCase() === 'sold')) return false;
  tagList.push('sold');
  await shopify('PUT', `/products/${product.id}.json`, {
    product: { id: product.id, tags: tagList.join(', ') },
  });
  return true;
}

// ---------- main ----------
async function main() {
  console.log(`[mark-sold] Reading ${inputPath} ...`);
  const raw = await readFile(inputPath, 'utf8');
  const rows = parseCsv(raw);
  if (rows.length < 2) { console.error('CSV has no data rows.'); process.exit(1); }

  // Skip any preamble rows before the real header.
  let headerIdx = 0;
  while (headerIdx < rows.length && findCol(rows[headerIdx], COLUMN_MAP.sku) === -1 && findCol(rows[headerIdx], COLUMN_MAP.itemId) === -1) {
    headerIdx++;
  }
  if (headerIdx >= rows.length) {
    console.error('Could not find a header row with SKU or Item ID column.');
    process.exit(1);
  }
  const header = rows[headerIdx];
  const dataRows = rows.slice(headerIdx + 1);

  const cols = {
    sku:       findCol(header, COLUMN_MAP.sku),
    itemId:    findCol(header, COLUMN_MAP.itemId),
    title:     findCol(header, COLUMN_MAP.title),
    status:    findCol(header, COLUMN_MAP.status),
    cancelled: findCol(header, COLUMN_MAP.cancelled),
    quantity:  findCol(header, COLUMN_MAP.quantity),
  };
  console.log('[mark-sold] Columns:', Object.fromEntries(
    Object.entries(cols).map(([k, v]) => [k, v === -1 ? '— missing' : `✓ ${header[v]}`])
  ));

  // Build the set of sold SKUs, skipping cancelled orders and empty SKUs.
  const soldSkus = new Set();
  const unmatchedSkus = new Set();
  let sawCancelled = 0;
  let sawNoSku = 0;

  for (const r of dataRows) {
    const status = cols.status !== -1 ? (r[cols.status] ?? '').trim() : '';
    const cancelStatus = cols.cancelled !== -1 ? (r[cols.cancelled] ?? '').trim() : '';
    if (CANCELLED_STATUS.test(status) || CANCELLED_STATUS.test(cancelStatus)) {
      sawCancelled++;
      continue;
    }

    let sku = cols.sku !== -1 ? (r[cols.sku] ?? '').trim() : '';
    // Fallback: derive SKU from eBay Item ID using our import convention.
    if (!sku && cols.itemId !== -1) {
      const itemId = (r[cols.itemId] ?? '').trim();
      if (itemId) sku = `BUBS-EB-${itemId}`;
    }
    if (!sku) { sawNoSku++; continue; }
    soldSkus.add(sku);
  }

  console.log(`[mark-sold] Unique sold SKUs in CSV: ${soldSkus.size} (skipped ${sawCancelled} cancelled, ${sawNoSku} no-SKU rows).`);
  if (soldSkus.size === 0) { console.log('[mark-sold] Nothing to do.'); return; }

  // Load Shopify catalog, match, mark.
  const productIndex = await indexShopifyProductsBySku();

  let updated = 0;
  let alreadyMarked = 0;
  let failed = 0;

  for (const sku of soldSkus) {
    const product = productIndex.get(sku);
    if (!product) { unmatchedSkus.add(sku); continue; }
    try {
      const changed = await markSold(product);
      if (changed) {
        updated++;
        console.log(`[mark-sold]   marked sold: ${product.handle} (SKU ${sku})`);
      } else {
        alreadyMarked++;
      }
    } catch (err) {
      failed++;
      console.error(`[mark-sold]   FAILED ${sku}: ${err.message}`);
    }
  }

  console.log(`[mark-sold] Done. Marked sold: ${updated}. Already sold: ${alreadyMarked}. Unmatched in Shopify: ${unmatchedSkus.size}. Failed: ${failed}.`);
  if (unmatchedSkus.size > 0 && unmatchedSkus.size <= 20) {
    console.log('[mark-sold] Unmatched SKUs:', Array.from(unmatchedSkus).join(', '));
  }
}

main().catch((err) => {
  console.error(`[mark-sold] FATAL: ${err.message}`);
  process.exit(1);
});
