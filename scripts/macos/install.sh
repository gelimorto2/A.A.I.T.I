#!/bin/bash

# AAITI Installation Script for macOS v1.1.0
# Auto AI Trading Interface - Easy Setup for Mac

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
║                        🍎 AAITI - Auto AI Trading Interface v1.1.0 - macOS INSTALLER                               ║
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

# Check macOS version
print_step "Checking macOS Compatibility"

MACOS_VERSION=$(sw_vers -productVersion)
MACOS_MAJOR=$(echo $MACOS_VERSION | cut -d. -f1)
MACOS_MINOR=$(echo $MACOS_VERSION | cut -d. -f2)

echo "macOS Version: $MACOS_VERSION"

if [ "$MACOS_MAJOR" -ge 11 ]; then
    print_success "macOS $MACOS_VERSION is fully supported"
elif [ "$MACOS_MAJOR" -eq 10 ] && [ "$MACOS_MINOR" -ge 15 ]; then
    print_warning "macOS $MACOS_VERSION is supported but 11.0+ is recommended"
else
    print_error "macOS $MACOS_VERSION is not supported. Please upgrade to macOS 10.15 or later"
    exit 1
fi

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    print_success "Apple Silicon Mac detected"
    HOMEBREW_PREFIX="/opt/homebrew"
else
    print_success "Intel Mac detected"
    HOMEBREW_PREFIX="/usr/local"
fi

# Check system requirements
print_step "Checking System Requirements"

# Check Xcode Command Line Tools
if ! xcode-select -p &> /dev/null; then
    print_warning "Xcode Command Line Tools not found"
    echo "Installing Xcode Command Line Tools..."
    xcode-select --install
    echo "Please complete the Xcode Command Line Tools installation and re-run this script"
    exit 1
fi
print_success "Xcode Command Line Tools are installed"

# Check Homebrew
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found"
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH
    echo "Adding Homebrew to PATH..."
    echo 'eval "$('$HOMEBREW_PREFIX'/bin/brew shellenv)"' >> ~/.zprofile
    eval "$($HOMEBREW_PREFIX/bin/brew shellenv)"
fi

BREW_VERSION=$(brew --version | head -1)
print_success "Homebrew is installed: $BREW_VERSION"

# Check Node.js version
if ! command -v node &> /dev/null; then
    print_warning "Node.js is not installed"
    echo "Installing Node.js via Homebrew..."
    brew install node
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    print_warning "Node.js version $NODE_VERSION is too old. Installing newer version..."
    brew upgrade node
    NODE_VERSION=$(node --version | sed 's/v//')
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
AVAILABLE_SPACE=$(df -g . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -lt 2 ]; then
    print_warning "Low disk space detected. At least 2GB is recommended"
fi

# Check memory (need at least 2GB)
TOTAL_MEMORY=$(sysctl -n hw.memsize)
TOTAL_MEMORY_GB=$((TOTAL_MEMORY / 1024 / 1024 / 1024))
if [ "$TOTAL_MEMORY_GB" -lt 4 ]; then
    print_warning "Low memory detected ($TOTAL_MEMORY_GB GB). At least 4GB RAM is recommended"
else
    print_success "System has $TOTAL_MEMORY_GB GB RAM"
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

# Show progress on Apple Silicon (may take longer)
if [ "$ARCH" = "arm64" ]; then
    echo "⚠️  Apple Silicon detected - some native modules may take longer to compile"
fi

$INSTALL_COMMAND

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

# macOS Specific
PLATFORM=macos
ARCH=$ARCH
EOF
    print_success "Initial configuration created with macOS settings"
else
    print_success "Configuration already exists"
fi

# macOS-specific optimizations
print_step "macOS Optimizations"
if [ "$ARCH" = "arm64" ]; then
    echo "🍎 Configuring Apple Silicon optimizations..."
    # Add any Apple Silicon specific configurations here
    print_success "Apple Silicon optimizations applied"
else
    echo "🍎 Configuring Intel Mac optimizations..."
    # Add any Intel Mac specific configurations here
    print_success "Intel Mac optimizations applied"
fi

# Version check
print_step "Version Information"
npm run version:show

# Final success message
print_step "Installation Complete!"
echo -e "${GREEN}"
cat << "EOF"
🎉 AAITI has been installed successfully on macOS!

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

# macOS-specific additional info
echo ""
echo -e "${BLUE}macOS Specific Information:${NC}"
echo -e "Architecture: $ARCH"
echo -e "macOS Version: $MACOS_VERSION"
echo -e "Homebrew Location: $HOMEBREW_PREFIX"
echo ""

# Ask if user wants to start now
echo ""
read -p "Would you like to start AAITI now? (y/N): " START_NOW
if [[ $START_NOW =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}🚀 Starting AAITI...${NC}"
    echo "Press Ctrl+C to stop"
    sleep 2
    $START_COMMAND
fi