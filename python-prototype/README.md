# SECURE FILE MANAGEMENT SYSTEM
### CSE-316 Operating Systems — CA2 Project

---

## 📋 Problem Statement
Develop a secure file management system that incorporates:
- Authentication mechanisms (password-based, two-factor)
- Protection measures (access control, encryption)
- Detection of common security threats (buffer overflow, malware)
- File operations: read, write, share, and view metadata securely

---

## 🗂️ Project Structure

```
SecureFileManager/
│
├── main.py                  ← Launch interactive UI
├── demo.py                  ← Auto-demo (tests all features)
├── README.md
├── requirements.txt
│
├── modules/
│   ├── auth.py              ← MODULE 1: Authentication
│   ├── file_manager.py      ← MODULE 2: File Operations + Encryption
│   ├── threat_detector.py   ← MODULE 3: Threat Detection
│   └── ui.py                ← Terminal UI
│
├── secure_files/            ← AES-encrypted files stored here
├── user_data/               ← User accounts + metadata
└── logs/                    ← Auth, file op, threat logs
```

---

## ⚙️ Installation

```bash
# Install dependencies
pip install cryptography pyotp bcrypt

# Run demo (tests all features automatically)
python demo.py

# Run interactive system
python main.py
```

> **Note:** The system works with standard Python libraries only.  
> `cryptography`, `pyotp`, `bcrypt` are optional enhancements.

---

## 🔐 Module 1: Authentication

| Feature | Implementation |
|---|---|
| Password Hashing | PBKDF2-HMAC-SHA256 + random salt (100,000 iterations) |
| 2FA | TOTP (RFC 6238) — compatible with Google Authenticator |
| Session Management | Secure random token, 1-hour expiry |
| Role System | admin / user / viewer |

**Default Admin Account:**
- Username: `admin`
- Password: `Admin@123`
- Check `user_data/users.json` for TOTP secret after first run

---

## 📁 Module 2: File Operations & Encryption

| Feature | Implementation |
|---|---|
| Encryption | AES-256 in CTR mode (pure Python implementation) |
| Key Derivation | SHA-256 of master key |
| Integrity Check | SHA-256 checksum on every read |
| Access Control | RBAC — owner/shared_with/admin |
| Operations | Write, Read, Share, Delete, View Metadata |

**Permission Table:**

| Role | Read | Write | Share | Delete | View Meta |
|---|---|---|---|---|---|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| user | ✅ | ✅ | ✅ | ❌ | ✅ |
| viewer | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## 🛡️ Module 3: Threat Detection

| Threat Type | Detection Method |
|---|---|
| Buffer Overflow | Regex — long strings, NOP sleds, format strings |
| Malware Signatures | SHA-256 hash matching against known signatures |
| Code Injection | Patterns: exec, eval, subprocess, os.system |
| SQL Injection | UNION SELECT, DROP TABLE, OR 1=1 patterns |
| XSS | `<script>` tag detection |
| Path Traversal | `../` detection in filenames |
| Sensitive Data | Credit card, SSN, hardcoded passwords/keys |

---

## 📊 Flow Diagram

```
[User] → Login → Password Check → 2FA Check → Session Token
                                                    ↓
                                             Dashboard
                                            ↙    ↓    ↘
                                      Write   Read   Share
                                        ↓       ↓
                                   Threat    Decrypt
                                   Scan      + Checksum
                                        ↓
                                   AES-256
                                   Encrypt
                                        ↓
                                   secure_files/
```

---

## 📝 GitHub Commit History (Template)

1. `Initial project structure setup`
2. `Add Module 1: Password hashing and user registration`
3. `Add Module 1: TOTP 2FA implementation (RFC 6238)`
4. `Add Module 1: Session management`
5. `Add Module 2: AES-256 encryption (pure Python CTR mode)`
6. `Add Module 2: File read/write/delete with RBAC`
7. `Add Module 2: File sharing and metadata`
8. `Add Module 3: Buffer overflow and malware detection`
9. `Add Module 3: Code injection and sensitive data patterns`
10. `Add terminal UI with full interactive menu`
11. `Add demo script and documentation`

---

## 🔬 Technology Used

- **Language:** Python 3.x
- **Encryption:** AES-256 CTR (pure Python) / `cryptography` library
- **Authentication:** PBKDF2-HMAC-SHA256, TOTP (RFC 6238)
- **Libraries:** `hashlib`, `hmac`, `secrets`, `json`, `logging`, `re`, `pathlib`
- **Version Control:** Git / GitHub

---

## 👨‍💻 How to Test

```bash
# Quick automated test of all features:
python demo.py

# Interactive system:
python main.py
# Default login: admin / Admin@123
# Get OTP from demo output or users.json
```
