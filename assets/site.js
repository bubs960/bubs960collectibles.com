// Global site-wide scripts. Loaded on every page via /assets/site.js.
// Currently: scroll-reveal via IntersectionObserver.
(function () {
  // Scroll reveal — elements with .reveal fade+slide in on first view.
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
