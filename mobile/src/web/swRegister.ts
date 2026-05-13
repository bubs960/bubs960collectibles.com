/**
 * Service-worker + PWA-manifest registration. Called from App.tsx at
 * module load — self-gates on the navigator surface so it's a no-op
 * on native (where neither `navigator.serviceWorker` nor `document`
 * exist).
 *
 * The manifest is injected via JS rather than placed in the HTML
 * template because Expo SDK 51's metro bundler doesn't expose a clean
 * `public/index.html` customization with `output: 'single'`. JS
 * injection works for Chrome's install-banner heuristic the same as
 * a server-rendered <link>.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // Inject the manifest link if it isn't already in the head (e.g.
  // from a future custom template).
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
  }

  // Inject the theme-color meta for the browser chrome on Android +
  // installed PWAs. Matches the dark token.
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#0a0d1c';
    document.head.appendChild(meta);
  }

  // Register the worker. Logging on failure but swallowing the error
  // so a SW glitch doesn't crash the app (the app still works without
  // a SW; it just doesn't cache the shell).
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[sw] registration failed', err);
  });
}
