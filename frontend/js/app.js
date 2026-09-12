/* ═══════════════════════════════════════════════════════════
   SiKePo app.js, Cockpit v3 (dense ops console)
   - Klaim: filters compose (status, fraud_type, faskes, risk
     min/max, debounced search), dense table w/ risk ramp,
     inspector drawer/sheet, keyboard shortcuts, verdict toast
   - Charts: destroyed on tab leave, no Chart.js duplicates
   - Data tab: timeline + heatmap
   - Auth/RBAC/SIMRS/Users: preserved from v2
   ═══════════════════════════════════════════════════════════ */

let activeTab = 'dashboard', selectedClaim = null, claimsData = [], filteredClaims = [], debounceTimer = null, chartsReady = false;
let authToken = localStorage.getItem('sikepo_token') || null, currentUser = null;
let focusedRow = -1; // keyboard cursor in claims table

/* ── Motion (motion.dev), progressive enhancement ──────── */
const motionOK = () => !!window.Motion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function motionSwap(el) {
  if (!motionOK() || !el) return false;
  window.Motion.animate(el, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] }, { duration: 0.3, ease: 'easeOut' });
  return true;
}
function motionStagger(el) {
  if (!motionOK() || !el || !el.children.length) return;
  window.Motion.animate(el.children, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] }, { duration: 0.4, delay: window.Motion.stagger(0.06), ease: 'easeOut' });
}

/* ── Toast ───────────────────────────────────────────────── */
function showToast(msg, type = 'ok') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 2800);
}

/* ── Auth ────────────────────────────────────────────────── */
async function attemptLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  try {
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
    const d = await r.json();
    if (r.ok && d.token) { err.style.display = 'none'; authToken = d.token; currentUser = d; localStorage.setItem('sikepo_token', authToken); showCockpit(); }
    else { err.textContent = d.detail || 'Username atau password salah.'; err.style.display = 'block'; document.getElementById('login-pass').value = ''; document.getElementById('login-pass').focus(); }
  } catch { err.textContent = 'Tidak dapat menghubungi server. Coba lagi beberapa saat.'; err.style.display = 'block'; }
}

function showCockpit() {
  document.getElementById('app-gate').classList.add('hidden');
  ['tab-dashboard','tab-claims','tab-sandbox','tab-data','tab-users'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
  // Badge pengguna: sidebar (desktop/icon rail) + header (mobile)
  document.getElementById('user-badge').classList.add('show');
  document.getElementById('user-role-label').textContent = `${currentUser.role_name || currentUser.role} · ${currentUser.username}`;
  const bb = document.getElementById('bottombar-badge');
  if (bb) {
    document.getElementById('bottombar-role').textContent = currentUser.username;
    bb.classList.add('show');
  }
  applyPerms();
  switchTab('dashboard');
}

function logoutUser() {
  if (authToken) fetch('/api/auth/logout', { method: 'POST', headers: { 'X-Auth-Token': authToken } }).catch(() => {});
  authToken = null; currentUser = null; localStorage.removeItem('sikepo_token'); location.href = '/';
}

// 401 → drop session and land on the login form (PRD §6: logout + redirect login)
function sessionExpired() {
  authToken = null; currentUser = null; localStorage.removeItem('sikepo_token'); location.href = '/app';
}

function ah() { return authToken ? { 'X-Auth-Token': authToken } : {}; }
async function af(url, o = {}) { o.headers = { ...(o.headers || {}), ...ah() }; const r = await fetch(url, o); if (r.status === 401) { sessionExpired(); return null; } return r; }

function applyPerms() {
  if (!currentUser) return;
  const p = currentUser.permissions || [];
  // Tombol nav Users: toggle class .hidden (style.display saja tidak
  // menembus .hidden !important, bug versi lama).
  document.querySelectorAll('#nav-users, #mt-users, .mobile-tabs [data-tab="users"]').forEach(el => {
    el.classList.toggle('hidden', !p.includes('manage_users'));
  });
  // Baris tombol verdict: default inline display:none di markup.
  const ia = document.getElementById('inspector-actions');
  if (ia) ia.style.display = p.includes('verdict') ? 'flex' : 'none';
}

/* ── Tabs ────────────────────────────────────────────────── */
function switchTab(tab) {
  // Chart lifecycle: destroy charts of the tab we are leaving (PRD §3.2)
  if (activeTab === 'dashboard' && tab !== 'dashboard') destroyDashboardCharts();
  if (activeTab === 'data' && tab !== 'data' && cTimeline) { cTimeline.destroy(); cTimeline = null; }

  activeTab = tab;
  closeInspector();
  ['dashboard','claims','sandbox','data','users'].forEach(id => {
    const el = document.getElementById('tab-' + id);
    if (el) { el.classList.add('hidden'); el.classList.remove('fade-in'); }
  });
  const active = document.getElementById('tab-' + tab);
  if (active) { active.classList.remove('hidden'); if (!motionSwap(active)) active.classList.add('fade-in'); }
  // Desktop nav
  document.querySelectorAll('.topbar-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  // Mobile tabs (termasuk tombol periode .mt tanpa data-tab, tetap utuh)
  document.querySelectorAll('.mt').forEach(b => { if (b.dataset.tab) b.classList.toggle('active', b.dataset.tab === tab); });
  if (tab === 'dashboard') { fetchStats(); initCharts(); motionStagger(document.getElementById('kpi-row')); simrsRefresh(); }
  if (tab === 'claims') fetchClaims();
  if (tab === 'data') { loadTimeline('daily'); loadHeatmap(); }
  if (tab === 'users') { fetchUsers(); fetchApiKeys(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Charts (dashboard) ──────────────────────────────────── */
let cI, cF, cFs, cR;
const CC = { a: '#009B4C', r: '#D92D20', y: '#D97706', g: '#64748B' };

function destroyDashboardCharts() {
  [cI, cF, cFs, cR].forEach(c => { if (c) c.destroy(); });
  cI = cF = cFs = cR = null;
  chartsReady = false;
}

function initCharts() {
  if (chartsReady) return;
  chartsReady = true;
  Chart.defaults.color = '#6B7A90';
  Chart.defaults.borderColor = '#EEF2F7';
  Chart.defaults.font.family = "'Inter',sans-serif";
  Chart.defaults.font.size = 11.5;

  cI = new Chart(document.getElementById('chart-inflow'), {
    type: 'bar', data: { labels: ['Disetujui','Ditolak','Antrean','Ditahan'], datasets: [{ data: [0,0,0,0], backgroundColor: [CC.a,CC.r,CC.y,CC.g], borderRadius: 6, barPercentage: .55 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#EEF2F7' }, beginAtZero: true } } }
  });
  cF = new Chart(document.getElementById('chart-fraud'), {
    type: 'doughnut', data: { labels: ['Upcoding','Phantom','Overpreskripsi','Cloning','Bersih'], datasets: [{ data: [0,0,0,0,0], backgroundColor: ['#D97706','#EA580C','#E11D48','#DC2626','#009B4C'], borderColor: '#FFFFFF', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, padding: 8, font: { size: 11 } } } } }
  });
  cFs = new Chart(document.getElementById('chart-faskes'), {
    type: 'bar', data: { labels: [], datasets: [{ data: [], backgroundColor: '#0284A8', borderRadius: 6, barPercentage: .6 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#EEF2F7' }, beginAtZero: true, max: 100 }, y: { grid: { display: false } } } }
  });
  cR = new Chart(document.getElementById('chart-risk'), {
    type: 'bar', data: { labels: ['0-20','21-40','41-60','61-80','81-100'], datasets: [{ data: [0,0,0,0,0], backgroundColor: ['#009B4C','#175CD3','#D97706','#EA580C','#D92D20'], borderRadius: 6, barPercentage: .7 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#EEF2F7' }, beginAtZero: true } } }
  });
  loadChartData();
}

async function loadChartData() {
  try {
    const r = await af('/api/claims?limit=200');
    if (!r) return;
    const items = (await r.json()).items || [];
    const sc = { APPROVED: 0, REJECTED: 0, PENDING_AUDIT: 0, HOLD: 0 };
    const fc = { UPCODING: 0, PHANTOM_BILLING: 0, INFLATED_BILLS: 0, CLONING: 0, CLEAN: 0 };
    const rb = [0,0,0,0,0], fm = {};
    items.forEach(c => {
      sc[c.status] = (sc[c.status]||0)+1;
      fc[c.fraud_type] = (fc[c.fraud_type]||0)+1;
      rb[c.risk_score<=20?0:c.risk_score<=40?1:c.risk_score<=60?2:c.risk_score<=80?3:4]++;
      const fn = c.faskes?.nama||'?';
      if(!fm[fn])fm[fn]={n:0,s:0}; fm[fn].n++; fm[fn].s+=c.risk_score;
    });
    if(cI){cI.data.datasets[0].data=[sc.APPROVED,sc.REJECTED,sc.PENDING_AUDIT,sc.HOLD];cI.update();}
    if(cF){cF.data.datasets[0].data=[fc.UPCODING,fc.PHANTOM_BILLING,fc.INFLATED_BILLS,fc.CLONING,fc.CLEAN];cF.update();}
    if(cFs){const t=Object.entries(fm).sort((a,b)=>(b[1].s/b[1].n)-(a[1].s/a[1].n)).slice(0,6);cFs.data.labels=t.map(([k])=>k.length>16?k.slice(0,14)+'…':k);cFs.data.datasets[0].data=t.map(([,v])=>Math.round(v.s/v.n));cFs.update();}
    if(cR){cR.data.datasets[0].data=rb;cR.update();}
  } catch {}
}

/* ── Timeline Chart (Data tab) ───────────────────────────── */
let cTimeline;

async function loadTimeline(period) {
  // Update sub-tab active state
  ['daily','monthly','yearly'].forEach(p => {
    const btn = document.getElementById('dt-' + p);
    if (btn) btn.classList.toggle('active', p === period);
  });

  const labels = { daily: 'Harian', monthly: 'Bulanan', yearly: 'Tahunan' };
  document.getElementById('dt-period-label').textContent = labels[period] || period;

  try {
    const r = await af(`/api/stats/timeline?period=${period}`);
    if (!r) return;
    const data = await r.json();
    const items = data.items || [];

    // Summary
    const totalAll = items.reduce((a, b) => a + b.total, 0);
    const fraudAll = items.reduce((a, b) => a + b.fraud, 0);
    const savingsAll = items.reduce((a, b) => a + b.savings, 0);
    const avgRisk = items.length ? (items.reduce((a, b) => a + b.avg_risk, 0) / items.length).toFixed(1) : 0;

    document.getElementById('dt-total').textContent = totalAll;
    document.getElementById('dt-fraud').textContent = fraudAll;
    document.getElementById('dt-savings').textContent = formatCompactIDR(savingsAll);
    document.getElementById('dt-avg-risk').textContent = avgRisk;
    document.getElementById('dt-count').textContent = items.length + ' periode';

    // Table
    const tbody = document.getElementById('dt-tbody');
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#6B7A90">Tidak ada data</td></tr>';
    } else {
      tbody.innerHTML = items.map(i => `<tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#10243E;font-weight:600">${i.period}</td>
        <td style="text-align:right;color:#3E5165">${i.total}</td>
        <td style="text-align:right;color:#D92D20;font-weight:600">${i.fraud}</td>
        <td style="text-align:right;color:#067647">${i.clean}</td>
        <td style="text-align:right;font-family:'JetBrains Mono',monospace;color:#007C3D;font-size:11.5px">${formatCompactIDR(i.savings)}</td>
        <td style="text-align:right;font-family:'JetBrains Mono',monospace;color:#3E5165">${i.avg_risk}</td>
      </tr>`).join('');
    }

    // Chart (destroy previous instance, no duplicate canvas)
    if (cTimeline) cTimeline.destroy();
    cTimeline = new Chart(document.getElementById('chart-timeline'), {
      type: 'bar',
      data: {
        labels: items.map(i => i.period),
        datasets: [
          { label: 'Total', data: items.map(i => i.total), backgroundColor: '#175CD3', borderRadius: 5, barPercentage: .55 },
          { label: 'Anomali', data: items.map(i => i.fraud), backgroundColor: '#D92D20', borderRadius: 5, barPercentage: .55 },
          { label: 'Bersih', data: items.map(i => i.clean), backgroundColor: '#009B4C', borderRadius: 5, barPercentage: .55 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 10, padding: 10, font: { size: 11.5 } } } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 10.5 }, maxRotation: 45 } }, y: { grid: { color: '#EEF2F7' }, beginAtZero: true } }
      }
    });
  } catch (err) { console.error('Timeline failed:', err); }
}

/* ── Heatmap (Data tab) ──────────────────────────────────── */
async function loadHeatmap() {
  const tbody = document.getElementById('heatmap-tbody');
  if (!tbody) return;
  try {
    const r = await af('/api/heatmap');
    if (!r) return;
    const d = await r.json();
    const items = d.items || [];
    document.getElementById('hm-count').textContent = items.length + ' faskes';
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#6B7A90">Belum ada data.</td></tr>';
      return;
    }
    const FC = { UPCODING: 'fc-upcoding', PHANTOM_BILLING: 'fc-phantom', INFLATED_BILLS: 'fc-inflated', CLONING: 'fc-cloning', CLEAN: 'fc-clean' };
    const FL = { UPCODING: 'Upcoding', PHANTOM_BILLING: 'Phantom', INFLATED_BILLS: 'Overpreskripsi', CLONING: 'Cloning', CLEAN: 'Bersih' };
    tbody.innerHTML = items.map(f => {
      const cls = f.avg_risk >= 70 ? 'risk-high' : f.avg_risk >= 30 ? 'risk-mid' : 'risk-low';
      const bar = Math.min(100, f.avg_risk);
      const barC = f.avg_risk >= 70 ? '#D92D20' : f.avg_risk >= 30 ? '#F0B429' : '#009B4C';
      return `<tr>
        <td><div style="font-weight:600;color:var(--ink);font-size:12.5px">${f.nama}</div><div style="font-size:11px;color:var(--muted)" class="mono-num">${f.kode} · ${f.kota}</div></td>
        <td style="text-align:right" class="mono-num">${f.total}</td>
        <td style="text-align:right;color:#D92D20;font-weight:600" class="mono-num">${f.fraud}</td>
        <td style="text-align:center"><div style="display:flex;align-items:center;gap:8px;justify-content:center"><span class="hm-bar"><span style="display:block;width:${bar}%;background:${barC}"></span></span><span class="risk-badge ${cls}">${f.avg_risk}</span></div></td>
        <td style="text-align:center">${f.top_modus ? `<span class="fraud-chip ${FC[f.top_modus] || ''}">${FL[f.top_modus] || f.top_modus}</span>` : '<span style="color:var(--muted)">, </span>'}</td>
      </tr>`;
    }).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#6B7A90">Gagal memuat heatmap.</td></tr>';
  }
}

/* ── Stats ───────────────────────────────────────────────── */
async function fetchStats() {
  try { const r = await af('/api/stats/overview'); if (!r) return; const d = await r.json(); document.getElementById('cp-savings').textContent = formatCompactIDR(d.total_savings_idr); document.getElementById('cp-total').textContent = d.total_claims; document.getElementById('cp-fraud').textContent = d.anomalous_count; document.getElementById('cp-clean').textContent = d.clean_count; document.getElementById('cp-faskes').textContent = d.active_faskes_count ?? ', '; } catch {}
}

/* ── Claims: fetch + filter compose ──────────────────────── */
const RESTRICTED = ['meropenem', 'albumin', 'trastuzumab', 'imunoglobulin', 'vecuronium'];
const FRAUD_CHIP = { CLEAN: 'fc-clean', UPCODING: 'fc-upcoding', PHANTOM_BILLING: 'fc-phantom', INFLATED_BILLS: 'fc-inflated', CLONING: 'fc-cloning' };
const FRAUD_LABEL = { CLEAN: 'Bersih', UPCODING: 'Upcoding', PHANTOM_BILLING: 'Phantom', INFLATED_BILLS: 'Overpreskripsi', CLONING: 'Cloning' };
const STATUS_BADGE = { APPROVED: 'b-g', REJECTED: 'b-r', PENDING_AUDIT: 'b-y', HOLD: 'b-x' };
const STATUS_TEXT = { APPROVED: 'Disetujui', REJECTED: 'Ditolak', PENDING_AUDIT: 'Antrean', HOLD: 'Ditahan' };

// Risk ramp PRD §3.2: <30 green · 30–69 amber · ≥70 red
function riskClass(r) { return r >= 70 ? 'risk-high' : r >= 30 ? 'risk-mid' : 'risk-low'; }

async function fetchClaims() {
  const status = document.getElementById('filter-status')?.value || 'ALL';
  const ft = document.getElementById('filter-fraud-type')?.value || 'ALL';
  let url = '/api/claims?limit=200';
  if (status !== 'ALL') url += `&status=${status}`;
  if (ft !== 'ALL') url += `&fraud_type=${ft}`;
  // search stays client-side (applyClientFilters) so it can also match
  // ICD-10, which the server-side search does not cover (PRD §3.2)
  try {
    const r = await af(url); if (!r) return;
    const d = await r.json();
    claimsData = d.items || [];
    populateFaskesFilter();
    focusedRow = -1;
    applyClientFilters();
  } catch {
    document.getElementById('claims-tbody').innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#6B7A90">Gagal memuat, cek koneksi server.</td></tr>';
    document.getElementById('table-count-label').textContent = '--';
  }
}
function debounceSearch() { clearTimeout(debounceTimer); debounceTimer = setTimeout(applyClientFilters, 250); }

// Client-side filters: text search (SEP/ID, faskes, pasien, diagnosa, ICD-10),
// faskes dropdown, risk min/max, the API only exposes status/fraud_type/search
function applyClientFilters() {
  const q = (document.getElementById('filter-search')?.value || '').trim().toLowerCase();
  const faskes = document.getElementById('filter-faskes')?.value || 'ALL';
  const rMin = document.getElementById('filter-risk-min')?.value;
  const rMax = document.getElementById('filter-risk-max')?.value;
  const min = rMin === '' || isNaN(+rMin) ? null : +rMin;
  const max = rMax === '' || isNaN(+rMax) ? null : +rMax;
  filteredClaims = claimsData.filter(c =>
    (!q ||
      String(c.id).toLowerCase().includes(q) ||
      String(c.faskes?.nama || '').toLowerCase().includes(q) ||
      String(c.pasien?.nama || '').toLowerCase().includes(q) ||
      String(c.diagnosa?.nama || '').toLowerCase().includes(q) ||
      String(c.diagnosa?.icd10 || '').toLowerCase().includes(q)) &&
    (faskes === 'ALL' || c.faskes.nama === faskes) &&
    (min === null || c.risk_score >= min) &&
    (max === null || c.risk_score <= max)
  );
  renderTable(filteredClaims);
}

function populateFaskesFilter() {
  const sel = document.getElementById('filter-faskes');
  if (!sel) return;
  const prev = sel.value;
  const names = [...new Set(claimsData.map(c => c.faskes.nama))].sort();
  sel.innerHTML = '<option value="ALL">Semua faskes</option>' + names.map(n => `<option value="${n.replace(/"/g, '&quot;')}">${n}</option>`).join('');
  if (names.includes(prev)) sel.value = prev;
}

function renderTable(claims) {
  const tb = document.getElementById('claims-tbody');
  if (!claims.length) { tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#6B7A90">Tidak ada klaim yang cocok.</td></tr>'; document.getElementById('table-count-label').textContent = '0 berkas'; return; }
  tb.innerHTML = claims.map((c, i) => `<tr class="${selectedClaim?.id === c.id ? 'sel' : ''}" data-idx="${i}" tabindex="0" role="button" aria-label="Buka klaim ${c.id}" onclick="selectClaim('${c.id}')">
    <td><span class="mono-id">${c.id}</span></td>
    <td class="mono-num">${c.tgl_masuk}</td>
    <td style="color:#3E5165;font-size:12px">${c.faskes.nama}</td>
    <td><span class="mono-id" style="color:#175CD3">${c.diagnosa.icd10}</span> <span style="color:#6B7A90;font-size:11px">${c.diagnosa.nama}</span></td>
    <td style="text-align:right" class="mono-num">${formatCompactIDR(c.biaya_diajukan)}</td>
    <td style="text-align:center"><span class="risk-badge ${riskClass(c.risk_score)}">${c.risk_score}</span></td>
    <td style="text-align:center"><span class="fraud-chip ${FRAUD_CHIP[c.fraud_type] || ''}">${FRAUD_LABEL[c.fraud_type] || c.fraud_type}</span></td>
    <td style="text-align:center"><span class="b ${STATUS_BADGE[c.status] || 'b-x'}">${STATUS_TEXT[c.status] || c.status}</span></td>
  </tr>`).join('');
  document.getElementById('table-count-label').textContent = claims.length + ' dari ' + claimsData.length + ' berkas';
  // keep keyboard cursor in sync with selection
  if (selectedClaim) focusedRow = claims.findIndex(c => c.id === selectedClaim.id);
}

function selectClaim(id) {
  selectedClaim = claimsData.find(c => c.id === id) || filteredClaims.find(c => c.id === id) || null;
  focusedRow = filteredClaims.findIndex(c => c.id === id);
  renderTable(filteredClaims);
  renderInspector();
  openInspector();
}

/* ── Inspector drawer ────────────────────────────────────── */
function openInspector() {
  const d = document.getElementById('inspector-drawer'), b = document.getElementById('drawer-backdrop');
  if (!d) return;
  d.classList.add('open');
  d.setAttribute('aria-hidden', 'false');
  if (b) { b.style.display = 'block'; requestAnimationFrame(() => b.style.opacity = '1'); }
}
function closeInspector() {
  const d = document.getElementById('inspector-drawer'), b = document.getElementById('drawer-backdrop');
  if (!d) return;
  d.classList.remove('open');
  d.setAttribute('aria-hidden', 'true');
  if (b) { b.style.opacity = '0'; setTimeout(() => { b.style.display = 'none'; }, 200); }
}

function restrictedDrugs(obat) {
  return (obat || []).filter(o => RESTRICTED.some(t => String(o).toLowerCase().includes(t)));
}

function pipelineStripHtml(c) {
  // _trace = hasil "Jalankan investigasi AI" sesi ini; agent_trace = trace tersimpan dari ingest
  const t = Array.isArray(c._trace) ? c._trace : (Array.isArray(c.agent_trace) ? c.agent_trace : null);
  const a1 = t?.find(x => x.agent === 'A1'), a2 = t?.find(x => x.agent === 'A2'), a3 = t?.find(x => x.agent === 'A3');
  const stage = (code, done, val, sub) =>
    `<div class="pipe-stage ${done ? 'done' : ''}">
       <div class="pipe-stage-code" style="color:${done ? '#067647' : 'var(--muted)'}">${code}</div>
       <div class="pipe-stage-val">${val}</div>
       <div class="pipe-stage-sub">${sub}</div>
     </div>`;
  return `<div class="pipe-strip">
    ${stage('A1', !!a1, a1 ? a1.preliminary_risk : ', ', 'Triage aturan')}
    <div class="pipe-arrow">→</div>
    ${stage('A2', !!a2, a2 ? a2.fused_risk : ', ', 'ML IsolationForest')}
    <div class="pipe-arrow">→</div>
    ${stage('A3', !!a3, a3 ? a3.status : ', ', a3 ? (a3.llm?.fallback ? 'Fallback aturan' : 'LLM adjudicator') : 'Adjudicator')}
  </div>`;
}

function renderInspector() {
  if (!selectedClaim) return;
  const c = selectedClaim;
  const badge = document.getElementById('insp-risk-badge');
  badge.textContent = `RISIKO ${c.risk_score}`;
  badge.className = `b ${c.risk_score >= 70 ? 'b-r' : c.risk_score >= 30 ? 'b-y' : 'b-g'}`;
  document.getElementById('insp-title').textContent = c.id;

  const selisih = c.selisih_biaya ?? Math.max(0, c.biaya_diajukan - c.tarif_ina_cbg);
  const losNorm = c.diagnosa.los_norm ?? '-';
  const losDelta = (c.los ?? 0) - (losNorm === '-' ? 0 : losNorm);
  const drugs = (c.obat || []).map(o => {
    const restricted = RESTRICTED.some(t => String(o).toLowerCase().includes(t));
    return `<span class="drug-chip ${restricted ? 'restricted' : ''}" title="${restricted ? 'Obat restriksi e-Fornas' : ''}">${o}</span>`;
  }).join('');
  const reasons = c.audit_reasons || [];
  const openAttr = reasons.length > 3 ? '' : ' open';

  document.getElementById('inspector-content').innerHTML = `
    <div class="insp-block" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span class="b ${STATUS_BADGE[c.status] || 'b-x'}">${STATUS_TEXT[c.status] || c.status}</span>
      <span class="fraud-chip ${FRAUD_CHIP[c.fraud_type] || ''}">${FRAUD_LABEL[c.fraud_type] || c.fraud_type}</span>
      <span class="mono-num" style="margin-left:auto">Masuk ${c.tgl_masuk}</span>
    </div>

    <div class="insp-block">
      <div class="insp-block-title">Pasien &amp; diagnosa</div>
      <div style="border:1px solid var(--line);border-radius:9px;padding:4px 11px;background:#fff">
        <div class="kv-row"><span class="kv-lbl">Pasien</span><span class="kv-val">${c.pasien.nama} (${c.pasien.gender}, ${c.pasien.usia} th)</span></div>
        <div class="kv-row"><span class="kv-lbl">Faskes</span><span class="kv-val">${c.faskes.nama}</span></div>
        <div class="kv-row"><span class="kv-lbl">ICD-10</span><span class="kv-val mono-id" style="color:#175CD3">${c.diagnosa.icd10}</span></div>
        <div class="kv-row"><span class="kv-lbl">Diagnosa</span><span class="kv-val">${c.diagnosa.nama}</span></div>
        <div class="kv-row"><span class="kv-lbl">LOS vs norma</span><span class="kv-val mono-num" style="${losDelta > 3 ? 'color:#D92D20' : ''}">${c.los} hari vs ${losNorm} hari (${losDelta >= 0 ? '+' : ''}${losDelta})</span></div>
      </div>
    </div>

    <div class="insp-block">
      <div class="insp-block-title">Biaya</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="border:1px solid var(--line);border-radius:9px;padding:8px 11px">
          <div style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em">Tarif INA-CBG</div>
          <div class="mono-num" style="font-size:13px;margin-top:2px">${formatIDR(c.tarif_ina_cbg)}</div>
        </div>
        <div style="border:1px solid ${selisih > 0 ? '#F4CFCB' : 'var(--line)'};border-radius:9px;padding:8px 11px;background:${selisih > 0 ? '#FDF6F5' : '#fff'}">
          <div style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em">Diajukan</div>
          <div class="mono-num" style="font-size:13px;margin-top:2px;${selisih > 0 ? 'color:#D92D20' : ''}">${formatIDR(c.biaya_diajukan)}</div>
        </div>
      </div>
      ${selisih > 0 ? `<div style="margin-top:6px;font-size:12px;color:#B42318;font-weight:600">Selisih: <span class="mono-num">${formatIDR(selisih)}</span> di atas plafon</div>` : ''}
    </div>

    <div class="insp-block">
      <div class="insp-block-title">Obat ${restrictedDrugs(c.obat).length ? `<span style="color:#D92D20">· ${restrictedDrugs(c.obat).length} restriksi e-Fornas</span>` : ''}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${drugs || '<span style="font-size:12px;color:var(--muted)">Tidak ada data obat.</span>'}</div>
    </div>

    <div class="insp-block">
      <div class="insp-block-title">Pipeline A1 → A2 → A3</div>
      ${pipelineStripHtml(c)}
      ${!c._trace ? `<button onclick="runAgentOnClaim('${c.id}')" id="btn-agent-run" class="btn btn-s" style="width:100%;justify-content:center;font-size:12px;margin-top:8px">⚡ Jalankan investigasi AI</button><div id="insp-ai-result"></div>
      ${c.rekomendasi ? `<div style="margin-top:8px;border:1px solid #C6E8D5;background:#F4FBF7;border-radius:9px;padding:8px 11px;font-size:11.5px;font-weight:600;color:#067647">Rekomendasi: ${c.rekomendasi}</div>` : ''}` : `
      ${c._alasan_ai ? `<div style="margin-top:8px;border:1px solid #C9DBF6;background:#F5F9FE;border-radius:9px;padding:9px 11px"><div style="font-size:10.5px;font-weight:700;color:#175CD3;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Alasan A3</div><p style="font-size:12px;color:#3E5165">${c._alasan_ai}</p></div>` : ''}
      ${c._rekomendasi ? `<div style="margin-top:6px;border:1px solid #C6E8D5;background:#F4FBF7;border-radius:9px;padding:8px 11px;font-size:11.5px;font-weight:600;color:#067647">Rekomendasi: ${c._rekomendasi}</div>` : ''}`}
    </div>

    <div class="insp-block">
      <details class="audit-details"${openAttr}>
        <summary>Alasan audit (${reasons.length})</summary>
        <ul class="audit-list">${reasons.map(r => `<li>· ${r}</li>`).join('') || '<li>Tidak ada catatan.</li>'}</ul>
      </details>
    </div>
    ${Array.isArray(c.verdict_history) && c.verdict_history.length ? `
    <div class="insp-block">
      <div class="insp-block-title">Riwayat keputusan (${c.verdict_history.length})</div>
      <div style="border:1px solid var(--line);border-radius:9px;padding:4px 11px;background:#fff">
        ${c.verdict_history.slice().reverse().map(v => `<div class="kv-row"><span class="kv-lbl mono-num">${String(v.at || '').replace('T', ' ').slice(0, 16) || '-'} · ${v.by || '-'}</span><span class="kv-val">${v.action || '-'}</span></div>`).join('')}
      </div>
    </div>` : ''}`;

  motionStagger(document.getElementById('inspector-content'));
}

/* ── Agent (A1→A2→A3) on stored claim ────────────────────── */
async function runAgentOnClaim(id) {
  const box = document.getElementById('insp-ai-result'), btn = document.getElementById('btn-agent-run');
  if (!box) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Pipeline berjalan…'; }
  box.innerHTML = '<div style="font-size:12px;color:#175CD3;text-align:center;padding:16px">Menjalankan A1 → A2 → A3…</div>';
  try {
    const r = await af(`/api/claims/${id}/agent`, { method: 'POST' });
    const d = await r.json();
    if (selectedClaim && selectedClaim.id === id) {
      selectedClaim._trace = d.agent_trace || [];
      selectedClaim._alasan_ai = d.alasan_ai || '';
      selectedClaim._rekomendasi = d.rekomendasi || '';
      if (typeof d.risk_score === 'number') selectedClaim.risk_score = d.risk_score;
      renderInspector(); renderTable(filteredClaims);
    }
  } catch {
    box.innerHTML = '<div style="font-size:12px;color:#D92D20;text-align:center;padding:16px">Gagal menjalankan pipeline.</div>';
  }
}

/* ── Sandbox ─────────────────────────────────────────────── */
let sandboxMode = 'agent';
function setSandboxMode(m) { sandboxMode = m; }

async function runSandboxAudit(e) {
  e.preventDefault();
  const body = { faskes_nama: document.getElementById('sb-faskes').value, diagnosa_icd: document.getElementById('sb-icd').value, diagnosa_nama: document.getElementById('sb-diagnosa').value, tarif_ina_cbg: +document.getElementById('sb-tarif-cbg').value, biaya_diajukan: +document.getElementById('sb-biaya-rs').value, los: +document.getElementById('sb-los').value, obat_list: document.getElementById('sb-obat').value.split(/[,\n]/).map(s => s.trim()).filter(Boolean) };
  const endpoint = sandboxMode === 'single' ? '/api/audit/single' : '/api/audit/agent';
  try {
    const r = await af(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r) return;
    const res = await r.json();
    document.getElementById('sandbox-result').style.display = 'none';
    const det = document.getElementById('sb-res-details'); det.style.display = 'block';
    det.innerHTML = sandboxMode === 'single' ? sandboxSingleHtml(res) : agentResultHtml(res);
    const badge = document.getElementById('sb-res-badge'); badge.textContent = `RISIKO ${res.risk_score}`; badge.className = `b ${res.risk_score >= 70 ? 'b-r' : res.risk_score >= 30 ? 'b-y' : 'b-g'}`;
    motionStagger(det);
  } catch { document.getElementById('sandbox-result').textContent = 'Gagal menjalankan audit.'; }
}

function sandboxSingleHtml(r) {
  const v = r.status === 'APPROVED' ? ['b-g', 'SIAP BAYAR'] : r.status === 'REJECTED' ? ['b-r', 'TOLAK'] : ['b-y', 'TAHAN / AUDIT'];
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px"><span class="b ${v[0]}">${v[1]}</span><span style="font-size:11.5px;font-family:'JetBrains Mono',monospace;color:#3E5165">${r.fraud_type}</span></div>
  <div class="res-card"><div style="font-size:10.5px;font-weight:700;color:#6B7A90;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Alasan audit aturan</div><ul style="font-size:12px;color:#3E5165;padding-left:16px">${(r.reasons || []).map(x => `<li style="margin-bottom:3px">${x}</li>`).join('')}</ul></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px;padding-top:9px;border-top:1px solid #E4E9F1"><span style="font-size:11.5px;color:#6B7A90">Overbilling dicegah</span><span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:#D92D20;font-size:12.5px">${formatIDR(r.selisih_biaya_idr || 0)}</span></div>
  <div class="res-card" style="border-color:#C6E8D5;background:#F4FBF7;margin-top:7px"><span style="font-size:11px;font-weight:600;color:#067647">Rekomendasi: ${r.rekomendasi || '-'}</span></div>`;
}

/* ── Agent result (sandbox agentic) ──────────────────────── */
const AC = { A1: 'color:#067647', A2: 'color:#B54708', A3: 'color:#D92D20' };
function agentTraceHtml(trace) {
  if (!Array.isArray(trace)) return '';
  return trace.map(t => {
    const m = t.ml ? `ML ${t.ml.anomaly_score}` : Array.isArray(t.flags) ? `${t.flags.length} flag` : t.llm ? (t.llm.fallback ? 'Fallback' : 'LLM') : '';
    const items = (t.flags || t.evidence || []).map(x => `<li style="font-size:11.5px;color:#6B7A90;margin-bottom:2px">· ${x}</li>`).join('');
    const al = t.agent === 'A3' && t.alasan ? `<p style="font-size:12px;color:#3E5165;margin-top:7px;padding-top:7px;border-top:1px solid #E4E9F1">${t.alasan}</p>` : '';
    return `<div class="res-card" style="display:flex;gap:10px"><span style="font-size:11.5px;font-weight:700;font-family:'JetBrains Mono',monospace;${AC[t.agent] || 'color:#6B7A90'};margin-top:1px">${t.agent}</span><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:3px"><span style="font-size:12.5px;font-weight:700;color:#10243E">${t.name}</span><span style="font-size:10.5px;color:#6B7A90;font-family:'JetBrains Mono',monospace;white-space:nowrap">${t.latency_ms}ms · ${m}</span></div><ul style="margin:0;padding-left:14px">${items}</ul>${al}</div></div>`;
  }).join('');
}

function agentResultHtml(r) {
  const v = r.verdict || 'HOLD';
  const vm = { APPROVE: ['b-g', 'SETUJUI'], HOLD: ['b-y', 'TAHAN'], REJECT: ['b-r', 'TOLAK'] }[v] || ['b-x', v];
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px"><span class="b ${vm[0]}">${vm[1]}</span><span style="font-size:11.5px;font-family:'JetBrains Mono',monospace;color:#3E5165">RISIKO ${r.risk_score} · ${r.fraud_type}</span></div>
  ${r.alasan_ai ? `<div class="res-card" style="border-color:#C9DBF6;background:#F5F9FE"><div style="font-size:10.5px;font-weight:700;color:#175CD3;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Alasan AI</div><p style="font-size:12px;color:#3E5165">${r.alasan_ai}</p></div>` : ''}
  <div style="display:flex;flex-direction:column;gap:6px">${agentTraceHtml(r.agent_trace)}</div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px;padding-top:9px;border-top:1px solid #E4E9F1"><span style="font-size:11.5px;color:#6B7A90">Overbilling dicegah</span><span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:#D92D20;font-size:12.5px">${formatIDR(r.selisih_biaya_idr || 0)}</span></div>
  <div class="res-card" style="border-color:#C6E8D5;background:#F4FBF7;margin-top:7px"><span style="font-size:11px;font-weight:600;color:#067647">Rekomendasi: ${r.rekomendasi || '-'}</span></div>`;
}

/* ── Verdict ─────────────────────────────────────────────── */
async function submitVerdict(action) {
  if (!selectedClaim || !currentUser?.permissions?.includes('verdict')) { showToast('Anda tidak memiliki hak verdict.', 'err'); return; }
  // Confirm when the claim is already decided (PRD keyboard spec)
  if (selectedClaim.status !== 'PENDING_AUDIT') {
    const label = STATUS_TEXT[selectedClaim.status] || selectedClaim.status;
    if (!confirm(`Klaim ini sudah berstatus "${label}". Ubah verdict menjadi ${action}?`)) return;
  }
  try {
    const r = await af(`/api/claims/${selectedClaim.id}/verdict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    if (!r) return;
    const d = await r.json();
    if (r.ok && d.success) {
      selectedClaim.status = d.new_status || selectedClaim.status;
      selectedClaim.audit_reasons = selectedClaim.audit_reasons || [];
      showToast(`Verdict ${action} tersimpan · ${selectedClaim.id}`, 'ok');
      renderTable(filteredClaims);
      renderInspector();
      fetchStats();
    } else {
      showToast(d.detail || 'Gagal menyimpan verdict.', 'err');
    }
  } catch { showToast('Gagal menyimpan verdict.', 'err'); }
}

/* ── Keyboard shortcuts (Klaim tab) ──────────────────────── */
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  // '/' focuses search from anywhere except while typing
  if (e.key === '/' && !typing) {
    if (activeTab !== 'claims') switchTab('claims');
    e.preventDefault();
    const s = document.getElementById('filter-search');
    if (s) { s.focus(); s.select(); }
    return;
  }
  if (typing) return;
  if (activeTab !== 'claims') return;

  if (e.key === 'Escape') { closeInspector(); return; }
  if (!filteredClaims.length) return;

  if (e.key === 'j' || e.key === 'k') {
    e.preventDefault();
    focusedRow = e.key === 'j' ? Math.min(filteredClaims.length - 1, focusedRow + 1) : Math.max(0, focusedRow - 1);
    const row = document.querySelector(`#claims-tbody tr[data-idx="${focusedRow}"]`);
    if (row) { row.scrollIntoView({ block: 'nearest' }); row.focus({ preventScroll: true }); }
    return;
  }
  if (e.key === 'Enter') {
    const c = filteredClaims[focusedRow];
    if (c) { e.preventDefault(); selectClaim(c.id); }
    return;
  }
  const drawerOpen = document.getElementById('inspector-drawer')?.classList.contains('open');
  if (drawerOpen && selectedClaim) {
    if (e.key === 'a') { e.preventDefault(); submitVerdict('APPROVE'); }
    else if (e.key === 'h') { e.preventDefault(); submitVerdict('HOLD'); }
    else if (e.key === 'r') { e.preventDefault(); submitVerdict('REJECT'); }
  }
});

/* ── Users ───────────────────────────────────────────────── */
const RL = { SA: 'Super Admin', VK: 'Verifikator', ST: 'Satgas AF', AU: 'Auditor' }, RC = { SA: 'b-r', VK: 'b-g', ST: 'b-y', AU: 'b-b' };
let editingUserId = null;
async function fetchUsers() { try { const r = await af('/api/admin/users'); if (r) renderUsers((await r.json()).users); } catch {} }
function renderUsers(users) {
  const tb = document.getElementById('users-tbody');
  if (!users.length) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#6B7A90">Belum ada pengguna.</td></tr>'; return; }
  tb.innerHTML = users.map(u => {
    if (editingUserId === u.id) return userEditRowHtml(u);
    return `<tr><td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B7A90">${u.id}</td><td style="font-weight:600;color:#10243E;font-size:12.5px">${u.username}</td><td style="color:#3E5165;font-size:12.5px">${u.fullname}</td><td><span class="b ${RC[u.role]}">${RL[u.role] || u.role}</span></td><td style="font-size:12px;font-weight:600;color:${u.active ? '#067647' : '#6B7A90'}">${u.active ? 'Aktif' : 'Nonaktif'}</td><td style="text-align:center;white-space:nowrap"><button onclick="editUser('${u.id}')" style="font-size:12px;font-weight:600;color:#175CD3;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px">Edit</button>${u.username !== 'admin' ? `<button onclick="deleteUser('${u.id}')" style="font-size:12px;font-weight:600;color:#D92D20;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px">Nonaktifkan</button>` : ''}</td></tr>`;
  }).join('');
}

// Inline edit row (PUT /api/admin/users/{id}), no modal maze (PRD §10)
function userEditRowHtml(u) {
  const roleOpts = Object.keys(RL).map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${RL[r]}</option>`).join('');
  return `<tr>
    <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B7A90">${u.id}</td>
    <td style="font-weight:600;color:#10243E;font-size:12.5px">${u.username}</td>
    <td><input type="text" id="eu-fullname" class="fi" value="${String(u.fullname || '').replace(/"/g, '&quot;')}" style="min-width:130px"></td>
    <td><select id="eu-role" class="fi fs">${roleOpts}</select></td>
    <td><label style="font-size:12px;font-weight:600;color:#3E5165;display:flex;align-items:center;gap:5px"><input type="checkbox" id="eu-active" ${u.active ? 'checked' : ''}> Aktif</label></td>
    <td style="text-align:center;white-space:nowrap">
      <input type="password" id="eu-password" class="fi" placeholder="Password baru (opsional)" style="width:150px;margin-right:6px">
      <button onclick="saveUser('${u.id}')" class="btn btn-p" style="padding:5px 10px">Simpan</button>
      <button onclick="cancelUserEdit()" class="btn btn-s" style="padding:5px 10px">Batal</button>
    </td></tr>`;
}
function editUser(id) { editingUserId = id; fetchUsers(); }
function cancelUserEdit() { editingUserId = null; fetchUsers(); }
async function saveUser(id) {
  const note = document.getElementById('add-user-note');
  const body = {
    fullname: document.getElementById('eu-fullname').value.trim(),
    role: document.getElementById('eu-role').value,
    active: document.getElementById('eu-active').checked
  };
  const pw = document.getElementById('eu-password').value;
  if (pw) body.password = pw;
  try {
    const r = await af(`/api/admin/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.success) { editingUserId = null; if (note) { note.style.display = 'block'; note.textContent = `Pengguna ${d.user.username} diperbarui.`; note.style.color = '#067647'; } fetchUsers(); }
    else { if (note) { note.style.display = 'block'; note.textContent = d.detail || 'Gagal memperbarui.'; note.style.color = '#D92D20'; } }
  } catch { if (note) { note.style.display = 'block'; note.textContent = 'Terjadi kesalahan.'; note.style.color = '#D92D20'; } }
}
async function addUser(e) {
  e.preventDefault();
  const note = document.getElementById('add-user-note');
  const body = { username: document.getElementById('nu-username').value.trim(), password: document.getElementById('nu-password').value, fullname: document.getElementById('nu-fullname').value.trim(), role: document.getElementById('nu-role').value };
  try { const r = await af('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json(); note.style.display = 'block';
  if (d.success) { note.textContent = 'Berhasil: ' + d.user.username; note.style.color = '#067647'; document.getElementById('add-user-form').reset(); fetchUsers(); }
  else { note.textContent = d.detail || 'Gagal.'; note.style.color = '#D92D20'; } } catch { note.style.display = 'block'; note.textContent = 'Terjadi kesalahan.'; note.style.color = '#D92D20'; }
}
async function deleteUser(id) { if (!confirm('Nonaktifkan pengguna ini?')) return; try { const r = await af(`/api/admin/users/${id}`, { method: 'DELETE' }); if (r?.ok) fetchUsers(); } catch {} }

/* ── API keys ingest faskes (SA only) ───────────────────── */
const FASKES_LIST = [
  ['FKRTL-001', 'RSUP Dr. Sardjito'], ['FKRTL-002', 'RSUD Tarakan'],
  ['FKRTL-003', 'RS Hermina Kemayoran'], ['FKRTL-004', 'RS Siloam Kebon Jeruk'],
  ['FKRTL-005', 'RSUD Dr. Soetomo'], ['FKRTL-006', 'RS Bhayangkara Sartika Asih'],
  ['FKRTL-007', 'RS Sentra Medika Cikarang'], ['FKRTL-008', 'RSUD Al-Ihsan']
];
async function fetchApiKeys() {
  const sel = document.getElementById('ak-faskes');
  if (sel && !sel.options.length) {
    sel.innerHTML = FASKES_LIST.map(([k, n]) => `<option value="${k}">${k} · ${n}</option>`).join('');
  }
  try {
    const r = await af('/api/admin/api-keys');
    if (!r) return;
    renderApiKeys((await r.json()).keys || []);
  } catch {}
}
function renderApiKeys(keys) {
  const tb = document.getElementById('apikeys-tbody');
  if (!tb) return;
  if (!keys.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:#7C8BA1">Belum ada kunci, generate di atas.</td></tr>'; return; }
  tb.innerHTML = keys.map(k => `<tr>
    <td class="mono-id">${k.faskes_kode}</td>
    <td style="font-size:12.5px;color:#10243E">${k.nama || '-'}</td>
    <td class="mono-num">${k.key}</td>
    <td class="mono-num">${k.created_at || '-'}</td>
    <td style="text-align:center"><span class="b ${k.active ? 'b-g' : 'b-x'}">${k.active ? 'Aktif' : 'Nonaktif'}</span></td>
  </tr>`).join('');
}
async function createApiKey(e) {
  e.preventDefault();
  const note = document.getElementById('ak-newkey');
  try {
    const r = await af('/api/admin/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ faskes_kode: document.getElementById('ak-faskes').value, nama: document.getElementById('ak-nama').value.trim() }) });
    const d = await r.json();
    if (d.success && d.key) {
      note.style.display = 'block';
      note.innerHTML = `Kunci baru untuk <b>${d.faskes_kode}</b> (tampil sekali, salin sekarang): <code class="mono-id" style="font-size:12px">${d.key}</code>`;
      document.getElementById('ak-nama').value = '';
      fetchApiKeys();
    } else {
      note.style.display = 'block';
      note.style.borderColor = '#F4CFCB'; note.style.background = '#FDECEA'; note.style.color = '#D92D20';
      note.textContent = d.detail || 'Gagal membuat kunci.';
    }
  } catch { note.style.display = 'block'; note.textContent = 'Gagal menghubungi server.'; }
}

/* ── SIMRS Intake Simulator ──────────────────────────────── */
let simrsState = { auto_enabled: false, interval_sec: 30, pushed_count: 0, last_sep: null, last_push_at: null };

function renderSimrs() {
  const tgl = document.getElementById('btn-simrs-toggle');
  if (tgl) {
    tgl.textContent = simrsState.auto_enabled ? 'Hentikan auto-push' : 'Aktifkan auto-push';
    tgl.classList.toggle('btn-d', simrsState.auto_enabled);
    tgl.classList.toggle('btn-p', !simrsState.auto_enabled);
  }
  const st = document.getElementById('simrs-state');
  if (st) st.textContent = simrsState.auto_enabled ? `Auto-push: AKTIF tiap ${simrsState.interval_sec} dtk` : 'Auto-push: mati';
  const sel = document.getElementById('simrs-interval');
  if (sel) sel.value = String(simrsState.interval_sec);
  const last = document.getElementById('simrs-last');
  if (last) last.textContent = simrsState.last_sep
    ? `${simrsState.pushed_count} klaim masuk · terakhir ${simrsState.last_sep} (${simrsState.last_push_at || '-'})`
    : 'Belum ada klaim masuk sesi ini';
}

async function simrsRefresh() {
  try { const r = await af('/api/simrs/status'); if (!r) return; simrsState = await r.json(); renderSimrs(); } catch {}
}

async function simrsAuto(payload) {
  try {
    const r = await af('/api/simrs/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r?.ok) { simrsState = await r.json(); renderSimrs(); }
  } catch {}
}

function simrsToggle() {
  simrsAuto({ enabled: !simrsState.auto_enabled, interval_sec: +document.getElementById('simrs-interval').value });
}

function simrsSetInterval(v) {
  simrsAuto({ enabled: simrsState.auto_enabled, interval_sec: +v });
}

async function simrsPush() {
  try {
    const r = await af('/api/simrs/intake', { method: 'POST' });
    if (r?.ok) {
      const d = await r.json();
      simrsState = { ...simrsState, pushed_count: (simrsState.pushed_count || 0) + 1, last_sep: d.claim.id, last_push_at: new Date().toLocaleTimeString('id-ID') };
      renderSimrs();
      fetchStats();
      loadChartData();
    }
  } catch {}
}

// Poll ringan: saat dashboard aktif & auto-push nyala, refresh KPI+chart berkala
setInterval(() => {
  if (activeTab === 'dashboard' && simrsState.auto_enabled) { simrsRefresh(); fetchStats(); loadChartData(); }
}, 5000);

/* ── Init ────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  if (authToken) { af('/api/auth/me').then(r => { if (r?.ok) r.json().then(d => { currentUser = d; showCockpit(); }); }).catch(() => {}); }
  else {
    // Entrance kartu login (Motion; tanpa Motion tetap tampil normal)
    const lb = document.querySelector('.login-box');
    if (lb && motionOK()) window.Motion.animate(lb, { opacity: [0, 1], transform: ['translateY(14px) scale(0.985)', 'translateY(0px) scale(1)'] }, { duration: 0.5, ease: 'easeOut' });
  }
});
