#!/usr/bin/env python3
"""
Extremely simple wrapper for spotdl CLI that works in any Python environment with spotdl installed.
This script simply calls the spotdl command as a subprocess, which avoids any import issues.
"""

import sys
import os
import subprocess
import time

def main():
    """
    Main function that calls the spotdl command with the provided arguments.
    """
    try:
        print(f"[run_spotdl] Starting at {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"[run_spotdl] Received arguments: {sys.argv[1:]}")
        
        # Get the path to the Python executable that's running this script
        python_executable = sys.executable
        print(f"[run_spotdl] Using Python executable: {python_executable}")
        
        # Construct a command that runs: python -m spotdl <args>
        cmd = [python_executable, "-m", "spotdl"] + sys.argv[1:]
        print(f"[run_spotdl] Executing command: {' '.join(cmd)}")
        
        # Run the command and capture output
        process = subprocess.run(
            cmd,
            check=False,
            text=True,
            capture_output=True
        )
        
        # Print the command output
        if process.stdout:
            print(process.stdout)
        
        # Print any errors
        if process.stderr:
            print(process.stderr, file=sys.stderr)
            
        # Return the same exit code
        sys.exit(process.returncode)
        
    except Exception as e:
        print(f"[run_spotdl] Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 