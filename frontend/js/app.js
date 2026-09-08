/* ═══════════════════════════════════════════════════════════
   SiKePo app.js — Cockpit (theme light v2)
   Semua ID elemen & nama fungsi dipertahankan dari versi lama.
   ═══════════════════════════════════════════════════════════ */

let activeTab = 'dashboard', selectedClaim = null, claimsData = [], debounceTimer = null, chartsReady = false;
let authToken = localStorage.getItem('sikepo_token') || null, currentUser = null;

/* ── Motion (motion.dev) — progressive enhancement ──────── */
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
  } catch { err.textContent = 'Server tidak aktif. Jalankan backend dulu.'; err.style.display = 'block'; }
}

function showCockpit() {
  document.getElementById('app-gate').style.display = 'none';
  ['tab-dashboard','tab-claims','tab-sandbox','tab-data','tab-users'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
  document.getElementById('btn-login-trigger').style.display = 'none';
  // Desktop badge
  const badge = document.getElementById('user-badge');
  badge.classList.add('show');
  document.getElementById('user-role-label').textContent = `${currentUser.role_name || currentUser.role} · ${currentUser.username}`;
  // Mobile badge
  const bb = document.getElementById('bottombar-badge');
  if (bb) {
    document.getElementById('bottombar-role').textContent = currentUser.username;
    bb.style.display = 'flex';
  }
  applyPerms();
  switchTab('dashboard');
}

function logoutUser() {
  if (authToken) fetch('/api/auth/logout', { method: 'POST', headers: { 'X-Auth-Token': authToken } }).catch(() => {});
  authToken = null; currentUser = null; localStorage.removeItem('sikepo_token'); location.href = '/';
}

function ah() { return authToken ? { 'X-Auth-Token': authToken } : {}; }
async function af(url, o = {}) { o.headers = { ...o.headers, ...ah() }; const r = await fetch(url, o); if (r.status === 401) { logoutUser(); return null; } return r; }

function applyPerms() {
  if (!currentUser) return;
  const p = currentUser.permissions || [];
  // Tombol nav Users: toggle class .hidden (style.display saja tidak
  // menembus .hidden !important — bug versi lama).
  document.querySelectorAll('#nav-users, #mt-users, .mobile-tabs [data-tab="users"]').forEach(el => {
    el.classList.toggle('hidden', !p.includes('manage_users'));
  });
  // Baris tombol verdict: default inline display:none di markup.
  const ia = document.getElementById('inspector-actions');
  if (ia) ia.style.display = p.includes('verdict') ? 'flex' : 'none';
}

/* ── Tabs ────────────────────────────────────────────────── */
function switchTab(tab) {
  activeTab = tab;
  ['dashboard','claims','sandbox','data','users'].forEach(id => {
    const el = document.getElementById('tab-' + id);
    if (el) { el.classList.add('hidden'); el.classList.remove('fade-in'); }
  });
  const active = document.getElementById('tab-' + tab);
  if (active) { active.classList.remove('hidden'); if (!motionSwap(active)) active.classList.add('fade-in'); }
  // Desktop nav
  document.querySelectorAll('.topbar-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  // Mobile tabs (termasuk tombol periode .mt tanpa data-tab — tetap utuh)
  document.querySelectorAll('.mt').forEach(b => { if (b.dataset.tab) b.classList.toggle('active', b.dataset.tab === tab); });
  if (tab === 'dashboard') { fetchStats(); initCharts(); motionStagger(document.getElementById('kpi-row')); simrsRefresh(); }
  if (tab === 'claims') fetchClaims();
  if (tab === 'data') loadTimeline('daily');
  if (tab === 'users') fetchUsers();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Charts ──────────────────────────────────────────────── */
let cI, cF, cFs, cR;
const CC = { a: '#009B4C', r: '#D92D20', y: '#D97706', g: '#64748B' };

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

/* ── Timeline Chart ──────────────────────────────────────── */
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

    // Chart
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

/* ── Stats ───────────────────────────────────────────────── */
async function fetchStats() {
  try { const r = await af('/api/stats/overview'); if (!r) return; const d = await r.json(); document.getElementById('cp-savings').textContent = formatCompactIDR(d.total_savings_idr); document.getElementById('cp-total').textContent = d.total_claims; document.getElementById('cp-fraud').textContent = d.anomalous_count; document.getElementById('cp-clean').textContent = d.clean_count; } catch {}
}

/* ── Claims ──────────────────────────────────────────────── */
async function fetchClaims() {
  const ft = document.getElementById('filter-fraud-type')?.value||'ALL', q = document.getElementById('filter-search')?.value?.trim()||'';
  let url = '/api/claims?limit=100';
  if(ft!=='ALL')url+=`&fraud_type=${ft}`; if(q)url+=`&search=${encodeURIComponent(q)}`;
  try { const r = await af(url); if(!r)return; const d=await r.json(); claimsData=d.items; renderTable(claimsData); document.getElementById('table-count-label').textContent=d.total+' berkas'; }
  catch { document.getElementById('claims-tbody').innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#6B7A90">Gagal memuat — cek koneksi server.</td></tr>'; }
}
function debounceSearch(){clearTimeout(debounceTimer);debounceTimer=setTimeout(fetchClaims,250);}

function renderTable(claims) {
  const tb = document.getElementById('claims-tbody');
  if(!claims.length){tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#6B7A90">Tidak ada klaim yang cocok.</td></tr>';return;}
  const sb=s=>({APPROVED:'b-g',REJECTED:'b-r',PENDING_AUDIT:'b-y',HOLD:'b-x'}[s]||'b-x');
  const rc=r=>r>75?'color:#D92D20':r>35?'color:#B54708':'color:#067647';
  tb.innerHTML=claims.map(c=>`<tr class="${selectedClaim?.id===c.id?'sel':''}" style="cursor:pointer" onclick="selectClaim('${c.id}')">
    <td><div style="font-weight:600;color:#10243E;font-size:12px;font-family:'JetBrains Mono',monospace">${c.id}</div><div style="font-size:11px;color:#6B7A90">${c.pasien.nama}</div></td>
    <td style="color:#3E5165;font-size:12px">${c.faskes.nama}</td>
    <td><span style="color:#10243E;font-weight:600;font-size:11.5px;font-family:'JetBrains Mono',monospace">${c.diagnosa.icd10}</span> <span style="color:#6B7A90;font-size:11px">${c.diagnosa.nama}</span></td>
    <td style="text-align:right;font-family:'JetBrains Mono',monospace;color:#3E5165;font-size:11.5px">${formatCompactIDR(c.biaya_diajukan)}</td>
    <td style="text-align:center"><span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:12.5px;${rc(c.risk_score)}">${c.risk_score}</span></td>
    <td style="text-align:center"><span class="b ${sb(c.status)}">${c.status.replace('_',' ')}</span></td></tr>`).join('');
}

function selectClaim(id){selectedClaim=claimsData.find(c=>c.id===id);renderTable(claimsData);renderInspector();}

/* ── Inspector ───────────────────────────────────────────── */
function renderInspector() {
  if(!selectedClaim) return;
  const c=selectedClaim, badge=document.getElementById('insp-risk-badge');
  const rc=c.risk_score>75?'b-r':c.risk_score>35?'b-y':'b-g';
  badge.textContent=`RISIKO ${c.risk_score}`; badge.className=`b ${rc}`;
  const f=c.fraud_type!=='CLEAN';
  document.getElementById('inspector-content').innerHTML=`
    <div class="res-card"><div class="res-row"><span class="res-lbl">No. SEP</span><span class="res-val font-mono">${c.id}</span></div><div class="res-row"><span class="res-lbl">Faskes</span><span class="res-val">${c.faskes.nama}</span></div><div class="res-row"><span class="res-lbl">Pasien</span><span class="res-val">${c.pasien.nama} (${c.pasien.gender}, ${c.pasien.usia} th)</span></div><div class="res-row"><span class="res-lbl">Rawat</span><span class="res-val font-mono">${c.tgl_masuk} s.d. ${c.tgl_keluar} (${c.los} hari)</span></div></div>
    <div class="res-card" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><div style="font-size:10.5px;color:#6B7A90;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Tarif INA-CBG</div><div style="font-family:'JetBrains Mono',monospace;color:#3E5165;font-size:13px;margin-top:2px">${formatIDR(c.tarif_ina_cbg)}</div></div><div><div style="font-size:10.5px;color:#6B7A90;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Biaya diajukan</div><div style="font-family:'JetBrains Mono',monospace;font-size:13px;margin-top:2px;${c.selisih_biaya>0?'color:#D92D20':'color:#3E5165'}">${formatIDR(c.biaya_diajukan)}</div></div></div>
    <div class="res-card" style="border-color:${f?'#F4CFCB':'#C6E8D5'};background:${f?'#FDF6F5':'#F4FBF7'}"><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;color:${f?'#B42318':'#067647'}">Temuan audit</div><ul style="font-size:12px;color:#3E5165;padding-left:16px">${c.audit_reasons.map(r=>`<li style="margin-bottom:3px">${r}</li>`).join('')}</ul><div style="margin-top:7px;padding-top:7px;border-top:1px solid ${f?'#F4CFCB':'#C6E8D5'};font-size:11.5px;font-weight:600;color:${f?'#B42318':'#067647'}">${c.rekomendasi}</div></div>
    <div style="margin-bottom:8px"><div style="font-size:10.5px;color:#6B7A90;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Obat</div><div style="display:flex;flex-wrap:wrap;gap:4px">${c.obat.map(o=>`<span style="padding:2.5px 8px;background:#F0F3F8;color:#3E5165;border:1px solid #E4E9F1;border-radius:999px;font-size:11px">${o}</span>`).join('')}</div></div>
    <button onclick="runAgentOnClaim('${c.id}')" id="btn-agent-run" class="btn btn-s" style="width:100%;justify-content:center;font-size:12px">⚡ Jalankan investigasi AI</button>
    <div id="insp-ai-result"></div>`;
  motionStagger(document.getElementById('inspector-content'));
}

/* ── Agent ───────────────────────────────────────────────── */
const AC={A1:'color:#067647',A2:'color:#B54708',A3:'color:#D92D20'};
function agentTraceHtml(trace){
  if(!Array.isArray(trace))return'';
  return trace.map(t=>{
    const m=t.ml?`ML ${t.ml.anomaly_score}`:Array.isArray(t.flags)?`${t.flags.length} flag`:t.llm?(t.llm.fallback?'Fallback':'LLM'):'';
    const items=(t.flags||t.evidence||[]).map(x=>`<li style="font-size:11.5px;color:#6B7A90;margin-bottom:2px">· ${x}</li>`).join('');
    const al=t.agent==='A3'&&t.alasan?`<p style="font-size:12px;color:#3E5165;margin-top:7px;padding-top:7px;border-top:1px solid #E4E9F1">${t.alasan}</p>`:'';
    return`<div class="res-card" style="display:flex;gap:10px"><span style="font-size:11.5px;font-weight:700;font-family:'JetBrains Mono',monospace;${AC[t.agent]||'color:#6B7A90'};margin-top:1px">${t.agent}</span><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:3px"><span style="font-size:12.5px;font-weight:700;color:#10243E">${t.name}</span><span style="font-size:10.5px;color:#6B7A90;font-family:'JetBrains Mono',monospace;white-space:nowrap">${t.latency_ms}ms · ${m}</span></div><ul style="margin:0;padding-left:14px">${items}</ul>${al}</div></div>`;
  }).join('');
}

function agentResultHtml(r){
  const v=r.verdict||'HOLD';
  const vm={APPROVE:['b-g','SETUJUI'],HOLD:['b-y','TAHAN'],REJECT:['b-r','TOLAK']}[v]||['b-x',v];
  return`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px"><span class="b ${vm[0]}">${vm[1]}</span><span style="font-size:11.5px;font-family:'JetBrains Mono',monospace;color:#3E5165">RISIKO ${r.risk_score} · ${r.fraud_type}</span></div>
  ${r.alasan_ai?`<div class="res-card" style="border-color:#C9DBF6;background:#F5F9FE"><div style="font-size:10.5px;font-weight:700;color:#175CD3;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Alasan AI</div><p style="font-size:12px;color:#3E5165">${r.alasan_ai}</p></div>`:''}
  <div style="display:flex;flex-direction:column;gap:6px">${agentTraceHtml(r.agent_trace)}</div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px;padding-top:9px;border-top:1px solid #E4E9F1"><span style="font-size:11.5px;color:#6B7A90">Overbilling dicegah</span><span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:#D92D20;font-size:12.5px">${formatIDR(r.selisih_biaya_idr||0)}</span></div>
  <div class="res-card" style="border-color:#C6E8D5;background:#F4FBF7;margin-top:7px"><span style="font-size:11px;font-weight:600;color:#067647">Rekomendasi: ${r.rekomendasi||'-'}</span></div>`;
}

async function runAgentOnClaim(id){
  const box=document.getElementById('insp-ai-result'),btn=document.getElementById('btn-agent-run');
  if(!box)return;
  if(btn){btn.disabled=true;btn.textContent='Pipeline berjalan…';}
  box.innerHTML='<div style="font-size:12px;color:#175CD3;text-align:center;padding:16px">Menjalankan A1 → A2 → A3…</div>';
  try{const r=await af(`/api/claims/${id}/agent`,{method:'POST'});box.innerHTML=agentResultHtml(await r.json());}
  catch{box.innerHTML='<div style="font-size:12px;color:#D92D20;text-align:center;padding:16px">Gagal menjalankan pipeline.</div>';}
  if(btn){btn.disabled=false;btn.textContent='⚡ Jalankan investigasi AI';}
}

/* ── Sandbox ─────────────────────────────────────────────── */
async function runSandboxAudit(e){
  e.preventDefault();
  const body={faskes_nama:document.getElementById('sb-faskes').value,diagnosa_icd:document.getElementById('sb-icd').value,diagnosa_nama:document.getElementById('sb-diagnosa').value,tarif_ina_cbg:+document.getElementById('sb-tarif-cbg').value,biaya_diajukan:+document.getElementById('sb-biaya-rs').value,los:+document.getElementById('sb-los').value,obat_list:document.getElementById('sb-obat').value.split(',').map(s=>s.trim()).filter(Boolean)};
  try{
    const r=await af('/api/audit/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const res=await r.json();
    document.getElementById('sandbox-result').style.display='none';
    const det=document.getElementById('sb-res-details');det.style.display='block';det.innerHTML=agentResultHtml(res);
    const badge=document.getElementById('sb-res-badge');badge.textContent=`RISIKO ${res.risk_score}`;badge.className=`b ${res.risk_score>70?'b-r':res.risk_score>35?'b-y':'b-g'}`;
    motionStagger(det);
  }catch{document.getElementById('sandbox-result').textContent='Gagal menjalankan simulasi.';}
}

/* ── Verdict ─────────────────────────────────────────────── */
async function submitVerdict(action){
  if(!selectedClaim||!currentUser?.permissions?.includes('verdict')){alert('Anda tidak memiliki hak verdict.');return;}
  try{const r=await af(`/api/claims/${selectedClaim.id}/verdict`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
  if(r?.ok){selectedClaim.status=action==='APPROVE'?'APPROVED':action==='REJECT'?'REJECTED':'PENDING_AUDIT';renderTable(claimsData);renderInspector();fetchStats();}}catch{alert('Gagal menyimpan verdict.');}
}

/* ── Users ───────────────────────────────────────────────── */
const RL={SA:'Super Admin',VK:'Verifikator',ST:'Satgas AF',AU:'Auditor'},RC={SA:'b-r',VK:'b-g',ST:'b-y',AU:'b-b'};
async function fetchUsers(){try{const r=await af('/api/admin/users');if(r)renderUsers((await r.json()).users);}catch{}}
function renderUsers(users){
  const tb=document.getElementById('users-tbody');
  if(!users.length){tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#6B7A90">Belum ada pengguna.</td></tr>';return;}
  tb.innerHTML=users.map(u=>`<tr><td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B7A90">${u.id}</td><td style="font-weight:600;color:#10243E;font-size:12.5px">${u.username}</td><td style="color:#3E5165;font-size:12.5px">${u.fullname}</td><td><span class="b ${RC[u.role]}">${RL[u.role]||u.role}</span></td><td style="font-size:12px;font-weight:600;color:${u.active?'#067647':'#6B7A90'}">${u.active?'Aktif':'Nonaktif'}</td><td style="text-align:center">${u.username!=='admin'?`<button onclick="deleteUser('${u.id}')" style="font-size:12px;font-weight:600;color:#D92D20;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px">Nonaktifkan</button>`:'<span style="color:#9AA8B9">—</span>'}</td></tr>`).join('');
}
async function addUser(e){
  e.preventDefault();
  const note=document.getElementById('add-user-note');
  const body={username:document.getElementById('nu-username').value.trim(),password:document.getElementById('nu-password').value,fullname:document.getElementById('nu-fullname').value.trim(),role:document.getElementById('nu-role').value};
  try{const r=await af('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();note.style.display='block';
  if(d.success){note.textContent='Berhasil: '+d.user.username;note.style.color='#067647';document.getElementById('add-user-form').reset();fetchUsers();}
  else{note.textContent=d.detail||'Gagal.';note.style.color='#D92D20';}}catch{note.style.display='block';note.textContent='Terjadi kesalahan.';note.style.color='#D92D20';}
}
async function deleteUser(id){if(!confirm('Nonaktifkan pengguna ini?'))return;try{const r=await af(`/api/admin/users/${id}`,{method:'DELETE'});if(r?.ok)fetchUsers();}catch{}}

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
window.addEventListener('DOMContentLoaded',()=>{
  if(authToken){af('/api/auth/me').then(r=>{if(r?.ok)r.json().then(d=>{currentUser=d;showCockpit();});}).catch(()=>{});}
  else{
    // Entrance kartu login (Motion; tanpa Motion tetap tampil normal)
    const lb=document.querySelector('.login-box');
    if(lb&&motionOK())window.Motion.animate(lb,{opacity:[0,1],transform:['translateY(14px) scale(0.985)','translateY(0px) scale(1)']},{duration:0.5,ease:'easeOut'});
  }
});
