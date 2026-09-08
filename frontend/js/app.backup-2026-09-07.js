let activeView = 'hero';
let activeTab = 'queue';
let selectedClaim = null;
let claimsData = [];
let debounceTimer = null;

const formatIDR = (num) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

function switchView(view) {
  activeView = view;
  const heroEl = document.getElementById('view-hero');
  const cockpitEl = document.getElementById('view-cockpit');
  const btnLogin = document.getElementById('btn-login-trigger');
  const userBadge = document.getElementById('user-badge');

  if (view === 'hero') {
    heroEl.classList.remove('hidden');
    cockpitEl.classList.add('hidden');
  } else {
    heroEl.classList.add('hidden');
    cockpitEl.classList.remove('hidden');
    fetchStats();
    fetchClaims();
  }
}

function openLoginModal() {
  document.getElementById('login-modal').classList.remove('hidden');
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.add('hidden');
}

function loginAs(roleName) {
  closeLoginModal();
  document.getElementById('btn-login-trigger').classList.add('hidden');
  const badge = document.getElementById('user-badge');
  badge.classList.remove('hidden');
  document.getElementById('user-role-label').textContent = roleName;
  switchView('cockpit');
}

function logoutUser() {
  document.getElementById('btn-login-trigger').classList.remove('hidden');
  document.getElementById('user-badge').classList.add('hidden');
  switchView('hero');
}

function quickGuestAccess() {
  loginAs('Tamu Penilai Hackathon');
}

function switchTab(tab) {
  activeTab = tab;
  const qBtn = document.getElementById('tab-btn-queue');
  const sBtn = document.getElementById('tab-btn-sandbox');
  const qSec = document.getElementById('tab-queue');
  const sSec = document.getElementById('tab-sandbox');
  const fBar = document.getElementById('queue-filter-bar');

  if (tab === 'queue') {
    qBtn.className = 'px-3 py-2 text-xs font-semibold text-bpjs-navy border-b-2 border-bpjs-navy';
    sBtn.className = 'px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border-b-2 border-transparent';
    qSec.classList.remove('hidden');
    sSec.classList.add('hidden');
    fBar.classList.remove('hidden');
  } else {
    sBtn.className = 'px-3 py-2 text-xs font-semibold text-bpjs-navy border-b-2 border-bpjs-navy';
    qBtn.className = 'px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border-b-2 border-transparent';
    sSec.classList.remove('hidden');
    qSec.classList.add('hidden');
    fBar.classList.add('hidden');
  }
}

async function fetchStats() {
  try {
    const res = await fetch('/api/stats/overview');
    const data = await res.json();
    
    // Update Hero Stats
    document.getElementById('hero-stat-savings').textContent = formatIDR(data.total_savings_idr);
    document.getElementById('hero-stat-fraud').textContent = data.anomalous_count;

    // Update Cockpit Stats
    document.getElementById('cp-stat-savings').textContent = formatIDR(data.total_savings_idr);
    document.getElementById('cp-stat-total').textContent = data.total_claims;
    document.getElementById('cp-stat-fraud').textContent = data.anomalous_count;
    document.getElementById('cp-stat-clean').textContent = data.clean_count;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function fetchClaims() {
  const fraudType = document.getElementById('filter-fraud-type').value;
  const search = document.getElementById('filter-search').value.trim();

  let url = `/api/claims?limit=80`;
  if (fraudType && fraudType !== 'ALL') url += `&fraud_type=${fraudType}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    claimsData = data.items;
    renderClaimsTable(claimsData);
    document.getElementById('table-count-label').textContent = `${data.total} Berkas Ditampilkan`;
  } catch (err) {
    console.error('Failed to fetch claims:', err);
  }
}

function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchClaims();
  }, 300);
}

function renderClaimsTable(claims) {
  const tbody = document.getElementById('claims-table-body');
  if (!claims.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-600">Tidak ada klaim yang cocok dengan filter.</td></tr>';
    return;
  }

  tbody.innerHTML = claims.map(c => {
    const isFraud = c.fraud_type !== 'CLEAN';
    const riskBadgeClass = c.risk_score > 75 ? 'bg-red-500/15 text-red-400 border border-red-500/20' : (c.risk_score > 35 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20');
    
    let statusClass = 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
    if (c.status === 'APPROVED') statusClass = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
    if (c.status === 'REJECTED') statusClass = 'bg-red-500/15 text-red-400 border border-red-500/20';
    if (c.status === 'PENDING_AUDIT') statusClass = 'bg-amber-500/15 text-amber-400 border border-amber-500/20';

    const isSelected = selectedClaim && selectedClaim.id === c.id;
    const rowClass = isSelected ? 'bg-bpjs-green/5 border-l-2 border-l-bpjs-green' : 'hover:bg-white/[0.02] cursor-pointer';

    return `
      <tr class="${rowClass} transition" onclick="selectClaim('${c.id}')">
        <td class="p-3">
          <div class="font-semibold text-slate-200 font-mono text-[11px]">${c.id}</div>
          <div class="text-[10px] text-slate-600">${c.faskes.nama}</div>
        </td>
        <td class="p-3">
          <div class="font-medium text-slate-300 text-[11px]">${c.diagnosa.icd10} — ${c.diagnosa.nama}</div>
          <div class="text-[10px] text-slate-600 font-mono">${c.los}d rawat</div>
        </td>
        <td class="p-3 text-right font-mono">
          <div class="text-slate-200 font-medium text-[11px]">${formatIDR(c.biaya_diajukan)}</div>
          ${c.selisih_biaya > 0 ? `<div class="text-[10px] text-red-400 font-semibold">+${formatIDR(c.selisih_biaya)}</div>` : ''}
        </td>
        <td class="p-3 text-center">
          <span class="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${riskBadgeClass}">${c.risk_score}</span>
        </td>
        <td class="p-3 text-center">
          <span class="px-1.5 py-0.5 rounded font-semibold text-[10px] ${statusClass}">${c.status}</span>
        </td>
      </tr>
    `;
  }).join('');
}

function selectClaim(claimId) {
  selectedClaim = claimsData.find(c => c.id === claimId);
  renderClaimsTable(claimsData);
  renderInspector();
  // Auto-scroll ke inspector di layar mobile
  if (window.innerWidth < 1024) {
    const insp = document.getElementById('inspector-panel');
    if (insp) insp.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderInspector() {
  if (!selectedClaim) return;
  const c = selectedClaim;
  const badge = document.getElementById('insp-risk-badge');
  const actions = document.getElementById('inspector-actions');
  actions.classList.remove('hidden');

  badge.textContent = `RISK ${c.risk_score}/100 — ${c.fraud_type}`;
  badge.className = c.risk_score > 75 
    ? 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200'
    : (c.risk_score > 35 ? 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200' : 'px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200');

  const content = document.getElementById('inspector-content');
  content.innerHTML = `
    <!-- Top Metadata -->
    <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
      <div class="flex justify-between"><span class="text-slate-400">Nomor SEP:</span> <span class="font-mono font-semibold">${c.id}</span></div>
      <div class="flex justify-between"><span class="text-slate-400">Rumah Sakit:</span> <span class="font-semibold">${c.faskes.nama} (${c.faskes.kota})</span></div>
      <div class="flex justify-between"><span class="text-slate-400">Pasien:</span> <span>${c.pasien.nama} (${c.pasien.gender}, ${c.pasien.usia} th)</span></div>
      <div class="flex justify-between"><span class="text-slate-400">Episode Rawat:</span> <span>${c.tgl_masuk} s.d ${c.tgl_keluar} (${c.los} Hari)</span></div>
    </div>

    <!-- Financial Comparison -->
    <div class="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-slate-200 font-mono">
      <div>
        <span class="text-[10px] text-slate-400 block">Tarif INA-CBGs Standar:</span>
        <span class="font-semibold text-slate-700">${formatIDR(c.tarif_ina_cbg)}</span>
      </div>
      <div>
        <span class="text-[10px] text-slate-400 block">Pengajuan Rumah Sakit:</span>
        <span class="font-semibold ${c.selisih_biaya > 0 ? 'text-rose-600' : 'text-slate-700'}">${formatIDR(c.biaya_diajukan)}</span>
      </div>
    </div>

    <!-- Audit Findings Box -->
    <div class="p-3.5 rounded-lg border ${c.fraud_type !== 'CLEAN' ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'}">
      <div class="font-bold text-[11px] uppercase tracking-wider mb-1.5 ${c.fraud_type !== 'CLEAN' ? 'text-rose-800' : 'text-emerald-800'}">
        Temuan Rekomendasi Audit:
      </div>
      <ul class="list-disc list-inside space-y-1 text-slate-700">
        ${c.audit_reasons.map(r => `<li>${r}</li>`).join('')}
      </ul>
      <div class="mt-2.5 pt-2 border-t border-slate-200/60 font-semibold text-[11px] ${c.fraud_type !== 'CLEAN' ? 'text-rose-700' : 'text-emerald-700'}">
        Rekomendasi SiKePo: ${c.rekomendasi}
      </div>
    </div>

    <!-- Drug & Items Tagged -->
    <div>
      <span class="font-bold text-slate-600 block mb-1">Rincian Obat & Alkes Penunjang:</span>
      <div class="flex flex-wrap gap-1">
        ${c.obat.map(o => `<span class="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10.5px]">${o}</span>`).join('')}
      </div>
    </div>
  `;
}

async function submitVerdict(action) {
  if (!selectedClaim) return;
  try {
    const res = await fetch(`/api/claims/${selectedClaim.id}/verdict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, notes: `Keputusan manual verifikator: ${action}` })
    });
    if (res.ok) {
      selectedClaim.status = action === 'APPROVE' ? 'APPROVED' : (action === 'REJECT' ? 'REJECTED' : 'PENDING_AUDIT');
      renderClaimsTable(claimsData);
      renderInspector();
      fetchStats();
    }
  } catch (err) {
    alert('Gagal memperbarui status berkas klaim');
  }
}

async function runSandboxAudit(e) {
  e.preventDefault();
  const faskes = document.getElementById('sb-faskes').value;
  const icd = document.getElementById('sb-icd').value;
  const diagnosa = document.getElementById('sb-diagnosa').value;
  const tarifCbg = parseInt(document.getElementById('sb-tarif-cbg').value);
  const biayaRs = parseInt(document.getElementById('sb-biaya-rs').value);
  const los = parseInt(document.getElementById('sb-los').value);
  const obat = document.getElementById('sb-obat').value.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const res = await fetch('/api/audit/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faskes_nama: faskes,
        diagnosa_icd: icd,
        diagnosa_nama: diagnosa,
        tarif_ina_cbg: tarifCbg,
        biaya_diajukan: biayaRs,
        los: los,
        obat_list: obat
      })
    });
    const result = await res.json();
    
    const resBox = document.getElementById('sandbox-result');
    const resBadge = document.getElementById('sb-res-badge');
    const resDetails = document.getElementById('sb-res-details');

    resBox.classList.remove('hidden');
    resBadge.textContent = `SKOR RISIKO: ${result.risk_score} — ${result.fraud_type}`;
    resBadge.className = result.risk_score > 70 
      ? 'px-2.5 py-1 rounded text-xs font-bold bg-rose-100 text-rose-700' 
      : (result.risk_score > 35 ? 'px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700' : 'px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700');

    resDetails.innerHTML = `
      <div class="flex justify-between py-1 border-b border-slate-200">
        <span class="text-slate-500">Status Rekomendasi:</span>
        <span class="font-bold">${result.status}</span>
      </div>
      <div class="flex justify-between py-1 border-b border-slate-200">
        <span class="text-slate-500">Selisih Overbilling Berpotensi Dicegah:</span>
        <span class="font-mono font-bold text-rose-600">${formatIDR(result.selisih_biaya_idr)}</span>
      </div>
      <div class="py-1">
        <span class="text-slate-500 block mb-1">Catatan Analisis Algoritma SiKePo:</span>
        <ul class="list-disc list-inside space-y-0.5 text-slate-700">
          ${result.reasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
      <div class="p-2 bg-emerald-100/50 rounded text-emerald-800 font-semibold mt-2">
        Tindakan: ${result.rekomendasi}
      </div>
    `;
  } catch (err) {
    alert('Gagal memproses simulasi sandbox');
  }
}

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  fetchStats();
});
