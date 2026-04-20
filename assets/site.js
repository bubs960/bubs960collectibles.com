// Global site-wide scripts. Loaded on every page via /assets/site.js.
// Currently: scroll-reveal via IntersectionObserver + Google Analytics 4.

// ---------- Google Analytics 4 ----------
// Paste your GA4 Measurement ID below (Google Analytics -> Admin -> Data Streams
// -> pick the web stream -> Measurement ID, format: G-XXXXXXXXXX).
// Leaving as 'G-REPLACE' disables tracking cleanly; no network calls are made.
const GA4_ID = 'G-REPLACE';

(function () {
  if (GA4_ID && GA4_ID !== 'G-REPLACE') {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, { anonymize_ip: true });
  }
})();

// ---------- Scroll reveal ----------
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('revealed'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  const watch = () => document.querySelectorAll('.reveal:not(.revealed)').forEach((el) => io.observe(el));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }
})();
