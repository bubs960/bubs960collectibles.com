// One-shot exporter: pulls all of your active eBay listings via the Browse API
// and writes a Shopify-format product-import CSV to disk. No Shopify token
// needed — you upload the CSV manually via Shopify admin -> Products -> Import.
//
// Shopify price = eBay price × (1 - DISCOUNT_PCT/100). Default 15% off.
// eBay price kept as "Compare At Price" so savings render on product pages.
//
// Required env:
//   EBAY_APP_ID, EBAY_CERT_ID, EBAY_SELLER_USERNAME
//
// Optional env:
//   DISCOUNT_PCT      (default 15)
//   PRODUCT_STATUS    ("active" or "draft", default "draft")
//   MAX_ITEMS         (blank = all)
//   EBAY_CATEGORIES   (comma-separated, default covers Toys/Collectibles/Sports/Coins/Games)
//   OUT_PATH          (default "shopify-import.csv")

import { writeFile } from 'node:fs/promises';

const EBAY_TOKEN_URL  = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const EBAY_ITEM_URL   = 'https://api.ebay.com/buy/browse/v1/item';
const EBAY_SCOPE      = 'https://api.ebay.com/oauth/api_scope';

const {
  EBAY_APP_ID, EBAY_CERT_ID, EBAY_SELLER_USERNAME,
  DISCOUNT_PCT = '15',
  PRODUCT_STATUS = 'draft',
  MAX_ITEMS,
  EBAY_CATEGORIES = '220,1,64482,11116,1249',
  OUT_PATH = 'shopify-import.csv',
} = process.env;

const REQUIRED = ['EBAY_APP_ID', 'EBAY_CERT_ID', 'EBAY_SELLER_USERNAME'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[ebay-to-csv] Missing required env: ${key}`);
    process.exit(1);
  }
}

const DISCOUNT_MULT = 1 - Number(DISCOUNT_PCT) / 100;
if (!Number.isFinite(DISCOUNT_MULT) || DISCOUNT_MULT <= 0 || DISCOUNT_MULT > 1) {
  console.error(`[ebay-to-csv] Invalid DISCOUNT_PCT: ${DISCOUNT_PCT}`);
  process.exit(1);
}
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
  return (await res.json()).access_token;
}

// ---------- eBay: page through seller's active listings ----------
async function fetchAllSellerItems(token) {
  const seen = new Map();
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
        if (!seen.has(id)) seen.set(id, it);
      }
      const total = data.total ?? batch.length;
      console.log(`[ebay-to-csv] cat=${cat} offset=${offset} got=${batch.length} total=${total} uniq=${seen.size}`);
      if (batch.length === 0 || offset + batch.length >= total) break;
      offset += batch.length;
      if (seen.size >= MAX) break outer;
    }
    if (seen.size >= MAX) break;
  }
  return [...seen.values()].slice(0, MAX);
}

async function fetchItemDetail(token, itemId) {
  const url = `${EBAY_ITEM_URL}/${encodeURIComponent(itemId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  });
  if (!res.ok) return null;
  return res.json();
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

// ---------- CSV writer ----------
const SHOPIFY_COLUMNS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value',
  'Variant SKU', 'Variant Inventory Tracker', 'Variant Inventory Qty',
  'Variant Inventory Policy', 'Variant Fulfillment Service',
  'Variant Price', 'Variant Compare At Price',
  'Variant Requires Shipping', 'Variant Taxable',
  'Image Src', 'Image Position', 'Image Alt Text', 'Status',
];

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n') + '\n';
}

// ---------- main ----------
async function main() {
  console.log(`[ebay-to-csv] seller=${EBAY_SELLER_USERNAME} discount=${DISCOUNT_PCT}% status=${PRODUCT_STATUS} max=${MAX === Infinity ? 'all' : MAX}`);

  const token = await getEbayAppToken();
  const summaries = await fetchAllSellerItems(token);
  console.log(`[ebay-to-csv] eBay active listings fetched: ${summaries.length}`);

  if (summaries.length === 0) {
    console.log('[ebay-to-csv] Nothing to export.');
    return;
  }

  const rows = [SHOPIFY_COLUMNS];
  let count = 0;
  let skipped = 0;

  for (const summary of summaries) {
    const rawId = String(summary.itemId ?? '');
    const itemId = rawId.replace(/^v1\|/, '').replace(/\|\d+$/, '');
    const sku = `BUBS-EB-${itemId}`;

    const ebayPrice = Number(summary.price?.value);
    if (!Number.isFinite(ebayPrice) || ebayPrice <= 0) {
      skipped++;
      console.warn(`[ebay-to-csv] no price on ${itemId} — skipping`);
      continue;
    }
    const shopifyPrice = Math.round(ebayPrice * DISCOUNT_MULT * 100) / 100;

    const detail = await fetchItemDetail(token, summary.itemId);
    const title = summary.title?.trim() || `eBay item ${itemId}`;
    const condition = summary.condition || detail?.condition || '';
    const productType = guessProductType(title);
    const handle = slugify(`${title}-${itemId}`);
    const images = collectImages(detail, summary);
    const tags = [
      productType && productType.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      condition && `condition-${condition.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      'from-ebay',
    ].filter(Boolean).join(', ');
    const body = buildBodyHtml(detail, summary, summary.itemWebUrl);
    const altBase = title;
    const mainImg = images[0] ?? '';

    const firstRow = SHOPIFY_COLUMNS.map((col) => {
      switch (col) {
        case 'Handle':                       return handle;
        case 'Title':                        return title;
        case 'Body (HTML)':                  return body;
        case 'Vendor':                       return 'Bubs960 Collectibles';
        case 'Type':                         return productType;
        case 'Tags':                         return tags;
        case 'Published':                    return PRODUCT_STATUS === 'active' ? 'TRUE' : 'FALSE';
        case 'Option1 Name':                 return 'Title';
        case 'Option1 Value':                return 'Default Title';
        case 'Variant SKU':                  return sku;
        case 'Variant Inventory Tracker':    return 'shopify';
        case 'Variant Inventory Qty':        return '1';
        case 'Variant Inventory Policy':     return 'deny';
        case 'Variant Fulfillment Service':  return 'manual';
        case 'Variant Price':                return shopifyPrice.toFixed(2);
        case 'Variant Compare At Price':     return ebayPrice.toFixed(2);
        case 'Variant Requires Shipping':    return 'TRUE';
        case 'Variant Taxable':              return 'TRUE';
        case 'Image Src':                    return mainImg;
        case 'Image Position':               return mainImg ? '1' : '';
        case 'Image Alt Text':               return mainImg ? altBase : '';
        case 'Status':                       return PRODUCT_STATUS;
        default: return '';
      }
    });
    rows.push(firstRow);

    for (let i = 1; i < images.length; i++) {
      const extra = new Array(SHOPIFY_COLUMNS.length).fill('');
      extra[SHOPIFY_COLUMNS.indexOf('Handle')]         = handle;
      extra[SHOPIFY_COLUMNS.indexOf('Image Src')]      = images[i];
      extra[SHOPIFY_COLUMNS.indexOf('Image Position')] = String(i + 1);
      extra[SHOPIFY_COLUMNS.indexOf('Image Alt Text')] = `${altBase} photo ${i + 1}`;
      rows.push(extra);
    }
    count++;
  }

  await writeFile(OUT_PATH, toCsv(rows));
  console.log(`[ebay-to-csv] Wrote ${count} product(s) to ${OUT_PATH}.`);
  if (skipped > 0) console.log(`[ebay-to-csv] Skipped ${skipped} row(s).`);
  console.log(`[ebay-to-csv] Next: download artifact, upload via Shopify admin -> Products -> Import.`);
}

main().catch((err) => {
  console.error(`[ebay-to-csv] FATAL: ${err.message}`);
  process.exit(1);
});
