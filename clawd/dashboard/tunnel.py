#!/usr/bin/env python3
"""
Quick Tunnel Setup Script
Creates temporary tunnel for dashboard access from phone
"""

import subprocess
import sys
from pathlib import Path

def check_ngrok():
    """Check if ngrok is available"""
    try:
        result = subprocess.run(
            ['ngrok', '--version'],
            capture_output=True,
            timeout=2
        )
        print(f"✓ ngrok found: {result.stdout.strip()}")
        return True
    except FileNotFoundError:
        print("✗ ngrok not installed")
        return False


def check_ssh_tunnel():
    """Setup SSH tunnel for local access"""
    try:
        # Check if SSH is available
        subprocess.run(['ssh', '-V'], capture_output=True, timeout=2)
        print("✓ SSH available")
        return True
    except FileNotFoundError:
        print("✗ SSH not available")
        return False


def setup_local_forwarding():
    """Display instructions for WSL port forwarding"""
    print("\n" + "="*60)
    print("OPTION 1: WSL Port Forwarding to Windows")
    print("="*60)
    print("""
From Windows PowerShell (run as admin):
    netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=172.26.9.77

Then access from phone: http://<windows-pc-ip>:8080

To stop later:
    netsh interface portproxy delete v4tov4 listenport=8080 listenaddress=0.0.0.0
    """)


def setup_ngrok_tunnel():
    """Setup ngrok tunnel"""
    print("\n" + "="*60)
    print("OPTION 2: Ngrok Tunnel (Phone access anywhere)")
    print("="*60)
    print("""
From WSL terminal:
    ngrok http 8080

This will create a temporary URL like:
    https://xxxx-xxxx.ngrok.io

Access this URL from your phone.
    """)


def main():
    """Main entry point"""
    print("\n📱 Dashboard Phone Access Options\n")
    
    has_ngrok = check_ngrok()
    has_ssh = check_ssh_tunnel()
    
    # Show Windows port forwarding option
    setup_local_forwarding()
    
    # Show ngrok option if available
    if has_ngrok:
        setup_ngrok_tunnel()
    
    print("\n" + "="*60)
    print("To access dashboard:")
    print("="*60)
    print("1. From WSL: http://localhost:8080")
    print("2. From Windows: http://172.26.9.77:8080")
    print("3. From phone (same WiFi): http://<windows-ip>:8080 (after port forwarding)")
    print("4. From phone (anywhere): ngrok URL (temporarily)")
    print("\n")


if __name__ == '__main__':
    main()
