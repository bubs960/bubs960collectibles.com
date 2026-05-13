// Platform-agnostic re-export point for Clerk's React hooks. Metro
// picks `.web.ts` over `.ts` when bundling for the browser, so this
// file is what iOS / Android consume. The web variant routes to
// `@clerk/clerk-react`, which the Expo SDK doesn't ship for native
// platforms.
//
// All Clerk imports in src/ should go through THIS module rather than
// `@clerk/clerk-expo` directly, so a single line-of-sight change
// drives both targets.
export { useAuth, useUser, useSignIn, useSignUp, useClerk } from '@clerk/clerk-expo';
