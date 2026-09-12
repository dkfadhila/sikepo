/* ═══════════════════════════════════════════════════════════
   SiKePo animations.js, Motion (motion.dev) progressive
   enhancement untuk landing + halaman publik.

   Atribut yang dikenali:
     [data-hero-intro]  → anak-anaknya masuk berurutan saat load
     [data-hero-panel]  → panel hero scale+fade saat load
     [data-reveal-group]→ anak-anaknya stagger saat masuk viewport
     [data-reveal]      → elemen fade+rise+scale saat masuk viewport

   Ekstra (v6):
     - Parallax panggung mesin mengikuti kursor (.hero-stage)
     - Nav pill auto-hide saat scroll turun, muncul saat naik

   Mekanisme reveal: scroll-listener + cek viewport (rAF throttle), TIDAK memakai IntersectionObserver karena tidak konsisten di
   beberapa guest browser. Tanpa Motion (CDN gagal) / reduced-motion
   → kelas `anim-ready` tak dipasang, halaman tampil normal.
   ═══════════════════════════════════════════════════════════ */
(function () {
  const M = window.Motion;
  if (!M) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  root.classList.add('anim-ready');

  function show(el) { el.classList.add('motion-in'); }

  function reveal(el, delay = 0) {
    show(el); // pastikan end-state opacity 1 di CSS
    M.animate(el,
      { opacity: [0, 1], transform: ['translateY(20px) scale(0.982)', 'translateY(0px) scale(1)'] },
      { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] });
  }

  /* ── Reveal berbasis posisi viewport ─────────────────────
     PENTING: memakai polling scrollY, bukan event scroll /
     IntersectionObserver, event scroll tidak konsisten di
     beberapa guest browser (pernah 0 event saat scrollY pindah).
     Polling 180ms untuk ~15 elemen = biaya dapat diabaikan. */
  const pending = []; // { el, group }
  function register(rootEl) {
    if (rootEl.hasAttribute('data-reveal')) pending.push({ el: rootEl, group: false });
    if (rootEl.hasAttribute('data-reveal-group')) pending.push({ el: rootEl, group: true });
  }

  function inViewport(el, margin) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight - margin && r.bottom > 0;
  }

  function checkPending() {
    const vh = window.innerHeight;
    for (let i = pending.length - 1; i >= 0; i--) {
      const item = pending[i];
      if (!inViewport(item.el, vh * 0.12)) continue;
      pending.splice(i, 1);
      if (item.group) {
        Array.from(item.el.children).forEach((c, j) => reveal(c, j * 0.08));
      } else {
        reveal(item.el);
      }
    }
  }

  function init() {
    // Entrance hero (landing), langsung saat init
    const heroIntro = document.querySelector('[data-hero-intro]');
    if (heroIntro) {
      Array.from(heroIntro.children).forEach((el, i) => reveal(el, 0.05 + i * 0.09));
    }
    const heroPanel = document.querySelector('[data-hero-panel]');
    if (heroPanel) {
      show(heroPanel);
      M.animate(heroPanel,
        { opacity: [0, 1], transform: ['translateY(24px) scale(0.985)', 'translateY(0px) scale(1)'] },
        { duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] });
    }

    // Daftarkan semua target reveal
    document.querySelectorAll('[data-reveal], [data-reveal-group]').forEach(register);

    initStageParallax();

    // Satu loop poll untuk: reveal saat scroll + nav auto-hide
    const nav = document.querySelector('.site-nav');
    let lastY = window.scrollY;
    setInterval(() => {
      const y = window.scrollY;
      // reveal
      checkPending();
      // nav auto-hide (sembunyi saat turun, muncul saat naik)
      if (nav) {
        if (document.querySelector('.nav-mobile.open')) nav.classList.remove('nav-hidden');
        else if (y > 180 && y > lastY + 6) nav.classList.add('nav-hidden');
        else if (y < lastY - 6 || y < 180) nav.classList.remove('nav-hidden');
      }
      lastY = y;
    }, 180);
  }

  /* Parallax panggung mesin: panel bergeser halus mengikuti kursor */
  function initStageParallax() {
    const hero = document.querySelector('.hero');
    const panel = document.querySelector('.hero-stage .stage-panel');
    if (!hero || !panel) return;
    let raf = 0, tx = 0, ty = 0;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 14;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 8;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        M.animate(panel, { transform: `translateX(${tx.toFixed(1)}px) translateY(${ty.toFixed(1)}px)` }, { duration: 0.7, ease: 'easeOut' });
      });
    });
    hero.addEventListener('pointerleave', () => {
      M.animate(panel, { transform: 'translateX(0px) translateY(0px)' }, { duration: 0.8, ease: 'easeOut' });
    });
  }

  // PENTING: init baru jalan setelah CSS Tailwind (CDN) aktif, // kalau lebih awal, posisi elemen dihitung pada layout
  // "telanjang" dan semua reveal ter-trigger sekaligus di awal.
  function whenStyled(cb, tries = 0) {
    const probe = document.createElement('div');
    probe.className = 'hidden';
    document.body.appendChild(probe);
    const styled = getComputedStyle(probe).display === 'none';
    probe.remove();
    if (styled || tries > 40) cb();
    else setTimeout(() => whenStyled(cb, tries + 1), 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => whenStyled(init));
  } else {
    whenStyled(init);
  }
})();
