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
    echo -e "${GREEN}${ROCKET} AAITI Installation Complete! ${ROCKET}${NC}"
    echo -e "${WHITE}================================================${NC}"
    echo ""
    
    print_header "Next Steps:"
    echo ""
    
    print_step "Start the development servers:"
    echo -e "  ${YELLOW}npm run dev${NC}"
    echo ""
    
    print_step "Or start services individually:"
    echo -e "  Backend:  ${YELLOW}cd backend && npm run dev${NC}"
    echo -e "  Frontend: ${YELLOW}cd frontend && npm start${NC}"
    echo ""
    
    print_step "Build for production:"
    echo -e "  ${YELLOW}npm run build${NC}"
    echo -e "  ${YELLOW}npm run start:backend${NC}"
    echo ""
    
    print_header "Access Points:"
    echo -e "  🌐 Frontend: ${CYAN}http://localhost:3000${NC}"
    echo -e "  🔧 Backend API: ${CYAN}http://localhost:5000${NC}"
    echo -e "  🏥 Health Check: ${CYAN}http://localhost:5000/api/health${NC}"
    echo ""
    
    print_header "Features:"
    echo -e "  📊 Real-time crypto data via CoinGecko API (no API key required)"
    echo -e "  🤖 Multi-bot management interface"
    echo -e "  📡 WebSocket real-time updates"
    echo -e "  🔐 Secure authentication system"
    echo -e "  ⚙️ UI-based configuration management"
    echo ""
    
    print_info "Configuration and user management available through the web interface"
    print_info "Check the README.md for detailed documentation"
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
        print_header "AAITI Auto AI Trading Interface - Installation Script"
        echo ""
        check_directory
        check_requirements
        install_dependencies
        setup_configuration
        show_success
        ;;
    "build")
        print_header "AAITI - Build Script"
        echo ""
        check_directory
        check_requirements
        install_dependencies
        build_application
        print_status "Build process complete!"
        ;;
    "requirements"|"check")
        print_header "AAITI - Requirements Check"
        echo ""
        check_requirements
        ;;
    "help"|"-h"|"--help")
        echo -e "${WHITE}AAITI Installation Script${NC}"
        echo ""
        echo -e "${YELLOW}Usage:${NC}"
        echo -e "  ./install.sh [command]"
        echo ""
        echo -e "${YELLOW}Commands:${NC}"
        echo -e "  install     ${CYAN}Full installation (default)${NC}"
        echo -e "  build       ${CYAN}Install dependencies and build for production${NC}"
        echo -e "  check       ${CYAN}Check system requirements only${NC}"
        echo -e "  help        ${CYAN}Show this help message${NC}"
        echo ""
        echo -e "${YELLOW}Examples:${NC}"
        echo -e "  ./install.sh"
        echo -e "  ./install.sh build"
        echo -e "  ./install.sh check"
        ;;
    *)
        print_error "Unknown command: $1"
        print_info "Run './install.sh help' for usage information"
        exit 1
        ;;
esac