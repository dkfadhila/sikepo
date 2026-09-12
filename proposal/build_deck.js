/* Proposal SiKePo, Healthkathon 2026 (14 slide, tema Clarity) */
const pptxgen = require("pptxgenjs");

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.author = "Coba Namanya Ini";
p.title = "SiKePo Proposal Healthkathon 2026";

const W = 13.33, H = 7.5, M = 0.5;
const INK = "0B1526", NAVY = "0A2540", BODY = "4A5568", MUTED = "8291A6";
const GREEN = "009B4C", GREEND = "007C3D", GREENSOFT = "E9F7EF";
const CYAN = "0284A8", CYANSOFT = "E4F6FB", RED = "D92D20", REDSOFT = "FDECEA";
const AMBER = "B54708", AMBERSOFT = "FCF1E4", BLUE = "175CD3", BLUESOFT = "E9F0FB";
const LINE = "ECEEF2", SOFTBG = "F6F8FA";
const DISP = "Plus Jakarta Sans", UI = "Inter", MONO = "JetBrains Mono";
const A = "D:/FamilyAgent/Nox/workspace/sikepo-app/proposal/assets/";
const AST = "D:/FamilyAgent/Nox/workspace/sikepo-app/proposal/assets/";
const arrow = () => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8291A6" stroke-width="2.4"><path d="M9 5l7 7-7 7"/></svg>`;

function kicker(s, text, x = M, y = 0.42, w = 6, align = "left") {
  s.addText(text.toUpperCase(), { x, y, w, h: 0.3, fontFace: DISP, fontSize: 11, bold: true, color: GREEN, charSpacing: 3, align, margin: 0 });
}
function title(s, text, x = M, y = 0.72, w = W - 2 * M, size = 30, align = "left", color = INK) {
  s.addText(text, { x, y, w, h: 0.75, fontFace: DISP, fontSize: size, bold: true, color, align, margin: 0, letterSpacing: -0.5 });
}
function pagefoot(s, n, dark = false) {
  s.addText(`SiKePo · Healthkathon BPJS Kesehatan 2026`, { x: M, y: H - 0.38, w: 5, h: 0.26, fontFace: UI, fontSize: 9, color: dark ? "64809F" : MUTED, margin: 0 });
  s.addText(String(n).padStart(2, "0"), { x: W - 1.0, y: H - 0.38, w: 0.5, h: 0.26, fontFace: MONO, fontSize: 9, color: dark ? "64809F" : MUTED, align: "right", margin: 0 });
}
const shadow = () => ({ type: "outer", color: "0B1526", blur: 7, offset: 2, angle: 90, opacity: 0.13 });
const bu = () => ({ code: "25B8", indent: 12 });

/* ── S1 COVER (gelap) ─────────────────────────────────── */
let s = p.addSlide();
s.background = { color: INK };
s.addImage({ path: AST + "cover-machine.png", x: 7.6, y: 0.55, w: 5.55, h: 4.44 * (5.55 * 0.784) / 5.55 > 0 ? 4.35 : 4.35 });
s.addImage({ path: "D:/FamilyAgent/Nox/workspace/sikepo-app/frontend/img/sikepo-logo.png", x: M, y: 0.55, w: 0.62, h: 0.5 });
s.addText("SiKePo", { x: 1.25, y: 0.52, w: 5, h: 0.62, fontFace: DISP, fontSize: 30, bold: true, color: "FFFFFF", margin: 0 });
s.addText("Sistem Investigasi Kelayakan Klaim & Pola Overbilling", { x: M, y: 2.35, w: 7, h: 0.35, fontFace: UI, fontSize: 13, color: "9DB2CC", margin: 0 });
s.addText([
  { text: "Deteksi klaim fraud\n", options: { color: "FFFFFF" } },
  { text: "sebelum ", options: { color: "FFFFFF" } },
  { text: "dana cair.", options: { color: "35D08F" } },
], { x: M, y: 2.72, w: 7.2, h: 1.9, fontFace: DISP, fontSize: 44, bold: true, margin: 0, lineSpacingMultiple: 1.18 });
s.addText("Pipeline A1 Triage, A2 Investigator, dan A3 Adjudicator menilai setiap klaim dalam hitungan detik. Skor risiko 0–100 disertai bukti yang dapat dibaca; keputusan akhir tetap milik verifikator.", { x: M, y: 4.72, w: 6.9, h: 0.95, fontFace: UI, fontSize: 13.5, color: "AAB9CB", align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
s.addShape(p.shapes.LINE, { x: M, y: 6.05, w: 6.4, h: 0, line: { color: "24406B", width: 1 } });
s.addText([
  { text: "Coba Namanya Ini", options: { bold: true, color: "FFFFFF" } },
  { text: "   Decka Fadhila Tirta", options: { color: "AAB9CB" } },
], { x: M, y: 6.22, w: 6.5, h: 0.32, fontFace: UI, fontSize: 13, margin: 0 });
s.addText("Healthkathon BPJS Kesehatan 2026 · Efisiensi Risiko", { x: M, y: 6.58, w: 6.5, h: 0.3, fontFace: UI, fontSize: 11, color: "64809F", margin: 0 });
s.addText("Detect Smarter. Protect JKN.", { x: 7.6, y: 6.75, w: 5.2, h: 0.4, fontFace: DISP, fontSize: 15, bold: true, color: "35D08F", align: "right", margin: 0 });

/* ── S2 KATEGORI & SUB-KATEGORI ───────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Kategori & sub-kategori yang diikuti");
title(s, "Efisiensi Risiko Fasilitas Kesehatan");
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.62, w: 12.33, h: 0.92, fill: { color: GREENSOFT }, rectRadius: 0.09 });
s.addText([
  { text: "Kategori: ", options: { bold: true, color: "#067647".slice(1) && "067647" } },
  { text: "Efisiensi Risiko Fasilitas Kesehatan", options: { bold: true, color: "067647" } },
  { text: "      Fokus SiKePo: klaim rawat inap FKRTL yang dinilai sebelum dana cair", options: { color: "4A5568" } },
], { x: 0.85, y: 1.62, w: 11.7, h: 0.92, fontFace: UI, fontSize: 14, valign: "middle", margin: 0 });
s.addText("Sub-kategori fokus (nomor mengikuti daftar resmi panitia), terdeteksi otomatis oleh SiKePo:", { x: M, y: 2.85, w: 11, h: 0.32, fontFace: UI, fontSize: 13.5, color: BODY, margin: 0 });
const subs = [
  ["No. 4 · Upcoding", "Diagnosis atau tindakan dimanipulasi agar nilai klaim meningkat.", "24 kasus pada dataset 150 klaim"],
  ["No. 6 · Phantom billing", "Klaim atas layanan yang tidak pernah diberikan kepada pasien.", "18 kasus · fingerprint rawat absen"],
  ["No. 7 · Inflated bills", "Biaya obat dan alkes ditagih melebihi biaya sebenarnya.", "19 kasus · obat di luar e-Fornas"],
  ["No. 5 · Cloning", "Klaim dibuat dengan menyalin klaim atau rekam medis pasien lain.", "8 kasus · kemiripan resume tinggi"],
];
subs.forEach((it, i) => {
  const x = M + (i % 2) * 6.31, y = 3.32 + Math.floor(i / 2) * 1.72;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 6.02, h: 1.56, fill: { color: "FFFFFF" }, line: { color: LINE, width: 1 }, rectRadius: 0.09, shadow: shadow() });
  s.addText(it[0], { x: x + 0.28, y: y + 0.16, w: 5.5, h: 0.3, fontFace: DISP, fontSize: 14.5, bold: true, color: INK, margin: 0 });
  s.addText(it[1], { x: x + 0.28, y: y + 0.5, w: 5.5, h: 0.55, fontFace: UI, fontSize: 11.5, color: BODY, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
  s.addText(it[2], { x: x + 0.28, y: y + 1.13, w: 5.5, h: 0.28, fontFace: MONO, fontSize: 10, color: GREEN, margin: 0 });
});
s.addText("Cakupan lanjutan: prolonged length of stay (No. 12), readmisi (No. 16), repeat billing (No. 11), dan unbundling/fragmentasi (No. 9) dipantau melalui pemeriksaan LOS dan pola episode. Kasus = sebaran modus pada 150 klaim uji SiKePo.", { x: M, y: 6.85, w: 11, h: 0.26, fontFace: UI, fontSize: 9.5, color: MUTED, margin: 0 });
pagefoot(s, 2);

/* ── S3 B1 IDENTITAS & POSITIONING ────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 1 · Identitas & positioning");
title(s, "Asisten verifikator yang membaca semua berkas");
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.7, w: 12.33, h: 2.1, fill: { color: SOFTBG }, rectRadius: 0.1 });
s.addText([
  { text: "SATU KALIMAT NILAI", options: { fontSize: 11, bold: true, color: GREEN, charSpacing: 2, breakLine: true } },
  { text: "SiKePo membaca setiap berkas klaim dalam hitungan detik, memberi skor risiko 0–100 beserta bukti yang dapat dibaca, lalu menyerahkan keputusan akhir kepada verifikator.", options: { fontSize: 18, color: INK } },
], { x: 0.9, y: 1.95, w: 11.55, h: 1.7, fontFace: UI, margin: 0, align: "justify", lineSpacingMultiple: 1.5, paraSpaceAfter: 6 });
s.addText("Posisi kami", { x: M, y: 4.02, w: 6, h: 0.32, fontFace: DISP, fontSize: 15, bold: true, color: INK, margin: 0 });
s.addText([
  { text: "Audit berjalan di dalam alur klaim, sebelum dana cair, bukan laporan setelah kejadian.", options: { bullet: bu(), breakLine: true } },
  { text: "Setiap skor disertai alasan yang dapat dibaca dan diaudit.", options: { bullet: bu(), breakLine: true } },
  { text: "AI memberi rekomendasi; verifikator yang memutuskan.", options: { bullet: bu() } },
], { x: M, y: 4.4, w: 12.33, h: 1.0, fontFace: UI, fontSize: 13.5, color: BODY, paraSpaceAfter: 12, margin: 0, align: "justify", align: "justify", lineSpacingMultiple: 1.45 });
s.addImage({ path: A + "shot-claims-strip.png", x: M, y: 5.55, w: 12.33, h: 1.6, sizing: { type: "cover", w: 12.33, h: 1.5 } });
pagefoot(s, 3);

/* ── S4 B2 MASALAH & URGENSI ──────────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 2 · Masalah & urgensi");
title(s, "Klaim fraudulent bocor setelah dana cair");
const stats = [
  ["Rp 2,6 T", "kerugian klaim fraudulent yang ditemukan BPJS Kesehatan pada 2023", "Publikasi media nasional, awal 2024"],
  ["Rp 12,63 T", "estimasi potensi kebocoran dana JKN per tahun", "BPJS Watch, 2019 (estimasi)"],
  ["Ratusan", "berkas klaim ditangani manual oleh setiap verifikator setiap hari", "Wawancara proses kerja verifikasi"],
];
stats.forEach((it, i) => {
  const x = M + i * 4.18;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.72, w: 3.94, h: 2.06, fill: { color: i === 0 ? INK : "FFFFFF" }, line: { color: LINE, width: 1 }, rectRadius: 0.1, shadow: shadow() });
  s.addText(it[0], { x: x + 0.3, y: 1.94, w: 3.35, h: 0.75, fontFace: DISP, fontSize: i === 0 ? 40 : 34, bold: true, color: i === 0 ? "FFFFFF" : NAVY, margin: 0 });
  s.addText(it[1], { x: x + 0.3, y: 2.72, w: 3.35, h: 0.68, fontFace: UI, fontSize: 11, color: i === 0 ? "AAB9CB" : BODY, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
  s.addText(it[2], { x: x + 0.3, y: 3.44, w: 3.35, h: 0.26, fontFace: UI, fontSize: 9.5, italic: true, color: i === 0 ? "64809F" : MUTED, margin: 0 });
});
s.addText("Yang membuatnya urgen", { x: M, y: 4.15, w: 6, h: 0.3, fontFace: DISP, fontSize: 15, bold: true, color: INK, margin: 0 });
s.addText([
  { text: "Pemeriksaan manual hanya mampu mengambil sampel berkas.", options: { bullet: bu(), breakLine: true } },
  { text: "Pola fraud terus berubah dan sulit diikuti secara konsisten.", options: { bullet: bu(), breakLine: true } },
  { text: "Dana yang bocor adalah iuran peserta JKN.", options: { bullet: bu() } },
], { x: M, y: 4.5, w: 7.4, h: 1.8, fontFace: UI, fontSize: 13, color: BODY, paraSpaceAfter: 11, margin: 0, align: "justify" });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 8.35, y: 4.15, w: 4.48, h: 2.28, fill: { color: REDSOFT }, rectRadius: 0.1 });
s.addText("Konsekuensi bila dibiarkan", { x: 8.65, y: 4.38, w: 3.9, h: 0.3, fontFace: DISP, fontSize: 13.5, bold: true, color: "B42318", margin: 0 });
s.addText([
  { text: "Klaim tidak layak terbayar lebih dahulu\n", options: { breakLine: true } },
  { text: "Faskes jujur dapat tertuduh tanpa dasar bukti", options: {} },
], { x: 8.65, y: 4.72, w: 3.9, h: 1.5, fontFace: UI, fontSize: 12, color: "B42318", paraSpaceAfter: 8, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
s.addText("Sumber: publikasi media nasional atas keterangan BPJS Kesehatan dan BPJS Watch; angka merupakan temuan atau estimasi.", { x: M, y: 6.62, w: 12.3, h: 0.26, fontFace: UI, fontSize: 9.5, color: MUTED, margin: 0 });
pagefoot(s, 4);

/* ── S5 B3 SOLUSI: DIAGRAM ALUR ───────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 3 · Solusi & keunggulan");
title(s, "Satu alur: masuk, dinilai mesin, diputuskan manusia");
const nodes = [
  ["INPUT", "SIMRS / Portal Faskes", "klaim masuk otomatis, berkunci API", SOFTBG, BODY],
  ["A1", "Triage Aturan", "rasio tarif, lama rawat, obat e-Fornas", CYANSOFT, CYAN],
  ["A2", "Investigator ML", "IsolationForest, fusi 45% aturan + 55% ML", AMBERSOFT, AMBER],
  ["A3", "Adjudicator", "Ling 3.0 Flash Sante, alasan berbahasa Indonesia", GREENSOFT, GREEND],
  ["MANUSIA", "Verifikator BPJS", "Setujui, Tahan, atau Tolak berdasar bukti", BLUESOFT, BLUE],
];
nodes.forEach((n, i) => {
  const x = M + i * 2.53;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.85, w: 2.28, h: 1.72, fill: { color: n[3] }, line: { color: LINE, width: 1 }, rectRadius: 0.09, shadow: shadow() });
  s.addText(n[0], { x: x + 0.16, y: 2.02, w: 2, h: 0.24, fontFace: MONO, fontSize: 9.5, bold: true, color: n[4], charSpacing: 2, margin: 0 });
  s.addText(n[1], { x: x + 0.16, y: 2.28, w: 2, h: 0.5, fontFace: DISP, fontSize: 13.5, bold: true, color: INK, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
  s.addText(n[2], { x: x + 0.16, y: 2.85, w: 2, h: 0.62, fontFace: UI, fontSize: 10, color: BODY, align: "justify", margin: 0, lineSpacingMultiple: 1.45 });
  if (i < 4) s.addText("→", { x: x + 2.26, y: 2.5, w: 0.3, h: 0.4, fontFace: UI, fontSize: 16, color: MUTED, align: "center", margin: 0 });
});
const outs = [
  ["SIAP BAYAR", "risiko rendah, cair lebih cepat", GREENSOFT, "#067647".slice(1)],
  ["TAHAN / AUDIT RM", "bukti lengkap untuk verifikator", AMBERSOFT, AMBER],
  ["TOLAK + ESKALASI", "diteruskan ke Satgas Anti-Fraud", REDSOFT, RED],
];
outs.forEach((o, i) => {
  const x = M + i * 4.18;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 4.05, w: 3.94, h: 0.62, fill: { color: o[2] }, rectRadius: 0.09 });
  s.addText([{ text: o[0] + "   ", options: { bold: true } }, { text: o[1], options: {} }], { x: x + 0.24, y: 4.05, w: 3.6, h: 0.62, fontFace: UI, fontSize: 12, color: o[3], valign: "middle", margin: 0 });
});
s.addText("Tiga keunggulan", { x: M, y: 5.05, w: 6, h: 0.3, fontFace: DISP, fontSize: 15, bold: true, color: INK, margin: 0 });
const adv = [
  ["Audit menyeluruh", "Setiap klaim dibaca mesin, bukan sampel."],
  ["AI tepat guna", "Aturan dan ML cepat serta dapat diaudit; LLM hanya untuk adjudikasi."],
  ["Siap alur kerja", "Verdict satu klik; klaim faskes masuk otomatis."],
];
adv.forEach((it, i) => {
  const x = M + i * 4.18;
  s.addText(it[0], { x, y: 5.42, w: 3.9, h: 0.28, fontFace: UI, fontSize: 12.5, bold: true, color: INK, margin: 0 });
  s.addText(it[1], { x, y: 5.72, w: 3.9, h: 0.85, fontFace: UI, fontSize: 11.5, color: BODY, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
});
pagefoot(s, 5);

/* ── S6 B3 FITUR: ANTRIAN + INSPECTOR ─────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 3 · Tampilan produk");
title(s, "Antrean klaim: risiko terlihat, bukti satu klik");
s.addImage({ path: A + "shot-claims.png", x: M, y: 1.66, w: 8.6, h: 5.97 * (8.6 / 14.4) * (1000 / 694) > 0 ? 5.97 : 5.97, sizing: { type: "cover", w: 8.6, h: 5.35 } });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 9.42, y: 1.66, w: 3.41, h: 5.35, fill: { color: SOFTBG }, rectRadius: 0.1 });
s.addText("Di layar ini", { x: 9.72, y: 1.94, w: 2.9, h: 0.3, fontFace: DISP, fontSize: 14.5, bold: true, color: INK, margin: 0 });
s.addText([
  { text: "150 klaim terurut; badge risiko hijau, kuning, merah (skor 0–100)", options: { bullet: bu(), breakLine: true } },
  { text: "Filter status, modus, faskes, rentang risiko, dan pencarian", options: { bullet: bu(), breakLine: true } },
  { text: "Klik baris: inspector memuat bukti A1–A3, obat restriksi, dan selisih biaya", options: { bullet: bu(), breakLine: true } },
  { text: "Verdict satu klik dengan jejak audit", options: { bullet: bu(), breakLine: true } },
  { text: "Navigasi keyboard: j/k, Enter, a/h/r", options: { bullet: bu() } },
], { x: 9.72, y: 2.32, w: 2.86, h: 4.4, fontFace: UI, fontSize: 11.5, color: BODY, paraSpaceAfter: 10, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
pagefoot(s, 6);

/* ── S7 B3 FITUR: DASHBOARD + SANDBOX + FASKES ────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 3 · Tampilan produk");
title(s, "Dashboard, sandbox, dan kanal faskes");
const shots = [
  [A + "shot-dashboard.png", "Dashboard", "KPI live, tren status, distribusi risiko, dan intake SIMRS."],
  [A + "shot-sandbox.png", "Sandbox audit", "Uji klaim hipotesis: skor, alasan, dan jejak A1–A3."],
  [A + "shot-faskes.png", "Portal Faskes", "Faskes mengirim klaim berkunci API; hasil audit tampil seketika."],
];
shots.forEach((it, i) => {
  const x = M + i * 4.18;
  s.addImage({ path: it[0], x, y: 1.7, w: 3.94, h: 2.74, sizing: { type: "cover", w: 3.94, h: 2.74 } });
  s.addText(it[1], { x, y: 4.56, w: 3.94, h: 0.3, fontFace: DISP, fontSize: 14, bold: true, color: INK, margin: 0 });
  s.addText(it[2], { x, y: 4.88, w: 3.94, h: 0.85, fontFace: UI, fontSize: 11.5, color: BODY, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
});
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 6.0, w: 12.33, h: 0.72, fill: { color: GREENSOFT }, rectRadius: 0.09 });
s.addText([
  { text: "Sinkron otomatis: ", options: { bold: true, color: "067647" } },
  { text: "Klaim dari faskes muncul otomatis di antrean Cockpit dalam hitungan detik, disertai notifikasi.", options: { color: "4A5568" } },
], { x: 0.85, y: 6.0, w: 11.7, h: 0.72, fontFace: UI, fontSize: 12.5, valign: "middle", margin: 0 });
pagefoot(s, 7);

/* ── S8 B4 PENDEKATAN TEKNIS ──────────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 4 · Pendekatan teknis & data");
title(s, "Dari input SIMRS sampai keputusan verifikator");
const arch = [
  ["1 · INPUT", "SEP, ICD-10, tarif INA-CBG, biaya, LOS, dan farmasi", "Sumber: API SIMRS berkunci, Portal Faskes, dan data uji", BLUE],
  ["2 · AUDIT PIPELINE", "A1 aturan (risiko awal) → A2 IsolationForest (fusi 45:55) → A3 Ling 3.0 Flash Sante, dengan fallback aturan", "Setiap tahap menghasilkan bukti yang tersimpan per klaim", AMBER],
  ["3 · KEPUTUSAN", "Rekomendasi status, antrean Cockpit, dan verdict berjejak audit", "Label verdict menjadi data latih pelatihan ulang berkala", GREEN],
];
arch.forEach((a, i) => {
  const y = 1.7 + i * 1.55;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y, w: 12.33, h: 1.36, fill: { color: i === 1 ? SOFTBG : "FFFFFF" }, line: { color: LINE, width: 1 }, rectRadius: 0.1 });
  s.addShape(p.shapes.OVAL, { x: 0.82, y: y + 0.42, w: 0.52, h: 0.52, fill: { color: a[3] } });
  s.addText(String(i + 1), { x: 0.82, y: y + 0.42, w: 0.52, h: 0.52, fontFace: MONO, fontSize: 16, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
  s.addText(a[0], { x: 1.62, y: y + 0.22, w: 3.1, h: 0.9, fontFace: DISP, fontSize: 15, bold: true, color: INK, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
  s.addText(a[1], { x: 4.9, y: y + 0.2, w: 5.4, h: 1.0, fontFace: UI, fontSize: 12, color: BODY, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
  s.addText(a[2], { x: 10.45, y: y + 0.2, w: 2.2, h: 1.0, fontFace: UI, fontSize: 10.5, color: MUTED, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
  if (i < 2) s.addText("↓", { x: 6.4, y: y + 1.28, w: 0.4, h: 0.3, fontFace: UI, fontSize: 14, color: MUTED, align: "center", margin: 0 });
});
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 6.42, w: 12.33, h: 0.62, fill: { color: SOFTBG }, rectRadius: 0.09 });
s.addText([
  { text: "Keamanan sejak desain:  ", options: { bold: true, color: INK } },
  { text: "kunci API per faskes · kata sandi PBKDF2 · RBAC 4 peran · rate limit · jejak audit · data uji sintetis", options: { color: BODY } },
], { x: 0.85, y: 6.42, w: 11.7, h: 0.62, fontFace: UI, fontSize: 11.5, valign: "middle", margin: 0 });
pagefoot(s, 8);

/* ── S9 B5 KEMATANGAN ─────────────────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 5 · Tingkat kematangan");
title(s, "Prototype berfungsi penuh, teruji end-to-end");
const stages = ["Ide", "Mockup", "Prototype", "MVP", "Produk"];
stages.forEach((st, i) => {
  const x = M + i * 2.53, active = i === 2;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.75, w: 2.28, h: 0.62, fill: { color: active ? GREEN : "FFFFFF" }, line: { color: active ? GREEN : LINE, width: 1 }, rectRadius: 0.09 });
  s.addText(st, { x, y: 1.75, w: 2.28, h: 0.62, fontFace: DISP, fontSize: 14, bold: true, color: active ? "FFFFFF" : MUTED, align: "center", valign: "middle", margin: 0 });
  if (i < 4) s.addText("→", { x: x + 2.28, y: 1.86, w: 0.25, h: 0.4, fontFace: UI, fontSize: 13, color: MUTED, align: "center", margin: 0 });
});
s.addText("Posisi saat ini: prototype fitur lengkap, dengan jalur jelas menuju MVP melalui pilot shadow di satu KC.", { x: M, y: 2.62, w: 12.2, h: 0.32, fontFace: UI, fontSize: 13, color: BODY, margin: 0 });
const proof = [
  ["Yang sudah berjalan", ["Antrean, inspector, dan verdict berjejak audit", "Pipeline A1–A3 dengan fallback deterministik", "Portal faskes dan sinkronisasi otomatis", "Sandbox, tren data, dan manajemen pengguna", "Pelatihan ulang ML dari label verdict"]],
  ["Yang sudah diuji", ["Alur ujung ke ujung: ingest, audit, hingga verdict tersimpan", "150 klaim teraudit otomatis (89 bersih, 61 anomali)", "Idempotensi SEP: kiriman ganda ditolak", "Pembatasan laju login dan kunci API teruji", "Tampilan teruji pada lebar 390 hingga 1440 piksel"]],
  ["Yang belum (jujur)", ["Belum terhubung dengan data produksi", "Belum ada uji lapangan bersama verifikator", "Presisi dan recall terukur setelah pilot", "PostgreSQL masuk rencana fase berikutnya", "Belum diterapkan pada infrastruktur resmi"]],
];
proof.forEach((col, i) => {
  const x = M + i * 4.18;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 3.14, w: 3.94, h: 3.42, fill: { color: i === 0 ? "FFFFFF" : (i === 1 ? GREENSOFT : SOFTBG) }, line: { color: i === 2 ? LINE : "#C9E9D8", width: 1 }, rectRadius: 0.1 });
  s.addText(col[0], { x: x + 0.26, y: 3.36, w: 3.45, h: 0.3, fontFace: DISP, fontSize: 13.5, bold: true, color: i === 2 ? MUTED : INK, margin: 0 });
  s.addText(col[1].map((t, j) => ({ text: t, options: { bullet: bu(), breakLine: j < col[1].length - 1 } })), { x: x + 0.26, y: 3.72, w: 3.45, h: 2.7, fontFace: UI, fontSize: 11, color: BODY, paraSpaceAfter: 7, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
});
pagefoot(s, 9);

/* ── S10 B6 RENCANA ───────────────────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 6 · Rencana & kelayakan");
title(s, "Empat fase menuju siap implementasi");
const plan = [
  ["Fondasi produksi", "Minggu 1-4", ["PostgreSQL dan Docker", "Seluruh API dipindah ke database", "Penguatan keamanan dan pencadangan"], "Hasil: versi siap produksi internal"],
  ["Pilot shadow", "Minggu 5-12", ["Mode bayangan di satu KC", "Verifikator tetap memutuskan manual", "Mengukur presisi dan recall per modus"], "Hasil: laporan evaluasi empat pekan"],
  ["Go-live bertahap", "Bulan 4-6", ["Klaim hijau lanjut otomatis di satu KC", "SOP dan pelatihan verifikator", "Rencana mundur di bawah 15 menit"], "Hasil: satu KC beroperasi dengan SiKePo"],
  ["Skala & mitra", "Bulan 7+", ["Perluasan KC dan onboarding SIMRS", "Dasbor analitik nasional", "Kerja sama data resmi BPJS Kesehatan"], "Hasil: laporan dampak triwulanan"],
];
plan.forEach((ph, i) => {
  const x = M + i * 3.13;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.78, w: 2.93, h: 4.3, fill: { color: i === 0 ? INK : "FFFFFF" }, line: { color: LINE, width: 1 }, rectRadius: 0.1, shadow: shadow() });
  s.addText(ph[1], { x: x + 0.24, y: 2.0, w: 2.45, h: 0.26, fontFace: MONO, fontSize: 10, bold: true, color: i === 0 ? "35D08F" : GREEN, margin: 0 });
  s.addText(ph[0], { x: x + 0.24, y: 2.3, w: 2.45, h: 0.62, fontFace: DISP, fontSize: 15.5, bold: true, color: i === 0 ? "FFFFFF" : INK, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
  s.addText(ph[2].map((t, j) => ({ text: t, options: { bullet: bu(), breakLine: j < ph[2].length - 1 } })), { x: x + 0.24, y: 3.0, w: 2.5, h: 2.0, fontFace: UI, fontSize: 10.5, color: i === 0 ? "AAB9CB" : BODY, paraSpaceAfter: 7, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
  s.addShape(p.shapes.LINE, { x: x + 0.24, y: 5.35, w: 2.45, h: 0, line: { color: i === 0 ? "24406B" : LINE, width: 1 } });
  s.addText(ph[3], { x: x + 0.24, y: 5.45, w: 2.5, h: 0.55, fontFace: UI, fontSize: 10, italic: true, color: i === 0 ? "64809F" : MUTED, align: "justify", margin: 0, lineSpacingMultiple: 1.45 });
  if (i < 3) s.addText("→", { x: x + 2.93, y: 3.6, w: 0.22, h: 0.4, fontFace: UI, fontSize: 14, color: MUTED, align: "center", margin: 0 });
});
s.addText("Kebutuhan utama: satu KC mitra untuk pilot shadow, dengan akses data uji terbatas berizin.", { x: M, y: 6.42, w: 12.3, h: 0.28, fontFace: UI, fontSize: 10.5, color: MUTED, margin: 0 });
pagefoot(s, 10);

/* ── S11 B7 DAMPAK ────────────────────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 7 · Dampak & nilai");
title(s, "Sebelum vs sesudah SiKePo");
s.addTable([
  [{ text: "Aspek", options: { bold: true, color: "FFFFFF", fill: { color: INK } } },
   { text: "Tanpa SiKePo (manual)", options: { bold: true, color: "FFFFFF", fill: { color: INK } } },
   { text: "Dengan SiKePo", options: { bold: true, color: "FFFFFF", fill: { color: GREEN } } }],
  ["Cakupan pemeriksaan", "Hanya sampel berkas", "Seluruh klaim dibaca mesin"],
  ["Waktu penilaian", "Belasan menit atau lebih", "Kurang dari 2 detik (terukur)"],
  ["Dasar keputusan", "Bervariasi antarpemeriksa", "Skor 0–100 dan alasan yang konsisten"],
  ["Jejak audit", "Catatan manual dan tersebar", "Tersimpan otomatis per verdict"],
  ["Deteksi pola", "Bergantung pengalaman individu", "Model dilatih ulang dari verdict terbaru"],
], { x: M, y: 1.7, w: 12.33, colW: [3.0, 4.6, 4.73], rowH: 0.52, fontFace: UI, fontSize: 11.5, color: BODY, border: { pt: 1, color: LINE }, valign: "middle", margin: 0.08 });
s.addText("Nilai per pemangku kepentingan", { x: M, y: 5.35, w: 6, h: 0.3, fontFace: DISP, fontSize: 15, bold: true, color: INK, margin: 0 });
const val = [
  ["Peserta JKN", "Iuran terjaga dari kebocoran dana"],
  ["Faskes jujur", "Klaim bersih cair lebih cepat dan bukti objektif"],
  ["BPJS Kesehatan", "Efisiensi risiko terukur tiap triwulan"],
];
val.forEach((v, i) => {
  const x = M + i * 4.18;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 5.72, w: 3.94, h: 0.98, fill: { color: SOFTBG }, rectRadius: 0.09 });
  s.addText(v[0], { x: x + 0.24, y: 5.86, w: 3.5, h: 0.26, fontFace: UI, fontSize: 12, bold: true, color: INK, margin: 0 });
  s.addText(v[1], { x: x + 0.24, y: 6.13, w: 3.5, h: 0.5, fontFace: UI, fontSize: 10.5, color: BODY, align: "justify", margin: 0, lineSpacingMultiple: 1.45 });
});
s.addText("Catatan: dampak diukur pada demo internal (150 klaim); angka lapangan divalidasi saat pilot. Waktu kurang dari 2 detik diukur dari latensi endpoint audit.", { x: M, y: 6.95, w: 12.3, h: 0.26, fontFace: UI, fontSize: 9.5, color: MUTED, margin: 0 });
pagefoot(s, 11);

/* ── S12 B8 RISIKO, PRIVASI & ETIKA ───────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 8 · Risiko, privasi & etika");
title(s, "AI mendukung keputusan, tidak menggantikan");
const eth = [
  ["Perlindungan data (UU PDP)", "Memakai 150 klaim sintetis, tanpa data peserta riil. Kata sandi berhash PBKDF2, RBAC empat peran, dan jejak audit per keputusan. Produksi: minimasi data pribadi dan enkripsi.", "0B1526", "FFFFFF", "9DB2CC"],
  ["Bias & keterbatasan AI", "Model dapat keliru pada kasus langka. Mitigasi: skor merupakan gabungan aturan dan ML, ambang konservatif, pelatihan ulang berkala, serta alasan yang terbuka untuk dibantah.", "FFFFFF", INK, BODY],
  ["Human-in-the-loop", "Mesin hanya memberi rekomendasi. Klaim berisiko wajib melewati verifikator dan eskalasi Satgas Anti-Fraud; setiap perubahan keputusan tercatat.", "FFFFFF", INK, BODY],
  ["Mitigasi risiko utama", "1) LLM gagal: fallback aturan menjaga layanan. 2) Kunci API bocor: rotasi per faskes dan rate limit. 3) Faskes jujur tertolak: ambang konservatif dan evaluasi pilot.", "FFFFFF", INK, BODY],
];
eth.forEach((c, i) => {
  const x = M + (i % 2) * 6.31, y = 1.72 + Math.floor(i / 2) * 2.42;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 6.02, h: 2.24, fill: { color: c[3] === INK && i === 0 ? INK : "FFFFFF" }, line: { color: LINE, width: 1 }, rectRadius: 0.1, shadow: shadow() });
  s.addText(c[0], { x: x + 0.28, y: y + 0.2, w: 5.5, h: 0.3, fontFace: DISP, fontSize: 14.5, bold: true, color: c[4], margin: 0 });
  s.addText(c[1], { x: x + 0.28, y: y + 0.56, w: 5.48, h: 1.55, fontFace: UI, fontSize: 11.5, color: c[3] === INK && i === 0 ? "AAB9CB" : c[5 - 1], align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
});
s.addText("Prinsip: transparan tentang keterbatasan, tidak memakai data peserta JKN riil tanpa izin resmi, dan setiap klaim tetap dapat dibantah manusia.", { x: M, y: 6.68, w: 12.3, h: 0.28, fontFace: UI, fontSize: 10.5, color: MUTED, margin: 0 });
pagefoot(s, 12);

/* ── S13 B9 PROFIL TIM ────────────────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Bagian 9 · Profil & pengalaman tim");
title(s, "Satu orang, seluruh lini produk");
s.addImage({ path: AST + "decka.jpg", x: M, y: 1.7, w: 3.1, h: 3.875, sizing: { type: "cover", w: 3.1, h: 3.875 } });
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 5.72, w: 3.1, h: 1.0, fill: { color: INK }, rectRadius: 0.1 });
s.addText([
  { text: "Decka Fadhila Tirta\n", options: { bold: true, fontSize: 14, color: "FFFFFF" } },
  { text: "deckafadhila@gmail.com · dktirta.tech", options: { fontSize: 10, color: "9DB2CC" } },
], { x: 0.78, y: 5.86, w: 2.7, h: 0.75, fontFace: UI, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
s.addText("Decka Fadhila Tirta, S.Si.", { x: 4.05, y: 1.72, w: 8.6, h: 0.42, fontFace: DISP, fontSize: 22, bold: true, color: INK, margin: 0 });
s.addText("Lead Engineer dan Product · S.Si. Fisika, Universitas Negeri Yogyakarta (2026)", { x: 4.05, y: 2.18, w: 8.6, h: 0.3, fontFace: UI, fontSize: 12.5, color: GREEN, bold: true, margin: 0 });
const bio = [
  ["Membangun SiKePo dari nol", "Backend FastAPI, pipeline AI (aturan, IsolationForest, LLM), dan frontend vanilla JS yang ringan."],
  ["Data & riset kuantitatif", "Analisis banjir Kabupaten Kudus dengan Python pada 10.000+ titik data; asisten lab Fisika Komputasi dan Sistem Digital UNY."],
  ["AI & otomasi kerja", "Praktik riset berbantuan AI dan agent workflow yang dipakai langsung pada pipeline adjudikasi."],
  ["Riset teknologi & ekosistem", "Evaluasi 300+ proyek Web3; magang BPBD Kabupaten Kudus untuk pemetaan risiko bencana."],
];
bio.forEach((b, i) => {
  const y = 2.62 + i * 0.92;
  s.addText(b[0], { x: 4.05, y, w: 8.7, h: 0.28, fontFace: UI, fontSize: 13, bold: true, color: INK, margin: 0 });
  s.addText(b[1], { x: 4.05, y: y + 0.28, w: 8.7, h: 0.55, fontFace: UI, fontSize: 11.5, color: BODY, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
});
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 4.05, y: 6.35, w: 8.7, h: 0.62, fill: { color: GREENSOFT }, rectRadius: 0.09 });
s.addText([
  { text: "Mengapa mampu eksekusi:  ", options: { bold: true, color: "#067647".slice(1) && "067647" } },
  { text: "satu orang menguasai data, AI, backend, dan antarmuka, sehingga iterasi cepat tanpa koordinasi lintas tim.", options: { color: "4A5568" } },
], { x: 4.35, y: 6.35, w: 8.2, h: 0.62, fontFace: UI, fontSize: 11.5, valign: "middle", align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
pagefoot(s, 13);

/* ── S13b DAFTAR SINGKATAN ────────────────────────────── */
s = p.addSlide();
s.background = { color: "FFFFFF" };
kicker(s, "Daftar singkatan");
title(s, "Istilah dan singkatan yang dipakai");
const abbrL = [
  ["JKN", "Jaminan Kesehatan Nasional"],
  ["BPJS", "Badan Penyelenggara Jaminan Sosial"],
  ["INA-CBG", "Indonesian Case Based Groups (tarif paket klaim)"],
  ["SEP", "Surat Eligibilitas Peserta"],
  ["ICD-10", "Klasifikasi Penyakit Internasional edisi 10"],
  ["LOS", "Length of Stay (lama rawat)"],
  ["e-Fornas", "Formularium Nasional elektronik"],
  ["FKRTL", "Fasilitas Kesehatan Rujukan Tingkat Lanjut"],
];
const abbrR = [
  ["FKTP", "Fasilitas Kesehatan Tingkat Pertama"],
  ["SIMRS", "Sistem Informasi Manajemen Rumah Sakit"],
  ["ML", "Machine Learning (pembelajaran mesin)"],
  ["LLM", "Large Language Model"],
  ["API", "Application Programming Interface"],
  ["RBAC", "Role-Based Access Control (hak akses per peran)"],
  ["UU PDP", "Undang-Undang Pelindungan Data Pribadi"],
  ["KC/PC", "Kantor Cabang / Kantor Cabang Pembantu"],
];
[[abbrL, M], [abbrR, 6.83]].forEach(([rows, x]) => {
  const rowsData = rows.map(([k, v]) => [
    { text: k, options: { bold: true, color: INK, fill: { color: SOFTBG }, fontFace: MONO, fontSize: 10.5 } },
    { text: v, options: { color: BODY, fontSize: 11 } },
  ]);
  s.addTable(rowsData, { x, y: 1.78, w: 5.9, colW: [1.35, 4.55], rowH: 0.5, fontFace: UI, border: { pt: 1, color: LINE }, valign: "middle", margin: 0.08 });
});
s.addText("Pipeline A1, A2, A3 adalah tiga agen audit SiKePo: aturan deterministik, machine learning, dan adjudikasi LLM.", { x: M, y: 6.6, w: 12.3, h: 0.28, fontFace: UI, fontSize: 10.5, color: MUTED, margin: 0 });
pagefoot(s, 14);

/* ── S14 CLOSING (gelap) ──────────────────────────────── */
s = p.addSlide();
s.background = { color: INK };
s.addImage({ path: "D:/FamilyAgent/Nox/workspace/sikepo-app/frontend/img/sikepo-logo.png", x: M, y: 1.15, w: 0.85, h: 0.69 });
s.addText("Detect Smarter.\nProtect JKN.", { x: M, y: 2.15, w: 9, h: 2.2, fontFace: DISP, fontSize: 54, bold: true, color: "FFFFFF", margin: 0, lineSpacingMultiple: 1.15 });
s.addText([
  { text: "SiKePo · ", options: { bold: true, color: "35D08F" } },
  { text: "Sistem Investigasi Kelayakan Klaim & Pola Overbilling", options: { color: "AAB9CB" } },
], { x: M, y: 4.55, w: 10, h: 0.35, fontFace: UI, fontSize: 14, margin: 0 });
s.addShape(p.shapes.LINE, { x: M, y: 5.15, w: 6.4, h: 0, line: { color: "24406B", width: 1 } });
s.addText([
  { text: "Demo live tersedia\n", options: { bold: true, color: "FFFFFF", fontSize: 13 } },
  { text: "Cockpit, Portal Faskes, dan panduan integrasi dapat dicoba langsung pada sesi presentasi.", options: { color: "AAB9CB", fontSize: 11.5 } },
], { x: M, y: 5.35, w: 6.5, h: 0.85, fontFace: UI, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
s.addText([
  { text: "Coba Namanya Ini · Decka Fadhila Tirta\n", options: { bold: true, color: "FFFFFF", fontSize: 13 } },
  { text: "deckafadhila@gmail.com · dktirta.tech", options: { color: "9DB2CC", fontSize: 11.5 } },
], { x: 7.6, y: 5.35, w: 5.2, h: 0.85, fontFace: UI, align: "justify", margin: 0, lineSpacingMultiple: 1.5 });
s.addText("Disclaimer: seluruh angka dan data yang ditampilkan berasal dari dataset demo sintetis, bukan data operasional BPJS Kesehatan.", { x: M, y: 6.62, w: 12.3, h: 0.3, fontFace: UI, fontSize: 10.5, color: "64809F", margin: 0 });
s.addText("Healthkathon BPJS Kesehatan 2026", { x: M, y: 6.95, w: 8, h: 0.3, fontFace: UI, fontSize: 10.5, color: "64809F", margin: 0 });

p.writeFile({ fileName: "C:/Users/Administrator/Downloads/Proposal_SiKePo_Healthkathon2026.pptx" }).then(() => console.log("PPTX selesai"));
