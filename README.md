# bubs960collectibles.com

Static site for Bubs960 Collectibles. Products come from Shopify.
The site generates catalog and product pages from the Shopify Admin API
on a schedule, commits them back to `main`, and GitHub Pages serves.

## Adding a product

**Primary flow (Shopify-first):**

1. Open the Shopify admin (mobile app works great). Add the product —
   title, description, photos, price, inventory, tags.
2. Set status to `active` when it's ready to be public, or `draft` to
   hide it until you're ready.
3. Save. On the next hourly cron (or click "Run workflow" on the
   `Build Site from Shopify` Action for instant), the site regenerates
   and the product page appears at `/shop/<handle>.html`.

**Special tags Shopify → site behavior:**

- Tag `sold` → the site marks the product as sold (SOLD stamp, disabled
  buy buttons, struck-through price).
- Tag `featured` or `grail` → "Grail" ribbon on the catalog card.
- Product status `archived` in Shopify → product is skipped (no page).

**Fallback flow (local JSON shells):**

If Shopify secrets are missing or the API is unreachable, the build
falls back to JSON shells in `products/*.json`. This is how the site
works pre-Shopify and it's still a valid backup path.

- Copy `products/_template.json` to `products/<handle>.json`.
- Fill in the fields. Photos go in `products/images/` named starting
  with the handle (auto-discovered).
- Commit and push.

## Local commands

```bash
node scripts/build-pages.mjs                    # regenerate shop/ HTML pages + sitemap
node scripts/sync-shopify.mjs                   # push local JSON shells INTO Shopify (migration tool)
node scripts/ebay-to-shopify-csv.mjs IN.csv     # convert eBay export CSV -> Shopify import CSV (15% off)
node scripts/mark-sold-from-csv.mjs ORDERS.csv  # mark Shopify products sold from an eBay Orders CSV
```

The sync script is a one-way push of local JSON into Shopify. It's
useful for the initial migration if you ever want to bulk-import from
JSON. It is NOT part of the default build flow.

## eBay-first intake workflow

For bulk migrating an existing eBay store into Shopify:

1. eBay Seller Hub -> Reports -> Downloads -> "Active Listings Report".
   Download the CSV.
2. Run:
   ```
   node scripts/ebay-to-shopify-csv.mjs active-listings.csv shopify-import.csv 15
   ```
   The last argument is the direct-buyer discount percentage (default
   15). eBay price becomes "Compare At Price" on Shopify, so the
   savings render as a strikethrough on the site.
3. Shopify admin -> Products -> Import -> upload `shopify-import.csv`.
   Photos pull from eBay's CDN URLs automatically.
4. GitHub Actions rebuilds the site on next cron (or manual dispatch).

## Mark eBay-sold items sold on the site (manual, no API needed)

Use this when the automated eBay sync isn't available (no dev
account, API issues, etc.). Free and fast.

1. eBay Seller Hub -> **Orders** -> **Download report** (any
   recent window — last 24h, last week, etc.). Save the CSV.
2. Run locally with your Shopify secrets:
   ```
   SHOPIFY_STORE=bubs960-collectibles.myshopify.com \
   SHOPIFY_ADMIN_TOKEN=your_token \
   node scripts/mark-sold-from-csv.mjs path/to/orders.csv
   ```
3. Script matches eBay SKUs (or falls back to `BUBS-EB-<itemId>`)
   against Shopify products and adds the `sold` tag to any that
   aren't already marked.
4. Site rebuilds on the next cron tick and those products render
   the SOLD stamp with disabled buy buttons.

Cancelled, refunded, or returned orders are automatically skipped.

## eBay listing template (drive sellers, stay legal)

`templates/ebay-listing-description.html` — copy/paste into the bottom
of every eBay listing. Drives sellers (inventory, 100% eBay-allowed)
and Whatnot viewers. Deliberately avoids URLs to bubs960collectibles.com
and any buyer-poaching language (both forbidden by eBay).

## One-time Formspree setup (contact + VIP forms)

Both homepage forms (Contact, VIP signup) and the intake forms on
`/we-buy.html`, `/want-list.html`, `/testimonials.html` POST to
Formspree. Form IDs live in each form's `data-formspree` attribute.

1. Create a free account at https://formspree.io.
2. Create a form (or multiple if you want to split inboxes).
3. Paste the form ID (the 8-char string after `/f/`) into the
   appropriate `data-formspree="..."` attribute.
4. Commit.

The AJAX handler falls back to the existing `mailto:` action if the
placeholder `YOUR_..._FORM_ID` is still in place.

## One-time Shopify setup

1. In Shopify admin: **Settings -> Apps and sales channels -> Develop
   apps -> Create an app** (name it "GitHub Sync" or similar).
2. In **Configuration -> Admin API integration**, grant:
   - `read_products`, `write_products`
   - `read_inventory`, `write_inventory`
3. Install the app, copy the **Admin API access token**.
4. In this repository: **Settings -> Secrets and variables -> Actions**,
   add:
   - `SHOPIFY_STORE` — your store domain (e.g. `bubs960-collectibles.myshopify.com`)
   - `SHOPIFY_ADMIN_TOKEN` — the token from step 3
5. The build now sources from Shopify on every run.

If secrets are missing, the build still succeeds using local JSON shells.

## Workflow triggers

The `Build Site from Shopify` workflow runs on:

- **Hourly cron** — picks up Shopify changes without manual action.
- **Push to `main`** under `products/**` or `scripts/**` — covers
  JSON fallback edits.
- **Manual dispatch** — Actions tab → "Run workflow" for instant
  rebuild after adding a Shopify product.
