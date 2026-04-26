"""
╔══════════════════════════════════════════════════════════════╗
║          SECURE FILE MANAGEMENT SYSTEM                       ║
║          CSE-316 Operating Systems — CA2 Project             ║
╚══════════════════════════════════════════════════════════════╝

Run: python main.py
Requirements: pip install cryptography pyotp bcrypt
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.auth import AuthModule
from modules.file_manager import FileManager
from modules.threat_detector import ThreatDetector
from modules.ui import SecureFileManagerUI


def main():
    print("=" * 60)
    print("   SECURE FILE MANAGEMENT SYSTEM")
    print("   CSE-316 Operating Systems — CA2")
    print("=" * 60)

    # Initialize modules
    auth = AuthModule()
    threat_detector = ThreatDetector()
    file_manager = FileManager(threat_detector)

    # Launch UI
    ui = SecureFileManagerUI(auth, file_manager, threat_detector)
    ui.run()


if __name__ == "__main__":
    main()
