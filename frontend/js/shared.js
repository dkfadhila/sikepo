/* ═══════════════════════════════════════════════════════════
   SiKePo shared.js — util lintas halaman (landing, pages, app)
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
