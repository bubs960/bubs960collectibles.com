# Store-listing copy — App Store + Play Store

All copy below is a starting draft. Edit freely. Three slots are
mandatory; the rest are nice-to-have or platform-specific.

## App name

**FigurePinner** (15 chars)

If you ever need to differentiate from a future Pro tier or Plus
edition: `FigurePinner` stays as the consumer brand; SKU
differentiation lives in IAP / paywall, not the app name.

## Subtitle / promotional text

**Apple "subtitle" field is hard-capped at 30 characters.** It appears
under the app name on the listing and inside Spotlight search. Three
options to pick from:

| # | Option | Chars | Pitch |
|---|---|---:|---|
| 1 | **Real eBay prices, real fast** | 28 | Ties the value-prop to the data source + speed |
| 2 | **Action figure prices, real** | 27 | Names the niche outright; weakest hook but highest clarity |
| 3 | **Know what your figures sell for** | 30 | Conversational, leans into collector pain |

**My pick: #1** — "real" twice is intentional, it stops the eye, and
"real eBay prices" beats anything generic about "values" or "estimates"
because that's literally the differentiator.

Play Store calls this the "short description" and caps at 80 chars.
For 80, use the long version of #1: "Real eBay sold prices for action
figures — search anything, see comps, no fluff." (94 → trim to fit.)

## Long description (4000 char cap)

Below is ~2,800 chars. Headroom for tweaks. Drop the "What's coming"
section if you want to ship leaner.

```
Stop guessing what your action figures are worth.

FigurePinner shows real eBay sold prices for action figures — every
release, every wave, going back as far as the data goes. Type a
character, line, or series, tap a result, see what people are actually
paying. No padded asking prices. No "values guide" estimates. Real
sold comps from real auctions.

Built by collectors, for collectors. We index figures across every
major line — Mattel WWE Elite, Hasbro Marvel Legends, Star Wars Black
Series, Mattel Hot Wheels Premium, NECA, McFarlane, Mezco, Super7,
Diamond Select, Storm Collectibles — and pair them with the eBay sold
listings that show what each one actually moves for. Average sold,
median, low, high. Last 90 days of comps. Recent sales with condition,
date, and sale price.

Built for the way collectors actually shop:

— Search anything: character name, line, series number, brand, or any
  combination. The kind of fuzzy matching that knows "Macho Man" finds
  Randy Savage and "Hall of Fame Warrior" finds the right Ultimate
  Warrior figure.

— Tap any sold comp to jump to the eBay listing. We use eBay Partner
  Network affiliate links, so when you buy through us you support the
  app at no extra cost to you (the eBay price is the same either way).

— Pinch to zoom on any figure photo. Zoom right into the paint apps
  to spot the version you're looking for.

— Works offline for figures you've already viewed. Tap into the same
  figure on a plane or out of signal and you'll still see the last
  cached prices.

— Built for accessibility from day one. Full VoiceOver and TalkBack
  support, Dynamic Type all the way to XXL, Reduce Motion respected
  across every animation, color contrast verified to meet WCAG AA.

— Dark mode only, by design. Most collectors browse at night. We
  optimized for it.

What's coming:
— Vault: track every figure you own.
— Wantlist: track figures you're hunting + set price targets.
— Price alerts: get pinged when a figure drops below your target.

These ship in a free update once the back-end is ready. No paywall.
No "Pro tier" we can't deliver yet.

About us:
We're independent. Solo dev, no VC, no data sale. The app collects
nothing about your behavior we don't need to make it work, and we
don't sell anything to anyone. Read our privacy policy at
figurepinner.com/privacy if you want the details.

Questions, bug reports, or a figure missing from the database?
figurepinner.com/support
```

## Keywords (App Store)

Apple gives you 100 chars of comma-separated keywords. Don't repeat
words from the title or subtitle — Apple's algorithm already weights
those. Pick high-intent collector vocabulary:

```
collectible,wwe,marvel,star wars,hasbro,mattel,grail,wave,series,price,checker,sold,comp,nm,moc
```

(99 chars, room for 1 more if a launch-day keyword surfaces)

## Promotional text (Apple, 170 char cap)

This is the field you can edit WITHOUT a binary update — use it for
launch announcements, sale notices, "new figures added today" type
copy.

Initial value:

```
The price guide collectors actually use. Real eBay sold comps for every figure — search anything, see what it actually sells for. Free, no paywall.
```

(149 chars)

## What's New on this version (Apple, 4000 char cap)

For v1.0 launch:

```
Hello FigurePinner.

Real eBay sold prices for action figures, in your pocket. Search any
figure, see comps, tap to buy.

We're independent, solo, and shipping the boring useful version first.
Vault and wantlist sync land in a free update once the back-end is
ready. Until then: search, see, and shop.

Questions or missing figures? figurepinner.com/support
```

## Age rating

**4+ / Everyone.**

Questionnaire answers (App Store Connect):
- Cartoon or Fantasy Violence: **None**
- Realistic Violence: **None**
- Sexual Content / Nudity: **None**
- Profanity / Crude Humor: **None**
- Alcohol, Tobacco, Drug Use: **None**
- Mature / Suggestive Themes: **None**
- Simulated Gambling: **None**
- Horror / Fear Themes: **None**
- Medical Information: **None**
- User-Generated Content: **None** (v1 has zero UGC; v2 adds vault but
  vault entries are private to the user, never shown to other users)
- Web Browser Access: **No** (we open `expo-web-browser` for eBay +
  legal links — that's an in-app browser, NOT a generic web browser
  field for arbitrary URLs)
- Unrestricted Web Access: **No**

## Category

**Reference** (primary). Not Shopping — Shopping implies in-app
checkout. Reference is where users search "action figure price."

Secondary, if Apple asks: **Lifestyle**.

## Support / marketing URLs (App Store Connect)

- **Support URL:** `https://figurepinner.com/support`
- **Marketing URL** (optional): `https://figurepinner.com`
- **Privacy Policy URL:** `https://figurepinner.com/privacy`

## Copyright

`© 2026 Bubs960 Collectibles`

(Confirm legal entity name. App Store accepts a single line; whatever
matches your tax + payments setup.)

## Screenshots — what to capture

Required device classes (iOS):
- 6.7" iPhone — 1290 × 2796 (iPhone 15 Pro Max class)
- 6.1" iPhone — 1179 × 2556 (iPhone 15 Pro class)

Strongly recommended:
- 5.5" iPhone — 1242 × 2208 (older devices, optional but more downloads)

Android (Play Console):
- Phone — 1080 × 1920 minimum, 1080 × 2400 fits modern aspect

Suggested 6 screenshots (ordered for store carousel — first 2 are
the only ones most users see):

1. **Hero detail** — Rey Mysterio (Elite Series 11) with full price
   strip + chart. Caption overlay: "Real eBay prices, every figure"
2. **Search results** — typing "wolverine", multiple lines / waves
   showing. Caption: "Search anything"
3. **Market panel** — recent sold comps with condition + date.
   Caption: "See what people actually pay"
4. **Onboarding slide 1** — "Hunt like a collector" title screen.
5. **Pinch zoom on hero** — figure photo zoomed to 2x. Caption:
   "Zoom in on every paint app"
6. **Settings** — clean settings screen with version + privacy.
   Caption: "Built collector-first, by collectors"

Screenshots can be captured from the iOS simulator running EAS
preview — no need for a real device. Use `xcrun simctl io booted
screenshot screenshot.png`.

## A note on "Pro tier" copy

We deliberately do NOT mention a Pro tier in any user-facing copy
right now. The reasoning is documented in
`docs/v3/FIGURE-ID-MINT-CANONICAL-DECISION-2026-04-19.md` (and
the Phase 6 CHANGELOG entry). Revisit when Pro is a real product
with a price + payment pipe.
