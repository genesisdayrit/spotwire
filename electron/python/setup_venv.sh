#!/bin/bash
# setup_venv.sh
# This script creates a virtual environment for spotdl and installs required packages

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
VENV_DIR="$APP_DIR/venv"

# Use the requirements file path from command line argument, or use default
if [ -n "$1" ]; then
    REQUIREMENTS_FILE="$1"
else
    REQUIREMENTS_FILE="$SCRIPT_DIR/requirements.txt"
fi

echo "Setting up Python virtual environment for spotdl..."
echo "App directory: $APP_DIR"
echo "Using requirements file: $REQUIREMENTS_FILE"

# Check if the requirements file exists
if [ ! -f "$REQUIREMENTS_FILE" ]; then
    echo "Error: Requirements file not found at $REQUIREMENTS_FILE"
    exit 1
fi

# Check if Python 3 is installed and get version
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3 and try again."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

echo "Detected Python version: $PYTHON_VERSION"

# Remove existing virtual environment if Python version has changed
if [ -f "$VENV_DIR/pyvenv.cfg" ]; then
    VENV_PYTHON_VERSION=$(grep "version" "$VENV_DIR/pyvenv.cfg" | cut -d' ' -f3)
    if [ "$PYTHON_VERSION" != "$VENV_PYTHON_VERSION" ]; then
        echo "Python version changed from $VENV_PYTHON_VERSION to $PYTHON_VERSION"
        echo "Removing outdated virtual environment..."
        rm -rf "$VENV_DIR"
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create virtual environment. Trying with '--system-site-packages' option..."
        python3 -m venv --system-site-packages "$VENV_DIR"
        if [ $? -ne 0 ]; then
            echo "Error: Failed to create virtual environment even with --system-site-packages."
            echo "Please check your Python installation and try again."
            exit 1
        fi
    fi
else
    echo "Using existing virtual environment at $VENV_DIR"
fi

# Activate the virtual environment and install packages
echo "Installing required packages..."
source "$VENV_DIR/bin/activate" || { echo "Error: Failed to activate virtual environment"; exit 1; }

# Print active Python version
echo "Using Python: $(python --version)"

# Upgrade pip first
echo "Upgrading pip..."
pip install --upgrade pip

# Install wheel and setuptools first
echo "Installing wheel and setuptools..."
pip install --upgrade wheel setuptools

# Install required packages
echo "Installing dependencies from requirements.txt..."
pip install -r "$REQUIREMENTS_FILE"

# Check if ffmpeg is installed in the system
if ! command -v ffmpeg &> /dev/null; then
    echo "Warning: ffmpeg not found in system PATH."
    echo "spotdl requires ffmpeg to function properly."
    echo "Please install ffmpeg using your system's package manager:"
    echo "  - macOS: brew install ffmpeg"
    echo "  - Linux: sudo apt install ffmpeg"
    echo "  - Windows: download from https://ffmpeg.org/download.html"
else
    echo "ffmpeg found in system PATH: $(which ffmpeg)"
fi

echo "Setup complete! Virtual environment is ready."
echo "You can now use spotdl through the spotwire app."