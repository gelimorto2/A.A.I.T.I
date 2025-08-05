#!/bin/bash

# A.A.I.T.I Demo Launcher - Backward Compatible
# This script maintains compatibility while directing users to the enhanced version

echo ""
echo "=========================================="
echo " A.A.I.T.I Demo - Quick Start"
echo "=========================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect operating system
case "$(uname -s)" in
    Linux*)
        OS="linux"
        VERBOSE_SCRIPT="$SCRIPT_DIR/scripts/linux/demo-verbose.sh"
        ;;
    Darwin*)
        OS="macos"
        VERBOSE_SCRIPT="$SCRIPT_DIR/scripts/macos/demo-verbose.sh"
        ;;
    *)
        OS="linux"  # Default fallback
        VERBOSE_SCRIPT="$SCRIPT_DIR/scripts/linux/demo-verbose.sh"
        ;;
esac

echo "Detected OS: $OS"
echo ""

# Check if verbose script exists
if [ -f "$VERBOSE_SCRIPT" ]; then
    echo "🚀 Enhanced verbose demo script available!"
    echo ""
    echo "Options:"
    echo "1) Run enhanced verbose demo (recommended)"
    echo "2) Run simple quick demo"
    echo ""
    read -p "Choose option (1-2, default: 1): " choice
    
    case "${choice:-1}" in
        1)
            echo ""
            echo "🎯 Launching enhanced verbose demo..."
            echo "This provides detailed progress, health checks, and troubleshooting info."
            echo ""
            exec "$VERBOSE_SCRIPT"
            ;;
        2)
            echo ""
            echo "🔄 Running simple demo..."
            ;;
        *)
            echo ""
            echo "🎯 Launching enhanced verbose demo (default)..."
            exec "$VERBOSE_SCRIPT"
            ;;
    esac
fi

# Original simple demo logic (fallback)
echo "This demo requires minimal setup and runs"
echo "with sample data for evaluation purposes."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is required for the demo."
    echo ""
    echo "Install Docker:"
    echo "  Linux: https://docs.docker.com/engine/install/"
    echo "  macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo ""
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "[ERROR] Docker is not running."
    echo "Please start Docker and try again."
    exit 1
fi

echo "[INFO] Docker detected and running"

# Determine Docker Compose command
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "[ERROR] Docker Compose is required but not found."
    exit 1
fi

echo "[INFO] Starting demo environment..."
$COMPOSE_CMD -f docker-compose.demo.yml down
$COMPOSE_CMD -f docker-compose.demo.yml up -d --build

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to start demo. Check Docker is running."
    exit 1
fi

echo ""
echo "===================================="
echo " Demo Started Successfully!"
echo "===================================="
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:5000"
echo "Health Check: http://localhost:5000/api/health"
echo ""
echo "Features in Demo:"
echo "- Sample trading data"
echo "- ML model demonstrations"
echo "- Dashboard interface"
echo "- Basic trading simulations"
echo ""
echo "To stop demo: $COMPOSE_CMD -f docker-compose.demo.yml down"
echo ""
echo "💡 Tip: For enhanced verbose demo with detailed progress tracking,"
echo "   run: $VERBOSE_SCRIPT"
echo ""

# Try to open browser (cross-platform)
if command -v xdg-open &> /dev/null; then
    echo "Opening demo in browser..."
    sleep 3
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    echo "Opening demo in browser..."
    sleep 3
    open http://localhost:3000
else
    echo "Demo is ready! Open http://localhost:3000 in your browser."
fi