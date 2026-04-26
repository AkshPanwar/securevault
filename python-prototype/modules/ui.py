"""
╔══════════════════════════════════════════════════════════════╗
║  UI: TERMINAL INTERFACE                                      ║
║  Full interactive CLI for Secure File Management System      ║
╚══════════════════════════════════════════════════════════════╝
"""

import os
import sys
import time


def clear():
    os.system("cls" if os.name == "nt" else "clear")


def banner():
    print("\033[96m")  # Cyan
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║          🔒  SECURE FILE MANAGEMENT SYSTEM  🔒               ║")
    print("║          CSE-316 Operating Systems — CA2 Project             ║")
    print("║          Authentication  |  Encryption  |  Threat Detection  ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print("\033[0m")


def success(msg): print(f"\033[92m✅  {msg}\033[0m")
def error(msg):   print(f"\033[91m❌  {msg}\033[0m")
def warn(msg):    print(f"\033[93m⚠️   {msg}\033[0m")
def info(msg):    print(f"\033[94mℹ️   {msg}\033[0m")
def header(msg):  print(f"\n\033[1m\033[95m{'─'*60}\n  {msg}\n{'─'*60}\033[0m")


def input_prompt(prompt: str) -> str:
    return input(f"\033[97m  ➤ {prompt}: \033[0m").strip()


class SecureFileManagerUI:

    def __init__(self, auth, file_manager, threat_detector):
        self.auth = auth
        self.fm = file_manager
        self.td = threat_detector
        self.token = None
        self.session = None  # {username, role}

    def run(self):
        clear()
        banner()
        while True:
            if not self.token:
                self._main_menu()
            else:
                self._dashboard()

    # ─────────────────────────────────────────
    #  MAIN MENU (unauthenticated)
    # ─────────────────────────────────────────

    def _main_menu(self):
        print("\n  [1] Login")
        print("  [2] Register")
        print("  [3] Exit")
        choice = input_prompt("Choose")

        if choice == "1":
            self._login_flow()
        elif choice == "2":
            self._register_flow()
        elif choice == "3":
            print("\n  Goodbye! 👋\n")
            sys.exit(0)
        else:
            error("Invalid choice.")

    # ─────────────────────────────────────────
    #  REGISTER
    # ─────────────────────────────────────────

    def _register_flow(self):
        header("📝  USER REGISTRATION")
        username = input_prompt("Choose a username")
        password = input_prompt("Choose a password (min 6 chars)")

        result = self.auth.register(username, password)

        if result["success"]:
            success(result["message"])
            if "totp_secret" in result:
                print(f"\n  \033[93m🔑 Your 2FA Secret Key:\033[0m")
                print(f"     \033[1m{result['totp_secret']}\033[0m")
                print(f"\n  Add this key to Google Authenticator or any TOTP app.")
                print(f"  Or use: otpauth URI = {result['totp_uri']}")
                current_code = self.auth.get_totp_code_for_user(username)
                print(f"\n  \033[92m📲 Current OTP code (for testing): {current_code}\033[0m")
        else:
            error(result["message"])

        input("\n  Press Enter to continue...")

    # ─────────────────────────────────────────
    #  LOGIN
    # ─────────────────────────────────────────

    def _login_flow(self):
        header("🔐  LOGIN")
        username = input_prompt("Username")
        password = input_prompt("Password")

        # First attempt (might need 2FA)
        result = self.auth.login(username, password)

        if result.get("requires_2fa"):
            info("2FA is enabled for your account.")
            # Show current OTP for demo purposes
            current = self.auth.get_totp_code_for_user(username)
            info(f"Demo OTP (use this to test): \033[1m{current}\033[0m")
            totp = input_prompt("Enter your 6-digit 2FA code")
            result = self.auth.login(username, password, totp)

        if result["success"]:
            self.token = result["token"]
            self.session = {"username": result["username"], "role": result["role"]}
            clear()
            banner()
            success(result["message"])
            info(f"Role: {result['role'].upper()}")
        else:
            error(result["message"])
            input("\n  Press Enter to continue...")

    # ─────────────────────────────────────────
    #  DASHBOARD (authenticated)
    # ─────────────────────────────────────────

    def _dashboard(self):
        username = self.session["username"]
        role = self.session["role"]

        header(f"📂  DASHBOARD  —  {username}  [{role.upper()}]")
        print("  [1] 📄 Write / Create File")
        print("  [2] 📖 Read File")
        print("  [3] 📋 List My Files")
        print("  [4] 🔗 Share File")
        print("  [5] 🗑️  Delete File")
        print("  [6] 🔍 View File Metadata")
        print("  [7] 🛡️  Threat Detection Log")
        if role == "admin":
            print("  [8] 👥 Manage Users (Admin)")
        print("  [9] 🚪 Logout")

        choice = input_prompt("Choose")

        if choice == "1":
            self._write_file()
        elif choice == "2":
            self._read_file()
        elif choice == "3":
            self._list_files()
        elif choice == "4":
            self._share_file()
        elif choice == "5":
            self._delete_file()
        elif choice == "6":
            self._view_metadata()
        elif choice == "7":
            self._threat_log()
        elif choice == "8" and role == "admin":
            self._admin_panel()
        elif choice == "9":
            self.auth.logout(self.token)
            self.token = None
            self.session = None
            clear()
            banner()
            success("Logged out successfully.")
        else:
            error("Invalid choice.")

    # ─────────────────────────────────────────
    #  WRITE FILE
    # ─────────────────────────────────────────

    def _write_file(self):
        header("📄  WRITE ENCRYPTED FILE")
        filename = input_prompt("Filename (e.g. notes.txt)")

        # Check filename safety
        check = self.td.check_filename(filename)
        if not check["safe"]:
            error(f"Unsafe filename: {check['reason']}")
            input("\n  Press Enter to continue...")
            return

        print("  Enter file content (type END on a new line to finish):")
        lines = []
        while True:
            line = input("  ")
            if line == "END":
                break
            lines.append(line)
        content = "\n".join(lines)

        # Check for sensitive data
        warnings = self.td.scan_for_sensitive_data(content)
        if warnings:
            warn("Sensitive data detected in content:")
            for w in warnings:
                print(f"     ⚠️  {w}")
            confirm = input_prompt("Save anyway? (yes/no)")
            if confirm.lower() != "yes":
                info("File not saved.")
                input("\n  Press Enter to continue...")
                return

        result = self.fm.write_file(
            filename, content,
            self.session["username"], self.session["role"]
        )

        if result["success"]:
            success(result["message"])
            self.auth.update_user_files(self.session["username"], filename, "add")
        else:
            error(result["message"])

        input("\n  Press Enter to continue...")

    # ─────────────────────────────────────────
    #  READ FILE
    # ─────────────────────────────────────────

    def _read_file(self):
        header("📖  READ ENCRYPTED FILE")
        filename = input_prompt("Filename to read")

        result = self.fm.read_file(
            filename,
            self.session["username"],
            self.session["role"]
        )

        if result["success"]:
            success(f"File decrypted successfully!")
            print(f"\n\033[97m{'─'*50}")
            print(result["content"])
            print(f"{'─'*50}\033[0m")
        else:
            error(result["message"])

        input("\n  Press Enter to continue...")

    # ─────────────────────────────────────────
    #  LIST FILES
    # ─────────────────────────────────────────

    def _list_files(self):
        header("📋  MY FILES")
        files = self.fm.list_files(
            self.session["username"],
            self.session["role"]
        )

        if not files:
            info("No files found.")
        else:
            print(f"\n  {'FILENAME':<25} {'OWNER':<15} {'SIZE':>8}  {'MODIFIED':<20}  STATUS")
            print(f"  {'─'*25} {'─'*15} {'─'*8}  {'─'*20}  {'─'*10}")
            for f in files:
                status = "📤 SHARED" if f["shared"] else "🔒 OWNED"
                print(f"  {f['filename']:<25} {f['owner']:<15} {f['size']:>6}B  {f['modified']:<20}  {status}")

        input("\n  Press Enter to continue...")

    # ─────────────────────────────────────────
    #  SHARE FILE
    # ─────────────────────────────────────────

    def _share_file(self):
        header("🔗  SHARE FILE")
        filename = input_prompt("Filename to share")
        target = input_prompt("Share with username")

        # Check target exists
        user = self.auth.get_user(target)
        if not user:
            error(f"User '{target}' does not exist.")
            input("\n  Press Enter to continue...")
            return

        result = self.fm.share_file(
            filename,
            self.session["username"],
            self.session["role"],
            target
        )

        if result["success"]:
            success(result["message"])
            self.auth.add_shared_file(target, filename)
        else:
            error(result["message"])

        input("\n  Press Enter to continue...")

    # ─────────────────────────────────────────
    #  DELETE FILE
    # ─────────────────────────────────────────

    def _delete_file(self):
        header("🗑️  DELETE FILE")
        filename = input_prompt("Filename to delete")
        confirm = input_prompt(f"Are you sure you want to delete '{filename}'? (yes/no)")

        if confirm.lower() != "yes":
            info("Deletion cancelled.")
            input("\n  Press Enter to continue...")
            return

        result = self.fm.delete_file(
            filename,
            self.session["username"],
            self.session["role"]
        )

        if result["success"]:
            success(result["message"])
            self.auth.update_user_files(self.session["username"], filename, "remove")
        else:
            error(result["message"])

        input("\n  Press Enter to continue...")

    # ─────────────────────────────────────────
    #  VIEW METADATA
    # ─────────────────────────────────────────

    def _view_metadata(self):
        header("🔍  FILE METADATA")
        filename = input_prompt("Filename")

        result = self.fm.view_metadata(
            filename,
            self.session["username"],
            self.session["role"]
        )

        if result["success"]:
            meta = result["meta"]
            print(f"\n  {'─'*50}")
            print(f"  📄 Filename    : {meta.get('filename')}")
            print(f"  👤 Owner       : {meta.get('owner')}")
            print(f"  📅 Created     : {meta.get('created_at')}")
            print(f"  🔄 Modified    : {meta.get('modified_at')}")
            print(f"  📦 Size        : {meta.get('size_bytes', 0)} bytes")
            print(f"  🔐 Encrypted   : {meta.get('encrypted')}")
            print(f"  🔑 Checksum    : {meta.get('checksum', '')[:32]}...")
            shared = meta.get("shared_with", [])
            print(f"  🤝 Shared with : {', '.join(shared) if shared else 'Nobody'}")
            print(f"  {'─'*50}")
        else:
            error(result["message"])

        input("\n  Press Enter to continue...")

    # ─────────────────────────────────────────
    #  THREAT LOG
    # ─────────────────────────────────────────

    def _threat_log(self):
        header("🛡️  THREAT DETECTION LOG")
        stats = self.td.get_stats()
        print(f"\n  Total threats detected: \033[91m{stats['total']}\033[0m")
        for ttype, count in stats["by_type"].items():
            print(f"     • {ttype}: {count}")

        events = self.td.get_threat_log(10)
        if events:
            print(f"\n  Recent Threats:")
            print(f"  {'─'*60}")
            for e in reversed(events[-10:]):
                print(f"  [{e['timestamp']}] \033[91m{e['threat_type']}\033[0m")
                print(f"     User: {e['username']}  |  {e['threat_name']}")
        else:
            success("No threats detected. System is clean!")

        input("\n  Press Enter to continue...")

    # ─────────────────────────────────────────
    #  ADMIN PANEL
    # ─────────────────────────────────────────

    def _admin_panel(self):
        header("👥  ADMIN PANEL")
        users = self.auth.get_all_users()
        print(f"\n  Registered Users ({len(users)}):")
        for u in users:
            user_data = self.auth.get_user(u)
            role = user_data.get("role", "?")
            fa = "✅" if user_data.get("two_fa_enabled") else "❌"
            files = len(user_data.get("files", []))
            print(f"     👤 {u:<20} Role: {role:<8} 2FA: {fa}  Files: {files}")

        print("\n  [1] Register new user (admin)")
        print("  [2] Back")
        choice = input_prompt("Choose")

        if choice == "1":
            username = input_prompt("New username")
            password = input_prompt("Password")
            role = input_prompt("Role (admin/user/viewer)")
            result = self.auth.register(username, password, role=role, setup_2fa=True)
            if result["success"]:
                success(result["message"])
                if "totp_secret" in result:
                    print(f"  TOTP Secret: {result['totp_secret']}")
                    print(f"  Current OTP: {self.auth.get_totp_code_for_user(username)}")
            else:
                error(result["message"])
            input("\n  Press Enter to continue...")
