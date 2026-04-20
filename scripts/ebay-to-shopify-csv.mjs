// Transform an eBay File Exchange / Seller Hub listings CSV into a
// Shopify-format product import CSV. Auto-applies a direct-buyer
// discount (default 15% off eBay price) so Shopify price = eBay price
// times (1 - DISCOUNT). eBay price is preserved as "Compare At Price"
// so the savings render on Shopify / our site.
//
// Usage:
//   node scripts/ebay-to-shopify-csv.mjs <ebay-export.csv> [output.csv] [discount]
//
// Examples:
//   node scripts/ebay-to-shopify-csv.mjs ebay-listings.csv
//     -> writes shopify-import.csv with 15% discount
//
//   node scripts/ebay-to-shopify-csv.mjs ebay-listings.csv out.csv 20
//     -> writes out.csv with 20% discount
//
// Where to get the eBay CSV:
//   eBay Seller Hub -> Reports -> Downloads -> "Active Listings Report"
//   (or any listings report with Title, Price, Picture URL fields)

import { readFile, writeFile } from 'node:fs/promises';

const [, , inputPath, outputPath = 'shopify-import.csv', discountArg = '15'] = process.argv;

if (!inputPath) {
  console.error('Usage: node scripts/ebay-to-shopify-csv.mjs <ebay-export.csv> [output.csv] [discount%]');
  process.exit(1);
}

const DISCOUNT_PCT = Number(discountArg);
if (!Number.isFinite(DISCOUNT_PCT) || DISCOUNT_PCT < 0 || DISCOUNT_PCT > 90) {
  console.error(`Discount must be 0-90. Got: ${discountArg}`);
  process.exit(1);
}
const DISCOUNT_MULT = 1 - DISCOUNT_PCT / 100;

// --- Minimal CSV parser (handles quoted fields with commas + escaped quotes) ---
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

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n') + '\n';
}

// --- Map eBay column variants -> canonical names (case-insensitive) ---
const COLUMN_MAP = {
  title: ['Title', 'Item Title', 'Listing Title'],
  price: ['Current price', 'Price', 'Start price', 'StartPrice', 'CurrentPrice', 'BuyItNowPrice'],
  itemId: ['Item number', 'ItemID', 'Item ID', 'Listing ID'],
  description: ['Description', 'Item Description'],
  pictures: ['Picture URL', 'PictureURL', 'Photo URL', 'Photos', 'Picture URLs'],
  quantity: ['Available quantity', 'Quantity', 'Qty', 'QuantityAvailable'],
  condition: ['Condition', 'ConditionName', 'Item Condition'],
  sku: ['Custom label (SKU)', 'SKU', 'CustomLabel', 'Custom Label'],
  categoryName: ['Category name', 'Primary category', 'Category'],
  ebayUrl: ['View URL', 'Listing URL', 'ViewItemURL', 'URL'],
};

function findCol(headerRow, candidates) {
  const lower = headerRow.map((h) => h.trim().toLowerCase());
  for (const name of candidates) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

// --- Shopify-friendly handle from title ---
function slugify(s) {
  return (s ?? '').toString()
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Guess product type (= our Collection) from title keywords.
// Add or adjust these rules anytime — they only affect categorization.
function guessProductType(title = '') {
  const t = title.toLowerCase();
  if (/\b(wwe|wwf|aew|nwa|wcw|njpw|wrestling)\b/.test(t)) return 'Wrestling Figures';
  if (/\b(funko|pop\s*!|bobblehead)\b/.test(t)) return 'Pop Culture & Exclusives';
  if (/\bsealed\b|\bcase\b|\bbox\s*lot\b/.test(t)) return 'Sealed & Boxed';
  if (/\b(1980s|1990s|vintage|g1|kenner|hasbro classic|loose vintage)\b/.test(t)) return 'Vintage Grails';
  return '';
}

function parsePrice(raw) {
  if (!raw) return null;
  const n = Number(String(raw).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function splitPictures(raw) {
  if (!raw) return [];
  return String(raw).split(/[;|\n]/).map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u));
}

function escapeHtmlDesc(raw = '') {
  // eBay descriptions often contain HTML already — keep as-is but wrap plaintext runs.
  if (/</.test(raw)) return raw;
  return `<p>${raw.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
}

// --- Shopify CSV column set (minimal useful) ---
const SHOPIFY_COLUMNS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value',
  'Variant SKU', 'Variant Inventory Tracker', 'Variant Inventory Qty',
  'Variant Inventory Policy', 'Variant Fulfillment Service',
  'Variant Price', 'Variant Compare At Price',
  'Variant Requires Shipping', 'Variant Taxable',
  'Image Src', 'Image Position', 'Image Alt Text', 'Status',
];

async function main() {
  const raw = await readFile(inputPath, 'utf8');
  const rows = parseCsv(raw);
  if (rows.length < 2) {
    console.error('Input CSV has no data rows.');
    process.exit(1);
  }

  // eBay reports sometimes prefix a "title" row before the real header row.
  // Skip any leading rows that don't look like a header (missing 'Title' column).
  let headerIdx = 0;
  while (headerIdx < rows.length && findCol(rows[headerIdx], COLUMN_MAP.title) === -1) headerIdx++;
  if (headerIdx >= rows.length) {
    console.error('Could not find a header row with a Title column.');
    process.exit(1);
  }
  const header = rows[headerIdx];
  const dataRows = rows.slice(headerIdx + 1);

  const cols = {
    title:        findCol(header, COLUMN_MAP.title),
    price:        findCol(header, COLUMN_MAP.price),
    itemId:       findCol(header, COLUMN_MAP.itemId),
    description:  findCol(header, COLUMN_MAP.description),
    pictures:     findCol(header, COLUMN_MAP.pictures),
    quantity:     findCol(header, COLUMN_MAP.quantity),
    condition:    findCol(header, COLUMN_MAP.condition),
    sku:          findCol(header, COLUMN_MAP.sku),
    categoryName: findCol(header, COLUMN_MAP.categoryName),
    ebayUrl:      findCol(header, COLUMN_MAP.ebayUrl),
  };

  console.log(`[ebay-to-shopify] Input: ${inputPath}`);
  console.log(`[ebay-to-shopify] Discount: ${DISCOUNT_PCT}% off eBay price`);
  console.log(`[ebay-to-shopify] Columns detected:`, Object.fromEntries(
    Object.entries(cols).map(([k, v]) => [k, v === -1 ? '❌ missing' : `✓ ${header[v]}`])
  ));

  if (cols.title === -1 || cols.price === -1) {
    console.error('Required columns missing (Title, Price). Check your CSV export.');
    process.exit(1);
  }

  const output = [SHOPIFY_COLUMNS];
  let productCount = 0;
  let skipped = 0;

  for (const r of dataRows) {
    const title = (r[cols.title] ?? '').trim();
    const ebayPrice = parsePrice(r[cols.price]);
    if (!title || ebayPrice == null) { skipped++; continue; }

    const itemId = cols.itemId !== -1 ? (r[cols.itemId] ?? '').trim() : '';
    const descriptionRaw = cols.description !== -1 ? (r[cols.description] ?? '').trim() : '';
    const pictures = cols.pictures !== -1 ? splitPictures(r[cols.pictures]) : [];
    const quantity = cols.quantity !== -1 ? (parsePrice(r[cols.quantity]) ?? 1) : 1;
    const condition = cols.condition !== -1 ? (r[cols.condition] ?? '').trim() : '';
    const sku = cols.sku !== -1 ? (r[cols.sku] ?? '').trim() : (itemId ? `BUBS-EB-${itemId}` : '');
    const ebayUrl = cols.ebayUrl !== -1 ? (r[cols.ebayUrl] ?? '').trim()
                  : (itemId ? `https://www.ebay.com/itm/${itemId}` : '');

    const shopifyPrice = Math.round(ebayPrice * DISCOUNT_MULT * 100) / 100;
    const handle = slugify(`${title}-${itemId || Math.random().toString(36).slice(2, 8)}`);
    const productType = guessProductType(title);
    const tags = [
      productType && productType.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      condition && `condition-${condition.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    ].filter(Boolean).join(', ');

    const descParts = [];
    if (descriptionRaw) descParts.push(escapeHtmlDesc(descriptionRaw));
    if (ebayUrl) descParts.push(`<p><a href="${ebayUrl}" rel="noopener">View original eBay listing</a></p>`);
    const body = descParts.join('\n');
    const altBase = title;

    // First row carries all the product fields; subsequent rows add extra images
    // with the same Handle and Image Position only.
    const mainImg = pictures[0] ?? '';
    const firstRow = SHOPIFY_COLUMNS.map((col) => {
      switch (col) {
        case 'Handle':                       return handle;
        case 'Title':                        return title;
        case 'Body (HTML)':                  return body;
        case 'Vendor':                       return 'Bubs960 Collectibles';
        case 'Type':                         return productType;
        case 'Tags':                         return tags;
        case 'Published':                    return 'TRUE';
        case 'Option1 Name':                 return 'Title';
        case 'Option1 Value':                return 'Default Title';
        case 'Variant SKU':                  return sku;
        case 'Variant Inventory Tracker':    return 'shopify';
        case 'Variant Inventory Qty':        return String(quantity);
        case 'Variant Inventory Policy':     return 'deny';
        case 'Variant Fulfillment Service':  return 'manual';
        case 'Variant Price':                return shopifyPrice.toFixed(2);
        case 'Variant Compare At Price':     return ebayPrice.toFixed(2);
        case 'Variant Requires Shipping':    return 'TRUE';
        case 'Variant Taxable':              return 'TRUE';
        case 'Image Src':                    return mainImg;
        case 'Image Position':               return mainImg ? '1' : '';
        case 'Image Alt Text':               return mainImg ? altBase : '';
        case 'Status':                       return 'active';
        default: return '';
      }
    });
    output.push(firstRow);

    for (let i = 1; i < pictures.length; i++) {
      const extra = new Array(SHOPIFY_COLUMNS.length).fill('');
      extra[SHOPIFY_COLUMNS.indexOf('Handle')]         = handle;
      extra[SHOPIFY_COLUMNS.indexOf('Image Src')]      = pictures[i];
      extra[SHOPIFY_COLUMNS.indexOf('Image Position')] = String(i + 1);
      extra[SHOPIFY_COLUMNS.indexOf('Image Alt Text')] = `${altBase} photo ${i + 1}`;
      output.push(extra);
    }

    productCount++;
  }

  await writeFile(outputPath, toCsv(output));
  console.log(`[ebay-to-shopify] Wrote ${productCount} product(s) to ${outputPath}.`);
  if (skipped > 0) console.log(`[ebay-to-shopify] Skipped ${skipped} row(s) (missing title or price).`);
  console.log(`[ebay-to-shopify] Upload in Shopify admin -> Products -> Import.`);
}

main().catch((err) => {
  console.error(`[ebay-to-shopify] FAILED: ${err.message}`);
  process.exit(1);
});
