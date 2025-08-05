#!/bin/bash

echo ""
echo "==========================================
 A.A.I.T.I Demo - Quick Start
=========================================="
echo ""
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