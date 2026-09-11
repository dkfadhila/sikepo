/* ═══════════════════════════════════════════════════════════
   SiKePo landing.js — HUD hero + stats teaser + problem stat.
   Semua angka live dari GET /api/stats/overview.
   Count-up idempotent: fetch kapan pun selesai, angka selalu
   benar — tidak pernah mentok "Rp 0" (bug lama §9.1).
   ═══════════════════════════════════════════════════════════ */

/* Count-up idempotent per elemen: animasi lama dibatalkan,
   nilai akhir selalu = nilai terbaru dari API. */
function landingCount(el, value, fmt) {
  if (!el) return;
  const render = (v) => { el.textContent = fmt ? fmt(v) : Math.round(v).toLocaleString('id-ID'); };
  if (prefersReducedMotion) { render(value); return; }
  if (el._countRaf) cancelAnimationFrame(el._countRaf);
  const from = 0, t0 = performance.now(), dur = 1200;
  function frame(now) {
    const t = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    render(from + (value - from) * eased);
    if (t < 1) el._countRaf = requestAnimationFrame(frame);
    else el._countRaf = null;
  }
  el._countRaf = requestAnimationFrame(frame);
}

async function fetchLandingStats() {
  try {
    const res = await fetch('/api/stats/overview');
    if (!res.ok) return;
    const d = await res.json();

    // Hero HUD
    landingCount(document.getElementById('hud-total'), d.total_claims ?? 0);
    landingCount(document.getElementById('hud-fraud'), d.anomalous_count ?? 0);
    landingCount(document.getElementById('hud-savings'), d.total_savings_idr ?? 0, formatCompactIDR);

    // Ticker strip (band ink)
    landingCount(document.getElementById('tick-total'), d.total_claims ?? 0);
    landingCount(document.getElementById('tick-fraud'), d.anomalous_count ?? 0);
    landingCount(document.getElementById('tick-savings'), d.total_savings_idr ?? 0, formatCompactIDR);
    landingCount(document.getElementById('tick-faskes'), d.active_faskes_count ?? 0);

    // Section Problem: satu angka kuat (dana berisiko teridentifikasi)
    landingCount(document.getElementById('problem-stat'), d.total_savings_idr ?? 0, formatCompactIDR);

    // Stats teaser
    landingCount(document.getElementById('teaser-total'), d.total_claims ?? 0);
    landingCount(document.getElementById('teaser-fraud'), d.anomalous_count ?? 0);
    landingCount(document.getElementById('teaser-savings'), d.total_savings_idr ?? 0, formatCompactIDR);
    landingCount(document.getElementById('teaser-faskes'), d.active_faskes_count ?? 0);
  } catch (err) {
    // Backend tidak aktif: HUD tetap "—", tanpa error di console happy path
    console.info('Landing stats: backend belum aktif.');
  }
}

/* ── Pipeline stepper: klik kartu untuk expand satu kalimat ── */
function initStepper() {
  document.querySelectorAll('[data-step]').forEach(card => {
    card.addEventListener('click', () => {
      const open = card.getAttribute('aria-expanded') === 'true';
      // tutup kartu lain agar fokus satu tahap
      document.querySelectorAll('[data-step]').forEach(c => c.setAttribute('aria-expanded', 'false'));
      card.setAttribute('aria-expanded', String(!open));
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initStepper();
  fetchLandingStats();
});
