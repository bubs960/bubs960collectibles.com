// Web variant of clerkRuntime. @clerk/clerk-react provides
// browser-native sign-in via cookies + localStorage; no tokenCache
// prop required on the provider.
//
// The hook surface (useAuth / useUser / useSignIn / useSignUp /
// useClerk) is API-compatible with @clerk/clerk-expo for the calls
// the rest of src/ makes — so consumer code can stay platform-agnostic.
export { useAuth, useUser, useSignIn, useSignUp, useClerk } from '@clerk/clerk-react';
