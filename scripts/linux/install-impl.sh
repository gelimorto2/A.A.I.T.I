#!/bin/bash

# A.A.I.T.I Linux Installation Implementation
# This script contains the Linux-specific installation logic

set -e

# Get script directory and load common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source common utilities
if [ -f "$SCRIPT_DIR/../common/utils.sh" ]; then
    source "$SCRIPT_DIR/../common/utils.sh"
else
    echo "Error: Common utilities not found"
    exit 1
fi

# Linux-specific functions
check_linux_requirements() {
    print_step 1 8 "Checking Linux System Requirements"
    start_timer
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root"
        exit 1
    fi
    
    # Check distribution
    local distro=$(detect_distro)
    print_info "Linux distribution: $distro"
    
    # Check architecture
    local arch=$(detect_architecture)
    print_info "Architecture: $arch"
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        echo "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local node_major=$(echo $node_version | cut -d. -f1)
    
    if [ "$node_major" -lt 18 ]; then
        print_error "Node.js version $node_version is too old. Please install Node.js 18 or higher"
        exit 1
    fi
    
    print_success "Node.js $node_version is installed"
    
    # Check npm version
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    local npm_version=$(npm --version)
    print_success "npm $npm_version is installed"
    
    # Check disk space
    local available_space=$(get_available_disk_gb)
    if [ "$available_space" != "unknown" ] && [ "$available_space" -lt 2 ]; then
        print_warning "Low disk space detected ($available_space GB). At least 2GB is recommended"
    else
        print_success "Sufficient disk space available ($available_space GB)"
    fi
    
    # Check memory
    local available_memory=$(get_available_memory_gb)
    if [ "$available_memory" != "unknown" ] && [ "$available_memory" -lt 2 ]; then
        print_warning "Low memory detected ($available_memory GB). At least 2GB RAM is recommended"
    else
        print_success "Sufficient memory available ($available_memory GB)"
    fi
    
    end_timer
}

select_installation_type() {
    print_step 2 8 "Choose Installation Type"
    start_timer
    
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
    
    end_timer
}

clean_previous_installation() {
    print_step 3 8 "Cleaning Previous Installation"
    start_timer
    
    if [ -d "$PROJECT_ROOT/node_modules" ] || [ -d "$PROJECT_ROOT/backend/node_modules" ] || [ -d "$PROJECT_ROOT/frontend/node_modules" ]; then
        echo ""
        read -p "Previous installation detected. Clean it? (y/N): " CLEAN_INSTALL
        if [[ $CLEAN_INSTALL =~ ^[Yy]$ ]]; then
            print_substep "Cleaning previous installation..."
            cd "$PROJECT_ROOT"
            npm run clean 2>/dev/null || true
            print_success "Previous installation cleaned"
        else
            print_info "Keeping previous installation"
        fi
    else
        print_success "No previous installation found"
    fi
    
    end_timer
}

install_dependencies() {
    print_step 4 8 "Installing Dependencies"
    start_timer
    
    print_substep "This may take a few minutes..."
    
    cd "$PROJECT_ROOT"
    
    # Show progress if pv is available
    if command -v pv &> /dev/null; then
        $INSTALL_COMMAND | pv -t -i 1 > /dev/null
    else
        $INSTALL_COMMAND
    fi
    
    print_success "Dependencies installed successfully"
    
    end_timer
}

build_application() {
    if [ ! -z "$BUILD_COMMAND" ]; then
        print_step 5 8 "Building Application"
        start_timer
        
        print_substep "Building frontend application..."
        cd "$PROJECT_ROOT"
        $BUILD_COMMAND
        print_success "Application built successfully"
        
        end_timer
    else
        print_step 5 8 "Skipping Build (Development Mode)"
        print_success "Build step skipped for development installation"
    fi
}

create_configuration() {
    print_step 6 8 "Initial Configuration"
    start_timer
    
    local env_file="$PROJECT_ROOT/backend/.env"
    
    if [ ! -f "$env_file" ]; then
        print_substep "Creating initial configuration..."
        
        local env_template="# A.A.I.T.I Configuration
NODE_ENV=production
PORT=5000
JWT_SECRET=$(generate_secret)
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

# Linux-specific
PLATFORM=linux
ARCH=$(detect_architecture)
DISTRO=$(detect_distro)"

        create_env_file "$env_file" "$env_template"
    else
        print_success "Configuration already exists"
    fi
    
    end_timer
}

show_version_info() {
    print_step 7 8 "Version Information"
    start_timer
    
    cd "$PROJECT_ROOT"
    npm run version:show
    
    end_timer
}

complete_installation() {
    print_step 8 8 "Installation Complete!"
    start_timer
    
    echo -e "${GREEN}"
    cat << "EOF"
🎉 A.A.I.T.I has been installed successfully on Linux!

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
    
    # Linux-specific information
    echo ""
    echo -e "${BLUE}Linux Specific Information:${NC}"
    echo -e "Distribution: $(detect_distro)"
    echo -e "Architecture: $(detect_architecture)"
    echo -e "Kernel: $(uname -r)"
    echo ""
    
    end_timer
    
    # Ask if user wants to start now
    echo ""
    read -p "Would you like to start A.A.I.T.I now? (y/N): " START_NOW
    if [[ $START_NOW =~ ^[Yy]$ ]]; then
        echo -e "\n${BLUE}🚀 Starting A.A.I.T.I...${NC}"
        echo "Press Ctrl+C to stop"
        sleep 2
        cd "$PROJECT_ROOT"
        $START_COMMAND
    fi
}

# Main installation function
main() {
    # Set up logging
    setup_logging "linux-install"
    
    # Print header
    print_header "A.A.I.T.I v2.0.0 - Linux Installation"
    
    # Run installation steps
    check_linux_requirements
    select_installation_type
    clean_previous_installation
    install_dependencies
    build_application
    create_configuration
    show_version_info
    complete_installation
    
    log_message "Linux installation completed successfully"
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Installation interrupted${NC}"; exit 1' INT

# Run main function
main "$@"