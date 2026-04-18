# bubs960collectibles.com

Static site for Bubs960 Collectibles with automated Shopify product sync and
generated high-resolution product pages.

## Adding a product

1. Copy `products/_template.json` to `products/<your-handle>.json`.
2. Fill in the fields (`handle`, `title`, `price`, `images`, etc.). See the
   template for the full schema.
3. Commit and push to `main`.

On push, GitHub Actions will:

- Regenerate `shop/index.html` and `shop/<handle>.html` (bold product pages),
  and commit the result back to `main`.
- Push the product to Shopify (create if new, update if the handle exists).

## Local commands

```bash
node scripts/build-pages.mjs   # regenerate shop/ HTML pages
node scripts/sync-shopify.mjs  # manual sync to Shopify (requires env vars)
```

## One-time Shopify setup

1. In Shopify admin: **Settings -> Apps and sales channels -> Develop apps ->
   Create an app** (e.g. "GitHub Sync").
2. In **Configuration -> Admin API integration**, grant these scopes:
   - `read_products`, `write_products`
   - `read_inventory`, `write_inventory`
3. Install the app, then copy the **Admin API access token**.
4. In this repository: **Settings -> Secrets and variables -> Actions**, add:
   - `SHOPIFY_STORE` - your store domain, e.g. `bubs960.myshopify.com`
   - `SHOPIFY_ADMIN_TOKEN` - the token from step 3
5. Next push to `main` under `products/**` triggers the sync automatically.

If secrets are missing, the sync step logs a message and exits cleanly so the
build still succeeds.
