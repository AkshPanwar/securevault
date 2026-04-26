"""
╔══════════════════════════════════════════════════════════════╗
║  MODULE 3: THREAT DETECTOR                                   ║
║  Features: Buffer Overflow, Malware Signatures, Logging      ║
╚══════════════════════════════════════════════════════════════╝
"""

import re
import hashlib
import logging
import time
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
LOG_FILE = BASE_DIR / "logs" / "threats.log"
LOG_FILE.parent.mkdir(exist_ok=True)
THREAT_LOG_JSON = BASE_DIR / "logs" / "threat_events.json"

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.WARNING,
    format="%(asctime)s [THREAT] %(levelname)s - %(message)s"
)
logger = logging.getLogger("threat_detector")


# ─────────────────────────────────────────────
#  MALWARE SIGNATURE DATABASE
#  (SHA-256 hashes of known malicious patterns)
# ─────────────────────────────────────────────

MALWARE_SIGNATURES = {
    # Known malicious code patterns (hash-based detection)
    hashlib.sha256(b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE").hexdigest(): "EICAR Test Virus",
    hashlib.sha256(b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR").hexdigest(): "EICAR Variant",
    hashlib.sha256(b"import os; os.system('rm -rf /')").hexdigest(): "Shell Destroy Cmd",
    hashlib.sha256(b"import subprocess; subprocess.call(['format', 'c:'])").hexdigest(): "Drive Format Cmd",
}

# ─────────────────────────────────────────────
#  SUSPICIOUS PATTERN RULES
# ─────────────────────────────────────────────

BUFFER_OVERFLOW_PATTERNS = [
    # Classic shellcode and overflow indicators
    (r"(\x90){10,}", "NOP sled (shellcode indicator)"),
    (r"(\\x[0-9a-fA-F]{2}){15,}", "Long hex escape sequence (possible shellcode)"),
    (r"[A-Za-z]{500,}", "Extremely long string (possible buffer overflow attempt)"),
    (r"(AAAA|BBBB|CCCC){10,}", "Repeated pattern string (fuzzing/overflow attempt)"),
    (r"0x[0-9a-fA-F]{8,}", "Large hex address (possible ROP gadget)"),
    (r"(%[0-9]+\$[a-z]){3,}", "Format string attack pattern"),
    (r"(\.\./){5,}", "Deep path traversal"),
    (r"<{100,}", "HTML/XML tag flood (possible DoS)"),
]

MALWARE_CODE_PATTERNS = [
    (r"import\s+os.*os\.(system|popen|exec)", "OS command execution"),
    (r"subprocess\.(call|run|Popen).*shell\s*=\s*True", "Shell injection risk"),
    (r"eval\s*\(.*input\s*\(", "Eval injection"),
    (r"__import__\s*\(\s*['\"]os['\"]", "Dynamic OS import"),
    (r"socket\.connect.*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", "Reverse shell indicator"),
    (r"base64\.b64decode.*exec", "Encoded payload execution"),
    (r"chr\(\d+\)\s*\+\s*chr\(\d+\)", "Obfuscated string construction"),
    (r"rm\s+-rf\s+/", "Destructive shell command"),
    (r"DROP\s+TABLE|DROP\s+DATABASE", "SQL injection - DROP"),
    (r"1\s*=\s*1|' OR '1'='1", "SQL injection - tautology"),
    (r"<script.*>.*</script>", "XSS script injection"),
    (r"javascript\s*:", "JavaScript protocol injection"),
    (r"UNION\s+SELECT", "SQL UNION injection"),
    (r"exec\s*\(.*\)\s*;", "Code execution attempt"),
]

SENSITIVE_DATA_PATTERNS = [
    (r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b", "Possible credit card number"),
    (r"\b\d{3}-\d{2}-\d{4}\b", "Possible SSN (US)"),
    (r"password\s*=\s*['\"][^'\"]{3,}", "Hardcoded password"),
    (r"api_key\s*=\s*['\"][^'\"]{10,}", "Hardcoded API key"),
    (r"-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----", "Private key in content"),
]


# ─────────────────────────────────────────────
#  THREAT DETECTOR CLASS
# ─────────────────────────────────────────────

class ThreatDetector:
    """
    Detects security threats in file content:
    1. Malware signature matching
    2. Buffer overflow patterns
    3. Code injection / malicious patterns
    4. Sensitive data exposure
    """

    def __init__(self):
        self.threat_log: list = self._load_threat_log()

    def _load_threat_log(self) -> list:
        if THREAT_LOG_JSON.exists():
            with open(THREAT_LOG_JSON) as f:
                return json.load(f)
        return []

    def _save_threat_log(self):
        with open(THREAT_LOG_JSON, "w") as f:
            json.dump(self.threat_log[-200:], f, indent=2)  # keep last 200

    def _record_threat(self, username: str, threat_type: str,
                       threat_name: str, content_preview: str):
        event = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "username": username,
            "threat_type": threat_type,
            "threat_name": threat_name,
            "content_preview": content_preview[:100]
        }
        self.threat_log.append(event)
        self._save_threat_log()
        logger.warning(f"[{threat_type}] User '{username}': {threat_name}")

    # ── MAIN SCAN ─────────────────────────────

    def scan_content(self, content: str, username: str = "unknown") -> dict:
        """
        Full threat scan on file content.
        Returns: {'detected': bool, 'threat': str, 'type': str}
        """

        # 1. Malware signature check
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        if content_hash in MALWARE_SIGNATURES:
            threat = MALWARE_SIGNATURES[content_hash]
            self._record_threat(username, "MALWARE_SIGNATURE", threat, content)
            return {"detected": True, "threat": threat, "type": "Malware Signature"}

        # 2. Buffer overflow detection
        for pattern, name in BUFFER_OVERFLOW_PATTERNS:
            if re.search(pattern, content):
                self._record_threat(username, "BUFFER_OVERFLOW", name, content)
                return {"detected": True, "threat": name, "type": "Buffer Overflow"}

        # 3. Malicious code patterns
        for pattern, name in MALWARE_CODE_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                self._record_threat(username, "MALICIOUS_CODE", name, content)
                return {"detected": True, "threat": name, "type": "Malicious Code"}

        return {"detected": False, "threat": None, "type": None}

    def scan_for_sensitive_data(self, content: str) -> list:
        """
        Scan for accidentally exposed sensitive data.
        Returns list of warnings (does NOT block — just warns).
        """
        warnings = []
        for pattern, name in SENSITIVE_DATA_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                warnings.append(name)
        return warnings

    def check_filename(self, filename: str) -> dict:
        """Check filename for path traversal or dangerous extensions."""
        dangerous_extensions = [".exe", ".bat", ".sh", ".ps1", ".cmd", ".vbs", ".js"]
        path_traversal = r"\.\.[/\\]"

        if re.search(path_traversal, filename):
            return {"safe": False, "reason": "Path traversal detected in filename."}

        ext = Path(filename).suffix.lower()
        if ext in dangerous_extensions:
            return {"safe": False, "reason": f"Dangerous file extension: {ext}"}

        if len(filename) > 255:
            return {"safe": False, "reason": "Filename too long (possible overflow)."}

        return {"safe": True, "reason": "Filename is safe."}

    def get_threat_log(self, limit: int = 50) -> list:
        """Return recent threat events."""
        return self.threat_log[-limit:]

    def get_stats(self) -> dict:
        """Return threat detection statistics."""
        stats = {"total": len(self.threat_log), "by_type": {}}
        for event in self.threat_log:
            t = event.get("threat_type", "UNKNOWN")
            stats["by_type"][t] = stats["by_type"].get(t, 0) + 1
        return stats
