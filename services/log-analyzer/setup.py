"""
Setup script for log analyzer service.
"""

import subprocess
import sys

def install_requirements():
    """Install Python requirements for the log analyzer service."""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("Successfully installed Python dependencies for log analyzer service.")
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        sys.exit(1)

if __name__ == "__main__":
    install_requirements()
