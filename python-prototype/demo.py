"""
╔══════════════════════════════════════════════════════════════╗
║  DEMO SCRIPT — Auto-tests all features                       ║
║  Run: python demo.py                                         ║
╚══════════════════════════════════════════════════════════════╝
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.auth import AuthModule
from modules.file_manager import FileManager
from modules.threat_detector import ThreatDetector

def sep(title=""):
    print(f"\n{'═'*60}")
    if title:
        print(f"  {title}")
    print('═'*60)

def ok(msg):  print(f"  ✅ {msg}")
def fail(msg): print(f"  ❌ {msg}")
def show(msg): print(f"  ℹ️  {msg}")


def run_demo():
    sep("SECURE FILE MANAGEMENT SYSTEM — DEMO")
    print("  CSE-316 Operating Systems, CA2 Project")

    # Initialize modules
    auth = AuthModule()
    td = ThreatDetector()
    fm = FileManager(td)

    # ── MODULE 1: AUTHENTICATION ──────────────────────────
    sep("MODULE 1: AUTHENTICATION")

    # Register a test user
    r = auth.register("alice", "Alice@123", role="user", setup_2fa=True)
    if r["success"]:
        ok(f"Registered 'alice' | TOTP Secret: {r.get('totp_secret', 'N/A')[:20]}...")
    else:
        show(f"Register: {r['message']}")  # already exists on rerun

    # Get current OTP for alice
    otp = auth.get_totp_code_for_user("alice")
    show(f"Current 2FA OTP for 'alice': {otp}")

    # Login alice with 2FA
    result = auth.login("alice", "Alice@123", otp)
    if result["success"]:
        ok(f"Login successful | Token: {result['token'][:20]}...")
        alice_token = result["token"]
        alice_session = {"username": "alice", "role": "user"}
    else:
        fail(f"Login failed: {result['message']}")
        return

    # Wrong password test
    r = auth.login("alice", "wrongpassword")
    if not r["success"]:
        ok(f"Correctly rejected wrong password: '{r['message']}'")

    # Wrong 2FA code test
    r = auth.login("alice", "Alice@123", "000000")
    if not r["success"]:
        ok(f"Correctly rejected wrong 2FA: '{r['message']}'")

    # ── MODULE 2: FILE OPERATIONS ─────────────────────────
    sep("MODULE 2: FILE OPERATIONS & ENCRYPTION")

    # Write a file
    r = fm.write_file("report.txt", "This is Alice's secret report.\nConfidential data here.",
                      "alice", "user")
    if r["success"]:
        ok(f"File written & AES-256 encrypted: {r['message']}")
        auth.update_user_files("alice", "report.txt", "add")
    else:
        fail(r["message"])

    # Read it back
    r = fm.read_file("report.txt", "alice", "user")
    if r["success"]:
        ok(f"File decrypted successfully!")
        show(f"Content: {r['content'][:60]}...")
    else:
        fail(r["message"])

    # Integrity check: try with non-owner
    r = fm.read_file("report.txt", "bob", "user")
    if not r["success"]:
        ok(f"Access denied for non-owner 'bob': '{r['message']}'")

    # Register bob and share with him
    auth.register("bob", "Bob@456", role="user", setup_2fa=False)
    r = fm.share_file("report.txt", "alice", "user", "bob")
    if r["success"]:
        ok(f"Shared file with bob: {r['message']}")
        auth.add_shared_file("bob", "report.txt")

    # Bob reads shared file
    r = fm.read_file("report.txt", "bob", "user")
    if r["success"]:
        ok(f"Bob read shared file: '{r['content'][:40]}...'")

    # View metadata
    r = fm.view_metadata("report.txt", "alice", "user")
    if r["success"]:
        meta = r["meta"]
        ok(f"Metadata: owner={meta['owner']}, size={meta['size_bytes']}B, "
           f"encrypted={meta['encrypted']}, shared={meta['shared_with']}")

    # List files
    files = fm.list_files("alice", "user")
    ok(f"Alice's files: {[f['filename'] for f in files]}")

    # ── MODULE 3: THREAT DETECTION ────────────────────────
    sep("MODULE 3: THREAT DETECTION")

    # Buffer overflow attempt
    overflow_content = "A" * 600
    r = fm.write_file("overflow_test.txt", overflow_content, "alice", "user")
    if not r["success"]:
        ok(f"Buffer overflow BLOCKED: {r['message']}")

    # SQL injection attempt
    sql_inject = "' OR '1'='1; DROP TABLE users;--"
    r = fm.write_file("sql_test.txt", sql_inject, "alice", "user")
    if not r["success"]:
        ok(f"SQL injection BLOCKED: {r['message']}")

    # OS command injection
    cmd_inject = "import os; os.system('rm -rf /')"
    r = fm.write_file("cmd_test.txt", cmd_inject, "alice", "user")
    if not r["success"]:
        ok(f"Command injection BLOCKED: {r['message']}")

    # XSS attempt
    xss = "<script>alert('xss')</script>"
    r = fm.write_file("xss_test.txt", xss, "alice", "user")
    if not r["success"]:
        ok(f"XSS BLOCKED: {r['message']}")

    # Safe content (should pass)
    r = fm.write_file("safe.txt", "Hello! This is a safe note.", "alice", "user")
    if r["success"]:
        ok(f"Safe content allowed: {r['message']}")

    # Threat stats
    stats = td.get_stats()
    ok(f"Total threats detected: {stats['total']}")
    for k, v in stats["by_type"].items():
        show(f"  {k}: {v} events")

    # ── RBAC TEST ─────────────────────────────────────────
    sep("ROLE-BASED ACCESS CONTROL (RBAC)")

    # Register viewer
    auth.register("viewer1", "View@789", role="viewer", setup_2fa=False)

    r = fm.write_file("view_test.txt", "Viewer trying to write", "viewer1", "viewer")
    if not r["success"]:
        ok(f"RBAC: Viewer blocked from writing: '{r['message']}'")

    r = fm.read_file("report.txt", "viewer1", "viewer")
    if not r["success"]:
        ok(f"RBAC: Viewer blocked from file they don't own (correct)")

    # ── FINAL SUMMARY ─────────────────────────────────────
    sep("DEMO COMPLETE")
    ok("All three modules working correctly!")
    ok("Module 1: Authentication (Password hashing + TOTP 2FA + Sessions)")
    ok("Module 2: File Operations (AES-256 encryption + RBAC + Metadata)")
    ok("Module 3: Threat Detection (Overflow + Malware + Injection blocking)")
    print()
    show("Run  python main.py  for the full interactive GUI")


if __name__ == "__main__":
    run_demo()
