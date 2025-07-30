#!/bin/bash

# AAITI Installation Script
# Auto AI Trading Interface - Simple Installation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Emojis
CHECK="✅"
ERROR="❌"
ROCKET="🚀"
GEAR="⚙️"
DOWNLOAD="⬇️"
INFO="ℹ️"
WARNING="⚠️"

# Function to print colored output
print_status() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

print_header() {
    echo -e "${PURPLE}${ROCKET} $1${NC}"
}

print_step() {
    echo -e "${CYAN}${GEAR} $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to clean installation
clean_install() {
    print_header "Performing clean installation..."
    
    if [ -d "node_modules" ] || [ -d "backend/node_modules" ] || [ -d "frontend/node_modules" ]; then
        print_step "Removing existing node_modules directories..."
        rm -rf node_modules backend/node_modules frontend/node_modules
        print_status "Cleaned existing installations"
    fi
    
    if [ -d "frontend/build" ]; then
        print_step "Removing existing build directory..."
        rm -rf frontend/build
        print_status "Cleaned existing build"
    fi
    
    if [ -f "package-lock.json" ] || [ -f "backend/package-lock.json" ] || [ -f "frontend/package-lock.json" ]; then
        print_step "Removing lock files for fresh installation..."
        rm -f package-lock.json backend/package-lock.json frontend/package-lock.json
        print_status "Cleaned lock files"
    fi
    
    echo ""
}

# Function to install production dependencies only
install_production() {
    print_header "Installing production dependencies..."
    
    # Install root dependencies
    print_step "Installing root package dependencies..."
    npm install --production
    print_status "Root dependencies installed"
    
    # Install backend dependencies
    print_step "Installing backend dependencies..."
    cd backend
    npm install --production
    cd ..
    print_status "Backend dependencies installed"
    
    # Install frontend dependencies and build
    print_step "Installing frontend dependencies..."
    cd frontend
    npm install
    print_status "Frontend dependencies installed"
    
    print_step "Building frontend for production..."
    npm run build
    cd ..
    print_status "Frontend built for production"
    
    print_status "Production installation complete!"
    echo ""
}

# Check system requirements
check_requirements() {
    print_header "Checking system requirements..."
    
    # Check for Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_status "Node.js found: $NODE_VERSION"
        
        # Check Node version (require 16+)
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -lt 16 ]; then
            print_error "Node.js version 16 or higher is required. Current: $NODE_VERSION"
            print_info "Please update Node.js: https://nodejs.org/"
            exit 1
        fi
    else
        print_error "Node.js is not installed"
        print_info "Please install Node.js 16+ from: https://nodejs.org/"
        exit 1
    fi
    
    # Check for npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_status "npm found: v$NPM_VERSION"
    else
        print_error "npm is not installed (should come with Node.js)"
        exit 1
    fi
    
    # Check for git
    if command_exists git; then
        GIT_VERSION=$(git --version)
        print_status "$GIT_VERSION found"
    else
        print_warning "git is not installed (optional for development)"
    fi
    
    print_status "All requirements satisfied!"
    echo ""
}

# Install dependencies
install_dependencies() {
    print_header "Installing dependencies..."
    
    # Install root dependencies
    print_step "Installing root package dependencies..."
    npm install
    print_status "Root dependencies installed"
    
    # Install backend dependencies
    print_step "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_status "Backend dependencies installed"
    
    # Install frontend dependencies
    print_step "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_status "Frontend dependencies installed"
    
    print_status "All dependencies installed successfully!"
    echo ""
}

# Build application
build_application() {
    print_header "Building application..."
    
    print_step "Building frontend for production..."
    cd frontend
    npm run build
    cd ..
    print_status "Frontend build completed"
    
    print_status "Application built successfully!"
    echo ""
}

# Setup configuration
setup_configuration() {
    print_header "Setting up configuration..."
    
    print_info "AAITI uses an UI-based configuration system"
    print_info "No manual configuration files are required"
    print_info "All settings can be managed through the web interface"
    
    print_status "Configuration setup complete!"
    echo ""
}

# Display success message and next steps
show_success() {
    echo ""
    echo -e "${WHITE}================================================${NC}"
    echo -e "${GREEN}${ROCKET} AAITI v1.0 Production Ready! ${ROCKET}${NC}"
    echo -e "${WHITE}================================================${NC}"
    echo ""
    
    print_header "Production Startup:"
    echo ""
    
    print_step "Start the complete application (single command):"
    echo -e "  ${YELLOW}npm start${NC}  ${CYAN}# Production mode with built frontend${NC}"
    echo ""
    
    print_step "Development mode (hot reload):"
    echo -e "  ${YELLOW}npm run dev${NC}  ${CYAN}# Development with live reload${NC}"
    echo ""
    
    print_step "Build for production:"
    echo -e "  ${YELLOW}npm run build:all${NC}  ${CYAN}# Build and optimize for production${NC}"
    echo ""
    
    print_header "Access Points:"
    echo -e "  🌐 Application: ${CYAN}http://localhost:3000${NC}"
    echo -e "  🔧 Backend API: ${CYAN}http://localhost:5000${NC}"
    echo -e "  🏥 Health Check: ${CYAN}http://localhost:5000/api/health${NC}"
    echo ""
    
    print_header "Production Features:"
    echo -e "  🚀 Single command startup (npm start)"
    echo -e "  📊 Real-time crypto data via CoinGecko API"
    echo -e "  🤖 Multi-bot management interface"
    echo -e "  📡 WebSocket real-time updates"
    echo -e "  🔐 Secure authentication system"
    echo -e "  ⚙️ UI-based configuration management"
    echo -e "  🎯 Mission-critical dark theme interface"
    echo -e "  📈 Advanced charting and analytics"
    echo ""
    
    print_info "Ready for production deployment!"
    print_info "Check the README.md for detailed documentation and screenshots"
    echo ""
}

# Check if running in the correct directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Please run this script from the root of the AAITI project directory"
        print_info "Expected structure: package.json, backend/, frontend/"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-install}" in
    "install"|"")
        print_header "AAITI v1.0 Production Installation"
        echo ""
        check_directory
        check_requirements
        install_dependencies
        setup_configuration
        show_success
        ;;
    "clean")
        print_header "AAITI - Clean Installation"
        echo ""
        check_directory
        check_requirements
        clean_install
        install_dependencies
        setup_configuration
        show_success
        ;;
    "production"|"prod")
        print_header "AAITI - Production Installation"
        echo ""
        check_directory
        check_requirements
        clean_install
        install_production
        setup_configuration
        show_success
        ;;
    "build")
        print_header "AAITI - Build for Production"
        echo ""
        check_directory
        check_requirements
        install_dependencies
        build_application
        print_status "Production build complete!"
        ;;
    "requirements"|"check")
        print_header "AAITI - Requirements Check"
        echo ""
        check_requirements
        ;;
    "help"|"-h"|"--help")
        echo -e "${WHITE}AAITI v1.0 Production Installation Script${NC}"
        echo ""
        echo -e "${YELLOW}Usage:${NC}"
        echo -e "  ./install.sh [command]"
        echo ""
        echo -e "${YELLOW}Commands:${NC}"
        echo -e "  install     ${CYAN}Standard installation (default)${NC}"
        echo -e "  clean       ${CYAN}Clean installation (removes existing files)${NC}"
        echo -e "  production  ${CYAN}Production-only installation with build${NC}"
        echo -e "  build       ${CYAN}Install dependencies and build for production${NC}"
        echo -e "  check       ${CYAN}Check system requirements only${NC}"
        echo -e "  help        ${CYAN}Show this help message${NC}"
        echo ""
        echo -e "${YELLOW}Examples:${NC}"
        echo -e "  ./install.sh clean      ${CYAN}# Clean install from scratch${NC}"
        echo -e "  ./install.sh production ${CYAN}# Production-ready installation${NC}"
        echo -e "  ./install.sh build      ${CYAN}# Just build for production${NC}"
        echo ""
        echo -e "${YELLOW}Post-Installation:${NC}"
        echo -e "  npm start    ${CYAN}# Start production application${NC}"
        echo -e "  npm run dev  ${CYAN}# Start development mode${NC}"
        ;;
    *)
        print_error "Unknown command: $1"
        print_info "Run './install.sh help' for usage information"
        exit 1
        ;;
esac