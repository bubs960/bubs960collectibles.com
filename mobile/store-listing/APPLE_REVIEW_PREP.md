# Apple App Store review prep — v1+v2 launch binary

Per the 2026-04-26 launch decision, the first App Store binary ships
with sign-in, vault, wantlist, and alerts ON (`EXPO_PUBLIC_V2_*=true`).
That trips three review surfaces a v1-only binary wouldn't have hit.
This file enumerates them so the App Store Connect form fills out
correctly the first time.

## 1. App Privacy questionnaire

The privacy manifest in `native-templates/PrivacyInfo.v2.xcprivacy`
already declares the technical surface; this is the human-facing
questionnaire ("App Privacy" tab in App Store Connect).

### Data types collected

Toggle ON in the form:

| Category               | Type                | Linked to user? | Used for tracking? | Purpose                       |
|------------------------|---------------------|-----------------|--------------------|-------------------------------|
| Identifiers            | User ID             | Yes             | No                 | App Functionality             |
| User Content           | Other User Content  | Yes             | No                 | App Functionality (vault/wantlist) |
| Usage Data             | Product Interaction | No              | No                 | Analytics                     |
| Diagnostics            | Crash Data          | No              | No                 | App Functionality             |
| Diagnostics            | Performance Data    | No              | No                 | App Functionality             |
| Identifiers            | Device ID           | No              | No                 | Analytics                     |

**Do NOT toggle:** Contact Info (Email/Phone), Location, Health &
Fitness, Financial Info, Sensitive Info, Browsing History, Search
History, Purchase History, Audio Data, Photos or Videos, Contacts.
None of these are collected by the app. Email is collected by Clerk
as the sign-in identifier, but Apple's questionnaire scope is what
the *binary* collects — Clerk runs in their own SDK with its own
declarations.

### Tracking

**No** — the app does not use any tracker for advertising or share
data with data brokers. The eBay affiliate URL has a `customid`
parameter for EPN revenue attribution, but that's a server-side
join on a click, not on-device tracking. Apple's `App Tracking
Transparency` (the "Allow `FigurePinner` to track you" prompt) is
NOT required.

### Privacy choices

- Data is linked to user identity ONLY when signed in (Clerk userId
  joins vault / wantlist / devices rows).
- A signed-out user collects only anonymous device-id-keyed analytics.
- "Account → Delete account" inside the app permanently removes the
  signed-in user's vault + wantlist + device registrations + Clerk
  user record. Per Apple guideline 5.1.1(v), this in-app deletion
  path is mandatory for any app with account creation. Settings →
  Account → Delete account ships this in `AccountSection.tsx`.

## 2. Sign in with Apple (SIWA)

Apple guideline 4.8 requires SIWA if the app offers third-party
sign-in (Google, Facebook, X, etc.). Email-only / password-only
sign-in does not trigger this.

**Action item before submitting:** check the Clerk dashboard for the
production instance.
- If only **Email** + **Password** are enabled: SIWA is optional.
- If **Google**, **Facebook**, **Apple**, or **X** is enabled: SIWA
  must also be enabled in the Clerk dashboard. Clerk supports SIWA
  natively — toggle it on and the SignInScreen will auto-render the
  Apple button via Clerk's UI components.

The dev Clerk instance (`fitting-penguin-70.clerk.accounts.dev`)
should mirror whatever production has so smoke testing catches any
SIWA-specific bugs before review.

## 3. Account deletion path

Already shipped in `src/screens/settings/AccountSection.tsx`. Apple
reviewers will look for it on the path:

- Tap profile / Settings tab → **Settings**
- Scroll to **Account** section
- Tap **Delete account**
- Confirm in the alert

The action calls Clerk's `user.delete()` which cascades to the
worker (vault/wantlist/devices rows are tied to the Clerk userId
via JWKS-verified middleware on the worker — no separate cascade
call needed from mobile).

## 4. Anonymous browsing path

Apple guideline 5.1.1(i) — apps must not require sign-in to use
core functionality unless that functionality genuinely needs an
account. FigurePinner's core (search figures, view prices, hit
"Find on eBay") works fully signed-out. The `FigureDetailScreen`
renders without auth; the v2 surfaces (Own/Want pills, vault,
wantlist, alerts) gate behind `useAuth().isSignedIn` and route to
SignInScreen on tap rather than blocking the read path.

**No action needed** — already correct in the codebase. Mention it
in the App Review Notes field as: "Sign-in is optional and only
unlocks personal collection features. Reviewers can fully evaluate
the app without creating an account."

## 5. Demo account for Apple reviewers

App Store Connect → App Review Information → Sign-in Information.

Provide a demo account so reviewers don't have to create one:
- Email: `apple-review@bubs960.com` (or whatever you set up in
  Clerk for review purposes; can be a real address that forwards)
- Password: a long random string

Pre-populate this account with a realistic vault (3–5 owned
figures) and wantlist (3–5 wanted figures with target prices) so
the reviewer sees the v2 features actually working, not an empty
state that looks broken.

## 6. App Review Notes — suggested copy

```
FigurePinner is a price-checker for action figures backed by real
eBay sold listings.

Core functionality (search any figure, view sold-comp prices, tap
through to eBay) works without an account — reviewers can evaluate
it fully without signing in.

Optional account features (sign in via Clerk):
- Vault: track figures you own
- Wantlist: track figures you're hunting + price-drop targets
- Price alerts: push notifications when a figure drops below a
  target you set

Demo credentials provided in Sign-in Information. The demo account
has a pre-populated vault + wantlist so the v2 surfaces are
non-empty.

Account deletion: Settings → Account → Delete account. This
permanently removes the user record and all server-stored data
(vault, wantlist, device registrations). The local on-device cache
is wiped at the same time.

Affiliate disclosure: eBay outbound links carry our eBay Partner
Network referrer. We earn a small commission on purchases, at no
extra cost to the user. The eBay price is identical with or
without our link. This is disclosed on the support page
(figurepinner.com/support).

No third-party trackers, no on-device behavioral tracking, no
data sale. Privacy details: figurepinner.com/privacy.
```

## 7. Smoke-test checklist before submitting

- [ ] `scripts/smoke-v2-auth.sh <JWT>` passes (vault / wantlist /
      devices return 200 with JWT, 401 without).
- [ ] Demo account created in Clerk + pre-populated with sample
      vault / wantlist.
- [ ] Walk through "Delete account" on a real sandbox account; verify
      the Clerk record is gone and the vault / wantlist endpoints
      return 401 for that user afterwards.
- [ ] Privacy policy at `figurepinner.com/privacy` updated to
      mention sign-in / account / push notifications (if it currently
      assumes the v1 read-only posture).
- [ ] Support page at `figurepinner.com/support` reachable from the
      app (Settings → Support tap should open in-app browser).
- [ ] Sign in with Apple either enabled in Clerk OR confirmed
      unnecessary because no other social provider is enabled.
- [ ] App icon + screenshots cover the v2 surfaces — at least one
      shot of the vault and one of the alert configuration; reviewers
      compare screenshots vs. binary functionality.
