# bubs960collectibles.com

Static site for Bubs960 Collectibles with automated Shopify product sync and
generated high-resolution product pages.

## Adding a product

1. Copy `products/_template.json` to `products/<your-handle>.json`.
2. Fill in the fields (`handle`, `title`, `price`, etc.).
3. Drop photos into `products/images/` with filenames starting with the
   product handle (e.g. `wwe-elite-legends-irs-1.jpg`,
   `wwe-elite-legends-irs-2.jpg`). They're auto-discovered and added to
   the gallery in sorted order — no need to edit the JSON's `images` array.
4. Commit and push to `main`.

The `images` array in the JSON still works for external URLs if you'd
rather host photos elsewhere; local files and URLs combine.

On push, GitHub Actions will:

- Regenerate `shop/index.html` and `shop/<handle>.html` (bold product pages),
  and commit the result back to `main`.
- Push the product to Shopify (create if new, update if the handle exists).

## Local commands

```bash
node scripts/build-pages.mjs   # regenerate shop/ HTML pages
node scripts/sync-shopify.mjs  # manual sync to Shopify (requires env vars)
```

## One-time Formspree setup (contact + VIP forms)

The contact form and VIP signup form on the homepage use Formspree for
real submission capture. Until Formspree IDs are pasted in, both forms
gracefully fall back to `mailto:Bubs960toys@gmail.com`.

1. Create a free account at https://formspree.io.
2. Create **two forms** in the dashboard:
   - `Bubs960 Contact` (the reach-out form)
   - `Bubs960 VIP` (the email signup)
   You can also use one form for both if you prefer.
3. Each form has a short ID in its endpoint, e.g. `mwkjyzab`.
4. In `index.html`, find the two `data-formspree="YOUR_..._FORM_ID"`
   attributes and paste the IDs in.
5. Commit — the AJAX handler automatically switches from `mailto:` to
   Formspree POSTs once a real ID is detected.

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
