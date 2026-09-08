/* ═══════════════════════════════════════════════════════════
   SiKePo animations.js — Motion (motion.dev) progressive
   enhancement untuk landing + halaman publik.
   Atribut yang dikenali:
     [data-hero-intro]  → anak-anaknya masuk berurutan saat load
     [data-hero-panel]  → panel hero scale+fade saat load
     [data-reveal-group]→ anak-anaknya stagger saat masuk viewport
     [data-reveal]      → elemen fade+rise saat masuk viewport

   Mekanisme: <html> diberi class `anim-ready` sehingga CSS
   (theme.css) menyembunyikan elemen target SEJAK AWAL — bebas
   race condition dengan Tailwind CDN. Motion lalu menganimasikan
   elemen saat masuk viewport dan menandai .motion-in (opacity 1).
   Tanpa Motion (CDN gagal) / reduced-motion → kelas tak dipasang,
   halaman tampil normal.
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
      { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0px)'] },
      { duration: 0.55, delay, ease: 'easeOut' });
  }

  function init() {
    // Entrance hero (landing) — langsung saat init
    const heroIntro = document.querySelector('[data-hero-intro]');
    if (heroIntro) {
      Array.from(heroIntro.children).forEach((el, i) => reveal(el, 0.05 + i * 0.09));
    }
    const heroPanel = document.querySelector('[data-hero-panel]');
    if (heroPanel) {
      show(heroPanel);
      M.animate(heroPanel,
        { opacity: [0, 1], transform: ['translateY(20px) scale(0.985)', 'translateY(0px) scale(1)'] },
        { duration: 0.7, delay: 0.18, ease: 'easeOut' });
    }

    // Reveal saat scroll — grup (stagger anak-anak)
    document.querySelectorAll('[data-reveal-group]').forEach(group => {
      const items = Array.from(group.children);
      if (!items.length) return;
      M.inView(group, () => { items.forEach((el, i) => reveal(el, i * 0.08)); }, { amount: 0.12 });
    });

    // Reveal saat scroll — elemen tunggal
    document.querySelectorAll('[data-reveal]').forEach(el => {
      M.inView(el, () => reveal(el), { amount: 0.12 });
    });
  }

  // PENTING: init baru jalan setelah CSS Tailwind (CDN) aktif —
  // kalau lebih awal, inView menghitung posisi elemen pada layout
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
