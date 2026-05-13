/**
 * Native fallback for usePwaInstall. iOS / Android already ARE
 * installed apps; there's no install prompt to surface, no
 * matchMedia(display-mode: standalone) check that makes sense.
 *
 * Returning a stable shape (rather than a Platform.OS branch in
 * every caller) keeps the Settings tree platform-agnostic — the
 * install row just renders nothing when `installable` is false.
 *
 * Metro picks `usePwaInstall.web.ts` over this file when bundling
 * for the web target; this is the iOS/Android variant.
 */
export interface PwaInstallState {
  installable: boolean;
  installed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unsupported'>;
}

export function usePwaInstall(): PwaInstallState {
  return {
    installable: false,
    installed: false,
    promptInstall: async () => 'unsupported',
  };
}
