/* ═══════════════════════════════════════════════════════════
   SiKePo app.js — Mobile-first Cockpit
   ═══════════════════════════════════════════════════════════ */

let activeTab = 'dashboard', selectedClaim = null, claimsData = [], debounceTimer = null, chartsReady = false;
let authToken = localStorage.getItem('sikepo_token') || null, currentUser = null;

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
    else { err.textContent = d.detail || 'Salah.'; err.style.display = 'block'; document.getElementById('login-pass').value = ''; document.getElementById('login-pass').focus(); }
  } catch { err.textContent = 'Server off.'; err.style.display = 'block'; }
}

function showCockpit() {
  document.getElementById('app-gate').style.display = 'none';
  ['tab-dashboard','tab-claims','tab-sandbox','tab-users'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
  document.getElementById('tab-dashboard').classList.remove('hidden');
  document.getElementById('tab-dashboard').classList.add('fade-in');
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
  const s = (id, pm) => { const el = document.getElementById(id); if (el) el.style.display = p.includes(pm) ? '' : 'none'; };
  s('nav-users', 'manage_users');
  s('mt-users', 'manage_users');
  s('inspector-actions', 'verdict');
}

/* ── Tabs ────────────────────────────────────────────────── */
function switchTab(tab) {
  activeTab = tab;
  ['dashboard','claims','sandbox','users'].forEach(id => {
    const el = document.getElementById('tab-' + id);
    if (el) { el.classList.add('hidden'); el.classList.remove('fade-in'); }
  });
  const active = document.getElementById('tab-' + tab);
  if (active) { active.classList.remove('hidden'); active.classList.add('fade-in'); }
  // Desktop nav
  document.querySelectorAll('.topbar-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  // Mobile tabs
  document.querySelectorAll('.mt').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'dashboard') { fetchStats(); initCharts(); }
  if (tab === 'claims') fetchClaims();
  if (tab === 'data') loadTimeline('daily');
}

/* ── Charts ──────────────────────────────────────────────── */
let cI, cF, cFs, cR;
const CC = { a: '#10B981', r: '#EF4444', y: '#F59E0B', g: '#6B7280' };

function initCharts() {
  if (chartsReady) return;
  chartsReady = true;
  Chart.defaults.color = '#9CA3AF';
  Chart.defaults.borderColor = '#374151';
  Chart.defaults.font.family = "'Inter',sans-serif";
  Chart.defaults.font.size = 11;

  cI = new Chart(document.getElementById('chart-inflow'), {
    type: 'bar', data: { labels: ['Approved','Rejected','Pending','Hold'], datasets: [{ data: [0,0,0,0], backgroundColor: [CC.a+'BB',CC.r+'BB',CC.y+'BB',CC.g+'BB'], borderRadius: 3, barPercentage: .5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#1F2937' }, beginAtZero: true } } }
  });
  cF = new Chart(document.getElementById('chart-fraud'), {
    type: 'doughnut', data: { labels: ['Upcoding','Phantom','Overpreskripsi','Cloning','Clean'], datasets: [{ data: [0,0,0,0,0], backgroundColor: ['#F59E0BBB','#F97316BB','#FB7185BB','#EF4444BB','#10B981BB'], borderColor: '#1F2937', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 6, font: { size: 10 } } } } }
  });
  cFs = new Chart(document.getElementById('chart-faskes'), {
    type: 'bar', data: { labels: [], datasets: [{ data: [], backgroundColor: '#3B82F6BB', borderRadius: 3, barPercentage: .6 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#1F2937' }, beginAtZero: true, max: 100 }, y: { grid: { display: false } } } }
  });
  cR = new Chart(document.getElementById('chart-risk'), {
    type: 'bar', data: { labels: ['0-20','21-40','41-60','61-80','81-100'], datasets: [{ data: [0,0,0,0,0], backgroundColor: ['#10B98199','#3B82F699','#F59E0B99','#F9731699','#EF444499'], borderRadius: 3, barPercentage: .7 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#1F2937' }, beginAtZero: true } } }
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
    if(cFs){const t=Object.entries(fm).sort((a,b)=>(b[1].s/b[1].n)-(a[1].s/a[1].n)).slice(0,6);cFs.data.labels=t.map(([k])=>k.length>16?k.slice(0,14)+'..':k);cFs.data.datasets[0].data=t.map(([,v])=>Math.round(v.s/v.n));cFs.update();}
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
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#6B7280">Tidak ada data</td></tr>';
    } else {
      tbody.innerHTML = items.map(i => `<tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#fff">${i.period}</td>
        <td style="text-align:right;color:#D1D5DB">${i.total}</td>
        <td style="text-align:right;color:#F87171">${i.fraud}</td>
        <td style="text-align:right;color:#34D399">${i.clean}</td>
        <td style="text-align:right;font-family:'JetBrains Mono',monospace;color:#10B981;font-size:11px">${formatCompactIDR(i.savings)}</td>
        <td style="text-align:right;font-family:'JetBrains Mono',monospace;color:#D1D5DB">${i.avg_risk}</td>
      </tr>`).join('');
    }

    // Chart
    if (cTimeline) cTimeline.destroy();
    cTimeline = new Chart(document.getElementById('chart-timeline'), {
      type: 'bar',
      data: {
        labels: items.map(i => i.period),
        datasets: [
          { label: 'Total', data: items.map(i => i.total), backgroundColor: '#3B82F699', borderColor: '#3B82F6', borderWidth: 1, borderRadius: 3, barPercentage: .5 },
          { label: 'Fraud', data: items.map(i => i.fraud), backgroundColor: '#EF444499', borderColor: '#EF4444', borderWidth: 1, borderRadius: 3, barPercentage: .5 },
          { label: 'Clean', data: items.map(i => i.clean), backgroundColor: '#10B98199', borderColor: '#10B981', borderWidth: 1, borderRadius: 3, barPercentage: .5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 10, padding: 8, font: { size: 11 } } } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } }, y: { grid: { color: '#1F2937' }, beginAtZero: true } }
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
  catch { document.getElementById('claims-tbody').innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#6B7280">Gagal</td></tr>'; }
}
function debounceSearch(){clearTimeout(debounceTimer);debounceTimer=setTimeout(fetchClaims,250);}

function renderTable(claims) {
  const tb = document.getElementById('claims-tbody');
  if(!claims.length){tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#6B7280">Kosong</td></tr>';return;}
  const sb=s=>({APPROVED:'b-g',REJECTED:'b-r',PENDING_AUDIT:'b-y',HOLD:'b-x'}[s]||'b-x');
  const rc=r=>r>75?'color:#F87171':r>35?'color:#FBBF24':'color:#34D399';
  tb.innerHTML=claims.map(c=>`<tr class="${selectedClaim?.id===c.id?'sel':''}" style="cursor:pointer" onclick="selectClaim('${c.id}')">
    <td><div style="font-weight:500;color:#fff;font-size:11px">${c.id}</div><div style="font-size:10px;color:#6B7280">${c.faskes.nama}</div></td>
    <td style="color:#9CA3AF;font-size:11px">${c.faskes.nama}</td>
    <td><span style="color:#D1D5DB;font-size:11px">${c.diagnosa.icd10}</span> <span style="color:#6B7280;font-size:10px">${c.diagnosa.nama}</span></td>
    <td style="text-align:right;font-family:'JetBrains Mono',monospace;color:#D1D5DB;font-size:11px">${formatCompactIDR(c.biaya_diajukan)}</td>
    <td style="text-align:center"><span style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:12px;${rc(c.risk_score)}">${c.risk_score}</span></td>
    <td style="text-align:center"><span class="b ${sb(c.status)}">${c.status.replace('_',' ')}</span></td></tr>`).join('');
}

function selectClaim(id){selectedClaim=claimsData.find(c=>c.id===id);renderTable(claimsData);renderInspector();}

/* ── Inspector ───────────────────────────────────────────── */
function renderInspector() {
  if(!selectedClaim) return;
  const c=selectedClaim, badge=document.getElementById('insp-risk-badge');
  const rc=c.risk_score>75?'b-r':c.risk_score>35?'b-y':'b-g';
  badge.textContent=`RISK ${c.risk_score}`; badge.className=`b ${rc}`;
  const f=c.fraud_type!=='CLEAN';
  document.getElementById('inspector-content').innerHTML=`
    <div class="res-card"><div class="res-row"><span class="res-lbl">SEP</span><span class="res-val font-mono">${c.id}</span></div><div class="res-row"><span class="res-lbl">RS</span><span class="res-val">${c.faskes.nama}</span></div><div class="res-row"><span class="res-lbl">Pasien</span><span class="res-val">${c.pasien.nama} (${c.pasien.gender}, ${c.pasien.usia}th)</span></div><div class="res-row"><span class="res-lbl">Rawat</span><span class="res-val font-mono">${c.tgl_masuk} s.d ${c.tgl_keluar} (${c.los}h)</span></div></div>
    <div class="res-card" style="display:grid;grid-template-columns:1fr 1fr;gap:4px"><div><div style="font-size:10px;color:#6B7280">TARIF CBG</div><div style="font-family:'JetBrains Mono',monospace;color:#D1D5DB;font-size:12px">${formatIDR(c.tarif_ina_cbg)}</div></div><div><div style="font-size:10px;color:#6B7280">BIAYA RS</div><div style="font-family:'JetBrains Mono',monospace;font-size:12px;${c.selisih_biaya>0?'color:#F87171':'color:#D1D5DB'}">${formatIDR(c.biaya_diajukan)}</div></div></div>
    <div class="res-card" style="border-color:${f?'rgba(239,68,68,.2)':'rgba(16,185,129,.2)'};background:${f?'rgba(239,68,68,.04)':'rgba(16,185,129,.04)'}"><div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;color:${f?'#F87171':'#34D399'}">Temuan</div><ul style="font-size:11px;color:#D1D5DB">${c.audit_reasons.map(r=>`<li style="margin-bottom:2px"><span style="color:${f?'#EF4444':'#10B981'}">-</span> ${r}</li>`).join('')}</ul><div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);font-size:10px;font-weight:600;color:${f?'#FCA5A5':'#6EE7B7'}">${c.rekomendasi}</div></div>
    <div style="margin-bottom:6px"><div style="font-size:10px;color:#6B7280;font-weight:500;margin-bottom:3px">Obat</div><div style="display:flex;flex-wrap:wrap;gap:4px">${c.obat.map(o=>`<span style="padding:2px 6px;background:#111827;color:#9CA3AF;border:1px solid #374151;border-radius:3px;font-size:10px">${o}</span>`).join('')}</div></div>
    <button onclick="runAgentOnClaim('${c.id}')" id="btn-agent-run" class="btn btn-s" style="width:100%;justify-content:center;font-size:11px">⚡ Jalankan Investigasi AI</button>
    <div id="insp-ai-result"></div>`;
}

/* ── Agent ───────────────────────────────────────────────── */
const AC={A1:'color:#34D399',A2:'color:#FBBF24',A3:'color:#F87171'};
function agentTraceHtml(trace){
  if(!Array.isArray(trace))return'';
  return trace.map(t=>{
    const m=t.ml?`ML ${t.ml.anomaly_score}`:Array.isArray(t.flags)?`${t.flags.length} Flag`:t.llm?(t.llm.fallback?'Fallback':'LLM'):'';
    const items=(t.flags||t.evidence||[]).map(x=>`<li style="font-size:11px;color:#9CA3AF;margin-bottom:1px">- ${x}</li>`).join('');
    const al=t.agent==='A3'&&t.alasan?`<p style="font-size:11px;color:#D1D5DB;margin-top:6px;padding-top:6px;border-top:1px solid #374151">${t.alasan}</p>`:'';
    return`<div class="res-card" style="display:flex;gap:8px"><span style="font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;${AC[t.agent]||'color:#6B7280'};margin-top:1px">${t.agent}</span><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:12px;font-weight:600;color:#fff">${t.name}</span><span style="font-size:10px;color:#6B7280;font-family:'JetBrains Mono',monospace">${t.latency_ms}ms ${m}</span></div><ul style="margin:0;padding:0;list-style:none">${items}</ul>${al}</div></div>`;
  }).join('');
}

function agentResultHtml(r){
  const v=r.verdict||'HOLD';
  const vm={APPROVE:['b-g','SETUJUI'],HOLD:['b-y','TAHAN'],REJECT:['b-r','TOLAK']}[v]||['b-x',v];
  return`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span class="b ${vm[0]}">${vm[1]}</span><span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:#D1D5DB">RISK ${r.risk_score} · ${r.fraud_type}</span></div>
  ${r.alasan_ai?`<div class="res-card" style="border-color:rgba(59,130,246,.2);background:rgba(59,130,246,.04)"><div style="font-size:10px;font-weight:600;color:#60A5FA;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Alasan AI</div><p style="font-size:11px;color:#D1D5DB">${r.alasan_ai}</p></div>`:''}
  <div style="display:flex;flex-direction:column;gap:6px">${agentTraceHtml(r.agent_trace)}</div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid #374151"><span style="font-size:10px;color:#6B7280">Overbilling dicegah</span><span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:#F87171;font-size:12px">${formatIDR(r.selisih_biaya_idr||0)}</span></div>
  <div class="res-card" style="border-color:rgba(16,185,129,.2);background:rgba(16,185,129,.06);margin-top:6px"><span style="font-size:10px;font-weight:600;color:#34D399;font-family:'JetBrains Mono',monospace">REK: ${r.rekomendasi||'-'}</span></div>`;
}

async function runAgentOnClaim(id){
  const box=document.getElementById('insp-ai-result'),btn=document.getElementById('btn-agent-run');
  if(!box)return;
  if(btn){btn.disabled=true;btn.textContent='Pipeline berjalan...';}
  box.innerHTML='<div style="font-size:11px;color:#60A5FA;text-align:center;padding:16px">Menjalankan A1-A2-A3...</div>';
  try{const r=await af(`/api/claims/${id}/agent`,{method:'POST'});box.innerHTML=agentResultHtml(await r.json());}
  catch{box.innerHTML='<div style="font-size:11px;color:#F87171;text-align:center;padding:16px">Gagal</div>';}
  if(btn){btn.disabled=false;btn.textContent='⚡ Jalankan Investigasi AI';}
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
    const badge=document.getElementById('sb-res-badge');badge.textContent=`RISK ${res.risk_score}`;badge.className=`b ${res.risk_score>70?'b-r':res.risk_score>35?'b-y':'b-g'}`;
  }catch{document.getElementById('sandbox-result').textContent='Gagal';}
}

/* ── Verdict ─────────────────────────────────────────────── */
async function submitVerdict(action){
  if(!selectedClaim||!currentUser?.permissions?.includes('verdict')){alert('Tidak ada hak.');return;}
  try{const r=await af(`/api/claims/${selectedClaim.id}/verdict`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
  if(r?.ok){selectedClaim.status=action==='APPROVE'?'APPROVED':action==='REJECT'?'REJECTED':'PENDING_AUDIT';renderTable(claimsData);renderInspector();fetchStats();}}catch{alert('Gagal.');}
}

/* ── Users ───────────────────────────────────────────────── */
const RL={SA:'Super Admin',VK:'Verifikator',ST:'Satgas AF',AU:'Auditor'},RC={SA:'b-r',VK:'b-g',ST:'b-y',AU:'b-b'};
async function fetchUsers(){try{const r=await af('/api/admin/users');if(r)renderUsers((await r.json()).users);}catch{}}
function renderUsers(users){
  const tb=document.getElementById('users-tbody');
  if(!users.length){tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#6B7280">Kosong</td></tr>';return;}
  tb.innerHTML=users.map(u=>`<tr><td style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B7280">${u.id}</td><td style="font-weight:500;color:#fff;font-size:12px">${u.username}</td><td style="color:#D1D5DB;font-size:12px">${u.fullname}</td><td><span class="b ${RC[u.role]}">${RL[u.role]||u.role}</span></td><td style="font-size:11px;color:${u.active?'#34D399':'#6B7280'}">${u.active?'Aktif':'Off'}</td><td style="text-align:center">${u.username!=='admin'?`<button onclick="deleteUser('${u.id}')" style="font-size:11px;color:#F87171;background:none;border:none;cursor:pointer">Nonaktifkan</button>`:'-'}</td></tr>`).join('');
}
async function addUser(e){
  e.preventDefault();
  const note=document.getElementById('add-user-note');
  const body={username:document.getElementById('nu-username').value.trim(),password:document.getElementById('nu-password').value,fullname:document.getElementById('nu-fullname').value.trim(),role:document.getElementById('nu-role').value};
  try{const r=await af('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();note.style.display='block';
  if(d.success){note.textContent='OK: '+d.user.username;note.style.color='#34D399';document.getElementById('add-user-form').reset();fetchUsers();}
  else{note.textContent=d.detail||'Gagal';note.style.color='#F87171';}}catch{note.style.display='block';note.textContent='Error';note.style.color='#F87171';}
}
async function deleteUser(id){if(!confirm('Nonaktifkan?'))return;try{const r=await af(`/api/admin/users/${id}`,{method:'DELETE'});if(r?.ok)fetchUsers();}catch{}}

/* ── Init ────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded',()=>{
  if(authToken){af('/api/auth/me').then(r=>{if(r?.ok)r.json().then(d=>{currentUser=d;showCockpit();});}).catch(()=>{});}
});
