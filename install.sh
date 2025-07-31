#!/bin/bash

# AAITI Installation Script v1.1.0
# Auto AI Trading Interface - Easy Setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                           🚀 AAITI - Auto AI Trading Interface v1.1.0 - INSTALLER                                   ║
║                                    Production-Ready Neural Command Deck Setup                                        ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Function to print step headers
print_step() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warnings
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print errors
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check system requirements
print_step "Checking System Requirements"

# Check Node.js version
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18 or higher"
    exit 1
fi

print_success "Node.js $NODE_VERSION is installed"

# Check npm version
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm $NPM_VERSION is installed"

# Check available disk space (need at least 2GB)
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -lt 2000000 ]; then
    print_warning "Low disk space detected. At least 2GB is recommended"
fi

# Check memory (need at least 2GB)
AVAILABLE_MEMORY=$(free -m | grep '^Mem:' | awk '{print $7}' 2>/dev/null || echo "unknown")
if [ "$AVAILABLE_MEMORY" != "unknown" ] && [ "$AVAILABLE_MEMORY" -lt 2000 ]; then
    print_warning "Low memory detected. At least 2GB RAM is recommended"
fi

print_success "System requirements check completed"

# Installation type selection
print_step "Choose Installation Type"
echo "1) 🚀 Production (recommended for live trading)"
echo "2) 🔧 Development (for testing and development)"
echo "3) ⚡ Fast Install (skip some optimizations)"
echo ""
read -p "Enter your choice (1-3): " INSTALL_TYPE

case $INSTALL_TYPE in
    1)
        INSTALL_COMMAND="npm run install:production"
        BUILD_COMMAND="npm run build:production"
        START_COMMAND="npm start"
        print_success "Production installation selected"
        ;;
    2)
        INSTALL_COMMAND="npm run setup:dev"
        BUILD_COMMAND=""
        START_COMMAND="npm run dev"
        print_success "Development installation selected"
        ;;
    3)
        INSTALL_COMMAND="npm run install:fast"
        BUILD_COMMAND="npm run build"
        START_COMMAND="npm start"
        print_success "Fast installation selected"
        ;;
    *)
        print_error "Invalid selection"
        exit 1
        ;;
esac

# Clean previous installations if they exist
if [ -d "node_modules" ] || [ -d "backend/node_modules" ] || [ -d "frontend/node_modules" ]; then
    print_step "Cleaning Previous Installation"
    read -p "Previous installation detected. Clean it? (y/N): " CLEAN_INSTALL
    if [[ $CLEAN_INSTALL =~ ^[Yy]$ ]]; then
        echo "🧹 Cleaning previous installation..."
        npm run clean 2>/dev/null || true
        print_success "Previous installation cleaned"
    fi
fi

# Install dependencies
print_step "Installing Dependencies"
echo "📦 This may take a few minutes..."

# Show progress
if command -v pv &> /dev/null; then
    $INSTALL_COMMAND | pv -t -i 1 > /dev/null
else
    $INSTALL_COMMAND
fi

print_success "Dependencies installed successfully"

# Build if needed
if [ ! -z "$BUILD_COMMAND" ]; then
    print_step "Building Application"
    echo "🏗️  Building frontend application..."
    $BUILD_COMMAND
    print_success "Application built successfully"
fi

# Create initial configuration
print_step "Initial Configuration"
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating initial configuration..."
    cat > backend/.env << EOF
# AAITI Configuration
NODE_ENV=production
PORT=5000
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "your-secret-key-here")
LOG_LEVEL=info

# Database
DB_PATH=./database/aaiti.sqlite

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Market Data
CACHE_TIMEOUT=60000
RATE_LIMIT_DELAY=1200

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600000
EOF
    print_success "Initial configuration created"
else
    print_success "Configuration already exists"
fi

# Version check
print_step "Version Information"
npm run version:show

# Final success message
print_step "Installation Complete!"
echo -e "${GREEN}"
cat << "EOF"
🎉 AAITI has been installed successfully!

Next steps:
1. Start the application:
   npm start

2. Open your browser to:
   http://localhost:3000

3. The backend API will be available at:
   http://localhost:5000

4. Check system health:
   npm run health

For help and documentation, visit:
https://github.com/gelimorto2/A.A.I.T.I

Happy Trading! 🚀
EOF
echo -e "${NC}"

# Ask if user wants to start now
echo ""
read -p "Would you like to start AAITI now? (y/N): " START_NOW
if [[ $START_NOW =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}🚀 Starting AAITI...${NC}"
    echo "Press Ctrl+C to stop"
    sleep 2
    $START_COMMAND
fi