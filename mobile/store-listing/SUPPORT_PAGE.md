# /support page content for figurepinner.com

Drop this into the figurepinner-site worker or as static HTML at
`https://figurepinner.com/support`. Apple needs the URL to resolve
to a real page (not a 404, not a redirect to the homepage) before
TestFlight will accept the app for review.

Two versions below — pick one.

---

## Version A — minimal (recommended for launch)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Support — FigurePinner</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;max-width:680px;margin:2rem auto;padding:0 1rem;line-height:1.55;color:#0a0d1c}
    h1{font-size:2rem;margin-bottom:.5rem}
    h2{font-size:1.1rem;margin-top:2rem;color:#5b8def}
    a{color:#5b8def}
    .muted{color:#6b7085}
  </style>
</head>
<body>

<h1>FigurePinner support</h1>
<p class="muted">Real eBay prices for action figures.</p>

<h2>Get in touch</h2>
<p>Email <a href="mailto:support@figurepinner.com">support@figurepinner.com</a>.
We're a small team — usually a same-day reply, occasionally next-day if
something's on fire.</p>

<h2>Common questions</h2>

<p><strong>A figure I own isn't showing up.</strong><br>
We index figures from major lines as they come in. If something's
missing, email us with the brand, line, series, and character name —
we'll add it on the next data refresh.</p>

<p><strong>The price feels off.</strong><br>
Prices come from real eBay sold listings. They reflect what people
actually paid in the last 90 days, including auctions that might have
gone low or high. If something looks wildly wrong, email us with the
figure name and a screenshot — we'll dig into it.</p>

<p><strong>The eBay link doesn't open.</strong><br>
Make sure you have either the eBay app installed or a default web
browser configured. We open eBay through an in-app browser; if
your phone has neither, the link will fail silently.</p>

<p><strong>Can I delete my account?</strong><br>
Yes. If you've signed in (a future feature), you can delete your
account from inside the app — Settings → Account → Delete account.
This permanently removes your account and all server-stored data.
Your local on-device cache is wiped at the same time.</p>

<p><strong>Where's the privacy policy?</strong><br>
<a href="/privacy">figurepinner.com/privacy</a></p>

<p><strong>Where's the terms of service?</strong><br>
<a href="/terms">figurepinner.com/terms</a></p>

<h2>About the app</h2>
<p>FigurePinner is built and maintained by Bubs960 Collectibles. We're
collectors first, devs second. The app is independent — no VC, no
data sale. Affiliate revenue from eBay Partner Network is what keeps
the lights on.</p>

<p class="muted">© 2026 Bubs960 Collectibles · <a href="/">figurepinner.com</a></p>

</body>
</html>
```

## Version B — Markdown (if you'd rather render through the worker's md pipeline)

```markdown
# FigurePinner support

Real eBay prices for action figures.

## Get in touch

Email **support@figurepinner.com**. Small team, usually same-day reply.

## Common questions

### A figure I own isn't showing up.
We index figures from major lines as they come in. If something's
missing, email us with the brand, line, series, and character name —
we'll add it on the next data refresh.

### The price feels off.
Prices come from real eBay sold listings, last 90 days. Includes
auctions that may have gone unusually low or high. If something looks
wildly wrong, email us with the figure name + screenshot.

### The eBay link doesn't open.
You'll need either the eBay app installed or a default web browser.
We open eBay through an in-app browser; without either, the link
fails silently.

### Can I delete my account?
Yes — Settings → Account → Delete account inside the app
(once sign-in is shipped). Permanently removes your account + all
server-stored data + local cache.

### Privacy / terms
- [Privacy policy](/privacy)
- [Terms of service](/terms)

## About the app

FigurePinner is built and maintained by Bubs960 Collectibles.
Collectors first, devs second. Independent — no VC, no data sale.
Affiliate revenue from eBay Partner Network keeps the lights on.

---

© 2026 Bubs960 Collectibles · [figurepinner.com](/)
```

## Things to verify before pushing live

- [ ] `support@figurepinner.com` is a real, monitored inbox (or alias
      that forwards somewhere monitored). Apple sometimes test-emails
      this address as part of review.
- [ ] `/privacy` and `/terms` exist (you reference both). If they
      don't, write the cheapest acceptable version and link that
      instead.
- [ ] Page returns HTTP 200 — no redirect chain. `curl -I` it once
      live.
- [ ] Loads on a 3G phone connection — the inline CSS in version A
      keeps it ~3KB total, which is the right call for support pages.
- [ ] The `<meta name="viewport">` tag is present (Apple's reviewers
      load these on iPhones; a desktop-only layout looks broken).
