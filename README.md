# SiKePo — Sistem Investigasi Kelayakan Klaim & Pola Overbilling

AI-powered **pre-adjudication audit** untuk klaim BPJS Kesehatan: deteksi fraud
(Upcoding, Phantom Billing, Inflated/Non-Fornas, Cloning) sebelum dana cair.

> Detect Smarter. Protect JKN.

## Menjalankan

**Cara tercepat:** klik dua kali `run_sikepo.bat` — menyalakan backend di port
7721 dan membuka browser.

Manual:

```bash
cd backend
python main.py        # uvicorn di 0.0.0.0:7721
```

Lalu buka <http://127.0.0.1:7721/>. Butuh internet untuk CDN Tailwind & Google
Fonts; semua data dan aset dilayani lokal.

## Struktur

```
backend/main.py        FastAPI + API audit (rules engine) + static mount /static
data/claims_dataset.json   150 klaim sintetis (di-generate scripts/generate_data.py)
frontend/
  index.html           Landing + cockpit (SPA 2 view, tanpa build step)
  css/theme.css        Design system: warna, komponen, animasi
  js/app.js            Logika: fetch API, render tabel/inspector, count-up, scramble
  js/app.backup-2026-09-07.js   Versi lama (cadangan sebelum rombak tema)
  index.backup-2026-09-07.html  Versi lama (cadangan sebelum rombak tema)
  img/hero-character.png   Ilustrasi 3D mesin audit (hero)
  img/sikepo-logo.svg  Logo vektor (navy/green/cyan + white hub)
run_sikepo.bat         Launcher Windows
```

## API

| Endpoint | Fungsi |
|---|---|
| `GET /api/stats/overview` | KPI: total klaim, dana tertahan, anomali, clean |
| `GET /api/claims?limit&fraud_type&search` | Daftar klaim + filter |
| `GET /api/claims/{id}` | Detail klaim |
| `POST /api/claims/{id}/verdict` | Setujui / tahan / tolak (menulis balik ke dataset) |
| `POST /api/audit/single` | Simulasi audit klaim manual (Live Sandbox) |

## Panduan modifikasi tema

- **Warna**: token `bpjs.*` di `<script> tailwind.config` di `index.html`
  (navy `#002C5F`, green `#009B4C`, greenBright `#00C464`, cyan `#00ACC1`,
  dark `#0A0F1C`, surface `#0D1526`, border `#1B2740`).
- **Tipografi**: Inter (UI) + JetBrains Mono (telemetri) — link Google Fonts di
  `<head>`; brief ops.txt mewajibkan kombinasi ini.
- **Komponen/animasi** (kartu kaca, scan-beam, float, spectrum): `css/theme.css`.
- **Salinan teks**: langsung di section `index.html` (hero, bento, spectrum,
  fraud cards, footer).
- **Kartu melayang hero**: blok `absolute top-… left-…` di dalam hero; posisi
  memakai persen terhadap kontainer gambar mesin.
- **Data sintetis**: `python scripts/generate_data.py` (menulis ulang dataset).
- **Angka bento** (Rp M / jumlah): fallback statis via `data-count-to` di HTML;
  saat backend hidup, `fetchStats()` menimpa dengan nilai live sebelum animasi
  count-up jalan.

## Arsitektur AI (narasi produk)

- **Deterministic rules engine** — validasi tarif plafon INA-CBGs, LOS kewajaran,
  restriksi e-Fornas (transparan, bisa diaudit).
- **Explainable AI scoring** — skor risiko 0–100 dengan alasan audit per klaim.
- **Agentic AI orchestration** (peta jalan) — agen triage men distributed antrean,
  agen investigator menggali temuan, agen adjudicator menyusun rekomendasi.
- **ML continuous learning** (peta jalan) — verdict verifikator jadi label untuk
  retraining berkala (feedback loop manusia-dalam-lingkaran).

## Role & akses

Login demo memilih profil: **Verifikator KC**, **Satgas Anti-Fraud Pusat**,
**Dewan Juri/Auditor**. Role menentukan cakupan data di cockpit; keputusan
final tetap di tangan verifikator manusia.

## Catatan kualitas

- Responsif (390px–1440px+), `scrollWidth ≤ viewport` terverifikasi.
- Kontras teks mengikuti WCAG AA untuk teks utama; `prefers-reduced-motion`
  mematikan float/scan/count-up/scramble.
- Tanpa console error; semua fetch punya fallback statis.
