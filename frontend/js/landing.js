/* ═══════════════════════════════════════════════════════════
   SiKePo landing.js — hero counters, live telemetry teaser
   Landing = informasi publik. Semua operasional ada di /app.
   ═══════════════════════════════════════════════════════════ */

async function fetchLandingStats() {
  try {
    const res = await fetch('/api/stats/overview');
    const data = await res.json();

    const savingsEl = document.getElementById('hero-stat-savings');
    if (savingsEl && typeof data.total_savings_idr === 'number' && data.total_savings_idr > 0) {
      savingsEl.dataset.countTo = Math.round(data.total_savings_idr / 1_000_000);
      savingsEl.dataset.countDecimals = '0';
      savingsEl.dataset.countSuffix = ' jt';
    }
    const fraudEl = document.getElementById('hero-stat-fraud');
    if (fraudEl && typeof data.anomalous_count === 'number' && data.anomalous_count > 0) {
      fraudEl.dataset.countTo = data.anomalous_count;
    }
  } catch (err) {
    console.error('Failed to load landing stats:', err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initScrambleTexts();
  // Statistik live: counters dijalankan lagi setelah fetch supaya
  // angka tetap terisi berapa pun urutan fetch vs timer.
  fetchLandingStats().finally(() => {
    setTimeout(initCounters, prefersReducedMotion ? 0 : 1400);
  });
});
