# SiKePo — Rencana Menuju Produksi

> Dari prototype Healthkathon 2026 → **lapisan audit pre-adjudication** yang berjalan di depan pembayaran klaim JKN.
> Prinsip tetap: *fraud tersaring sebelum dana cair, keputusan akhir tetap milik manusia, setiap putusan tercatat.*

Status dokumen: v1 · 2026-09-11 · pemilik: Luna
Kode prototype yang menjadi fondasi: `backend/main.py` (API) · `engine/ai_engine.py` (A1→A2→A3) · `engine/auth.py` (RBAC) · cockpit UI v3.

> **PROGRES 2026-09-11 (malam):** sebagian Fase 1 & 2 sudah diimplementasikan dan teruji —
> ✅ `POST /api/ingest/claims` (M2M, X-API-Key per faskes, idempoten SEP, audit A1→A2→A3 saat masuk)
> ✅ Manajemen API key (SA): `GET/POST /api/admin/api-keys`
> ✅ Password hashing PBKDF2 + migrasi transparan dari plaintext
> ✅ Sesi persist ke disk (restart tidak logout) · rate limit login per-IP
> ✅ Audit trail verdict (`verdict_history` di klaim, tampil di inspector)
> Sisa Fase 1: hubungkan sumber nyata. Sisa Fase 2: masking PII, backup otomatis, CORS ketat.

---

## 1. Posisi produk di arsitektur BPJS

```
SIMRS Faskes / E-Klaim (INA-CBG)                     Sistem Pengolah Klaim BPJS
        │  1. klaim selesai dikoding                          ▲
        ▼                                                     │ 4. klaim bersih lanjut bayar
┌─────────────────────────────────────────────────────────────┴─────────┐
│  SiKePo (audit pre-adjudication)                                      │
│  2. Ingest otomatis → DB → Pipeline A1 Rules → A2 ML → A3 LLM         │
│     skor 0–100 + bukti · antrean verifier · verdict APPROVE/HOLD/REJECT│
│  3. eskalasi Satgas Anti-Fraud untuk REJECT                           │
└───────────────────────────────────────────────────────────────────────┘
```

Yang **tidak berubah** dari prototype: taksonomi fraud, RBAC 4 peran, semantik pipeline A1/A2/A3, fallback deterministik LLM.
Yang **berubah**: sumber data (file JSON → DB + ingestion), keamanan, dan operasional.

---

## 2. Keputusan infrastruktur (penting)

| Hal | Keputusan | Alasan |
|---|---|---|
| Runtime backend | **Container (Docker) di VPS/cloud** — bukan Vercel serverless | ML (sklearn/joblib) butuh FS persisten untuk retrain; background job (auto-push/ingest) butuh proses jangka panjang; Vercel read-only + timeout. Vercel tetap dipakai untuk frontend statis jika diinginkan. |
| Database | **PostgreSQL managed** (Neon/Supabase/RDS) | Ganti `claims_dataset.json`; transaksi aman untuk verdict bersamaan; backup bawaan. |
| Frontend | Tetap vanilla JS + Tailwind CDN, dilayani backend yang sama | Sudah rombak total (design system v3); tidak ada alasan menambah framework. |
| LLM A3 | Tetap Vercel AI Gateway (`ling-3.0-flash-sante-free`) + fallback rules | Sudah berjalan; fallback membuat sistem tidak pernah berhenti bila LLM down. |

---

## 3. Fase pekerjaan

### Fase 0 — Fondasi data (minggu 1–2)
Pindahkan "source of truth" dari file JSON ke database.

- [ ] Skema PostgreSQL: `claims`, `users`, `verdict_log`, `ingest_log`, `ml_runs`
      (kolom klaim = shape JSON sekarang; `id`/SEP jadi unique key).
- [ ] Ganti `load_claims()/save_claims()` → query DB (satu lapis repo, sisanya API tidak berubah).
- [ ] Seed: 150 klaim sintetis jadi data demo/staging (dataset sintetis tetap dipertahankan untuk demo publik).
- [ ] Config via environment (DB URL, LLM key, secret) — `.env` tidak masuk repo.
- [ ] `Dockerfile` + `docker-compose.yml` (api + postgres) supaya lokal/prod identik.
- **Definition of done:** semua endpoint & cockpit berjalan melawan Postgres; verdict persist setelah restart.

### Fase 1 — Ingestion otomatis dari server sumber (minggu 2–4)
Ini jawaban dari "input data otomatis": klaim masuk **tanpa input manual**.

- [ ] `POST /api/ingest/claims` — payload klaim asli (SIMRS/E-Klaim), auth **machine-to-machine**
      (API key per faskes/KC atau OAuth client-credentials), bukan login user.
- [ ] Validasi ketat (pydantic): wajib SEP, ICD-10, tarif INA-CBG, biaya, LOS, obat — tolak + catat di `ingest_log`.
- [ ] Idempotensi: SEP duplikat → respons "already ingested", tidak menambah baris.
- [ ] Mode batch: unggah CSV/JSON harian per KC (untuk faskes yang belum punya API).
- [ ] Adapter polling (opsional): tarik antrean klaim dari sistem BPJS bila push tidak memungkinkan.
- [ ] Simulator SIMRS yang ada dijadikan **mode staging** (`SIKEPO_ENV=staging`) — tidak pernah aktif di produksi.
- **Definition of done:** klaim dari sistem uji eksternal masuk otomatis < 5 detik, teraudit A1→A3, muncul di antrean; duplikat tertolak.

### Fase 2 — Keamanan & kepatuhan (minggu 4–6)
Wajib karena menyangkut dana publik + data pribadi (UU PDP No. 27/2022).

- [ ] Password hashing (argon2/bcrypt) — hapus plaintext di `users.json`.
- [ ] Sesi persist di DB/Redis (saat ini in-memory, hilang saat restart), expiry + refresh.
- [ ] **Audit trail immutable**: setiap verdict tercatat (siapa, kapan, aksi, bukti skor saat itu) — tidak bisa dihapus/ubah.
- [ ] Minimasi PII: nama & no. kartu di-mask di UI/list; detail hanya untuk peran berkebutuhan.
- [ ] HTTPS wajib, rate limit per IP & per API key, CORS dibatasi (saat ini `*`).
- [ ] Backup DB harian + uji restore; rotasi log.
- **Definition of done:** penetration test mandiri lolos (auth, IDOR antar faskes, inject); restore backup sukses.

### Fase 3 — Operasional & keandalan (minggu 6–8)
- [ ] Health endpoint + dashboard uptime; log terstruktur JSON; metric ringkas (latensi ingest, latensi audit, rasio anomali).
- [ ] Alerting: ingestion gagal beruntun, LLM fallback rate > 20%, antrean > ambang.
- [ ] **Feedback loop ML**: job berkala retrain IsolationForest dari label verdict verifier (endpoint `/api/ml/train` sudah ada — dijadwalkan + dataset versioning).
- [ ] CI/CD (GitHub Actions): lint → test → build image → deploy staging → promote produksi.
- [ ] Staging environment dengan data sintetis untuk demo/demo juri tanpa menyentuh data nyata.
- **Definition of done:** deployment 1 command; insiden kelas "LLM down" / "ingest down" terdeteksi < 5 menit.

### Fase 4 — Pilot shadow mode (minggu 8–12)
Jangan langsung memutuskan — buktikan dulu akurasinya di data nyata.

- [ ] Jalankan SiKePo di 1–2 KC dalam **mode bayangan**: sistem menilai semua klaim, verifier tetap memutuskan manual seperti biasa.
- [ ] Bandingkan otomatis: setuju/tolak SiKePo vs keputusan verifier → ukur precision/recall per modus fraud.
- [ ] Kalibrasi threshold (30/70) & prompt A3 dari hasil pilot; target awal: precision ≥ 90% pada klaim yang ditolak sistem.
- **Definition of done:** laporan evaluasi 4 minggu disetujui pengelola; false-reject < ambang yang disepakati.

### Fase 5 — Go-live bertahap (minggu 12+)
- [ ] Enforce verdict SiKePo di 1 KC (klaim hijau auto-lanjut, kuning/merah wajib ke verifier).
- [ ] SOP verifier + pelatihan 1 sesi; kanal eskalasi Satgas Anti-Fraud.
- [ ] Rollback plan: saklar untuk kembali ke alur lama dalam < 15 menit.
- [ ] Perluas bertahap per KC setelah metrik stabil 2 minggu.

---

## 4. Estimasi ringkas

| Fase | Durasi | Ukuran kerja |
|---|---|---|
| 0 Fondasi DB + Docker | 1–2 mgg | Sedang |
| 1 Ingestion otomatis | 2 mgg | Sedang |
| 2 Keamanan/kepatuhan | 2 mgg | Sedang |
| 3 Operasional/CI-CD | 2 mgg | Ringan–sedang |
| 4 Pilot shadow | 4 mgg | Terutama operasional |
| 5 Go-live bertahap | bertahap | Operasional |

Total ± 12 minggu sampai pilot tervalidasi; **fase 0–2 adalah syarat minimum** sebelum menyentuh data nyata.

## 5. Risiko utama & mitigasi

| Risiko | Mitigasi |
|---|---|
| Kualitas payload SIMRS beragam antar faskes | Validasi ketat + `ingest_log` + onboarding faskes bertahap |
| LLM gateway tidak tersedia | Fallback rules deterministik (sudah ada) + alert rasio fallback |
| Verifier tidak percaya sistem | Shadow mode + tampilkan *bukti* tiap skor (audit_reasons sudah desain inti) |
| Kebocoran data pasien | Masking PII, RBAC ketat, audit trail, HTTPS, backup terenkripsi |
| False reject (klaim baik tertolak) | Threshold konservatif + bandingkan vs verifier di pilot sebelum enforce |

## 6. Yang sudah benar sejak sekarang (tidak perlu diubah)

- Pipeline A1 rules → A2 ML → A3 LLM dengan fallback: murah, cepat, tetap jalan saat LLM mati.
- RBAC 4 peran dengan permission granular (`verdict`, `manage_users`, `ai_investigate`, …).
- Audit trail konsep `verdict_history` & `audit_reasons` di shape klaim.
- Simulator SIMRS = blueprint endpoint ingestion produksi (`/api/simrs/intake` → `/api/ingest/claims`).
- Cockpit v3: queue → inspect → verdict ≤ 2 klik, keyboard-first — sesuai beban kerja verifier.

---

*Dokumen ini rencana hidup: review tiap akhir fase, perbarui checklist, jangan tunda Fase 2 (keamanan) meski tekanan demo tinggi.*
