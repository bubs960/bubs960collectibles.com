// Generates static HTML product pages from products/*.json into /shop/.
// Produces:
//   shop/index.html              — catalog listing
//   shop/<handle>.html           — one high-res page per product
// Safe to re-run; output is fully overwritten.

import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { loadProducts, SHOP_DIR, escapeHtml } from './products.mjs';

const SITE_BRAND = 'Bubs960 Collectibles';

function fmtPrice(p) {
  if (p == null || p === '') return '';
  const n = Number(p);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : String(p);
}

function statusBadge(status) {
  const s = (status ?? 'draft').toLowerCase();
  if (s === 'active') return '<span class="badge badge-live">Live</span>';
  if (s === 'sold') return '<span class="badge badge-sold">Sold</span>';
  return '<span class="badge badge-soon">Coming Soon</span>';
}

function buyButtons(p) {
  const links = p.buyLinks ?? {};
  const out = [];
  if (links.shopify) {
    out.push(`<a class="btn btn-primary" href="${escapeHtml(links.shopify)}" target="_blank" rel="noopener">Buy on Shopify</a>`);
  }
  if (links.ebay) {
    out.push(`<a class="btn btn-yellow" href="${escapeHtml(links.ebay)}" target="_blank" rel="noopener">Buy on eBay</a>`);
  }
  if (links.whatnot) {
    out.push(`<a class="btn btn-ghost" href="${escapeHtml(links.whatnot)}" target="_blank" rel="noopener">Catch on Whatnot</a>`);
  }
  out.push(`<a class="btn btn-ghost" href="/index.html#contact">Inquire Direct</a>`);
  return out.join('\n');
}

function imageGallery(images, title) {
  if (!images || images.length === 0) {
    return `<div class="gallery placeholder"><div class="placeholder-logo">BUBS960</div></div>`;
  }
  const main = images[0];
  const thumbs = images
    .map((src, i) => `<img class="thumb ${i === 0 ? 'active' : ''}" data-full="${escapeHtml(src)}" src="${escapeHtml(src)}" alt="${escapeHtml(title)} photo ${i + 1}">`)
    .join('\n');
  return `
    <div class="gallery">
      <div class="gallery-main">
        <img id="galleryMain" src="${escapeHtml(main)}" alt="${escapeHtml(title)}">
      </div>
      ${images.length > 1 ? `<div class="gallery-thumbs">${thumbs}</div>` : ''}
    </div>
    <script>
      document.querySelectorAll('.thumb').forEach(t => t.addEventListener('click', () => {
        document.getElementById('galleryMain').src = t.dataset.full;
        document.querySelectorAll('.thumb').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      }));
    </script>
  `;
}

function specList(p) {
  const rows = [
    ['Condition', p.condition],
    ['Year', p.year],
    ['Series', p.series],
    ['SKU', p.sku],
    ['Collection', p.collection],
  ].filter(([, v]) => v != null && v !== '');
  if (rows.length === 0) return '';
  return `
    <dl class="specs">
      ${rows.map(([k, v]) => `<div class="spec-row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}
    </dl>
  `;
}

const PAGE_CSS = `
:root {
  --primary-red: #e62429;
  --red-glow: rgba(230, 36, 41, 0.55);
  --primary-blue: #1c3b70;
  --accent-yellow: #f1c40f;
  --accent-cyan: #00e0ff;
  --bg-dark: #05070d;
  --bg-panel: #101827;
  --bg-panel-2: #0a1120;
  --text-light: #f4f4f4;
  --text-muted: #9aa3b2;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  background: var(--bg-dark);
  color: var(--text-light);
  font-family: 'Montserrat', system-ui, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}
a { color: inherit; text-decoration: none; }

.nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 2rem;
  background: rgba(5,7,13,0.92);
  backdrop-filter: blur(8px);
  border-bottom: 2px solid var(--primary-red);
}
.nav-brand {
  font-family: 'Bangers', cursive;
  font-size: 1.75rem;
  color: var(--accent-yellow);
  letter-spacing: 2px;
  text-shadow: 2px 2px 0 var(--primary-red);
}
.nav-links { display: flex; gap: 1.75rem; list-style: none; font-weight: 700; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px; }
.nav-links a:hover { color: var(--accent-yellow); }

.page-wrap { max-width: 1300px; margin: 0 auto; padding: 3rem 2rem; }

.product {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 3rem;
  align-items: start;
}

/* Gallery */
.gallery {
  position: sticky; top: 90px;
  background: linear-gradient(145deg, var(--primary-blue), #0a1a36 70%, #05070d);
  border: 2px solid var(--primary-red);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 0 50px var(--red-glow);
}
.gallery.placeholder {
  aspect-ratio: 1 / 1;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 30% 30%, var(--primary-blue), var(--bg-dark) 70%);
}
.placeholder-logo {
  font-family: 'Bangers', cursive;
  font-size: 5rem;
  color: var(--accent-yellow);
  text-shadow: 4px 4px 0 var(--primary-red);
  letter-spacing: 4px;
}
.gallery-main img {
  width: 100%; height: auto;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  border-radius: 10px;
  background: #000;
  display: block;
}
.gallery-thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
  background: #000;
}
.thumb:hover { transform: translateY(-2px); }
.thumb.active { border-color: var(--accent-yellow); }

/* Info */
.info-collection {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--accent-yellow);
  margin-bottom: 0.75rem;
}
.info-title {
  font-family: 'Bangers', cursive;
  font-size: 3.5rem;
  line-height: 1.05;
  letter-spacing: 1px;
  color: var(--text-light);
  text-shadow: 3px 3px 0 var(--primary-red);
  margin-bottom: 0.5rem;
}
.info-subtitle {
  font-size: 1.1rem;
  font-style: italic;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.price {
  font-family: 'Bangers', cursive;
  font-size: 3rem;
  color: var(--accent-yellow);
  letter-spacing: 1px;
}
.compare-price {
  font-size: 1.25rem;
  color: var(--text-muted);
  text-decoration: line-through;
}
.badge {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 0.35rem 0.7rem;
  border-radius: 4px;
}
.badge-live { background: var(--primary-red); color: white; }
.badge-soon { background: var(--primary-blue); color: white; }
.badge-sold { background: #333; color: var(--text-muted); }

.description {
  background: var(--bg-panel);
  padding: 1.5rem;
  border-radius: 10px;
  border-left: 4px solid var(--primary-red);
  margin-bottom: 1.5rem;
  line-height: 1.7;
  color: #dfe3ec;
}
.description p { margin-bottom: 0.75rem; }
.description p:last-child { margin-bottom: 0; }

.buy-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Bangers', cursive;
  font-size: 1.25rem;
  letter-spacing: 2px;
  padding: 0.9rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 6px;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}
.btn-primary { background: var(--primary-red); color: white; }
.btn-primary:hover { background: #c91d22; transform: scale(1.03); }
.btn-yellow { background: var(--accent-yellow); color: #111; }
.btn-yellow:hover { background: #e4b507; transform: scale(1.03); }
.btn-ghost { background: transparent; color: var(--accent-yellow); border-color: var(--accent-yellow); }
.btn-ghost:hover { background: var(--accent-yellow); color: #111; transform: scale(1.03); }

.specs {
  background: var(--bg-panel-2);
  border: 1px solid #1a2233;
  border-radius: 10px;
  overflow: hidden;
}
.spec-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #1a2233;
}
.spec-row:last-child { border-bottom: none; }
.spec-row dt { font-weight: 800; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; color: var(--text-muted); }
.spec-row dd { color: var(--text-light); }

.back-link {
  display: inline-block;
  margin-bottom: 2rem;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 2px;
  color: var(--accent-yellow);
}
.back-link:hover { color: var(--primary-red); }

/* Catalog page */
.catalog-header { text-align: center; margin-bottom: 3rem; }
.catalog-title {
  font-family: 'Bangers', cursive;
  font-size: 4rem;
  letter-spacing: 2px;
  color: var(--accent-yellow);
  text-shadow: 3px 3px 0 var(--primary-red);
}
.catalog-sub { color: var(--text-muted); font-style: italic; margin-top: 0.5rem; }
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.75rem;
}
.card {
  background: var(--bg-panel);
  border: 2px solid #1a2233;
  border-radius: 14px;
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  transform: translateY(-4px);
  border-color: var(--primary-red);
  box-shadow: 0 12px 30px var(--red-glow);
}
.card-img {
  aspect-ratio: 4 / 3;
  width: 100%;
  object-fit: cover;
  background: radial-gradient(circle at 30% 30%, var(--primary-blue), var(--bg-dark) 70%);
  display: block;
}
.card-img-placeholder {
  aspect-ratio: 4 / 3;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 30% 30%, var(--primary-blue), var(--bg-dark) 70%);
  font-family: 'Bangers', cursive;
  color: var(--accent-yellow);
  font-size: 2.5rem;
  letter-spacing: 3px;
  text-shadow: 3px 3px 0 var(--primary-red);
}
.card-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; flex-grow: 1; }
.card-collection { font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; color: var(--accent-yellow); font-weight: 800; }
.card-title { font-family: 'Bangers', cursive; font-size: 1.5rem; color: var(--text-light); line-height: 1.1; letter-spacing: 1px; }
.card-foot { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.75rem; }
.card-price { font-family: 'Bangers', cursive; color: var(--accent-yellow); font-size: 1.5rem; }

footer { text-align: center; padding: 2.5rem 1rem; color: #777; border-top: 1px solid #1a2233; margin-top: 3rem; }

@media (max-width: 900px) {
  .product { grid-template-columns: 1fr; }
  .gallery { position: static; }
  .info-title { font-size: 2.5rem; }
  .price { font-size: 2.25rem; }
}
@media (max-width: 600px) {
  .page-wrap { padding: 2rem 1rem; }
  .nav { padding: 0.75rem 1rem; }
  .nav-links { gap: 1rem; font-size: 0.8rem; }
  .catalog-title { font-size: 2.75rem; }
  .spec-row { grid-template-columns: 100px 1fr; }
}
`;

const NAV_HTML = `
<nav class="nav">
  <a href="/index.html" class="nav-brand">BUBS960</a>
  <ul class="nav-links">
    <li><a href="/shop/index.html">Shop</a></li>
    <li><a href="/index.html#collections">Collections</a></li>
    <li><a href="/index.html#contact">Contact</a></li>
  </ul>
</nav>
`;

const HEAD = (title, description) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | ${SITE_BRAND}</title>
  <meta name="description" content="${escapeHtml(description ?? '')}">
  <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Montserrat:wght@400;700;800&display=swap" rel="stylesheet">
  <style>${PAGE_CSS}</style>
</head>
<body>
${NAV_HTML}
<main class="page-wrap">
`;

const FOOT = `
</main>
<footer>&copy; 2026 ${SITE_BRAND}. All rights reserved.</footer>
</body>
</html>
`;

function productPage(p) {
  const meta = (p.description ?? '').replace(/<[^>]*>/g, '').slice(0, 160);
  return `${HEAD(p.title, meta)}
<a class="back-link" href="/shop/index.html">&lsaquo; Back to Shop</a>
<div class="product">
  <div>${imageGallery(p.images, p.title)}</div>
  <div class="info">
    ${p.collection ? `<div class="info-collection">${escapeHtml(p.collection)}</div>` : ''}
    <h1 class="info-title">${escapeHtml(p.title)}</h1>
    ${p.subtitle ? `<p class="info-subtitle">${escapeHtml(p.subtitle)}</p>` : ''}
    <div class="price-row">
      ${p.price != null ? `<span class="price">${fmtPrice(p.price)}</span>` : ''}
      ${p.compareAtPrice != null ? `<span class="compare-price">${fmtPrice(p.compareAtPrice)}</span>` : ''}
      ${statusBadge(p.status)}
    </div>
    <div class="description">${p.description ?? '<p>Details coming soon — reach out for photos and condition notes.</p>'}</div>
    <div class="buy-row">${buyButtons(p)}</div>
    ${specList(p)}
  </div>
</div>
${FOOT}`;
}

function catalogPage(products) {
  const cards = products.map((p) => {
    const img = p.images?.[0]
      ? `<img class="card-img" src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.title)}">`
      : `<div class="card-img-placeholder">BUBS960</div>`;
    return `
      <a class="card" href="/shop/${escapeHtml(p.handle)}.html">
        ${img}
        <div class="card-body">
          ${p.collection ? `<div class="card-collection">${escapeHtml(p.collection)}</div>` : ''}
          <div class="card-title">${escapeHtml(p.title)}</div>
          <div class="card-foot">
            ${p.price != null ? `<span class="card-price">${fmtPrice(p.price)}</span>` : '<span></span>'}
            ${statusBadge(p.status)}
          </div>
        </div>
      </a>
    `;
  }).join('\n');

  return `${HEAD('Shop', 'Shop Bubs960 Collectibles — hard-to-find figures, vintage grails, and pop culture pieces.')}
<div class="catalog-header">
  <h1 class="catalog-title">The Shop</h1>
  <p class="catalog-sub">${products.length} piece${products.length === 1 ? '' : 's'} — click through for full specs and buy links.</p>
</div>
${products.length > 0
  ? `<div class="catalog-grid">${cards}</div>`
  : `<p style="text-align:center;color:var(--text-muted);">No products yet. Add a shell under <code>products/</code> and commit — the build will pick it up.</p>`}
${FOOT}`;
}

async function clearOldPages() {
  try {
    const existing = await readdir(SHOP_DIR);
    for (const f of existing) {
      if (f.endsWith('.html')) await unlink(join(SHOP_DIR, f));
    }
  } catch {}
}

await mkdir(SHOP_DIR, { recursive: true });
await clearOldPages();

const products = await loadProducts();
products.sort((a, b) => (a.featured === b.featured ? a.title.localeCompare(b.title) : a.featured ? -1 : 1));

await writeFile(join(SHOP_DIR, 'index.html'), catalogPage(products));
for (const p of products) {
  await writeFile(join(SHOP_DIR, `${p.handle}.html`), productPage(p));
  console.log(`[build] shop/${p.handle}.html`);
}
console.log(`[build] shop/index.html (${products.length} products)`);
