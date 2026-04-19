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
node scripts/build-pages.mjs   # regenerate shop/ HTML pages + sitemap
node scripts/sync-shopify.mjs  # push local JSON shells INTO Shopify (migration tool)
```

The sync script is a one-way push of local JSON into Shopify. It's
useful for the initial migration if you ever want to bulk-import from
JSON. It is NOT part of the default build flow.

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
