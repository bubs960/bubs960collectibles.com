# eBay → Shopify Sold-Item Sync Setup

One-time setup to automatically mark Shopify products sold when they sell on
eBay. Prevents double-selling 1-of-1 collectibles. Runs every 15 min via
GitHub Actions.

**Time required:** ~15 minutes, all on your side. No code changes.

---

## Step 1 — Create an eBay Developer account

1. Go to https://developer.ebay.com/
2. Sign in with your regular eBay account
3. Accept the developer terms — you're now a developer

## Step 2 — Create a Production keyset

1. Dashboard → **Keysets** → **Create a keyset**
2. Environment: **Production**
3. Application title: `Bubs960 Shopify Sync` (or anything)
4. Save

You'll now see two secrets at the top of the keyset page:
- **App ID (Client ID)** — note this
- **Cert ID (Client Secret)** — note this

## Step 3 — Configure the user-token flow (RuName)

Still inside the keyset:

1. Scroll to **"User Tokens"** section → click **"Get a Token from eBay via Your Application"**
2. Set **Your auth accepted URL** to exactly:
   ```
   http://localhost:8787/callback
   ```
3. Save
4. eBay now shows your **RuName** — it looks like `Bubs960-Bubs960-PRD-abc123xyz-4e8a2b1c`. Note this.

## Step 4 — Run the OAuth helper locally

Clone the repo locally if you haven't (or just download these files). Then:

```bash
node scripts/ebay-oauth-setup.mjs
```

The script will prompt for App ID, Cert ID, and RuName (or set them as env vars first).
It prints an authorization URL → click it → log in to eBay → approve.
eBay redirects to `localhost:8787/callback`, the script catches the code and prints:

```
============================================================
SUCCESS. Copy the refresh token below into GitHub Secrets as:
  Name:  EBAY_REFRESH_TOKEN
  Value: (the string below)
============================================================
v^1.1#i^1#...very long string...
============================================================
```

## Step 5 — Add 4 secrets to GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**.

Add all four:

| Name                 | Value                          |
|----------------------|--------------------------------|
| `EBAY_APP_ID`        | from keyset (Step 2)           |
| `EBAY_CERT_ID`       | from keyset (Step 2)           |
| `EBAY_RUNAME`        | from user-token setup (Step 3) |
| `EBAY_REFRESH_TOKEN` | from helper output (Step 4)    |

`SHOPIFY_STORE` and `SHOPIFY_ADMIN_TOKEN` are already set (for the Shopify build).

## Step 6 — Verify it works

Repo → **Actions → eBay Sold-Item Sync → Run workflow** → pick `main` → **Run**.

Watch the log. A healthy first run looks like:

```
[sync-ebay-sold] Lookback window: 120 min.
[sync-ebay-sold] eBay orders scanned: 3. Unique sold SKUs: 3.
[sync-ebay-sold] Shopify products indexed: 47 SKUs across 1 page(s).
[sync-ebay-sold]   marked sold: wwe-elite-87-stone-cold-steve-austin (SKU BUBS-EB-123456)
[sync-ebay-sold] Done. Marked sold: 1. Already sold: 2. Not in Shopify: 0.
```

From this point on, the workflow runs every 15 min automatically. First eBay
order fires within a quarter-hour and you'll see the Shopify product's tag
list pick up `sold`. Site rebuilds on its next cron tick and renders the
SOLD stamp.

## How it matches eBay orders to Shopify products

By **SKU**. Our `ebay-to-shopify-csv.mjs` transformer sets Shopify SKU =
`BUBS-EB-<eBay item ID>`. When you import those into Shopify, each product
has a stable SKU that matches what eBay reports in the Fulfillment API's
line items.

If you list on eBay manually (not via the CSV transformer), make sure the
**Custom Label (SKU)** field in your eBay listing matches the SKU of your
Shopify product. If they don't match, the sync can't connect them and
you'll see `(no Shopify match for SKU XXX)` in the log.

## Troubleshooting

- **"eBay token refresh failed (400)"** → refresh token expired or wrong
  (they last ~18 months). Re-run `ebay-oauth-setup.mjs` to get a fresh one.
- **"no Shopify match for SKU"** → SKU mismatch. Align SKUs in eBay and
  Shopify.
- **Cancelled orders get marked sold** → they shouldn't — the script skips
  `cancelStatus.cancelState === 'CANCELED'`. If you see this, open an issue.
- **Want to un-mark sold** → in Shopify admin, remove the `sold` tag from
  the product's Tags field. Site rebuilds next cron.
