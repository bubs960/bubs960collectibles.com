// Global site-wide scripts. Loaded on every page via /assets/site.js.
// Currently: scroll-reveal via IntersectionObserver + Google Analytics 4.

// ---------- Google Analytics 4 ----------
// Paste your GA4 Measurement ID below (Google Analytics -> Admin -> Data Streams
// -> pick the web stream -> Measurement ID, format: G-XXXXXXXXXX).
// Leaving as 'G-REPLACE' disables tracking cleanly; no network calls are made.
const GA4_ID = 'G-QG8J17L0XS';

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

// ---------- Floating "Shop Everywhere" widget ----------
// Bottom-right pill with three quick links: Direct shop, eBay, Whatnot.
// Lets buyers jump to whichever platform they prefer without hunting menus.
(function () {
  const PLATFORMS = [
    { key: 'direct',  label: 'Shop Direct',      href: '/shop/index.html',                           icon: '🛒' },
    { key: 'ebay',    label: 'My eBay Store',    href: 'https://www.ebay.com/usr/bubs960',           icon: '🅴' },
    { key: 'whatnot', label: 'Live on Whatnot',  href: 'https://www.whatnot.com/user/bubs960',       icon: '🎥' },
  ];

  function inject() {
    if (document.getElementById('shop-everywhere')) return;
    const root = document.createElement('div');
    root.id = 'shop-everywhere';
    root.innerHTML = `
      <button type="button" class="se-toggle" aria-expanded="false" aria-controls="se-panel" aria-label="Shop Bubs960 on other platforms">
        <span class="se-toggle-icon">🛍️</span>
        <span class="se-toggle-label">Shop Bubs960</span>
      </button>
      <div class="se-panel" id="se-panel" hidden>
        <div class="se-heading">Shop Anywhere</div>
        ${PLATFORMS.map((p) => `
          <a class="se-link" href="${p.href}"${/^https?:/.test(p.href) ? ' target="_blank" rel="noopener"' : ''}>
            <span class="se-icon" aria-hidden="true">${p.icon}</span>
            <span class="se-label">${p.label}</span>
          </a>
        `).join('')}
      </div>
    `;
    document.body.appendChild(root);

    const btn = root.querySelector('.se-toggle');
    const panel = root.querySelector('.se-panel');
    btn.addEventListener('click', () => {
      const open = panel.hasAttribute('hidden') ? true : false;
      if (open) { panel.removeAttribute('hidden'); btn.setAttribute('aria-expanded', 'true'); }
      else      { panel.setAttribute('hidden', '');  btn.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('click', (e) => {
      if (!root.contains(e.target) && !panel.hasAttribute('hidden')) {
        panel.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
