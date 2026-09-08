/* ═══════════════════════════════════════════════════════════
   SiKePo pages.js — data live untuk halaman informasi:
   /pages/overview · how-it-works · detection-engine · public-data
   ═══════════════════════════════════════════════════════════ */

/* ── Overview page: metrik live ─────────────────────────── */
async function fetchOverviewStats() {
  try {
    const res = await fetch('/api/stats/overview');
    const d = await res.json();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('ov-total', d.total_claims ?? '—');
    set('ov-fraud', d.anomalous_count ?? '—');
    set('ov-clean', d.clean_count ?? '—');
    set('ov-faskes', d.active_faskes_count ?? '—');
    set('ov-savings', formatIDR(d.total_savings_idr ?? 0));
    // breakdown modus
    const wrap = document.getElementById('ov-breakdown');
    if (wrap && d.fraud_breakdown) {
      wrap.innerHTML = Object.entries(d.fraud_breakdown).map(([k, v]) => `
        <div class="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
          <span class="text-[11px] ${MODUS_COLOR[k] || 'text-slate-400'} font-mono font-semibold">${MODUS_LABEL[k] || k}</span>
          <span class="text-[11px] font-mono text-slate-300">${v} berkas</span>
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
      tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-600">Belum ada data.</td></tr>';
      return;
    }
    tbody.innerHTML = d.items.map((f, i) => {
      const riskCls = f.avg_risk > 65 ? 'text-red-400' : (f.avg_risk > 40 ? 'text-yellow-400' : 'text-emerald-400');
      const bar = Math.min(100, f.avg_risk);
      return `
      <tr class="row-hover">
        <td class="px-4 py-3 font-mono text-slate-500 text-[10px]">${String(i + 1).padStart(2, '0')}</td>
        <td class="px-4 py-3">
          <div class="text-slate-200 font-medium text-[11px]">${f.nama}</div>
          <div class="text-[9.5px] text-slate-600 font-mono">${f.kode} · ${f.kota}</div>
        </td>
        <td class="px-4 py-3 text-center font-mono text-slate-300 text-[10.5px]">${f.total}</td>
        <td class="px-4 py-3 text-center font-mono text-red-400 text-[10.5px]">${f.fraud}</td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden min-w-[60px]">
              <div class="h-full rounded-full ${f.avg_risk > 65 ? 'bg-red-500' : (f.avg_risk > 40 ? 'bg-yellow-500' : 'bg-emerald-500')}" style="width:${bar}%"></div>
            </div>
            <span class="font-mono font-bold text-[10.5px] ${riskCls}">${f.avg_risk}</span>
          </div>
        </td>
        <td class="px-4 py-3 text-center"><span class="text-[9px] font-mono ${MODUS_COLOR[f.top_modus] || 'text-slate-400'}">${MODUS_LABEL[f.top_modus] || '—'}</span></td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('heatmap failed', err);
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-600">Backend tidak aktif.</td></tr>';
  }
}

/* ── Public data page: register klaim ───────────────────── */
function renderPublicTable(claims) {
  const tbody = document.getElementById('public-tbody');
  const count = document.getElementById('public-count');
  if (!tbody) return;
  const view = claims.slice(0, 50);
  if (!view.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-600 text-[11px]">Belum ada data klaim.</td></tr>';
    if (count) count.textContent = '0 BERKAS';
    return;
  }
  tbody.innerHTML = view.map(c => `
    <tr class="row-hover">
      <td class="px-4 py-2.5 font-mono text-slate-300 text-[10.5px]">${c.id}</td>
      <td class="px-4 py-2.5 text-slate-400">${c.faskes.nama}</td>
      <td class="px-4 py-2.5 font-mono text-[10px] ${MODUS_COLOR[c.fraud_type] || 'text-slate-400'}">${MODUS_LABEL[c.fraud_type] || c.fraud_type}</td>
      <td class="px-4 py-2.5 text-center font-mono font-bold ${c.risk_score > 75 ? 'text-red-400' : (c.risk_score > 35 ? 'text-yellow-400' : 'text-emerald-400')}">${c.risk_score}</td>
      <td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded border text-[9px] font-mono tracking-wide ${STATUS_COLOR[c.status] || STATUS_COLOR.HOLD}">${STATUS_LABEL[c.status] || c.status}</span></td>
    </tr>`).join('');
  if (count) count.textContent = claims.length + ' BERKAS TERPANTAU';
}

async function fetchPublicData() {
  try {
    const res = await fetch('/api/claims?limit=200');
    const data = await res.json();
    renderPublicTable(data.items);
  } catch (err) {
    console.error('Failed to load public data:', err);
    const tbody = document.getElementById('public-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-600 text-[11px]">Backend tidak aktif — data publik tidak tersedia.</td></tr>';
  }
}

/* ── Init dispatcher ────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  initScrambleTexts(150, 200);
  if (document.getElementById('ov-total')) fetchOverviewStats();
  if (document.getElementById('de-heatmap-tbody')) fetchHeatmapTable();
  if (document.getElementById('public-tbody')) fetchPublicData();
});
