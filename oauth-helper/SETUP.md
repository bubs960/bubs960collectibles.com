# Shopify OAuth Helper — Setup Guide

Tiny one-time setup. After this, the existing eBay→Shopify GitHub workflow runs
on its own forever.

## What this gets you

A long-lived **Admin API access token** (`shpat_*`) for your store that the
GitHub Actions workflow uses to create Shopify products from eBay listings.
Shopify won't let you issue this kind of token directly anymore — you have to
go through a registered Partner app's OAuth install flow. This helper is the
smallest possible thing that completes that flow.

---

## Step 1 — Create a Shopify Partner account (free, 2 min)

1. Go to <https://partners.shopify.com/signup>
2. Sign up with your `bubs960toys@gmail.com` email
3. Pick "Manage clients and apps" when asked what you're using it for
4. Verify your email

## Step 2 — Create a Partner app (5 min)

1. Partner Dashboard → **Apps** → **Create app** → **Create app manually**
2. Name: `Bubs960 eBay Sync`
3. **App URL:** leave blank for now — we come back to it after Step 3
4. **Allowed redirection URL(s):** leave blank for now
5. Click **Create app**
6. On the app page, find **Client ID** and **Client secret** under "API credentials". You'll paste these into the Cloudflare Worker in Step 3.

## Step 3 — Deploy the Cloudflare Worker (10 min)

This is the OAuth handler that catches the token. Cloudflare Workers' free tier
covers us forever (100k requests/day; we'll use ~5 over the app's lifetime).

### 3a. Cloudflare account

1. Sign up at <https://dash.cloudflare.com/sign-up> *(use a fresh account, not the bubs960toys one)*
2. Verify email

### 3b. Deploy via dashboard (easiest, no CLI)

1. Cloudflare dashboard → **Workers & Pages** → **Create application** → **Create Worker**
2. Name it `bubs960-shopify-oauth` → **Deploy**
3. On the new Worker's page → **Edit code**
4. Replace the default code with the contents of `worker.js` (the file next to this README)
5. **Save and Deploy**
6. Go back to the Worker overview. Note the URL — looks like:
   `https://bubs960-shopify-oauth.<your-handle>.workers.dev`

### 3c. Add the two secrets

1. Worker page → **Settings** → **Variables and Secrets** → **Add variable**
2. Add:
   - **Name:** `SHOPIFY_API_KEY` → **Value:** the Client ID from Step 2 step 6 → **Encrypt** → Save
   - **Name:** `SHOPIFY_API_SECRET` → **Value:** the Client Secret from Step 2 step 6 → **Encrypt** → Save
3. Click **Deploy** again to apply

## Step 4 — Finish the Shopify Partner app config (1 min)

Back in Shopify Partner Dashboard → your app → **Configuration**:

1. **App URL:** paste your Worker URL (e.g., `https://bubs960-shopify-oauth.your-handle.workers.dev`)
2. **Allowed redirection URL(s):** paste `<Worker URL>/callback`
   - e.g., `https://bubs960-shopify-oauth.your-handle.workers.dev/callback`
3. **Save**

## Step 5 — Install the app on your store (1 min, captures the token)

1. Open in your browser:
   ```
   <Worker URL>/install?shop=bubs960-collectibles.myshopify.com
   ```
   e.g., `https://bubs960-shopify-oauth.your-handle.workers.dev/install?shop=bubs960-collectibles.myshopify.com`
2. Shopify takes you to the consent screen — review scopes (products + inventory + locations) → **Install app**
3. You'll land back on the Worker's success page showing a `shpat_...` token
4. **Copy the token now — it won't be shown again**

## Step 6 — Save the token in GitHub (30 sec)

1. <https://github.com/bubs960/bubs960collectibles.com/settings/secrets/actions>
2. Click `SHOPIFY_ADMIN_TOKEN` → **Update** → paste the `shpat_...` value → Save

## Step 7 — Run the workflow

<https://github.com/bubs960/bubs960collectibles.com/actions/workflows/ebay-active-sync.yml>
→ Run workflow → defaults (Dry run on, Max 5) → green button.

Diagnostic should now show:
```
[diag] SHOPIFY_ADMIN_TOKEN prefix=shpa** len=38
[diag] shop.name="Bubs960 Collectibles" primaryDomain=https://...
```

Flip Dry Run off, Max=1 to create one real product as a final check, then full run.

---

## If anything breaks

- **`/install` redirects to a 404 Shopify page** → "Allowed redirection URL(s)" in Step 4 doesn't match the Worker URL exactly. Re-paste, save.
- **Worker shows "SHOPIFY_API_KEY not configured"** → Step 3c didn't save. Re-add the secrets, redeploy.
- **Consent screen says "Oauth error invalid_request"** → Client ID/Secret on the Worker doesn't match the Partner app. Re-copy from Partner Dashboard.
- **Token starts with `shppa_`, not `shpat_`** → that's fine; both formats work as `X-Shopify-Access-Token`.
