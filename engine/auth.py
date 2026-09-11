"""
SiKePo Auth System — Role-Based Access Control
4 roles: SA (Super Admin), VK (Verifikator), ST (Satgas AF), AU (Auditor)
Passwords are stored hashed (PBKDF2, see security.py). Legacy plaintext
values from users.json are upgraded transparently on first successful login.
Sessions persist to data/sessions.json so restarts do not log users out.
"""
import json
import os
import secrets
import time
from typing import Any, Dict, List, Optional
from functools import wraps
from fastapi import HTTPException, Request

from security import hash_password, verify_password, is_hashed, load_sessions, save_sessions

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")

# ── Role definitions ───────────────────────────────────────
ROLE_DEFS = {
    "SA": {
        "name": "Super Admin",
        "code": "SA",
        "desc": "Akses penuh + kelola user",
        "permissions": ["view_all_claims", "verdict", "ai_investigate", "ml_train", "sandbox", "manage_users"]
    },
    "VK": {
        "name": "Verifikator KC",
        "code": "VK",
        "desc": "Audit klaim wilayah + verdict final",
        "permissions": ["view_cabang_claims", "verdict", "ai_investigate", "ml_train", "sandbox"]
    },
    "ST": {
        "name": "Satgas Anti-Fraud",
        "code": "ST",
        "desc": "Investigasi lintas faskes, tanpa verdict",
        "permissions": ["view_all_claims", "ai_investigate", "ml_train", "sandbox"]
    },
    "AU": {
        "name": "Auditor / Dewan Juri",
        "code": "AU",
        "desc": "Read-only: transparansi & sandbox",
        "permissions": ["view_all_claims", "sandbox"]
    }
}

# ── Session store (persisted to disk) ──────────────────────
_sessions: Dict[str, Dict[str, Any]] = {}
_sessions_loaded = False

def _load_sessions_once():
    global _sessions, _sessions_loaded
    if not _sessions_loaded:
        _sessions = load_sessions()
        _sessions_loaded = True

def _persist_sessions():
    save_sessions(_sessions)

def _load_users() -> List[Dict[str, Any]]:
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_users(users: List[Dict[str, Any]]):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

# ── Auth functions ─────────────────────────────────────────
def authenticate(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Validate credentials, return user dict (without password) or None.
    Legacy plaintext passwords are verified then upgraded to a hash."""
    _load_sessions_once()
    users = _load_users()
    for u in users:
        if u["username"] != username or not u.get("active", True):
            continue
        stored = u.get("password", "")
        if is_hashed(stored):
            ok = verify_password(password, stored)
        else:
            ok = secrets.compare_digest(stored, password)
            if ok:
                u["password"] = hash_password(password)  # transparent upgrade
                _save_users(users)
        if not ok:
            continue
        token = secrets.token_hex(32)
        _sessions[token] = {
            "user_id": u["id"],
            "username": u["username"],
            "fullname": u["fullname"],
            "role": u["role"],
            "faskes_scope": u.get("faskes_scope"),
            "login_at": time.time()
        }
        _persist_sessions()
        return {
            "token": token,
            "user_id": u["id"],
            "username": u["username"],
            "fullname": u["fullname"],
            "role": u["role"],
            "role_name": ROLE_DEFS[u["role"]]["name"],
            "role_desc": ROLE_DEFS[u["role"]]["desc"],
            "permissions": ROLE_DEFS[u["role"]]["permissions"],
            "faskes_scope": u.get("faskes_scope")
        }
    return None

def get_session(token: str) -> Optional[Dict[str, Any]]:
    """Get session by token. Returns None if expired (24h) or invalid."""
    _load_sessions_once()
    session = _sessions.get(token)
    if not session:
        return None
    if time.time() - session["login_at"] > 86400:  # 24h expiry
        _sessions.pop(token, None)
        _persist_sessions()
        return None
    return session

def logout(token: str):
    _load_sessions_once()
    if _sessions.pop(token, None) is not None:
        _persist_sessions()

def has_permission(session: Dict[str, Any], perm: str) -> bool:
    """Check if session has a specific permission."""
    role = session.get("role", "")
    role_def = ROLE_DEFS.get(role, {})
    return perm in role_def.get("permissions", [])

def require_permission(perm: str):
    """FastAPI dependency: require a permission from the X-Auth-Token header."""
    def dependency(request: Request):
        token = request.headers.get("X-Auth-Token", "")
        session = get_session(token)
        if not session:
            raise HTTPException(status_code=401, detail="Session tidak valid atau sudah expired. Silakan login ulang.")
        if not has_permission(session, perm):
            raise HTTPException(status_code=403, detail=f"Anda tidak memiliki hak akses: {perm}")
        return session
    return dependency

# ── User management (SA only) ──────────────────────────────
def list_users() -> List[Dict[str, Any]]:
    """Return all users without passwords."""
    users = _load_users()
    return [{k: v for k, v in u.items() if k != "password"} for u in users]

def add_user(username: str, password: str, fullname: str, role: str, faskes_scope: Optional[str] = None) -> Dict[str, Any]:
    """Add a new user. Returns the created user (without password)."""
    if role not in ROLE_DEFS:
        raise HTTPException(status_code=400, detail=f"Role tidak valid: {role}. Pilihan: {', '.join(ROLE_DEFS.keys())}")
    users = _load_users()
    if any(u["username"] == username for u in users):
        raise HTTPException(status_code=409, detail=f"Username '{username}' sudah digunakan.")
    new_id = f"USR-{len(users) + 1:03d}"
    new_user = {
        "id": new_id,
        "username": username,
        "password": hash_password(password),
        "fullname": fullname,
        "role": role,
        "faskes_scope": faskes_scope,
        "created_at": time.strftime("%Y-%m-%d"),
        "active": True
    }
    users.append(new_user)
    _save_users(users)
    return {k: v for k, v in new_user.items() if k != "password"}

def delete_user(user_id: str) -> bool:
    """Deactivate a user (soft delete). Cannot delete the last SA."""
    users = _load_users()
    target = next((u for u in users if u["id"] == user_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"User {user_id} tidak ditemukan.")
    if target["username"] == "admin":
        raise HTTPException(status_code=403, detail="Tidak bisa menghapus akun admin utama.")
    # Check: don't allow deleting the last SA
    if target["role"] == "SA":
        sa_count = sum(1 for u in users if u["role"] == "SA" and u.get("active", True))
        if sa_count <= 1:
            raise HTTPException(status_code=403, detail="Tidak bisa menghapus Super Admin terakhir.")
    target["active"] = False
    _save_users(users)
    return True

def update_user(user_id: str, fullname: Optional[str] = None, role: Optional[str] = None, 
                faskes_scope: Optional[str] = None, password: Optional[str] = None, 
                active: Optional[bool] = None) -> Dict[str, Any]:
    """Update user fields."""
    if role and role not in ROLE_DEFS:
        raise HTTPException(status_code=400, detail=f"Role tidak valid: {role}")
    users = _load_users()
    target = next((u for u in users if u["id"] == user_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"User {user_id} tidak ditemukan.")
    if target["username"] == "admin" and role and role != "SA":
        raise HTTPException(status_code=403, detail="Tidak bisa mengubah role akun admin utama.")
    if fullname is not None: target["fullname"] = fullname
    if role is not None: target["role"] = role
    if faskes_scope is not None: target["faskes_scope"] = faskes_scope
    if password is not None: target["password"] = hash_password(password)
    if active is not None: target["active"] = active
    _save_users(users)
    return {k: v for k, v in target.items() if k != "password"}
