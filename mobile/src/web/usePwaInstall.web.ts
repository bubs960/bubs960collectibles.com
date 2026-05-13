import { useEffect, useState, useCallback } from 'react';

/**
 * Chrome / Edge / Brave fire `beforeinstallprompt` when the page
 * meets the PWA install heuristic (manifest + service worker + a
 * couple of visits worth of engagement). The browser holds the
 * native prompt back; we capture it and offer a button to surface
 * it on demand.
 *
 * Safari (macOS / iOS) doesn't fire this event — installation goes
 * through Share → Add to Home Screen instead, with no JS API. This
 * hook just returns `installable: false` there.
 *
 * Tauri's webview never fires this event either (it's already a
 * binary), so the hook is a no-op inside the desktop shell.
 *
 * Native (iOS/Android) imports never reach the .web variant; the
 * non-web file below returns a stable no-op so React's Rules of
 * Hooks are satisfied without a Platform.OS branch in callers.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export interface PwaInstallState {
  /** True when the browser has offered an install prompt we can fire. */
  installable: boolean;
  /** True when running inside an already-installed PWA. */
  installed: boolean;
  /** Surface the native install prompt. Returns the user's choice. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unsupported'>;
}

export function usePwaInstall(): PwaInstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => detectInstalled());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    'accepted' | 'dismissed' | 'unsupported'
  > => {
    if (!deferred) return 'unsupported';
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome;
  }, [deferred]);

  return { installable: !!deferred && !installed, installed, promptInstall };
}

function detectInstalled(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  // display-mode: standalone matches when launched from a PWA install
  // shortcut. Tauri's webview reports `standalone` too — good enough
  // signal that we're not in a "browser tab" context where the
  // install offer would be valuable.
  return window.matchMedia('(display-mode: standalone)').matches;
}
