# SIKEPO Remake — PRD for GPT Astra

> **Optimized generation brief.** Feed this file as the single source of truth.
> Goal: maximize output quality — every decision is pre-made or constrained so the model does not invent product intent.

---

## 0. Role & Operating Mode

You are a **senior product engineer + UI implementer** executing an existing prototype remake. You do **not** redesign the product domain. You **do** rewrite frontend presentation to the spec below.

**Hard rules**
1. Do not change fraud taxonomy, API contract, RBAC, or AI pipeline semantics.
2. Prefer editing existing files over new architecture.
3. No marketing fluff. Indonesian UI copy. English code comments only when non-obvious.
4. Every interactive surface must work without JS where practical; progressive enhancement for 3D/motion.
5. If a requirement conflicts with an existing file, **this PRD wins** for UI; **existing backend wins** for data/API.

**Working directory**
`D:/FamilyAgent/Nox/workspace/sikepo-app/`

---

## 1. Product Context (do not re-litigate)

**SiKePo** — Sistem Investigasi Kelayakan Klaim & Pola Overbilling.

BPJS Kesehatan claim pre-adjudication. Catch fraud **before funds disburse**.

| Item | Value |
|---|---|
| Tagline | Detect Smarter. Protect JKN. |
| Event | BPJS Kesehatan Healthkathon 2026 |
| Domain | Fraud types: `UPCODING`, `INFLATED_BILLS`, `PHANTOM_BILLING`, `CLONING`, `CLEAN` |
| Pipeline | A1 Triage (rules) → A2 Investigator (IsolationForest) → A3 Adjudicator (**Vercel AI Gateway** LLM, rules fallback) |
| Roles | SA Super Admin · VK Verifikator KC · ST Satgas Anti-Fraud · AU Auditor/Juri |
| Demo login | `admin` / `admin` |
| Local server | FastAPI, port **7721** (`python backend/main.py` or `run_sikepo.bat`) |
| Deploy target | Vercel (static frontend + API) + local Windows |

**Success north star**
- Landing: jury understands product in ≤30s.
- Cockpit: queue → inspect → verdict in ≤2 clicks.

---

## 2. Scope

### IN (this remake)
- Landing page rebuild with **interactive Three.js 3D hero**
- Landing section content/layout refresh (keep information architecture)
- Cockpit UI density + usability upgrade (technical but easy)
- Design token consistency, mobile, a11y baseline
- Fix known UI bugs listed in §9

### OUT (do not implement)
- Backend rewrite, auth hardening, DB migration
- Export CSV/PDF
- New fraud types or ML features
- Full framework migration (React/Next/Vite) — **vanilla JS + Tailwind CDN stay**
- i18n system (UI is Indonesian only)

---

## 3. Target Experience

### 3.1 Landing — “The Claim Stream”

**Feeling:** institutional trust + one memorable machine.

**Layout chrome:** light, professional (BPJS). **Only the 3D viewport is dark.**

**Hero stage (required)**
- Full-bleed dark viewport, height `min(85vh, 820px)` desktop; `70vh` mobile.
- Three.js scene:
  - Particle stream of “claims” flowing toward a central **Detection Core** (icosahedron wireframe + 2–3 orbit rings labeled conceptually as A1/A2/A3 via HTML HUD, not WebGL text).
  - Color encoding: green = CLEAN (pass through), amber = anomalous/HOLD (deflect), red = fraud/REJECT (captured orbit).
  - Mouse/pointer parallax (subtle, max ~4°).
  - Idle slow rotation; no nauseating camera moves.
- HTML overlays (real DOM, accessible):
  - Headline + sub + CTA “Buka Aplikasi” → `/app`
  - Live HUD chips from `GET /api/stats/overview`: total claims, anomali, dana dicegah (format compact IDR).
- Performance contract:
  - Particles: ≤12,000 desktop; ≤2,500 mobile (`matchMedia` width ≤767 or low `devicePixelRatio`)
  - `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`
  - Pause RAF when `document.hidden` or stage not intersecting viewport
  - `prefers-reduced-motion: reduce` → static/simple scene or CSS poster, **no continuous RAF**
  - Load three.js lazily after first paint; do not block FCP
  - Provide static poster image fallback if WebGL fails

**Sections after hero (keep order, tighten copy)**

| Order | Section | Requirement |
|---|---|---|
| 1 | Nav | Logo, subpage links, CTA `/app`. Mobile: hamburger for subpages |
| 2 | Hero 3D | as above |
| 3 | Problem | 1 strong stat + short paragraph (manual audit volume/risk) |
| 4 | Pipeline | A1 → A2 → A3 horizontal stepper; click expands one sentence each |
| 5 | Fraud types | 4 cards + risk-spectrum visual (CLEAN→REJECT bar); no emoji icons |
| 6 | Roles | SA/VK/ST/AU short cards; link to `/pages/roles.html` |
| 7 | Public stats teaser | Compact KPI strip (can reuse overview API) |
| 8 | Footer | Navy band, links, disclaimer data sintetis |

**Sub-pages** (`/pages/*.html`): keep content meaning; align nav/chrome/tokens with landing.

### 3.2 Cockpit — “Teknis tapi mudah”

**90% state:** Claim queue → open detail → verdict.

**Shell (keep pattern)**
- Desktop topbar: brand + tab nav (Dashboard, Klaim, Sandbox, Data, Users) + user badge
- Mobile: topbar logo + horizontal scroll tabs per view + bottom bar (user + logout)

**Tabs (behavioral requirements)**

#### Dashboard
- KPI: total, clean, anomali, dana dicegah, faskes aktif
- Charts: inflow bar, fraud doughnut, top faskes (Chart.js)
- **Destroy/recreate charts on tab switch** — no duplicate canvas bugs

#### Klaim (primary ops)
- Filters: status, fraud_type, faskes, risk min/max, text search (SEP/id/nama/ICD)
- Table columns (min): ID (mono), tgl, faskes, diagnosa, biaya, risk badge, fraud chip, status
- Risk badge ramp: `<30` green · `30–69` amber · `≥70` red; show number 0–100
- Row click → **Inspector** (desktop right drawer ~420px; mobile full sheet)
- Inspector contents:
  1. Header: claim ID, risk, fraud_type, status
  2. Pasien / diagnosa / LOS vs norm / biaya vs INA-CBG / selisih
  3. Obat list; highlight restricted drugs
  4. **Pipeline strip A1→A2→A3** with per-stage score/status if available
  5. Audit reasons: collapsed `<details>` (default closed if >3 items)
  6. Sticky action bar: **Approve** (green) · **Hold** (amber) · **Reject** (red)
- Verdict POST `/api/claims/{id}/verdict` with `X-Auth-Token`; toast success/error; refresh row

#### Sandbox
- Form: diagnosa, biaya, tarif INA-CBG, LOS, obat (textarea comma/newline)
- Run deterministic `/api/audit/single` and optional `/api/audit/agent`
- Show score + reasons + recommended status

#### Data
- Period switch daily/monthly/yearly → `/api/stats/timeline?period=`
- Chart + table; heatmap from `/api/heatmap` if present

#### Users (SA only)
- List/create/edit/deactivate via `/api/admin/users`
- Hide tab when permission missing (`applyPerms`)

**Keyboard (required)**
- When Klaim tab active: `j`/`k` next/prev row, `Enter` open, `Esc` close inspector
- Inspector open: `a` approve, `h` hold, `r` reject (with confirm if already decided)
- `/` focus search

**Density rules**
- Row height compact (~36–40px)
- JetBrains Mono for: claim IDs, ICD, IDR amounts, risk scores, dates optional
- Inter for labels/copy
- No giant empty padding cards

---

## 4. Design Tokens (implement exactly)

### Light chrome
```css
--bg: #F5F7FA;
--surface: #FFFFFF;
--line: #E4E9F1;
--line-soft: #EEF2F7;
--ink: #10243E;
--navy: #002C5F;
--body: #3E5165;
--muted: #6B7A90;
--green: #009B4C;
--green-dark: #007C3D;
--green-soft: #E7F6EE;
--cyan: #0284A8;
--cyan-soft: #E3F5FA;
--red: #D92D20;
--red-soft: #FDECEA;
--amber: #B54708;
--amber-soft: #FCF1E4;
--blue: #175CD3;
--blue-soft: #E9F0FB;
--radius-card: 12px;
--radius-btn: 10px;
--shadow-card: 0 1px 2px rgba(16,36,62,.05), 0 1px 3px rgba(16,36,62,.06);
```

### 3D stage only
```css
--stage-bg: #070B14;
--stage-grid: rgba(148,163,184,.06);
--stage-glow: #00ACC1;
```

### Type
- Font UI: `Inter` (Google Fonts)
- Font mono: `JetBrains Mono`
- Landing display: 40–56px / 700 / tracking -0.02em
- Body: 14–16px / 400 / line-height 1.55
- Cockpit label: 11–12px / 500 / uppercase optional muted

### Breakpoint
- Mobile: `max-width: 767px`
- No horizontal page scroll at 390px width

---

## 5. File Map (expected outputs)

```
frontend/
  index.html              # landing (rewrite hero + sections)
  app.html                # cockpit shell (rewrite styles/structure as needed)
  css/theme.css           # shared tokens/components for landing+pages
  js/
    three-hero.js         # NEW — Three.js claim stream (isolated module)
    landing.js            # landing interactions
    animations.js         # motion.dev progressive
    app.js                # cockpit logic
    pages.js              # subpage routing
    shared.js             # utils (formatIDR, auth helpers)
  pages/*.html            # align chrome
  img/                    # keep existing logo; poster optional NEW
```

**Rules**
- Import three.js from CDN (pinned version, e.g. `three@0.170.0`) via ES module or script tag — document choice in a 3-line header comment in `three-hero.js`.
- Cache-bust local assets: bump `?v=N` after edits.
- Do not add build step unless absolutely required; default is no bundler.

---

## 6. API Surface the UI May Call

Auth header: `X-Auth-Token: <token>` when required.

### LLM (A3 Adjudicator) — locked config

| Key | Value |
|---|---|
| Provider | `vercel` — Vercel AI Gateway (OpenAI-compatible) |
| Base URL | `https://ai-gateway.vercel.sh/v1` |
| Model | `inclusionai/ling-3.0-flash-sante-free` |
| Env key | `AI_GATEWAY_API_KEY` |
| HTTP | `POST {base}/chat/completions` · `Authorization: Bearer …` |
| Config file | `.env` (gitignored) loaded by `engine/ai_engine.py` |
| Timeout | 60s default (`SIKEPO_LLM_TIMEOUT`) |
| Fallback | deterministic rules if key missing / HTTP fail / JSON invalid |

**UI never calls the LLM.** Backend A3 only. Show `llm.model` / `llm.fallback` in agent trace if displayed. Do **not** reintroduce opencode/mimo.

| Method | Path | Auth | UI use |
|---|---|---|---|
| POST | `/api/auth/login` | — | login form |
| POST | `/api/auth/logout` | token | logout |
| GET | `/api/auth/me` | any sandbox+ | session restore |
| GET | `/api/stats/overview` | — | landing HUD + dashboard KPI |
| GET | `/api/claims` | role-scoped | queue |
| GET | `/api/claims/{id}` | role-scoped | inspector |
| POST | `/api/claims/{id}/verdict` | verdict | approve/hold/reject |
| POST | `/api/claims/{id}/agent` | ai_investigate | re-run agent on stored claim |
| POST | `/api/audit/single` | — | sandbox rules |
| POST | `/api/audit/agent` | — | sandbox agentic |
| GET | `/api/stats/timeline?period=` | — | Data tab |
| GET | `/api/heatmap` | — | anomaly heatmap |
| GET/POST/PUT/DELETE | `/api/admin/users` | manage_users | Users tab |

On 401: logout + redirect login. Never invent endpoints.

---

## 7. Claim Object (UI field mapping)

```json
{
  "id": "CLM-0001",
  "tgl_masuk": "2026-08-15",
  "status": "APPROVED | REJECTED | PENDING_AUDIT",
  "faskes": { "kode": "FKRTL-001", "nama": "…", "kota": "…" },
  "pasien": { "nama": "…", "usia": 45, "gender": "L" },
  "diagnosa": { "icd10": "J18.9", "nama": "…", "los_norm": 5 },
  "biaya_diajukan": 8500000,
  "tarif_ina_cbg": 5900000,
  "selisih_biaya": 2600000,
  "los": 8,
  "obat": ["Azithromycin", "Meropenem Inj 1g"],
  "fraud_type": "UPCODING | INFLATED_BILLS | PHANTOM_BILLING | CLONING | CLEAN",
  "risk_score": 72,
  "audit_reasons": ["…"],
  "verdict_history": []
}
```

Restricted drug names (highlight): meropenem, albumin, trastuzumab, imunoglobulin, vecuronium (case-insensitive contains).

IDR compact format: `jt` for juta, `M` for miliar (Indonesian business reading).

---

## 8. Acceptance Criteria (ship checklist)

### Landing
- [ ] Hero shows 3D stream on WebGL devices; poster/static fallback otherwise
- [ ] HUD numbers match `/api/stats/overview` (idempotent count-up; never stuck at Rp 0 after fetch)
- [ ] Reduced motion disables continuous animation
- [ ] Mobile hamburger opens subpage links
- [ ] CTA opens `/app`
- [ ] No layout shift from late 3D load

### Cockpit
- [ ] Login stores token; requests include header; 401 logs out
- [ ] Tabs switch without chart duplication or leaked intervals
- [ ] Klaim filters compose; search debounced ~250ms
- [ ] Risk badge colors match ramp
- [ ] Inspector opens on row click; actions visible per role permission
- [ ] Verdict updates UI state + toast
- [ ] Keyboard shortcuts work and do not fire in inputs
- [ ] Users tab only for `manage_users`
- [ ] 390px: no horizontal scroll; tabs usable

### Quality
- [ ] Lighthouse perf on landing not worse than baseline by >10 points after 3D
- [ ] Console clean of errors on happy path
- [ ] `prefers-reduced-motion` respected
- [ ] Existing API tests/smoke (`curl` login, stats, claims) still pass

---

## 9. Known Bugs to Fix While Remaking

1. Landing “Dana dicegah” counter races before fetch completes
2. Chart.js re-init duplicates on tab switch
3. Mobile landing nav lacks hamburger (subpages hidden)
4. Long `audit_reasons` overflow — collapse
5. Cache: bump `?v=` on JS/CSS changes

---

## 10. Anti-Patterns (reject in your own output)

- Full-page dark neon theme
- Purple/blue/cyan mesh gradient hero without 3D meaning
- 6 identical icon+emoji feature cards
- WebGL-only text (content must be DOM)
- Blocking first paint on three.js
- Continuous animation under `prefers-reduced-motion`
- Verdict behind multi-step modal maze
- Empty marketing copy (“unlock potential”, “seamless synergy”)
- Changing backend data files as a UI shortcut
- Introducing React/Vue/Next “because cleaner”

---

## 11. Generation Protocol (for GPT Astra)

Execute in this order. Do not skip ahead without artifacts.

### Step A — Read
1. Read this PRD fully.
2. Read `README.md`, `SIKEPO_LUNA.md`, `DESIGN.md` (if present).
3. Read current `frontend/index.html`, `app.html`, `js/app.js`, `css/theme.css`.
4. Skim `backend/main.py` endpoints only (no logic changes).

### Step B — Plan output (in chat, short)
List files you will create/modify and why (bullet, ≤15 lines).

### Step C — Implement landing
1. Create `js/three-hero.js` complete and self-contained.
2. Rewrite hero + nav in `index.html`.
3. Wire HUD fetch + count-up.
4. Mobile + reduced-motion paths.

### Step D — Implement cockpit
1. Update styles for density/inspector.
2. Update `app.js`: filters, inspector, shortcuts, chart lifecycle, permissions.
3. Verify verdict flow against API field names (do not invent).

### Step E — Verify
1. Start server if possible; smoke login + stats + one verdict path (or static review if no runtime).
2. Grep for leftover TODOs/broken asset paths.
3. Bump cache-bust versions.
4. Report acceptance checklist status honestly (pass/fail/partial).

### Step F — Report
Return:
- Files changed
- How to run
- What passed / what is partial
- Any blocker (do not silently stub)

---

## 12. Prompt Skeleton (paste after this PRD)

```
You are executing SIKEPO Remake PRD in D:/FamilyAgent/Nox/workspace/sikepo-app.
Follow §11 Generation Protocol exactly.
Language of UI: Indonesian. Code identifiers: English.
Do not change backend semantics. Implement landing Three.js claim stream + cockpit density/inspector/shortcuts.
When done, return §12-F report only after implementing (not a plan-only turn unless blocked).
```

---

## 13. Open Questions (default answers — only override if user contradicts)

| Question | Default |
|---|---|
| Dark full landing? | **No** — stage only |
| Bundle three via npm? | **No** — CDN module |
| English UI? | **No** — Indonesian |
| Add new tabs? | **No** |
| Redesign logo? | **No** — keep assets |

---

*PRD crafted for GPT Astra maximal constraint-satisfaction — Ily / Nox, 2026-09-11*
