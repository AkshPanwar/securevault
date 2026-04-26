"""
╔══════════════════════════════════════════════════════════════╗
║  MODULE 1: AUTHENTICATION                                    ║
║  Features: Password hashing, 2FA (TOTP), Session mgmt       ║
╚══════════════════════════════════════════════════════════════╝
"""

import hashlib
import hmac
import os
import json
import time
import struct
import base64
import secrets
import logging
from pathlib import Path

# Project paths
BASE_DIR = Path(__file__).parent.parent
USER_DATA_DIR = BASE_DIR / "user_data"
USER_DATA_DIR.mkdir(exist_ok=True)
USERS_FILE = USER_DATA_DIR / "users.json"
LOG_FILE = BASE_DIR / "logs" / "auth.log"
LOG_FILE.parent.mkdir(exist_ok=True)

# Setup logger
logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s [AUTH] %(levelname)s - %(message)s"
)
logger = logging.getLogger("auth")


# ─────────────────────────────────────────────
#  PASSWORD HASHING  (SHA-256 + salt, bcrypt-style)
# ─────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash password with a random salt using SHA-256 (PBKDF2)."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        hash_name="sha256",
        password=password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        iterations=100_000
    )
    hashed = base64.b64encode(dk).decode("utf-8")
    return f"{salt}${hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a plaintext password against stored hash."""
    try:
        salt, hashed = stored_hash.split("$")
        dk = hashlib.pbkdf2_hmac(
            hash_name="sha256",
            password=password.encode("utf-8"),
            salt=salt.encode("utf-8"),
            iterations=100_000
        )
        new_hash = base64.b64encode(dk).decode("utf-8")
        return hmac.compare_digest(new_hash, hashed)
    except Exception:
        return False


# ─────────────────────────────────────────────
#  TOTP — TIME-BASED ONE-TIME PASSWORD (2FA)
#  RFC 6238 implementation (same algo as Google Authenticator)
# ─────────────────────────────────────────────

def generate_totp_secret() -> str:
    """Generate a new base32 TOTP secret."""
    random_bytes = secrets.token_bytes(20)
    return base64.b32encode(random_bytes).decode("utf-8")


def get_totp_code(secret: str, timestamp: float = None) -> str:
    """
    Generate 6-digit TOTP code for the current 30-second window.
    Compatible with Google Authenticator.
    """
    if timestamp is None:
        timestamp = time.time()

    # Get 30-second time step
    time_step = int(timestamp) // 30
    time_bytes = struct.pack(">Q", time_step)

    # HMAC-SHA1
    key = base64.b32decode(secret, casefold=True)
    mac = hmac.new(key, time_bytes, hashlib.sha1).digest()

    # Dynamic truncation
    offset = mac[-1] & 0x0F
    code = struct.unpack(">I", mac[offset:offset + 4])[0]
    code = (code & 0x7FFFFFFF) % 1_000_000

    return str(code).zfill(6)


def verify_totp(secret: str, user_code: str) -> bool:
    """Verify TOTP code (±1 window tolerance for clock drift)."""
    current = time.time()
    for delta in [-30, 0, 30]:  # check prev, current, next window
        expected = get_totp_code(secret, current + delta)
        if hmac.compare_digest(expected, user_code.strip()):
            return True
    return False


def get_totp_uri(secret: str, username: str, issuer: str = "SecureFileManager") -> str:
    """Generate otpauth URI for QR code scanning."""
    return f"otpauth://totp/{issuer}:{username}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"


# ─────────────────────────────────────────────
#  USER STORAGE
# ─────────────────────────────────────────────

def _load_users() -> dict:
    if USERS_FILE.exists():
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    return {}


def _save_users(users: dict):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


# ─────────────────────────────────────────────
#  AUTH MODULE CLASS
# ─────────────────────────────────────────────

class AuthModule:
    """
    Handles user registration, login (password + 2FA), and sessions.
    """

    ROLES = ("admin", "user", "viewer")

    def __init__(self):
        self.sessions: dict[str, dict] = {}  # token -> {username, role, created_at}
        self._ensure_admin_exists()

    def _ensure_admin_exists(self):
        """Create default admin account if no users exist."""
        users = _load_users()
        if not users:
            self.register("admin", "Admin@123", role="admin", setup_2fa=True)
            logger.info("Default admin account created.")

    # ── REGISTER ──────────────────────────────

    def register(self, username: str, password: str,
                 role: str = "user", setup_2fa: bool = True) -> dict:
        """
        Register a new user.
        Returns: {'success': bool, 'message': str, 'totp_secret': str (if 2FA)}
        """
        users = _load_users()

        if username in users:
            return {"success": False, "message": "Username already exists."}

        if len(password) < 6:
            return {"success": False, "message": "Password must be at least 6 characters."}

        if role not in self.ROLES:
            role = "user"

        totp_secret = generate_totp_secret() if setup_2fa else None

        users[username] = {
            "password_hash": hash_password(password),
            "role": role,
            "totp_secret": totp_secret,
            "two_fa_enabled": setup_2fa,
            "created_at": time.time(),
            "files": [],          # list of filenames owned
            "shared_with_me": []  # files shared with this user
        }
        _save_users(users)
        logger.info(f"User '{username}' registered with role '{role}'.")

        result = {"success": True, "message": "Registration successful."}
        if totp_secret:
            result["totp_secret"] = totp_secret
            result["totp_uri"] = get_totp_uri(totp_secret, username)
        return result

    # ── LOGIN ─────────────────────────────────

    def login(self, username: str, password: str, totp_code: str = None) -> dict:
        """
        Login with username + password (+ optional 2FA code).
        Returns: {'success': bool, 'message': str, 'token': str, 'role': str}
        """
        users = _load_users()

        if username not in users:
            logger.warning(f"Login attempt for unknown user '{username}'.")
            return {"success": False, "message": "Invalid username or password."}

        user = users[username]

        # Step 1: Verify password
        if not verify_password(password, user["password_hash"]):
            logger.warning(f"Failed login for '{username}' — wrong password.")
            return {"success": False, "message": "Invalid username or password."}

        # Step 2: Verify 2FA if enabled
        if user.get("two_fa_enabled") and user.get("totp_secret"):
            if not totp_code:
                return {"success": False, "message": "2FA code required.", "requires_2fa": True}
            if not verify_totp(user["totp_secret"], totp_code):
                logger.warning(f"Failed 2FA for '{username}'.")
                return {"success": False, "message": "Invalid 2FA code."}

        # Step 3: Create session token
        token = secrets.token_hex(32)
        self.sessions[token] = {
            "username": username,
            "role": user["role"],
            "created_at": time.time()
        }
        logger.info(f"User '{username}' logged in successfully.")
        return {
            "success": True,
            "message": f"Welcome, {username}!",
            "token": token,
            "role": user["role"],
            "username": username
        }

    # ── SESSION ───────────────────────────────

    def validate_session(self, token: str) -> dict | None:
        """Return session info if token is valid (expires in 1 hour)."""
        session = self.sessions.get(token)
        if session:
            if time.time() - session["created_at"] < 3600:
                return session
            else:
                del self.sessions[token]  # expired
        return None

    def logout(self, token: str):
        """Invalidate a session token."""
        username = self.sessions.get(token, {}).get("username", "unknown")
        self.sessions.pop(token, None)
        logger.info(f"User '{username}' logged out.")

    # ── USER INFO ─────────────────────────────

    def get_user(self, username: str) -> dict | None:
        users = _load_users()
        return users.get(username)

    def get_all_users(self) -> list:
        return list(_load_users().keys())

    def update_user_files(self, username: str, filename: str, action: str = "add"):
        """Track files owned by a user."""
        users = _load_users()
        if username in users:
            if action == "add" and filename not in users[username]["files"]:
                users[username]["files"].append(filename)
            elif action == "remove" and filename in users[username]["files"]:
                users[username]["files"].remove(filename)
            _save_users(users)

    def add_shared_file(self, target_username: str, filename: str):
        """Record that a file was shared with a user."""
        users = _load_users()
        if target_username in users:
            if filename not in users[target_username]["shared_with_me"]:
                users[target_username]["shared_with_me"].append(filename)
            _save_users(users)

    def get_totp_code_for_user(self, username: str) -> str:
        """Get current TOTP code (for demo/testing purposes)."""
        users = _load_users()
        user = users.get(username)
        if user and user.get("totp_secret"):
            return get_totp_code(user["totp_secret"])
        return "N/A"
