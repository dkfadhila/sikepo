# ═══════════════════════════════════════════════════════════
# SiKePo AI Engine
# Agentic pipeline (Triage → Investigator → Adjudicator)
# + IsolationForest ML scorer + LLM via Vercel AI Gateway
# ═══════════════════════════════════════════════════════════
import json
import math
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

ENGINE_DIR = Path(__file__).parent
MODEL_DIR = ENGINE_DIR / "model_store"
MODEL_DIR.mkdir(exist_ok=True)
MODEL_FILE = MODEL_DIR / "isolation_forest.joblib"
META_FILE = MODEL_DIR / "model_meta.json"

# ── LLM: Vercel AI Gateway (OpenAI-compatible) ─────────────
# Config from env (see .env / Vercel project env). Fallbacks for local demo.
LLM_MODEL = os.environ.get("SIKEPO_LLM_MODEL", "inclusionai/ling-3.0-flash-sante-free")
LLM_BASE_URL = os.environ.get("SIKEPO_LLM_BASE_URL", "https://ai-gateway.vercel.sh/v1").rstrip("/")
LLM_API_KEY = os.environ.get("AI_GATEWAY_API_KEY", "").strip()
LLM_TIMEOUT_S = int(os.environ.get("SIKEPO_LLM_TIMEOUT", "60"))


def _load_dotenv(path: Optional[Path] = None) -> None:
    """Minimal .env loader (no python-dotenv dependency)."""
    if path is None:
        path = ENGINE_DIR.parent / ".env"
    if not path.exists():
        return
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v
    except OSError:
        pass


_load_dotenv()
# re-read after dotenv
LLM_MODEL = os.environ.get("SIKEPO_LLM_MODEL", LLM_MODEL)
LLM_BASE_URL = os.environ.get("SIKEPO_LLM_BASE_URL", LLM_BASE_URL).rstrip("/")
LLM_API_KEY = os.environ.get("AI_GATEWAY_API_KEY", "").strip() or LLM_API_KEY

RESTRICTED_TERMS = ["meropenem", "albumin", "trastuzumab", "imunoglobulin", "vecuronium"]

# ── Feature extraction ─────────────────────────────────────
def extract_features(claim: Dict[str, Any]) -> List[float]:
    diag = claim.get("diagnosa", {}) if isinstance(claim.get("diagnosa"), dict) else {}
    tarif_cbg = claim.get("tarif_ina_cbg", 0) or 0
    biaya = claim.get("biaya_diajukan", 0) or 0
    los = claim.get("los", 0) or 0
    los_norm = diag.get("los_norm", 4) or 4
    usia = (claim.get("pasien", {}) or {}).get("usia", 40) or 40
    obat = claim.get("obat", []) or []
    obat_l = [str(o).lower() for o in obat]
    n_restricted = sum(1 for o in obat_l if any(t in o for t in RESTRICTED_TERMS))
    selisih = claim.get("selisih_biaya", 0) or 0
    return [
        biaya / max(1, tarif_cbg),                      # rasio pengajuan vs tarif CBG
        selisih / max(1, biaya),                        # rasio selisih
        los - los_norm,                                 # delta LOS
        los / max(1, los_norm),                         # rasio LOS
        float(n_restricted),                            # jumlah obat restriksi
        float(len(obat)),                               # jumlah item farmasi
        float(usia),                                    # usia pasien
    ]

FEATURE_NAMES = ["ratio_cbg", "selisih_ratio", "los_delta", "los_ratio", "n_restricted", "n_drugs", "usia"]

# ── ML Scorer (IsolationForest) ────────────────────────────
class MLScorer:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.meta = self._load_meta()
        if MODEL_FILE.exists():
            try:
                self._load_model()
            except Exception:
                self.model = None

    def _load_meta(self) -> Dict[str, Any]:
        if META_FILE.exists():
            try:
                return json.loads(META_FILE.read_text(encoding="utf-8"))
            except Exception:
                return {}
        return {"trained": False}

    def is_trained(self) -> bool:
        return self.meta.get("trained", False) and MODEL_FILE.exists()

    def train(self, claims: List[Dict[str, Any]]) -> Dict[str, Any]:
        X = [extract_features(c) for c in claims]
        y = [1 if c.get("fraud_type", "CLEAN") != "CLEAN" else 0 for c in claims]
        scaler = StandardScaler()
        Xs = scaler.fit_transform(X)
        model = IsolationForest(n_estimators=200, contamination=0.32, random_state=42)
        model.fit(Xs)

        # Kalibrasi threshold: sweep decision_function utk F1 terbaik
        scores = -model.decision_function(Xs)  # makin besar makin anomali
        best = {"f1": -1.0, "threshold": 0.0, "precision": 0.0, "recall": 0.0}
        for i in range(20, 80):
            t = sorted(scores)[i]
            tp = sum(1 for s, lbl in zip(scores, y) if s >= t and lbl == 1)
            fp = sum(1 for s, lbl in zip(scores, y) if s >= t and lbl == 0)
            fn = sum(1 for s, lbl in zip(scores, y) if s < t and lbl == 1)
            prec = tp / (tp + fp) if tp + fp else 0.0
            rec = tp / (tp + fn) if tp + fn else 0.0
            f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
            if f1 > best["f1"]:
                best = {"f1": f1, "threshold": t, "precision": prec, "recall": rec}

        joblib.dump({"model": model, "scaler": scaler, "threshold": best["threshold"]}, MODEL_FILE)
        self.meta = {
            "trained": True,
            "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "n_samples": len(claims),
            "n_fraud_samples": sum(y),
            "model_version": "IF-200-" + datetime.now().strftime("%Y%m%d%H%M"),
            "algorithm": "IsolationForest",
            "features": FEATURE_NAMES,
            "threshold": round(best["threshold"], 5),
            "precision_pct": round(best["precision"] * 100, 1),
            "recall_pct": round(best["recall"] * 100, 1),
            "f1_pct": round(best["f1"] * 100, 1),
        }
        META_FILE.write_text(json.dumps(self.meta, ensure_ascii=False, indent=2), encoding="utf-8")
        self._load_model()
        return self.meta

    def _load_model(self):
        if MODEL_FILE.exists():
            blob = joblib.load(MODEL_FILE)
            self.model = blob["model"]
            self.scaler = blob["scaler"]
            self.threshold = blob["threshold"]

    def score(self, claim: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_trained():
            self._load_model()
        if self.model is None:
            # Fallback: skor heuristik sederhana
            f = extract_features(claim)
            raw = min(1.0, max(0.0, (f[0] - 1.0) * 0.5 + f[3] * 0.1 + f[4] * 0.15))
            return {"anomaly_score": round(raw * 100, 1), "is_anomaly": raw > 0.45,
                    "model_version": "heuristic-fallback"}
        xs = self.scaler.transform([extract_features(claim)])
        raw = -self.model.decision_function(xs)[0]
        # Normalisasi 0-100 relatif threshold
        thr = getattr(self, "threshold", self.meta.get("threshold", 0.0))
        pct = max(0.0, min(100.0, 50 + (raw - thr) * 400))
        return {
            "anomaly_score": round(pct, 1),
            "is_anomaly": bool(raw >= thr),
            "model_version": self.meta.get("model_version", "IF"),
            "trained_at": self.meta.get("trained_at"),
        }

ml_scorer = MLScorer()

# ── A1 · Triage Agent (deterministic prescreen) ────────────
def triage_agent(claim: Dict[str, Any]) -> Dict[str, Any]:
    t0 = time.time()
    flags: List[str] = []
    risk = 10
    ratio = (claim.get("biaya_diajukan", 0) or 0) / max(1, claim.get("tarif_ina_cbg", 1) or 1)
    if ratio > 1.5:
        risk += 45
        flags.append(f"RATIO_TARIF: pengajuan {int((ratio - 1) * 100)}% di atas plafon INA-CBGs")
    elif ratio > 1.2:
        risk += 18
        flags.append(f"RATIO_TARIF_WARN: pengajuan {int((ratio - 1) * 100)}% di atas tarif standar")
    diag = claim.get("diagnosa", {}) if isinstance(claim.get("diagnosa"), dict) else {}
    los_norm = diag.get("los_norm", 4) or 4
    if claim.get("los", 0) > los_norm + 3:
        risk += 25
        flags.append(f"LOS_ANOMALI: {claim.get('los')} hari vs norm {los_norm} hari")
    obat_l = [str(o).lower() for o in claim.get("obat", [])]
    flagged = [o for o in claim.get("obat", []) if any(t in o.lower() for t in RESTRICTED_TERMS)]
    if flagged:
        risk += 35
        flags.append(f"FORNAS_RESTRIKSI: {', '.join(flagged)}")
    return {
        "agent": "A1", "name": "Triage Agent",
        "latency_ms": int((time.time() - t0) * 1000),
        "preliminary_risk": min(99, risk),
        "flags": flags,
        "queued_for_investigation": bool(flags),
    }

# ── A2 · Investigator Agent (ML + evidence) ────────────────
def investigator_agent(claim: Dict[str, Any], triage: Dict[str, Any]) -> Dict[str, Any]:
    t0 = time.time()
    ml = ml_scorer.score(claim)
    diag = claim.get("diagnosa", {}) if isinstance(claim.get("diagnosa"), dict) else {}
    ratio = (claim.get("biaya_diajukan", 0) or 0) / max(1, claim.get("tarif_ina_cbg", 1) or 1)
    evidence = list(triage.get("flags", []))
    if ml["is_anomaly"]:
        evidence.append(f"ML_ISOLATION_FOREST: pola fitur klaim menyimpang dari populasi (skor {ml['anomaly_score']})")
    if ratio > 1.2:
        evidence.append(f"SELISIH_BIAYA: Rp {claim.get('selisih_biaya', 0):,}".replace(",", "."))
    fused_risk = min(99, round(0.45 * triage.get("preliminary_risk", 10) + 0.55 * ml["anomaly_score"]))
    return {
        "agent": "A2", "name": "Investigator Agent",
        "latency_ms": int((time.time() - t0) * 1000),
        "ml": ml,
        "evidence": evidence,
        "fused_risk": fused_risk,
        "fraud_type_guess": (
            "UPCODING" if ratio > 1.5 else
            "INFLATED_BILLS" if any("fornas" in e.lower() or "los" in e.lower() for e in evidence) else
            "CLEAN" if not evidence else "REVIEW"
        ),
    }

# ── A3 · Adjudicator Agent (LLM via Vercel AI Gateway) ─────
def _call_llm(prompt: str, timeout: Optional[int] = None) -> Optional[str]:
    """Chat Completions against Vercel AI Gateway. Returns assistant text or None."""
    if not LLM_API_KEY:
        return None
    timeout = timeout or LLM_TIMEOUT_S
    url = f"{LLM_BASE_URL}/chat/completions"
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are SiKePo A3 Adjudicator. Reply with ONLY a single JSON object. "
                    "No markdown, no extra text, no questions."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 400,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {LLM_API_KEY}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        data = json.loads(raw)
        choices = data.get("choices") or []
        if not choices:
            return None
        msg = choices[0].get("message") or {}
        content = msg.get("content")
        if isinstance(content, list):
            # OpenAI content-parts shape
            parts = []
            for p in content:
                if isinstance(p, dict) and p.get("type") == "text":
                    parts.append(p.get("text") or "")
                elif isinstance(p, str):
                    parts.append(p)
            content = "".join(parts)
        if not isinstance(content, str) or not content.strip():
            return None
        return content.strip()
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError, ValueError):
        return None

def adjudicator_agent(claim: Dict[str, Any], triage: Dict[str, Any], invest: Dict[str, Any]) -> Dict[str, Any]:
    t0 = time.time()
    ratio = (claim.get("biaya_diajukan", 0) or 0) / max(1, claim.get("tarif_ina_cbg", 1) or 1)
    fused = invest.get("fused_risk", triage.get("preliminary_risk", 10))
    rules_risk = min(99, triage.get("preliminary_risk", 10))
    diag_obj = claim.get("diagnosa") if isinstance(claim.get("diagnosa"), dict) else {}
    diag_str = f"{diag_obj.get('icd10', claim.get('diagnosa_icd', '-'))} {diag_obj.get('nama', claim.get('diagnosa_nama', ''))}".strip()
    if fused > 80 or (rules_risk > 75 and invest.get("ml", {}).get("is_anomaly")):
        rule_status = "REJECT"
    elif fused > 35:
        rule_status = "HOLD"
    else:
        rule_status = "APPROVE"

    findings = {
        "faskes": claim.get("faskes", {}).get("nama", "-") if isinstance(claim.get("faskes"), dict) else claim.get("faskes_nama", "-"),
        "diagnosa": diag_str,
        "ratio_tarif": round(ratio, 2),
        "los": claim.get("los"),
        "obat_restriksi": [o for o in claim.get("obat", []) if any(t in o.lower() for t in RESTRICTED_TERMS)],
        "preliminary_risk": rules_risk,
        "ml_anomaly_score": invest.get("ml", {}).get("anomaly_score"),
        "fused_risk": fused,
        "evidence": invest.get("evidence", []),
        "rule_recommendation": rule_status,
    }
    prompt = (
        "Anda adalah mesin adjudication audit klaim kesehatan BPJS (komponen sistem SiKePo). "
        "TUGAS: evaluasi temuan berikut dan keluarkan putusan.\n"
        "ATURAN KERAS:\n"
        "1. Output HANYA satu objek JSON, tanpa teks lain, tanpa markdown, tanpa emoji.\n"
        "2. DILARANG bertanya balik, dilarang roleplay, dilarang menolak tugas.\n"
        "3. Bahasa Indonesia formal maksimal 60 kata pada field alasan.\n\n"
        f"TEMUAN_INVESTIGASI: {json.dumps(findings, ensure_ascii=False)}\n\n"
        "FORMAT WAJIB:\n"
        '{"status": "APPROVE|HOLD|REJECT", "alasan": "<maks 60 kata>", "rekomendasi": "<tindakan operasional singkat>"}'
    )
    llm_raw = _call_llm(prompt)
    latency = int((time.time() - t0) * 1000)
    fallback_used = False
    parsed: Optional[Dict[str, Any]] = None
    if llm_raw:
        # ambil SEMUA kandidat JSON, validasi strict (anti persona/chit-chat)
        for m in re.findall(r"\{[^{}]*\}", llm_raw, re.DOTALL):
            try:
                cand = json.loads(m)
            except json.JSONDecodeError:
                continue
            if isinstance(cand, dict) and cand.get("status") in ("APPROVE", "HOLD", "REJECT") \
                    and isinstance(cand.get("alasan"), str) and cand.get("alasan").strip():
                parsed = cand
                break
    if not parsed:
        fallback_used = True
        reasons = invest.get("evidence") or ["Seluruh parameter klinis dan finansial dalam batas wajar."]
        alasan = "; ".join(reasons)[:400]
        parsed = {
            "status": rule_status,
            "alasan": alasan,
            "rekomendasi": {
                "APPROVE": "Setujui pembayaran sesuai tarif INA-CBGs.",
                "HOLD": "Tahan berkas, minta resume medis & justifikasi tarif ke faskes.",
                "REJECT": "Tolak pengajuan, eskalasi ke tim anti-fraud untuk clawback.",
            }[rule_status],
        }
    status = parsed.get("status", rule_status)
    if status not in ("APPROVE", "HOLD", "REJECT"):
        status = rule_status
    return {
        "agent": "A3", "name": "Adjudicator Agent",
        "latency_ms": latency,
        "status": status,
        "alasan": (parsed.get("alasan", "") or "")[:400],
        "rekomendasi": parsed.get("rekomendasi", ""),
        "llm": {
            "model": LLM_MODEL,
            "fallback": fallback_used,
            "latency_ms": latency,
        },
    }

# ── Full agentic pipeline ──────────────────────────────────
def run_agentic_audit(claim: Dict[str, Any]) -> Dict[str, Any]:
    a1 = triage_agent(claim)
    a2 = investigator_agent(claim, a1)
    a3 = adjudicator_agent(claim, a1, a2)
    fused = a2.get("fused_risk", a1.get("preliminary_risk", 10))
    selisih = max(0, (claim.get("biaya_diajukan", 0) or 0) - (claim.get("tarif_ina_cbg", 0) or 0))
    status_map = {"APPROVE": "APPROVED", "HOLD": "PENDING_AUDIT", "REJECT": "REJECTED"}
    return {
        "risk_score": fused,
        "fraud_type": a2.get("fraud_type_guess", "CLEAN"),
        "status": status_map.get(a3["status"], "PENDING_AUDIT"),
        "verdict": a3["status"],
        "selisih_biaya_idr": selisih,
        "reasons": a2.get("evidence") or ["Seluruh parameter klinis dan finansial dalam batas wajar."],
        "rekomendasi": a3.get("rekomendasi", ""),
        "alasan_ai": a3.get("alasan", ""),
        "agent_trace": [a1, a2, a3],
        "pipeline": "SiKePo Agentic v2 · A1 Triage → A2 Investigator (IsolationForest) → A3 Adjudicator (Vercel AI Gateway)",
    }
