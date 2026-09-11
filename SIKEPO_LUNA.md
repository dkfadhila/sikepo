# SiKePo — Handover Documentation untuk Luna

> **Sistem Investigasi Kelayakan Klaim & Pola Overbilling**
> AI-powered pre-adjudication audit untuk klaim BPJS Kesehatan.
> Healthkathon 2026 Innovation Project.

---

## 1. Project Overview

SiKePo adalah aplikasi web audit klaim BPJS kesehatan yang mendeteksi fraud (Upcoding, Phantom Billing, Inflated Bills, Cloning) sebelum dana cair. Menggabungkan deterministic rules, ML (IsolationForest), dan LLM (Vercel AI Gateway: `inclusionai/ling-3.0-flash-sante-free`) dalam pipeline agentic 3 tahap.

**Tagline:** *Detect Smarter. Protect JKN.*

---

## 2. How to Run

```bash
cd D:/FamilyAgent/Nox/workspace/sikepo-app
# Cara cepat:
run_sikepo.bat

# Manual:
cd backend
python main.py    # uvicorn di 0.0.0.0:7721
```

Buka `http://127.0.0.1:7721/`

**Dependencies:**
- Python 3.12
- FastAPI + uvicorn
- scikit-learn (IsolationForest)
- joblib
- Network access ke `ai-gateway.vercel.sh` (LLM adjudicator)

---

## 3. File Structure

```
sikepo-app/
├── backend/
│   └── main.py              # FastAPI server, semua API endpoints
├── engine/
│   ├── ai_engine.py          # Agentic pipeline: Triage → Investigator → Adjudicator
│   ├── auth.py               # RBAC auth system, session management
│   └── model_store/
│       ├── isolation_forest.joblib   # Trained ML model
│       └── model_meta.json          # Model metadata (threshold, precision, dll)
├── data/
│   ├── claims_dataset.json   # 150 klaim sintetis (source of truth)
│   └── users.json            # User accounts
├── frontend/
│   ├── index.html            # Landing page (hero, bento, spectrum, roles)
│   ├── app.html              # Cockpit dashboard (SPA)
│   ├── css/theme.css         # Design system: animasi, komponen
│   ├── js/
│   │   ├── app.js            # Cockpit logic: tabs, charts, tables, auth + Motion transitions
│   │   ├── landing.js        # Landing page interactions
│   │   ├── shared.js         # Shared utilities
│   │   ├── animations.js     # Motion (motion.dev): hero entrance, reveal-on-scroll (landing+pages)
│   │   └── pages.js          # Landing sub-page routing
│   ├── pages/
│   │   ├── overview.html     # Product overview
│   │   ├── how-it-works.html # Pipeline explanation
│   │   ├── detection-engine.html  # Tech details
│   │   ├── roles.html        # Role descriptions
│   │   └── public-data.html  # Public statistics
│   ├── img/
│   │   ├── sikepo-logo.png   # Logo utama (682×553, transparan)
│   │   ├── sikepo-logo.svg   # Logo vektor
│   │   └── hero-character.png
│   ├── favicon.ico           # Multi-size favicon
│   ├── favicon-16.png
│   ├── favicon-32.png
│   ├── favicon-48.png
│   └── apple-touch-icon.png
├── scripts/
│   └── generate_data.py      # Regenerate claims_dataset.json
├── run_sikepo.bat            # Windows launcher
└── README.md                 # Original readme
```

---

## 4. Backend API (`backend/main.py`)

### Auth Endpoints
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/login` | POST | No | Login, returns token |
| `/api/auth/logout` | POST | X-Auth-Token | Destroy session |
| `/api/auth/me` | GET | sandbox | Current user info + permissions |
| `/api/auth/roles` | GET | No | Role definitions |

### Claims Endpoints
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/stats/overview` | GET | No | KPI: total, fraud, clean, savings |
| `/api/claims` | GET | No | List claims (filter: status, fraud_type, search, limit) |
| `/api/claims/{id}` | GET | No | Detail satu klaim |
| `/api/claims/{id}/verdict` | POST | verdict | Approve/Hold/Reject (tulis ke dataset) |
| `/api/claims/{id}/agent` | POST | ai_investigate | Jalankan agentic audit pada klaim tersimpan |

### AI/ML Endpoints
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/audit/single` | POST | No | Deterministic rules audit (Sandbox) |
| `/api/audit/agent` | POST | No | Full agentic pipeline audit |
| `/api/ml/train` | POST | ml_train | Retrain IsolationForest dari dataset |
| `/api/ml/status` | GET | No | Model metadata + pipeline info |

### Analytics
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/stats/overview` | GET | No | Dashboard KPI |
| `/api/stats/timeline` | GET | No | Agregasi harian/bulanan/tahunan (`?period=daily|monthly|yearly`) |
| `/api/heatmap` | GET | No | Persebaran anomali per faskes |

### User Management (SA only)
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/admin/users` | GET | manage_users | List semua user |
| `/api/admin/users` | POST | manage_users | Buat user baru |
| `/api/admin/users/{id}` | PUT | manage_users | Update user |
| `/api/admin/users/{id}` | DELETE | manage_users | Soft-delete user |

### Static File Serving
- `/` → `index.html` (landing page)
- `/app` → `app.html` (cockpit dashboard)
- `/pages/{name}` → `pages/*.html`
- `/static/*` → semua file di `frontend/`

---

## 5. Auth & RBAC (`engine/auth.py`)

### 4 Roles
| Code | Name | Permissions |
|---|---|---|
| `SA` | Super Admin | view_all_claims, verdict, ai_investigate, ml_train, sandbox, manage_users |
| `VK` | Verifikator KC | view_cabang_claims, verdict, ai_investigate, ml_train, sandbox |
| `ST` | Satgas Anti-Fraud | view_all_claims, ai_investigate, ml_train, sandbox |
| `AU` | Auditor/Dewan Juri | view_all_claims, sandbox |

### Default Users
| Username | Password | Role | Active |
|---|---|---|---|
| `admin` | `admin` | SA | ✅ |

### Session Management
- Token: `secrets.token_hex(32)` (64 char hex)
- Header: `X-Auth-Token`
- Expiry: 24 jam (in-memory store)
- Password: plaintext di JSON (demo/prototype, bukan production)

### Frontend Auth Flow
```javascript
// Login
POST /api/auth/login { username, password }
→ { token, user_id, role, permissions, ... }

// Authenticated requests
fetch(url, { headers: { 'X-Auth-Token': token } })

// Auto-logout on 401
if (r.status === 401) { logoutUser(); }
```

---

## 6. AI Engine (`engine/ai_engine.py`)

### Pipeline: A1 → A2 → A3

```
Input Claim
    ↓
[A1] Triage Agent (deterministic rules)
    - Ratio tarif vs INA-CBGs
    - Length of Stay anomalies
    - Restricted drug detection (e-Fornas)
    ↓ preliminary_risk (0-99)
[A2] Investigator Agent (ML IsolationForest)
    - 7 fitur: ratio_cbg, selisih_ratio, los_delta, los_ratio, n_restricted, n_drugs, usia
    - Anomaly score + evidence collection
    - Fused risk: 0.45 × triage + 0.55 × ML
    ↓ fused_risk + evidence
[A3] Adjudicator Agent (LLM: opencode/mimo-v2.5-free)
    - Prompt dengan findings
    - Output: { status: APPROVE|HOLD|REJECT, alasan, rekomendasi }
    - Fallback ke rules jika LLM gagal
    ↓
Final Verdict
```

### Feature Extraction (7 fitur ML)
1. `ratio_cbg` — biaya_diajukan / tarif_ina_cbg
2. `selisih_ratio` — selisih_biaya / biaya_diajukan
3. `los_delta` — los - los_norm
4. `los_ratio` — los / los_norm
5. `n_restricted` — jumlah obat restriksi (meropenem, albumin, trastuzumab, imunoglobulin, vecuronium)
6. `n_drugs` — total item farmasi
7. `usia` — usia pasien

### ML Model
- Algorithm: IsolationForest (n_estimators=200, contamination=0.32)
- Training: auto-train saat startup jika belum ada model
- Threshold: di-kalibrasi via F1 sweep (threshold 20-80)
- Persist: `engine/model_store/isolation_forest.joblib`
- Meta: `engine/model_store/model_meta.json`

### LLM Integration (Vercel AI Gateway)
- Model: `inclusionai/ling-3.0-flash-sante-free`
- Base URL: `https://ai-gateway.vercel.sh/v1` (OpenAI-compatible `/chat/completions`)
- Auth: `Authorization: Bearer $AI_GATEWAY_API_KEY`
- Config: `.env` (gitignored) — `AI_GATEWAY_API_KEY`, `SIKEPO_LLM_MODEL`, `SIKEPO_LLM_BASE_URL`, `SIKEPO_LLM_TIMEOUT`
- Loader: `engine/ai_engine.py` (`_load_dotenv` + `_call_llm`)
- Timeout: 60 detik (default)
- Fallback: deterministic rules jika key kosong / HTTP error / JSON tidak valid

---

## 7. Data Model

### Claim Object (`data/claims_dataset.json`)
```json
{
  "id": "CLM-0001",
  "tgl_masuk": "2026-08-15",
  "status": "APPROVED|REJECTED|PENDING_AUDIT",
  "faskes": {
    "kode": "FKRTL-001",
    "nama": "RSUP Dr. Sardjito",
    "kota": "Yogyakarta"
  },
  "pasien": {
    "nama": "Budi Santoso",
    "usia": 45,
    "gender": "L"
  },
  "diagnosa": {
    "icd10": "J18.9",
    "nama": "Pneumonia Akut",
    "los_norm": 5
  },
  "biaya_diajukan": 8500000,
  "tarif_ina_cbg": 5900000,
  "selisih_biaya": 2600000,
  "los": 8,
  "obat": ["Azithromycin", "Ambroxol", "Meropenem Inj 1g"],
  "fraud_type": "UPCODING|INFLATED_BILLS|PHANTOM_BILLING|CLONING|CLEAN",
  "risk_score": 72,
  "audit_reasons": ["..."],
  "verdict_history": []
}
```

### User Object (`data/users.json`)
```json
{
  "id": "USR-001",
  "username": "admin",
  "password": "admin",
  "fullname": "Administrator",
  "role": "SA|VK|ST|AU",
  "faskes_scope": null,
  "created_at": "2026-09-07",
  "active": true
}
```

---

## 8. Frontend Architecture

### Two HTML Entry Points
1. **`index.html`** — Landing page (public)
2. **`app.html`** — Cockpit dashboard (needs login)

### Landing Page Sections (`index.html`)
- Hero: dua kolom, logo + headline + CTA
- Bento grid: 4 KPI cards (count-up animation)
- Spectrum: CLEAN → REVIEW → UPCODING → PHANTOM → CLONING
- Fraud cards: 4 kartu jenis fraud
- Roles: 4 role cards
- Footer
- Sub-pages: `/pages/overview.html`, `/pages/how-it-works.html`, dll

### Cockpit Dashboard (`app.html`)
5 tabs utama:

1. **Dashboard** — 4 KPI cards, 3 charts (inflow bar, fraud doughnut, faskes bar), claims table
2. **Klaim** — Tabel klaim + inspector panel (detail + verdict buttons)
3. **Sandbox** — Form simulasi audit (manual + agentic)
4. **Data** — Timeline view (harian/bulanan/tahunan) dengan chart + table
5. **Users** — Manajemen user (SA only)

### Design System (UI v2 — Light, 2026-09-07)
- **Theme:** LIGHT, profesional & ramah pengguna (rework total dari dark "command center")
- **Framework:** Tailwind CSS (CDN) + custom CSS, **bahasa desain shadcn/ui** (tabs segmented, badge kotak ber-border, tombol solid rounded, kartu border halus) — diamplikasikan native di CSS karena shadcn/ui asli itu komponen React (app ini vanilla JS tanpa build step)
- **Motion (motion.dev):** CDN `motion@11/dist/motion.js` — hero entrance, reveal-on-scroll (landing/pages via `animations.js`), transisi antar-tab & stagger KPI (app via `app.js`). Semua **progressive enhancement**: CDN gagal / `prefers-reduced-motion` → halaman tetap normal tanpa animasi
- **Cache busting:** referensi lokal pakai query `?v=N` (mis. `app.js?v=5`) — NAIKKAN versi setelah mengubah file JS/CSS agar browser user tidak pakai cache lama
- **Fonts:** Inter (semua UI) + JetBrains Mono (hanya angka/ID tabular)
- **Color palette (light):**
  - Page bg: `#F5F7FA` · Surface: `#FFFFFF` · Border: `#E4E9F1`
  - Ink/headings: `#10243E` · Navy brand: `#002C5F` · Body: `#3E5165` · Muted: `#6B7A90`
  - Brand green: `#009B4C` (primary buttons, hover `#007C3D`, soft `#E7F6EE`)
  - Cyan: `#0284A8` · Red: `#D92D20` · Amber: `#B54708` · Blue: `#175CD3`
- **Karakter:** tanpa efek gimmick berlebihan; hero landing memakai **ilustrasi mesin (`hero-character.png`) dalam panel gelap rounded** + floating data cards & scan-beam di dalam panel (favorit Luna — jangan dihapus!), band statistik navy, footer navy
- **Design tokens CSS:** `frontend/css/theme.css` (landing + pages); cockpit punya style sendiri di `<style>` app.html

### Mobile Responsiveness
- **Desktop (>767px):** topbar putih: brand + tab nav + user badge
- **Mobile (<768px):**
  - Topbar: logo saja (tab tersembunyi)
  - **Setiap tab** punya baris tab pills horizontal-scrollable di atas (dulu hanya dashboard — sudah diperbaiki)
  - Bottom bar: logo + user badge + Keluar
- Breakpoint: `767px`

---

## 9. Known Issues & TODOs

### Sudah Dikerjakan ✅
- [x] Landing page responsif
- [x] Cockpit dashboard dengan 5 tabs
- [x] Auth system (4 roles)
- [x] Deterministic rules audit
- [x] Agentic pipeline (A1→A2→A3)
- [x] ML IsolationForest auto-train
- [x] LLM adjudicator via opencode
- [x] Mobile-first responsive
- [x] Logo + favicon baru
- [x] Timeline data view (harian/bulanan/tahunan)
- [x] User management (SA only)

### Belum Dikerjakan / Perlu Diperbaiki 🔧
- [ ] **Nav mobile landing** — link sub-halaman (Overview, dll) tersembunyi di <768px, belum ada hamburger menu
- [ ] **Session persistence** — in-memory, hilang saat server restart
- [ ] **Password storage** — plaintext, perlu hash untuk production
- [ ] **Chart re-init** — charts bisa duplikasi jika switch tab berulang kali
- [ ] **Audit reasons display** — audit_reasons array panjang, perlu ringkasan/collapse
- [ ] **Export data** — belum ada fitur export CSV/PDF
- [ ] **Filter avanzado** — filter claims masih basic (status, fraud_type, search)

### Diperbaiki saat Rework UI v2 ✅ (2026-09-07)
- [x] **UI rework total** — dark neon → light theme profesional (backup UI lama: `_backup/ui-dark/`)
- [x] **Bug: tab Users tak pernah muncul** — `style.display=''` tidak menembus class `.hidden`; sekarang pakai `classList.toggle('hidden')` di `applyPerms`
- [x] **Bug: tab Data tak ikut tersembunyi** — 'data' tidak ada di daftar tab `switchTab` versi lama
- [x] **Bug: navigasi mobile antar-tab** — dulu mobile-tabs hanya ada di tab Dashboard
- [x] **Bug: stat "Dana dicegah" landing selalu Rp 0** — counter jalan sebelum fetch selesai; `initCounters` sekarang idempotent + dipanggil ulang setelah fetch
- [x] **Format uang** — `formatCompactIDR`: juta → "jt" (bukan "M" yang terbaca miliar), miliar → "M"
- [x] **Enforce permission verdict** — baris tombol verdict pakai display flex/none sesuai permission
- [x] Viewport meta `user-scalable=no` dihapus (a11y)

---

## 10. Design Spec (ops.txt Summary)

Dari brief asli:
- **Theme gelap** navy `#002C5F` + hijau `#009B4C` + cyan `#00ACC1` → *deviasi: UI v2 memakai LIGHT theme atas feedback Luna (dark neon terkesan "AI-made" & kurang ramah pengguna); warna brand tetap dipakai sebagai aksen*
- **Logo:** PNG transparan 682×553
- **Performance:** 60fps, Lighthouse >90, total page <500KB, FCP <1.2s
- **Mobile-first:** 390px–1440px+, no horizontal scroll (terverifikasi di 390px)
- **WCAG AA** contrast (teks di light theme memakai shade gelap yang lolos AA)
- **`prefers-reduced-motion`** support (masih ada di theme.css & app.js)

---

## 11. Cheat Sheet for Luna

### Jalankan server
```bash
cd D:/FamilyAgent/Nox/workspace/sikepo-app/backend
python main.py
```

### Test API cepat
```bash
# Login
curl -X POST http://127.0.0.1:7721/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'

# Stats
curl http://127.0.0.1:7721/api/stats/overview

# Claims
curl "http://127.0.0.1:7721/api/claims?limit=5"

# Timeline
curl "http://127.0.0.1:7721/api/stats/timeline?period=daily"

# ML Status
curl http://127.0.0.1:7721/api/ml/status
```

### Regenerate Data
```bash
cd D:/FamilyAgent/Nox/workspace/sikepo-app
python scripts/generate_data.py
```

### Retrain ML Model
```bash
curl -X POST http://127.0.0.1:7721/api/ml/train
```

### Key File Locations
- **Backend logic:** `backend/main.py` (385 lines)
- **AI engine:** `engine/ai_engine.py` (348 lines)
- **Auth system:** `engine/auth.py` (179 lines)
- **Cockpit JS:** `frontend/js/app.js` (318 lines)
- **Cockpit HTML:** `frontend/app.html` (366 lines)
- **Landing HTML:** `frontend/index.html`
- **Landing JS:** `frontend/js/landing.js`
- **Theme CSS:** `frontend/css/theme.css`
- **Claims data:** `data/claims_dataset.json` (150 items)
- **Users data:** `data/users.json`

---

## 12. Important Notes

1. **DATA_FILE path di `main.py` hardcoded** ke `D:/FamilyAgent/Nox/workspace/sikepo-app/data/claims_dataset.json` — ganti kalau pindah directory
2. **FRONTEND_DIR di `main.py` hardcoded** ke `D:/FamilyAgent/Nox/workspace/sikepo-app/frontend`
3. **Server port: 7721** — jangan clash dengan service lain
4. **CORS: allow all origins** — untuk demo/prototype
5. **ML model auto-trains** saat startup jika belum ada model file
6. **LLM (Vercel AI Gateway)** perlu `AI_GATEWAY_API_KEY` di `.env` atau env system — fallback ke rules jika tidak available

---

*Documentation generated by Nox — 2026-09-07*
