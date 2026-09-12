/* ═══════════════════════════════════════════════════════════
   SiKePo shared.js, util lintas halaman (landing, pages, app)
   Number count-up & text scramble: vanilla-JS adaptations of
   21st.dev components, MIT-licensed.
   ═══════════════════════════════════════════════════════════ */

const formatIDR = (num) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

const formatCompactIDR = (num) => {
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  return formatIDR(num);
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Number count-up ────────────────────────────────────── */
function animateCount(el, target, { duration = 1600, prefix = '', suffix = '', decimals = 0 } = {}) {
  if (prefersReducedMotion) {
    el.textContent = prefix + target.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    return;
  }
  const start = performance.now();
  const from = 0;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = from + (target - from) * eased;
    el.textContent = prefix + val.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function initCounters(root = document) {
  root.querySelectorAll('[data-count-to]').forEach(el => {
    if (el.dataset.counted === '1') return; // hindari animasi ganda
    const raw = el.dataset.countTo;
    if (raw === undefined || raw === '') return;
    const target = parseFloat(raw);
    if (Number.isNaN(target)) return;
    el.dataset.counted = '1';
    animateCount(el, target, {
      prefix: el.dataset.countPrefix || '',
      suffix: el.dataset.countSuffix || '',
      decimals: parseInt(el.dataset.countDecimals || '0', 10)
    });
  });
}

/* ── Text scramble ──────────────────────────────────────── */
const SCRAMBLE_CHARS = '-_~<>[]{}#$%&*+=?';
function scrambleReveal(el) {
  const text = el.dataset.text || el.textContent;
  if (prefersReducedMotion) { el.textContent = text; return; }
  let revealed = 0;
  const total = text.length;
  const interval = setInterval(() => {
    revealed += 1;
    let out = '';
    for (let i = 0; i < total; i++) {
      if (i < revealed || text[i] === ' ') out += text[i];
      else out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }
    el.textContent = out;
    if (revealed >= total) clearInterval(interval);
  }, 28);
}

function initScrambleTexts(delayBase = 200, step = 260) {
  document.querySelectorAll('.scramble').forEach((el, i) => {
    setTimeout(() => scrambleReveal(el), delayBase + i * step);
  });
}

/* ── Fraud/status label maps (dipakai beberapa halaman, theme light) ── */
const MODUS_LABEL = { CLEAN: 'Bersih', UPCODING: 'Upcoding', PHANTOM_BILLING: 'Phantom', INFLATED_BILLS: 'Overpreskripsi', CLONING: 'Cloning' };
const MODUS_COLOR = { CLEAN: 'text-emerald-700', UPCODING: 'text-amber-700', PHANTOM_BILLING: 'text-orange-700', INFLATED_BILLS: 'text-rose-700', CLONING: 'text-red-700' };
const STATUS_LABEL = { PENDING_AUDIT: 'Dalam antrean', APPROVED: 'Disetujui', REJECTED: 'Ditolak', HOLD: 'Ditahan' };
const STATUS_COLOR = { PENDING_AUDIT: 'text-amber-800 border-amber-300 bg-amber-50', APPROVED: 'text-emerald-800 border-emerald-300 bg-emerald-50', REJECTED: 'text-red-700 border-red-300 bg-red-50', HOLD: 'text-slate-600 border-slate-300 bg-slate-100' };

/* ── Mobile hamburger nav (landing + semua sub-pages) ─────
   Meng-clone link desktop .nav-link ke panel geser di bawah
   nav. Tanpa JS, link desktop tetap berfungsi normal. */
function initMobileNav() {
  const nav = document.querySelector('.site-nav');
  if (!nav || nav.querySelector('.nav-toggle')) return;
  const links = Array.from(nav.querySelectorAll('a.nav-link'));
  if (!links.length) return;

  const toggle = document.createElement('button');
  toggle.className = 'nav-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Buka menu navigasi');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>';

  const panel = document.createElement('div');
  panel.className = 'nav-mobile';
  links.forEach(a => {
    const c = a.cloneNode(true);
    c.classList.remove('active');
    c.addEventListener('click', () => close());
    panel.appendChild(c);
  });
  const cta = document.createElement('a');
  cta.href = '/app';
  cta.className = 'nav-cta';
  cta.textContent = 'Buka Aplikasi →';
  panel.appendChild(cta);

  const inner = nav.querySelector('.nav-inner') || nav.querySelector(':scope > div') || nav;
  inner.appendChild(toggle);
  nav.appendChild(panel);

  function close() { panel.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (panel.classList.contains('open') && !nav.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

document.addEventListener('DOMContentLoaded', initMobileNav);
