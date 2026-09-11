"""
SiKePo Security — production hardening helpers (stdlib only).
- Password hashing: PBKDF2-HMAC-SHA256 (format "pbkdf2$iters$salt$hash")
- Session persistence: data/sessions.json (survives restart; best-effort on read-only FS)
- Login rate limiting: per-IP sliding window
"""
import hashlib
import json
import os
import secrets
import time
from typing import Any, Dict, List

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")

_PBKDF2_ITERS = 240_000


# ── Password hashing ───────────────────────────────────────
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ITERS)
    return f"pbkdf2${_PBKDF2_ITERS}${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Verify against pbkdf2$ format. Legacy plaintext values return False."""
    try:
        algo, iters, salt, expected = stored.split("$")
        if algo != "pbkdf2":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iters))
        return secrets.compare_digest(dk.hex(), expected)
    except (ValueError, TypeError):
        return False


def is_hashed(stored: str) -> bool:
    return isinstance(stored, str) and stored.startswith("pbkdf2$")


# ── Session persistence ────────────────────────────────────
def load_sessions() -> Dict[str, Dict[str, Any]]:
    try:
        if os.path.exists(SESSIONS_FILE):
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
    except (OSError, ValueError):
        pass
    return {}


def save_sessions(sessions: Dict[str, Dict[str, Any]]) -> None:
    # Read-only filesystem (Vercel): stay in-memory, never crash the API
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions, f)
    except OSError:
        pass


# ── Login rate limiting (per-IP sliding window) ────────────
_login_fails: Dict[str, List[float]] = {}
_MAX_FAILS = 10
_WINDOW_SEC = 300


def login_allowed(ip: str) -> bool:
    now = time.time()
    fails = [t for t in _login_fails.get(ip, []) if now - t < _WINDOW_SEC]
    _login_fails[ip] = fails
    return len(fails) < _MAX_FAILS


def login_record_fail(ip: str) -> None:
    _login_fails.setdefault(ip, []).append(time.time())


def login_reset(ip: str) -> None:
    _login_fails.pop(ip, None)
