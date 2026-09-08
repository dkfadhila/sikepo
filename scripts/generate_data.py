import json
import random
from datetime import datetime, timedelta
from pathlib import Path

faskes_list = [
    {"kode": "FKRTL-001", "nama": "RSUP Dr. Sardjito", "tipe": "A", "kota": "Yogyakarta"},
    {"kode": "FKRTL-002", "nama": "RSUD Tarakan", "tipe": "B", "kota": "Jakarta Pusat"},
    {"kode": "FKRTL-003", "nama": "RS Hermina Kemayoran", "tipe": "B", "kota": "Jakarta Pusat"},
    {"kode": "FKRTL-004", "nama": "RS Siloam Kebon Jeruk", "tipe": "B", "kota": "Jakarta Barat"},
    {"kode": "FKRTL-005", "nama": "RSUD Dr. Soetomo", "tipe": "A", "kota": "Surabaya"},
    {"kode": "FKRTL-006", "nama": "RS Bhayangkara Sartika Asih", "tipe": "C", "kota": "Bandung"},
    {"kode": "FKRTL-007", "nama": "RS Sentra Medika Cikarang", "tipe": "B", "kota": "Bekasi"},
    {"kode": "FKRTL-008", "nama": "RSUD Al-Ihsan", "tipe": "B", "kota": "Bandung"}
]

penyakit_catalog = [
    {
        "icd10": "A01.0", "nama": "Demam Tifoid", "cbg": "I-4-10-I",
        "tarif_standar": 3800000, "los_norm": 4, "obat_lazim": ["Ceftriaxone", "Paracetamol", "RL Infus"]
    },
    {
        "icd10": "J18.9", "nama": "Pneumonia Akut", "cbg": "J-4-16-I",
        "tarif_standar": 5900000, "los_norm": 5, "obat_lazim": ["Azithromycin", "Ambroxol", "Salbutamol Inhalasi"]
    },
    {
        "icd10": "E11.9", "nama": "Diabetes Melitus Tipe 2", "cbg": "E-4-10-I",
        "tarif_standar": 4200000, "los_norm": 3, "obat_lazim": ["Metformin", "Glimepiride", "Insulin Rapid"]
    },
    {
        "icd10": "I21.9", "nama": "Infark Miokard Akut (STEMI)", "cbg": "I-4-11-III",
        "tarif_standar": 18500000, "los_norm": 6, "obat_lazim": ["Aspirin", "Clopidogrel", "Atorvastatin", "Heparin"]
    },
    {
        "icd10": "K29.7", "nama": "Gastritis Tanpa Pendarahan", "cbg": "K-4-17-I",
        "tarif_standar": 2900000, "los_norm": 2, "obat_lazim": ["Omeprazole", "Antasida", "Sucralfate"]
    },
    {
        "icd10": "H25.9", "nama": "Katarak Senilis (Fakoemulsifikasi)", "cbg": "H-1-10-I",
        "tarif_standar": 7200000, "los_norm": 1, "obat_lazim": ["Tetes Mata Antibiotik", "Tetes Steroid"]
    }
]

expensive_unrelated_drugs = [
    {"nama": "Meropenem Inj 1g", "harga": 2400000, "flag": "Antibiotik Cadangan Kuartener"},
    {"nama": "Human Albumin 20%", "harga": 1850000, "flag": "Plasma Expander Ketat"},
    {"nama": "Enoxaparin Sodium Inj", "harga": 1200000, "flag": "Antikoagulan Khusus"},
    {"nama": "Trastuzumab Inj", "harga": 8500000, "flag": "Obat Onkologi Restriktif"}
]

random.seed(42)
claims = []

for i in range(1, 151):
    faskes = random.choice(faskes_list)
    penyakit = random.choice(penyakit_catalog)
    sep_date = datetime.now() - timedelta(days=random.randint(1, 28))
    
    # Kategori anomali
    roll = random.random()
    if roll < 0.55:
        # CLEAN
        fraud_type = "CLEAN"
        risk_score = random.randint(5, 24)
        status = "APPROVED"
        los = penyakit["los_norm"] + random.choice([-1, 0, 1])
        los = max(1, los)
        biaya_rs = int(penyakit["tarif_standar"] * random.uniform(0.95, 1.05))
        obat = list(penyakit["obat_lazim"])
        alasan = ["Seluruh item prosedur & farmasi sesuai e-Fornas dan Clinical Pathway nasional."]
        rekomendasi = "SIAP BAYAR (AUTO-APPROVED)"
    elif roll < 0.70:
        # UPCODING
        fraud_type = "UPCODING"
        risk_score = random.randint(75, 94)
        status = "PENDING_AUDIT"
        los = penyakit["los_norm"] + random.randint(2, 4)
        biaya_rs = int(penyakit["tarif_standar"] * random.uniform(1.6, 2.2))
        obat = list(penyakit["obat_lazim"])
        alasan = [
            f"Tarif INA-CBGs melonjak {int(biaya_rs/penyakit['tarif_standar']*100)}% dari baseline.",
            f"Kode severitas terangkat ke Tingkat III tanpa bukti komorbiditas valid di resume medis."
        ]
        rekomendasi = "HOLD / TURUNKAN TINGKAT SEVERITAS"
    elif roll < 0.82:
        # PHANTOM BILLING
        fraud_type = "PHANTOM_BILLING"
        risk_score = random.randint(85, 98)
        status = "REJECTED"
        los = random.randint(3, 7)
        biaya_rs = int(penyakit["tarif_standar"] * random.uniform(1.3, 1.8))
        obat = list(penyakit["obat_lazim"])
        alasan = [
            "Fingerprint validasi biometrik absen pada hari rawat 2 dan 3.",
            "Tindakan bedah ditagihkan tapi jadwal dokter bedah di SIMRS tercatat off/cuti."
        ]
        rekomendasi = "TOLAK KLAIM & AUDIT INVESTIGATIF"
    elif roll < 0.92:
        # OVERPRESCRIPTION / FORNAS OUTLIER
        fraud_type = "INFLATED_BILLS"
        risk_score = random.randint(68, 88)
        status = "PENDING_AUDIT"
        los = penyakit["los_norm"]
        extra_drug = random.choice(expensive_unrelated_drugs)
        biaya_rs = penyakit["tarif_standar"] + extra_drug["harga"]
        obat = list(penyakit["obat_lazim"]) + [extra_drug["nama"]]
        alasan = [
            f"Ditemukan obat berbiaya tinggi ({extra_drug['nama']}) di luar Formularium Nasional untuk diagnosa {penyakit['icd10']}.",
            f"Ketiadaan restriksi persetujuan Komite Farmasi untuk obat {extra_drug['flag']}."
        ]
        rekomendasi = "POTONG BIAYA FARMASI NON-FORNAS"
    else:
        # CLONING / REPEAT BILLING
        fraud_type = "CLONING"
        risk_score = random.randint(80, 95)
        status = "PENDING_AUDIT"
        los = penyakit["los_norm"]
        biaya_rs = penyakit["tarif_standar"]
        obat = list(penyakit["obat_lazim"])
        alasan = [
            "Resume medis dan item penagihan identik 98% (Jaccard Match) dengan klaim No SEP lain dalam kurun 48 jam.",
            "Indikasi copy-paste rekam medis administratif oleh petugas koder Faskes."
        ]
        rekomendasi = "SUSPEND PENGAJUAN & CROSS-CHECK BERKAS ASLI"

    claim_id = f"SEP-{faskes['kode']}-{sep_date.strftime('%Y%m')}-{i:04d}"
    
    claims.append({
        "id": claim_id,
        "faskes": faskes,
        "pasien": {
            "nama": f"Pasien JKN #{1000 + i}",
            "no_kartu": f"000{random.randint(10000000, 99999999)}",
            "gender": random.choice(["L", "P"]),
            "usia": random.randint(18, 72)
        },
        "diagnosa": penyakit,
        "tgl_masuk": sep_date.strftime("%Y-%m-%d"),
        "tgl_keluar": (sep_date + timedelta(days=los)).strftime("%Y-%m-%d"),
        "los": los,
        "biaya_diajukan": biaya_rs,
        "tarif_ina_cbg": penyakit["tarif_standar"],
        "selisih_biaya": max(0, biaya_rs - penyakit["tarif_standar"]),
        "obat": obat,
        "risk_score": risk_score,
        "fraud_type": fraud_type,
        "status": status,
        "audit_reasons": alasan,
        "rekomendasi": rekomendasi
    })

BASE_DIR = Path(__file__).resolve().parent.parent
with open(BASE_DIR / "data" / "claims_dataset.json", "w", encoding="utf-8") as f:
    json.dump(claims, f, indent=2, ensure_ascii=False)

print(f"Generated {len(claims)} synthetic BPJS claims successfully!")
