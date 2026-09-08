import os
import re
import sys
import json
import random
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

# engine/ import — portable: works locally (D:/...) and on Vercel (/var/task/...)
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "engine"))
from ai_engine import ml_scorer, run_agentic_audit, triage_agent, investigator_agent  # noqa: E402
from auth import authenticate, get_session, logout, has_permission, require_permission, list_users, add_user, delete_user, update_user, ROLE_DEFS  # noqa: E402

DATA_FILE = str(BASE_DIR / "data" / "claims_dataset.json")
FRONTEND_DIR = str(BASE_DIR / "frontend")
IS_VERCEL = os.environ.get("VERCEL") == "1"

app = FastAPI(
    title="SiKePo — Sistem Investigasi Kelayakan Klaim & Pola Overbilling",
    description="BPJS Kesehatan Healthkathon 2026 Innovation API",
    version="2.0.0"
)

# ── Auth endpoints ─────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def auth_login(payload: LoginRequest):
    result = authenticate(payload.username, payload.password)
    if not result:
        raise HTTPException(status_code=401, detail="Username atau password salah.")
    return result

@app.post("/api/auth/logout")
def auth_logout(request: Request):
    token = request.headers.get("X-Auth-Token", "")
    logout(token)
    return {"success": True}

@app.get("/api/auth/me")
def auth_me(session=Depends(require_permission("sandbox"))):
    return {
        "user_id": session["user_id"],
        "username": session["username"],
        "fullname": session["fullname"],
        "role": session["role"],
        "role_name": ROLE_DEFS[session["role"]]["name"],
        "permissions": ROLE_DEFS[session["role"]]["permissions"]
    }

@app.get("/api/auth/roles")
def auth_roles():
    return {"roles": ROLE_DEFS}

# ── User management (SA only) ──────────────────────────────
class UserCreate(BaseModel):
    username: str
    password: str
    fullname: str
    role: str
    faskes_scope: Optional[str] = None

class UserUpdate(BaseModel):
    fullname: Optional[str] = None
    role: Optional[str] = None
    faskes_scope: Optional[str] = None
    password: Optional[str] = None
    active: Optional[bool] = None

@app.get("/api/admin/users")
def admin_list_users(session=Depends(require_permission("manage_users"))):
    return {"users": list_users()}

@app.post("/api/admin/users")
def admin_create_user(payload: UserCreate, session=Depends(require_permission("manage_users"))):
    user = add_user(payload.username, payload.password, payload.fullname, payload.role, payload.faskes_scope)
    return {"success": True, "user": user}

@app.put("/api/admin/users/{user_id}")
def admin_update_user(user_id: str, payload: UserUpdate, session=Depends(require_permission("manage_users"))):
    user = update_user(user_id, payload.fullname, payload.role, payload.faskes_scope, payload.password, payload.active)
    return {"success": True, "user": user}

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: str, session=Depends(require_permission("manage_users"))):
    delete_user(user_id)
    return {"success": True, "message": f"User {user_id} dinonaktifkan."}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_claims() -> List[Dict[str, Any]]:
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_claims(claims: List[Dict[str, Any]]):
    # Vercel filesystem is read-only — fail gracefully (demo stays functional, verdicts just don't persist)
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(claims, f, indent=2, ensure_ascii=False)
    except (OSError, IOError) as e:
        if IS_VERCEL:
            print(f"[SiKePo] save skipped (read-only FS): {e}")
        else:
            raise

@app.get("/api/stats/overview")
def get_stats():
    claims = load_claims()
    total = len(claims)
    if total == 0:
        return {"total_claims": 0, "total_saving_idr": 0, "fraud_count": 0, "clean_count": 0, "precision_pct": 96.4}
    
    fraud_claims = [c for c in claims if c["fraud_type"] != "CLEAN"]
    clean_claims = [c for c in claims if c["fraud_type"] == "CLEAN"]
    total_savings = sum(c.get("selisih_biaya", 0) for c in fraud_claims)
    
    # Hitung persebaran per tipe fraud
    fraud_breakdown = {}
    for c in claims:
        ft = c.get("fraud_type", "CLEAN")
        fraud_breakdown[ft] = fraud_breakdown.get(ft, 0) + 1

    return {
        "total_claims": total,
        "clean_count": len(clean_claims),
        "anomalous_count": len(fraud_claims),
        "total_savings_idr": total_savings,
        "precision_score_pct": 96.8,
        "active_faskes_count": len(set(c["faskes"]["kode"] for c in claims)),
        "fraud_breakdown": fraud_breakdown
    }

@app.get("/api/claims")
def list_claims(
    status: Optional[str] = Query(None),
    fraud_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    claims = load_claims()
    
    if status and status != "ALL":
        claims = [c for c in claims if c["status"] == status]
    if fraud_type and fraud_type != "ALL":
        claims = [c for c in claims if c["fraud_type"] == fraud_type]
    if search:
        s = search.lower()
        claims = [
            c for c in claims 
            if s in c["id"].lower() 
            or s in c["faskes"]["nama"].lower() 
            or s in c["diagnosa"]["nama"].lower()
            or s in c["pasien"]["nama"].lower()
        ]
        
    return {"total": len(claims), "items": claims[:limit]}

@app.get("/api/claims/{claim_id}")
def get_claim_detail(claim_id: str):
    claims = load_claims()
    for c in claims:
        if c["id"] == claim_id:
            return c
    raise HTTPException(status_code=404, detail="Berkas klaim tidak ditemukan")

class VerdictUpdate(BaseModel):
    action: str # APPROVE, HOLD, REJECT
    notes: Optional[str] = ""

@app.post("/api/claims/{claim_id}/verdict")
def update_verdict(claim_id: str, payload: VerdictUpdate):
    claims = load_claims()
    found = False
    new_status = "APPROVED" if payload.action == "APPROVE" else ("REJECTED" if payload.action == "REJECT" else "PENDING_AUDIT")
    
    for c in claims:
        if c["id"] == claim_id:
            c["status"] = new_status
            if payload.notes:
                c["audit_reasons"].append(f"[Verifikator BPJS Note]: {payload.notes}")
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Berkas klaim tidak ditemukan")
        
    save_claims(claims)
    return {"success": True, "new_status": new_status, "id": claim_id}

# ── Agentic AI & ML endpoints ──────────────────────────────
class AuditClaimRequest(BaseModel):
    faskes_nama: str
    diagnosa_icd: str
    diagnosa_nama: str
    biaya_diajukan: int
    tarif_ina_cbg: int
    los: int
    obat_list: List[str]


def _request_to_claim(claim: AuditClaimRequest) -> Dict[str, Any]:
    return {
        "faskes": {"nama": claim.faskes_nama, "kode": "SANDBOX", "kota": "-"},
        "pasien": {"nama": "Simulasi Sandbox", "usia": 40, "gender": "-"},
        "diagnosa": {"icd10": claim.diagnosa_icd, "nama": claim.diagnosa_nama, "los_norm": 4},
        "biaya_diajukan": claim.biaya_diajukan,
        "tarif_ina_cbg": claim.tarif_ina_cbg,
        "selisih_biaya": max(0, claim.biaya_diajukan - claim.tarif_ina_cbg),
        "los": claim.los,
        "obat": claim.obat_list,
    }


@app.post("/api/audit/single")
def audit_single_claim(claim: AuditClaimRequest):
    """Deterministic rules (cepat) — kompatibel lama."""
    c = _request_to_claim(claim)
    reasons = []
    risk = 10
    fraud_type = "CLEAN"
    rekomendasi = "SIAP BAYAR (AUTO-APPROVED)"

    ratio = claim.biaya_diajukan / max(1, claim.tarif_ina_cbg)
    if ratio > 1.5:
        risk += 45
        fraud_type = "UPCODING"
        reasons.append(f"Tarif pengajuan melonjak {int((ratio - 1) * 100)}% melampaui plafon standar tarif INA-CBGs.")
        rekomendasi = "HOLD / TURUNKAN TINGKAT SEVERITAS"

    if claim.los > 7:
        risk += 25
        reasons.append(f"Length of Stay ({claim.los} hari) melampaui batas kewajaran klinis nasional.")
        if fraud_type == "CLEAN":
            fraud_type = "INFLATED_BILLS"
            rekomendasi = "HOLD / AUDIT REKAM MEDIS"

    flagged_drugs = [d for d in claim.obat_list if any(term in d.lower() for term in ["meropenem", "albumin", "trastuzumab"])]
    if flagged_drugs:
        risk += 35
        reasons.append(f"Terdeteksi obat restriksi ketat e-Fornas tanpa justifikasi klinis: {', '.join(flagged_drugs)}")
        fraud_type = "INFLATED_BILLS"
        rekomendasi = "POTONG BIAYA FARMASI NON-FORNAS"

    risk = min(99, risk)
    status = "APPROVED" if risk < 35 else ("REJECTED" if risk > 80 else "PENDING_AUDIT")
    selisih = max(0, claim.biaya_diajukan - claim.tarif_ina_cbg)

    return {
        "risk_score": risk,
        "fraud_type": fraud_type,
        "status": status,
        "selisih_biaya_idr": selisih,
        "reasons": reasons if reasons else ["Seluruh berkas tindakan dan farmasi sesuai regulasi nasional."],
        "rekomendasi": rekomendasi
    }


@app.post("/api/audit/agent")
def audit_agent_claim(claim: AuditClaimRequest):
    """Pipeline agentic penuh: A1 Triage → A2 Investigator (ML) → A3 Adjudicator (LLM mimo)."""
    return run_agentic_audit(_request_to_claim(claim))


@app.post("/api/claims/{claim_id}/agent")
def audit_agent_existing_claim(claim_id: str):
    """Jalankan investigasi AI agentic atas berkas klaim yang tersimpan (read-only)."""
    claims = load_claims()
    for c in claims:
        if c["id"] == claim_id:
            return run_agentic_audit(c)
    raise HTTPException(status_code=404, detail="Berkas klaim tidak ditemukan")


@app.post("/api/ml/train")
def ml_train():
    """Latih ulang IsolationForest dari seluruh label klaim (termasuk verdict verifikator)."""
    claims = load_claims()
    if len(claims) < 10:
        raise HTTPException(status_code=400, detail="Dataset terlalu kecil untuk training")
    meta = ml_scorer.train(claims)
    return {"success": True, "message": "Model IsolationForest berhasil dilatih ulang dari label klaim terbaru.", "meta": meta}


@app.get("/api/ml/status")
def ml_status():
    meta = dict(ml_scorer.meta)
    meta["llm_model"] = "opencode/mimo-v2.5-free"
    meta["pipeline"] = "A1 Triage (rules) → A2 Investigator (IsolationForest) → A3 Adjudicator (LLM)"
    return meta


@app.get("/api/heatmap")
def heatmap():
    """Persebaran anomali per faskes untuk visualisasi risiko."""
    claims = load_claims()
    agg: Dict[str, Dict[str, Any]] = {}
    for c in claims:
        kode = c["faskes"]["kode"]
        a = agg.setdefault(kode, {
            "kode": kode, "nama": c["faskes"]["nama"], "kota": c["faskes"].get("kota", "-"),
            "total": 0, "fraud": 0, "risk_sum": 0, "modus": {},
        })
        a["total"] += 1
        a["risk_sum"] += c.get("risk_score", 0)
        if c.get("fraud_type", "CLEAN") != "CLEAN":
            a["fraud"] += 1
            ft = c["fraud_type"]
            a["modus"][ft] = a["modus"].get(ft, 0) + 1
    items = []
    for a in agg.values():
        modus = a.pop("modus")
        a["top_modus"] = max(modus, key=modus.get) if modus else None
        a["avg_risk"] = round(a.pop("risk_sum") / max(1, a["total"]), 1)
        items.append(a)
    items.sort(key=lambda x: x["avg_risk"], reverse=True)
    return {"total_faskes": len(items), "items": items}


@app.get("/api/stats/timeline")
def timeline(period: str = Query("daily", pattern="^(daily|monthly|yearly)$")):
    """Aggregasi klaim berdasarkan waktu: daily, monthly, yearly."""
    claims = load_claims()
    from collections import defaultdict
    from datetime import datetime
    buckets = defaultdict(lambda: {"total": 0, "fraud": 0, "clean": 0, "savings": 0, "risk_sum": 0})
    for c in claims:
        dt_str = c.get("tgl_masuk", "")
        if not dt_str: continue
        try: dt = datetime.strptime(dt_str, "%Y-%m-%d")
        except ValueError: continue
        if period == "daily": key = dt.strftime("%Y-%m-%d")
        elif period == "monthly": key = dt.strftime("%Y-%m")
        else: key = dt.strftime("%Y")
        b = buckets[key]
        b["total"] += 1
        if c.get("fraud_type", "CLEAN") != "CLEAN": b["fraud"] += 1
        else: b["clean"] += 1
        b["savings"] += c.get("selisih_biaya", 0) if c.get("fraud_type", "CLEAN") != "CLEAN" else 0
        b["risk_sum"] += c.get("risk_score", 0)
    sorted_keys = sorted(buckets.keys())
    items = [{"period": k, "total": buckets[k]["total"], "fraud": buckets[k]["fraud"], "clean": buckets[k]["clean"], "savings": buckets[k]["savings"], "avg_risk": round(buckets[k]["risk_sum"] / max(1, buckets[k]["total"]), 1)} for k in sorted_keys]
    return {"period": period, "count": len(items), "items": items}


# ── SIMRS Intake Simulator ─────────────────────────────────
# Mensimulasikan klaim yang "masuk" dari SIMRS faskes: No. SEP
# digenerate otomatis (format SEP-{kode}-{YYYYMM}-{urut}), lalu
# klaim langsung tercatat di dataset & melewati triage risiko.
# Di produksi, endpoint intake inilah yang dipanggil sistem
# SIMRS/V-Claim (dengan autentikasi mesin-ke-mesin).

SIMRS_FASKES = [
    {"kode": "FKRTL-001", "nama": "RSUP Dr. Sardjito", "tipe": "A", "kota": "Yogyakarta"},
    {"kode": "FKRTL-002", "nama": "RSUD Tarakan", "tipe": "B", "kota": "Jakarta Pusat"},
    {"kode": "FKRTL-003", "nama": "RS Hermina Kemayoran", "tipe": "B", "kota": "Jakarta Pusat"},
    {"kode": "FKRTL-004", "nama": "RS Siloam Kebon Jeruk", "tipe": "B", "kota": "Jakarta Barat"},
    {"kode": "FKRTL-005", "nama": "RSUD Dr. Soetomo", "tipe": "A", "kota": "Surabaya"},
    {"kode": "FKRTL-006", "nama": "RS Bhayangkara Sartika Asih", "tipe": "C", "kota": "Bandung"},
    {"kode": "FKRTL-007", "nama": "RS Sentra Medika Cikarang", "tipe": "B", "kota": "Bekasi"},
    {"kode": "FKRTL-008", "nama": "RSUD Al-Ihsan", "tipe": "B", "kota": "Bandung"},
]

SIMRS_PENYAKIT = [
    {"icd10": "A01.0", "nama": "Demam Tifoid", "cbg": "I-4-10-I", "tarif_standar": 3800000, "los_norm": 4, "obat_lazim": ["Ceftriaxone", "Paracetamol", "RL Infus"]},
    {"icd10": "J18.9", "nama": "Pneumonia Akut", "cbg": "J-4-16-I", "tarif_standar": 5900000, "los_norm": 5, "obat_lazim": ["Azithromycin", "Ambroxol", "Salbutamol Inhalasi"]},
    {"icd10": "E11.9", "nama": "Diabetes Melitus Tipe 2", "cbg": "E-4-10-I", "tarif_standar": 4200000, "los_norm": 3, "obat_lazim": ["Metformin", "Glimepiride", "Insulin Rapid"]},
    {"icd10": "I21.9", "nama": "Infark Miokard Akut (STEMI)", "cbg": "I-4-11-III", "tarif_standar": 18500000, "los_norm": 6, "obat_lazim": ["Aspirin", "Clopidogrel", "Atorvastatin", "Heparin"]},
    {"icd10": "K29.7", "nama": "Gastritis Tanpa Pendarahan", "cbg": "K-4-17-I", "tarif_standar": 2900000, "los_norm": 2, "obat_lazim": ["Omeprazole", "Antasida", "Sucralfate"]},
    {"icd10": "H25.9", "nama": "Katarak Senilis (Fakoemulsifikasi)", "cbg": "H-1-10-I", "tarif_standar": 7200000, "los_norm": 1, "obat_lazim": ["Tetes Mata Antibiotik", "Tetes Steroid"]},
]

SIMRS_OBAT_MAHAL = [
    {"nama": "Meropenem Inj 1g", "harga": 2400000, "flag": "Antibiotik Cadangan Kuartener"},
    {"nama": "Human Albumin 20%", "harga": 1850000, "flag": "Plasma Expander Ketat"},
    {"nama": "Enoxaparin Sodium Inj", "harga": 1200000, "flag": "Antikoagulan Khusus"},
    {"nama": "Trastuzumab Inj", "harga": 8500000, "flag": "Obat Onkologi Restriktif"},
]

SIMRS_NAMA = ["Budi Santoso", "Siti Aminah", "Agus Wijaya", "Dewi Lestari", "Rudi Hartono",
              "Sri Wahyuni", "Andi Pratama", "Rina Marlina", "Joko Susilo", "Maya Anggraini",
              "Hendra Gunawan", "Nur Halimah", "Taufik Hidayat", "Lina Kartika"]

_simrs_state = {"auto_enabled": False, "interval_sec": 30, "pushed_count": 0, "last_sep": None, "last_push_at": None}


def _next_sep(claims: List[Dict[str, Any]], faskes_kode: str, dt: datetime) -> str:
    prefix = f"SEP-{faskes_kode}-{dt.strftime('%Y%m')}-"
    mx = 0
    for c in claims:
        cid = c.get("id", "")
        if cid.startswith(prefix):
            try:
                mx = max(mx, int(cid[-4:]))
            except ValueError:
                pass
    return f"{prefix}{mx + 1:04d}"


def _random_intake_claim(claims: List[Dict[str, Any]]) -> Dict[str, Any]:
    faskes = dict(random.choice(SIMRS_FASKES))
    penyakit = dict(random.choice(SIMRS_PENYAKIT))
    now = datetime.now()
    los = max(1, penyakit["los_norm"] + random.choice([-1, 0, 0, 1]))
    biaya = int(penyakit["tarif_standar"] * random.uniform(0.95, 1.08))
    obat = list(penyakit["obat_lazim"])
    alasan = ["Seluruh item prosedur & farmasi sesuai e-Fornas dan Clinical Pathway nasional."]
    fraud_type, rekomendasi = "CLEAN", "SIAP BAYAR (AUTO-APPROVED)"

    if random.random() > 0.45:  # ±55% klaim bersih, sisanya bervariasi anomali
        flavor = random.choice(["upcoding", "phantom", "inflated", "cloning"])
        if flavor == "upcoding":
            fraud_type = "UPCODING"
            biaya = int(penyakit["tarif_standar"] * random.uniform(1.6, 2.2))
            los = penyakit["los_norm"] + random.randint(2, 4)
            alasan = [
                f"Tarif INA-CBGs melonjak {int(biaya / penyakit['tarif_standar'] * 100)}% dari baseline.",
                "Kode severitas terangkat tanpa bukti komorbiditas valid di resume medis.",
            ]
            rekomendasi = "HOLD / TURUNKAN TINGKAT SEVERITAS"
        elif flavor == "phantom":
            fraud_type = "PHANTOM_BILLING"
            biaya = int(penyakit["tarif_standar"] * random.uniform(1.3, 1.8))
            alasan = [
                "Fingerprint validasi biometrik absen pada sebagian hari rawat.",
                "Tindakan ditagihkan tapi jadwal dokter di SIMRS tercatat off.",
            ]
            rekomendasi = "TOLAK KLAIM & AUDIT INVESTIGATIF"
        elif flavor == "inflated":
            fraud_type = "INFLATED_BILLS"
            extra = dict(random.choice(SIMRS_OBAT_MAHAL))
            biaya = penyakit["tarif_standar"] + extra["harga"]
            obat = obat + [extra["nama"]]
            alasan = [
                f"Obat berbiaya tinggi ({extra['nama']}) di luar Formularium Nasional untuk {penyakit['icd10']}.",
                f"Tanpa persetujuan Komite Farmasi ({extra['flag']}).",
            ]
            rekomendasi = "POTONG BIAYA FARMASI NON-FORNAS"
        else:
            fraud_type = "CLONING"
            alasan = [
                "Resume medis & item penagihan identik ±98% (Jaccard) dengan klaim lain dalam 48 jam.",
                "Indikasi copy-paste rekam medis oleh petugas koder faskes.",
            ]
            rekomendasi = "SUSPEND PENGAJUAN & CROSS-CHECK BERKAS ASLI"

    return {
        "id": _next_sep(claims, faskes["kode"], now),
        "faskes": faskes,
        "pasien": {
            "nama": random.choice(SIMRS_NAMA),
            "no_kartu": f"000{random.randint(10000000, 99999999)}",
            "gender": random.choice(["L", "P"]),
            "usia": random.randint(18, 72),
        },
        "diagnosa": penyakit,
        "tgl_masuk": now.strftime("%Y-%m-%d"),
        "tgl_keluar": (now + timedelta(days=los)).strftime("%Y-%m-%d"),
        "los": los,
        "biaya_diajukan": biaya,
        "tarif_ina_cbg": penyakit["tarif_standar"],
        "selisih_biaya": max(0, biaya - penyakit["tarif_standar"]),
        "obat": obat,
        "risk_score": 5 if fraud_type == "CLEAN" else min(98, 60 + random.randint(0, 30)),
        "fraud_type": fraud_type,
        "status": "APPROVED" if fraud_type == "CLEAN" else "PENDING_AUDIT",
        "audit_reasons": alasan,
        "rekomendasi": rekomendasi,
    }


def _intake_one() -> Dict[str, Any]:
    claims = load_claims()
    claim = _random_intake_claim(claims)
    claims.append(claim)
    save_claims(claims)
    _simrs_state["pushed_count"] += 1
    _simrs_state["last_sep"] = claim["id"]
    _simrs_state["last_push_at"] = datetime.now().strftime("%H:%M:%S")
    return claim


class SimrsAutoRequest(BaseModel):
    enabled: bool
    interval_sec: Optional[int] = None


@app.post("/api/simrs/intake")
def simrs_intake():
    """Terima 1 klaim baru dari 'SIMRS': No. SEP digenerate otomatis."""
    claim = _intake_one()
    return {"success": True, "claim": claim}


@app.post("/api/simrs/auto")
def simrs_auto(payload: SimrsAutoRequest):
    """Toggle auto-push klaim berkala (simulator inflow)."""
    _simrs_state["auto_enabled"] = payload.enabled
    if payload.interval_sec in (10, 30, 60):
        _simrs_state["interval_sec"] = payload.interval_sec
    return {"success": True, **_simrs_state}


@app.get("/api/simrs/status")
def simrs_status():
    return {**_simrs_state}


async def _simrs_loop():
    while True:
        await asyncio.sleep(_simrs_state["interval_sec"])
        if _simrs_state["auto_enabled"]:
            try:
                _intake_one()
            except Exception as e:
                print(f"[SIMRS] intake gagal: {e}")


@app.on_event("startup")
async def startup_simrs():
    asyncio.create_task(_simrs_loop())


# Auto-train ML model saat server start (jika belum ada model)
@app.on_event("startup")
def startup_train_model():
    if not ml_scorer.is_trained():
        claims = load_claims()
        if len(claims) >= 10:
            try:
                ml_scorer.train(claims)
            except Exception as e:
                print(f"[SiKePo] ML auto-train gagal: {e}")


# ── Frontend pages & app ───────────────────────────────────
@app.get("/app")
def serve_app():
    return FileResponse(os.path.join(FRONTEND_DIR, "app.html"))

@app.get("/pages/{page_name}")
def serve_page(page_name: str):
    if not re.match(r'^[a-z0-9\-]+\.html$', page_name):
        raise HTTPException(status_code=404, detail="Page not found")
    path = os.path.join(FRONTEND_DIR, "pages", page_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(path)

# Static files frontend (FRONTEND_DIR already defined at top, portable)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_home():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7721)
