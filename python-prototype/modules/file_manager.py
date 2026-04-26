"""
╔══════════════════════════════════════════════════════════════╗
║  MODULE 2: FILE MANAGER                                      ║
║  Features: AES-256 Encryption, RBAC, Read/Write/Share/Meta  ║
╚══════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import hashlib
import base64
import struct
import logging
import secrets
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).parent.parent
FILES_DIR = BASE_DIR / "secure_files"
META_DIR = BASE_DIR / "user_data" / "metadata"
FILES_DIR.mkdir(exist_ok=True)
META_DIR.mkdir(exist_ok=True)
LOG_FILE = BASE_DIR / "logs" / "file_ops.log"

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s [FILE] %(levelname)s - %(message)s"
)
logger = logging.getLogger("file_manager")


# ─────────────────────────────────────────────
#  AES-256 ENCRYPTION (Pure Python — CTR mode)
#  No external library needed!
# ─────────────────────────────────────────────

# AES S-Box
_SBOX = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
]

def _xtime(a):
    return (((a << 1) ^ 0x1b) & 0xff) if (a & 0x80) else ((a << 1) & 0xff)

def _gmul(a, b):
    p = 0
    for _ in range(8):
        if b & 1:
            p ^= a
        hi = a & 0x80
        a = (a << 1) & 0xff
        if hi:
            a ^= 0x1b
        b >>= 1
    return p

def _sub_bytes(state):
    return [[_SBOX[b] for b in row] for row in state]

def _shift_rows(s):
    return [
        [s[0][0], s[0][1], s[0][2], s[0][3]],
        [s[1][1], s[1][2], s[1][3], s[1][0]],
        [s[2][2], s[2][3], s[2][0], s[2][1]],
        [s[3][3], s[3][0], s[3][1], s[3][2]],
    ]

def _mix_columns(s):
    def mix(col):
        return [
            _gmul(2,col[0])^_gmul(3,col[1])^col[2]^col[3],
            col[0]^_gmul(2,col[1])^_gmul(3,col[2])^col[3],
            col[0]^col[1]^_gmul(2,col[2])^_gmul(3,col[3]),
            _gmul(3,col[0])^col[1]^col[2]^_gmul(2,col[3]),
        ]
    cols = [[s[r][c] for r in range(4)] for c in range(4)]
    mixed = [mix(col) for col in cols]
    return [[mixed[c][r] for c in range(4)] for r in range(4)]

def _add_round_key(state, rk):
    return [[state[r][c] ^ rk[r][c] for c in range(4)] for r in range(4)]

def _key_expansion(key: bytes) -> list:
    Nk = len(key) // 4
    Nr = Nk + 6
    w = [list(key[4*i:4*i+4]) for i in range(Nk)]
    rcon = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36]
    for i in range(Nk, 4*(Nr+1)):
        temp = w[i-1][:]
        if i % Nk == 0:
            temp = [_SBOX[b] for b in temp[1:]+temp[:1]]
            temp[0] ^= rcon[i//Nk-1]
        elif Nk > 6 and i % Nk == 4:
            temp = [_SBOX[b] for b in temp]
        w.append([w[i-Nk][j]^temp[j] for j in range(4)])
    rks = []
    for i in range(Nr+1):
        rk = [[w[i*4+c][r] for c in range(4)] for r in range(4)]
        rks.append(rk)
    return rks

def _aes_encrypt_block(block: bytes, round_keys: list) -> bytes:
    Nr = len(round_keys) - 1
    state = [[block[r+4*c] for c in range(4)] for r in range(4)]
    state = _add_round_key(state, round_keys[0])
    for rnd in range(1, Nr):
        state = _sub_bytes(state)
        state = _shift_rows(state)
        state = _mix_columns(state)
        state = _add_round_key(state, round_keys[rnd])
    state = _sub_bytes(state)
    state = _shift_rows(state)
    state = _add_round_key(state, round_keys[Nr])
    return bytes(state[r][c] for c in range(4) for r in range(4))

def _derive_key(password: str) -> bytes:
    """Derive a 32-byte AES-256 key from password using SHA-256."""
    return hashlib.sha256(password.encode()).digest()

def aes_encrypt(plaintext: bytes, password: str) -> bytes:
    """Encrypt using AES-256 in CTR mode. Returns iv + ciphertext."""
    key = _derive_key(password)
    rks = _key_expansion(key)
    iv = secrets.token_bytes(16)
    ciphertext = bytearray()
    for i in range(0, len(plaintext), 16):
        counter = bytearray(iv)
        block_num = i // 16
        for j in range(4):
            counter[15-j] ^= (block_num >> (8*j)) & 0xff
        keystream = _aes_encrypt_block(bytes(counter), rks)
        chunk = plaintext[i:i+16]
        for a, b in zip(chunk, keystream):
            ciphertext.append(a ^ b)
    return iv + bytes(ciphertext)

def aes_decrypt(ciphertext: bytes, password: str) -> bytes:
    """Decrypt AES-256 CTR. Input must be iv + ciphertext."""
    key = _derive_key(password)
    rks = _key_expansion(key)
    iv = ciphertext[:16]
    ct = ciphertext[16:]
    plaintext = bytearray()
    for i in range(0, len(ct), 16):
        counter = bytearray(iv)
        block_num = i // 16
        for j in range(4):
            counter[15-j] ^= (block_num >> (8*j)) & 0xff
        keystream = _aes_encrypt_block(bytes(counter), rks)
        chunk = ct[i:i+16]
        for a, b in zip(chunk, keystream):
            plaintext.append(a ^ b)
    return bytes(plaintext)


# ─────────────────────────────────────────────
#  ROLE-BASED ACCESS CONTROL
# ─────────────────────────────────────────────

PERMISSIONS = {
    "admin":  {"read", "write", "delete", "share", "view_meta", "manage_users"},
    "user":   {"read", "write", "share", "view_meta"},
    "viewer": {"read", "view_meta"},
}

def can(role: str, action: str) -> bool:
    return action in PERMISSIONS.get(role, set())


# ─────────────────────────────────────────────
#  FILE MANAGER CLASS
# ─────────────────────────────────────────────

class FileManager:
    """
    Handles secure file operations:
    - Write (encrypt & save)
    - Read (decrypt & return)
    - Share (grant access)
    - Delete
    - View metadata
    """

    MASTER_KEY = "SecureFileManager@CSE316"  # In production, derive per-user

    def __init__(self, threat_detector=None):
        self.threat_detector = threat_detector

    def _meta_path(self, filename: str) -> Path:
        return META_DIR / f"{filename}.meta.json"

    def _file_path(self, filename: str) -> Path:
        return FILES_DIR / f"{filename}.enc"

    def _load_meta(self, filename: str) -> dict:
        p = self._meta_path(filename)
        if p.exists():
            with open(p) as f:
                return json.load(f)
        return {}

    def _save_meta(self, filename: str, meta: dict):
        with open(self._meta_path(filename), "w") as f:
            json.dump(meta, f, indent=2)

    # ── WRITE FILE ────────────────────────────

    def write_file(self, filename: str, content: str,
                   username: str, role: str) -> dict:
        """Encrypt and save a file."""
        if not can(role, "write"):
            return {"success": False, "message": "Permission denied: write requires user/admin role."}

        # Threat detection
        if self.threat_detector:
            threat = self.threat_detector.scan_content(content, username)
            if threat["detected"]:
                return {"success": False, "message": f"THREAT BLOCKED: {threat['threat']}"}

        # Encrypt content
        enc_data = aes_encrypt(content.encode("utf-8"), self.MASTER_KEY)
        file_path = self._file_path(filename)
        with open(file_path, "wb") as f:
            f.write(enc_data)

        # Save metadata
        meta = {
            "filename": filename,
            "owner": username,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "modified_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "size_bytes": len(content.encode()),
            "encrypted": True,
            "checksum": hashlib.sha256(content.encode()).hexdigest(),
            "shared_with": [],
            "permissions": PERMISSIONS.get(role, set()) - {"manage_users"}
        }
        # Convert set to list for JSON
        meta["permissions"] = list(meta["permissions"])
        self._save_meta(filename, meta)

        logger.info(f"User '{username}' wrote file '{filename}'.")
        return {"success": True, "message": f"File '{filename}' saved and encrypted."}

    # ── READ FILE ─────────────────────────────

    def read_file(self, filename: str, username: str, role: str) -> dict:
        """Decrypt and return file content."""
        if not can(role, "read"):
            return {"success": False, "message": "Permission denied: read access required."}

        meta = self._load_meta(filename)
        if not meta:
            return {"success": False, "message": "File not found."}

        # Check ownership or sharing
        if meta.get("owner") != username and username not in meta.get("shared_with", []) and role != "admin":
            return {"success": False, "message": "Access denied: you do not own this file."}

        file_path = self._file_path(filename)
        if not file_path.exists():
            return {"success": False, "message": "Encrypted file missing on disk."}

        with open(file_path, "rb") as f:
            enc_data = f.read()

        try:
            content = aes_decrypt(enc_data, self.MASTER_KEY).decode("utf-8")
        except Exception as e:
            return {"success": False, "message": f"Decryption failed: {e}"}

        # Verify checksum
        actual_checksum = hashlib.sha256(content.encode()).hexdigest()
        if actual_checksum != meta.get("checksum"):
            logger.warning(f"Checksum mismatch for file '{filename}'!")
            return {"success": False, "message": "File integrity check FAILED — possible tampering!"}

        logger.info(f"User '{username}' read file '{filename}'.")
        return {"success": True, "content": content, "meta": meta}

    # ── SHARE FILE ────────────────────────────

    def share_file(self, filename: str, owner: str, role: str,
                   target_user: str) -> dict:
        """Share a file with another user."""
        if not can(role, "share"):
            return {"success": False, "message": "Permission denied: share requires user/admin role."}

        meta = self._load_meta(filename)
        if not meta:
            return {"success": False, "message": "File not found."}

        if meta.get("owner") != owner and role != "admin":
            return {"success": False, "message": "Only the file owner can share it."}

        if target_user not in meta.get("shared_with", []):
            meta.setdefault("shared_with", []).append(target_user)
            self._save_meta(filename, meta)

        logger.info(f"User '{owner}' shared '{filename}' with '{target_user}'.")
        return {"success": True, "message": f"File shared with '{target_user}'."}

    # ── DELETE FILE ───────────────────────────

    def delete_file(self, filename: str, username: str, role: str) -> dict:
        """Delete a file (owner or admin only)."""
        if not can(role, "delete"):
            return {"success": False, "message": "Permission denied."}

        meta = self._load_meta(filename)
        if not meta:
            return {"success": False, "message": "File not found."}

        if meta.get("owner") != username and role != "admin":
            return {"success": False, "message": "Only the file owner or admin can delete."}

        self._file_path(filename).unlink(missing_ok=True)
        self._meta_path(filename).unlink(missing_ok=True)
        logger.info(f"User '{username}' deleted file '{filename}'.")
        return {"success": True, "message": f"File '{filename}' deleted."}

    # ── VIEW METADATA ─────────────────────────

    def view_metadata(self, filename: str, username: str, role: str) -> dict:
        """Return file metadata."""
        if not can(role, "view_meta"):
            return {"success": False, "message": "Permission denied."}

        meta = self._load_meta(filename)
        if not meta:
            return {"success": False, "message": "File not found."}

        if meta.get("owner") != username and username not in meta.get("shared_with", []) and role != "admin":
            return {"success": False, "message": "Access denied."}

        return {"success": True, "meta": meta}

    # ── LIST FILES ────────────────────────────

    def list_files(self, username: str, role: str) -> list:
        """List files accessible to this user."""
        result = []
        for meta_file in META_DIR.glob("*.meta.json"):
            with open(meta_file) as f:
                meta = json.load(f)
            if (meta.get("owner") == username or
                    username in meta.get("shared_with", []) or
                    role == "admin"):
                result.append({
                    "filename": meta["filename"],
                    "owner": meta["owner"],
                    "size": meta.get("size_bytes", 0),
                    "modified": meta.get("modified_at", ""),
                    "shared": username in meta.get("shared_with", []) and meta["owner"] != username
                })
        return result
