/* ═══════════════════════════════════════════════════════════
   SiKePo pages.js, data live untuk halaman informasi (theme light):
   /pages/overview · detection-engine · public-data
   ═══════════════════════════════════════════════════════════ */

/* ── Overview page: metrik live ─────────────────────────── */
async function fetchOverviewStats() {
  try {
    const res = await fetch('/api/stats/overview');
    const d = await res.json();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('ov-total', d.total_claims ?? ', ');
    set('ov-fraud', d.anomalous_count ?? ', ');
    set('ov-clean', d.clean_count ?? ', ');
    set('ov-faskes', d.active_faskes_count ?? ', ');
    set('ov-savings', formatIDR(d.total_savings_idr ?? 0));
    // breakdown modus
    const wrap = document.getElementById('ov-breakdown');
    if (wrap && d.fraud_breakdown) {
      wrap.innerHTML = Object.entries(d.fraud_breakdown).map(([k, v]) => `
        <div class="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-none">
          <span class="text-[13px] font-semibold ${MODUS_COLOR[k] || 'text-slate-600'}">${MODUS_LABEL[k] || k}</span>
          <span class="text-[13px] font-mono text-slate-500">${v} berkas</span>
        </div>`).join('');
    }
  } catch (err) {
    console.error('overview stats failed', err);
  }
}

/* ── Detection engine page: heatmap faskes ──────────────── */
async function fetchHeatmapTable() {
  const tbody = document.getElementById('de-heatmap-tbody');
  if (!tbody) return;
  try {
    const res = await fetch('/api/heatmap');
    const d = await res.json();
    if (!d.items || !d.items.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada data.</td></tr>';
      return;
    }
    tbody.innerHTML = d.items.map((f, i) => {
      const riskCls = f.avg_risk > 65 ? 'text-red-600' : (f.avg_risk > 40 ? 'text-amber-600' : 'text-emerald-700');
      const barCls = f.avg_risk > 65 ? 'bg-red-500' : (f.avg_risk > 40 ? 'bg-amber-500' : 'bg-emerald-600');
      const bar = Math.min(100, f.avg_risk);
      return `
      <tr class="row-hover">
        <td class="font-mono text-slate-400 text-[11px]">${String(i + 1).padStart(2, '0')}</td>
        <td>
          <div class="text-slate-800 font-semibold text-[12.5px]">${f.nama}</div>
          <div class="text-[11px] text-slate-500 font-mono">${f.kode} · ${f.kota}</div>
        </td>
        <td class="text-center font-mono text-slate-600 text-[12px]">${f.total}</td>
        <td class="text-center font-mono text-red-600 font-semibold text-[12px]">${f.fraud}</td>
        <td>
          <div class="flex items-center gap-2.5">
            <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[70px]">
              <div class="h-full rounded-full ${barCls}" style="width:${bar}%"></div>
            </div>
            <span class="font-mono font-bold text-[12px] ${riskCls}">${f.avg_risk}</span>
          </div>
        </td>
        <td class="text-center text-[11.5px] font-semibold ${MODUS_COLOR[f.top_modus] || 'text-slate-500'}">${MODUS_LABEL[f.top_modus] || ', '}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('heatmap failed', err);
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Data belum tersedia. Coba beberapa saat lagi.</td></tr>';
  }
}

/* ── Public data page: register klaim ───────────────────── */
function renderPublicTable(claims) {
  const tbody = document.getElementById('public-tbody');
  const count = document.getElementById('public-count');
  if (!tbody) return;
  const view = claims.slice(0, 50);
  if (!view.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 text-[12.5px]">Belum ada data klaim.</td></tr>';
    if (count) count.textContent = '0 berkas';
    return;
  }
  tbody.innerHTML = view.map(c => `
    <tr class="row-hover">
      <td class="font-mono text-slate-600 text-[12px]">${c.id}</td>
      <td class="text-slate-700 text-[12.5px]">${c.faskes.nama}</td>
      <td class="text-[12px] font-semibold ${MODUS_COLOR[c.fraud_type] || 'text-slate-500'}">${MODUS_LABEL[c.fraud_type] || c.fraud_type}</td>
      <td class="text-center font-mono font-bold text-[12px] ${c.risk_score > 75 ? 'text-red-600' : (c.risk_score > 35 ? 'text-amber-600' : 'text-emerald-700')}">${c.risk_score}</td>
      <td class="text-center"><span class="px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS_COLOR[c.status] || STATUS_COLOR.HOLD}">${STATUS_LABEL[c.status] || c.status}</span></td>
    </tr>`).join('');
  if (count) count.textContent = claims.length + ' berkas terpantau';
}

async function fetchPublicData() {
  try {
    const res = await fetch('/api/claims?limit=200');
    const data = await res.json();
    renderPublicTable(data.items);
  } catch (err) {
    console.error('Failed to load public data:', err);
    const tbody = document.getElementById('public-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 text-[12.5px]">Data belum tersedia. Coba beberapa saat lagi.</td></tr>';
  }
}

/* ── Init dispatcher ────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('ov-total')) fetchOverviewStats();
  if (document.getElementById('de-heatmap-tbody')) fetchHeatmapTable();
  if (document.getElementById('public-tbody')) fetchPublicData();
});
