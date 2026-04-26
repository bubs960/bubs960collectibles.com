# native-templates/

Files Apple + Android need at build time, but that don't sit naturally in
`src/` because they're not TypeScript / React.

## `PrivacyInfo.v1.xcprivacy` + `PrivacyInfo.v2.xcprivacy`

Apple privacy manifest declarations. Required for iOS 17+ submissions.

### How to wire into the EAS Build

In `app.json` (or `app.config.js`), point `expo.ios.privacyManifests` at
the right file based on the build profile:

```json
{
  "expo": {
    "ios": {
      "privacyManifests": {
        "NSPrivacyTracking": false,
        "NSPrivacyTrackingDomains": [],
        "NSPrivacyCollectedDataTypes": [],
        "NSPrivacyAccessedAPITypes": [
          { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
            "NSPrivacyAccessedAPITypeReasons": ["CA92.1"] },
          { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
            "NSPrivacyAccessedAPITypeReasons": ["C617.1"] },
          { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryDiskSpace",
            "NSPrivacyAccessedAPITypeReasons": ["85F4.1"] },
          { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategorySystemBootTime",
            "NSPrivacyAccessedAPITypeReasons": ["35F9.1"] }
        ]
      }
    }
  }
}
```

Or reference the `.xcprivacy` file directly in EAS build hooks. Either
works — Expo flattens both paths into the same plist at build time.

### v1 vs v2 — pick by profile

- **v1-production** EAS profile → `PrivacyInfo.v1.xcprivacy`
  - Tracking: false
  - Data collected: NONE
  - Required-reason APIs: 4 (UserDefaults, FileTimestamp, DiskSpace, SystemBootTime)

- **v2-preview / v2-production** EAS profiles →
  `PrivacyInfo.v2.xcprivacy`
  - Adds Email, User ID, Device ID (Expo push token), Other User
    Content (vault/wantlist) — all linked to user identity, none
    used for tracking, all for AppFunctionality only

### When to update the manifest again

Apple is strict. **Resubmit the manifest** any time the app starts:

| Change | Update needed |
|---|---|
| Add Sentry / Bugsnag | + Crash Data, Performance Data, Diagnostic Data sections |
| Add PostHog / Amplitude / Segment | + Product Interaction (Other Usage Data) section |
| Start tracking outbound clicks for our own analytics | flip `NSPrivacyTracking` to true + list domains in `NSPrivacyTrackingDomains` |
| Add camera (figure scanner v3?) | + Camera-related data types |
| Add anything from a new third-party SDK | Read THAT SDK's manifest + merge |

Resubmissions go through Apple review (24–48h typical). Plan the
changes alongside SDK additions, not weeks later.

### Reason codes used (Apple's official list)

| Code | Category | What it means |
|---|---|---|
| CA92.1 | UserDefaults | "Access user defaults to read/write information that is only accessible to the app itself" — covers AsyncStorage |
| C617.1 | FileTimestamp | "Display file timestamps to the user" — expo-image LRU eviction |
| 85F4.1 | DiskSpace | "Write to disk space within the app's container" — image cache |
| 35F9.1 | SystemBootTime | "Calculate absolute timestamps for events that occurred within your app" — performance + cache keys |

If a future SDK uses an API with a reason code we haven't declared,
Apple's static analyzer flags it on submission. Watch the EAS Build
logs for warnings about undeclared API usage.

## `apple-app-site-association` + `assetlinks.json`

Not yet committed — owed by ops. Templates land here when produced.
See `DEPLOY.md` "Universal Links" for the AASA gotchas (Content-Type,
no redirect, narrow to `/open/*`).
