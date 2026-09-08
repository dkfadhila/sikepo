# SiKePo — Sistem Investigasi Kelayakan Klaim & Pola Overbilling

> *Detect Smarter. Protect JKN.*

**SiKePo** adalah aplikasi audit klaim kesehatan yang membantu verifikator BPJS Kesehatan
menyaring klaim bermasalah **sebelum dana cair** — bukan sesudahnya.

Coba langsung: **https://sikepo-app.vercel.app** (akun demo: `admin` / `admin`)

Dibuat untuk **Healthkathon BPJS Kesehatan 2026** dengan tema
*Detect Smarter, Protect JKN — Efisiensi Risiko Program JKN*.

---

## Ini aplikasi apa sih?

Setiap hari, fasilitas kesehatan di seluruh Indonesia mengajukan ribuan klaim ke BPJS Kesehatan.
Sebagian kecil di antaranya bermasalah: tarif yang digelembungkan, layanan yang ditagih tapi
tidak pernah diberikan, obat mahal di luar ketentuan, sampai resume medis yang dijiplak
antar pasien.

Memeriksa semuanya secara manual itu lambat dan melelahkan. **SiKePo hadir sebagai asisten
verifikator**: ia membaca setiap berkas klaim, menilai tingkat risikonya (skor 0–100),
menjelaskan *kenapa* sebuah klaim dicurigai, lalu memberi rekomendasi — **setujui, tahan,
atau tolak**. Keputusan final selalu di tangan manusia, SiKePo hanya memastikan tidak ada
yang lolos dari perhatian.

---

## Cara kerja aplikasinya

Setiap klaim melewati empat tahap yang sama, kurang dari dua detik:

1. **Klaim masuk** — Data pengajuan dari sistem rumah sakit (diagnosa, obat, biaya yang
   diajukan, dan tarif plafon INA-CBG) tercatat sebagai berkas digital.
2. **Pemeriksaan aturan** — Sistem memeriksa otomatis: apakah biayanya melonjak jauh di atas
   plafon? Apakah lama rawat inapnya wajar untuk diagnosa tersebut? Apakah ada obat
   restriksi ketat tanpa justifikasi klinis?
3. **Penilaian risiko AI** — Model kecerdasan buatan membandingkan klaim ini dengan pola
   ratusan klaim lain, lalu memberi skor risiko beserta bukti-buktinya — bukan kotak hitam,
   semua alasannya bisa dibaca dan diaudit.
4. **Rekomendasi putusan** — Berkas berisiko rendah siap dibayar, berkas mencurigakan
   ditahan untuk audit rekam medis, berkas berbahaya ditolak dan dieskalasi ke tim
   anti-fraud. Verifikator yang menekan tombol final.

Semakin sering verifikator memberi keputusan, semakin pintar sistemnya — setiap verdict
menjadi pelajaran untuk penilaian berikutnya.

---

## Pola kecurangan yang dideteksi

| Pola | Artinya dalam bahasa sehari-hari |
|---|---|
| **Upcoding** | Diagnosa "digemukkan" agar masuk tarif yang lebih mahal |
| **Phantom billing** | Nagih layanan yang sebenarnya tidak pernah diberikan ke pasien |
| **Overpreskripsi / Inflated bills** | Obat mahal di luar formularium nasional tanpa alasan klinis |
| **Cloning** | Resume medis di-copy-paste antar pasien berbeda untuk klaim massal |

---

## Yang bisa kamu lakukan di dalamnya

- **Dashboard** — Angka ringkas: total klaim, dana yang berhasil dicegah, sebaran anomali,
  dan rata-rata risiko per rumah sakit.
- **Antrean klaim** — Daftar berkas beserta skor risikonya; klik satu berkas untuk melihat
  detail lengkap, alasan audit, dan tombol putusan (Setujui / Tahan / Tolak).
- **Sandbox simulasi** — Coba-coba audit klaim khayalan: isi diagnosa, biaya, dan obat,
  lalu lihat bagaimana mesin audit menilainya — tanpa mengubah data asli.
- **Data & tren** — Grafik perjalanan klaim harian, bulanan, tahunan, plus peta
  persebaran anomali per fasilitas kesehatan.
- **Simulasi intake** — Rasakan klaim "mengalir masuk" dari sistem rumah sakit secara
  real-time, lengkap dengan nomor SEP otomatis.

---

## Dibuat untuk siapa?

- **Verifikator Kantor Cabang** — menyaring antrean klaim wilayahnya dan memberi putusan final.
- **Satgas Anti-Fraud** — investigasi lintas fasilitas kesehatan, tanpa kewenangan putusan.
- **Auditor / Dewan Juri** — akses transparan read-only untuk menilai dan mengawasi.

---

## Catatan penting

Seluruh data di aplikasi ini adalah **data sintetis untuk simulasi dan demo** — 150 klaim
khayalan dari 8 rumah sakit fiktif. Bukan data operasional BPJS Kesehatan, bukan data
pasien sungguhan. Dibuat agar cara kerja sistem bisa dilihat dan dicoba tanpa menyentuh
data sensitif apa pun.

---

*SiKePo — Healthkathon BPJS Kesehatan 2026 · Prototype*
