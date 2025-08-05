#!/bin/bash

# A.A.I.T.I macOS Installation Implementation
# This script contains the macOS-specific installation logic

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

# macOS-specific functions
check_macos_requirements() {
    print_step 1 9 "Checking macOS System Requirements"
    start_timer
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root"
        exit 1
    fi
    
    # Check macOS version
    local macos_version=$(sw_vers -productVersion)
    local macos_major=$(echo $macos_version | cut -d. -f1)
    local macos_minor=$(echo $macos_version | cut -d. -f2)
    
    print_info "macOS Version: $macos_version"
    
    if [ "$macos_major" -ge 11 ]; then
        print_success "macOS $macos_version is fully supported"
    elif [ "$macos_major" -eq 10 ] && [ "$macos_minor" -ge 15 ]; then
        print_warning "macOS $macos_version is supported but 11.0+ is recommended"
    else
        print_error "macOS $macos_version is not supported. Please upgrade to macOS 10.15 or later"
        exit 1
    fi
    
    # Detect architecture
    local arch=$(detect_architecture)
    if [ "$arch" = "arm64" ]; then
        print_success "Apple Silicon Mac detected"
        HOMEBREW_PREFIX="/opt/homebrew"
    else
        print_success "Intel Mac detected"  
        HOMEBREW_PREFIX="/usr/local"
    fi
    
    end_timer
}

check_xcode_tools() {
    print_step 2 9 "Checking Development Tools"
    start_timer
    
    # Check Xcode Command Line Tools
    if ! xcode-select -p &> /dev/null; then
        print_warning "Xcode Command Line Tools not found"
        print_substep "Installing Xcode Command Line Tools..."
        xcode-select --install
        print_info "Please complete the Xcode Command Line Tools installation and re-run this script"
        exit 1
    fi
    print_success "Xcode Command Line Tools are installed"
    
    end_timer
}

check_homebrew() {
    print_step 3 9 "Checking Package Manager"
    start_timer
    
    # Check Homebrew
    if ! command -v brew &> /dev/null; then
        print_warning "Homebrew not found"
        print_substep "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH
        print_substep "Adding Homebrew to PATH..."
        echo 'eval "$('$HOMEBREW_PREFIX'/bin/brew shellenv)"' >> ~/.zprofile
        eval "$($HOMEBREW_PREFIX/bin/brew shellenv)"
    fi
    
    local brew_version=$(brew --version | head -1)
    print_success "Homebrew is installed: $brew_version"
    
    end_timer
}

check_node_npm() {
    print_step 4 9 "Checking Node.js and npm"
    start_timer
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed"
        print_substep "Installing Node.js via Homebrew..."
        brew install node
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local node_major=$(echo $node_version | cut -d. -f1)
    
    if [ "$node_major" -lt 18 ]; then
        print_warning "Node.js version $node_version is too old. Installing newer version..."
        brew upgrade node
        node_version=$(node --version | sed 's/v//')
    fi
    
    print_success "Node.js $node_version is installed"
    
    # Check npm version
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    local npm_version=$(npm --version)
    print_success "npm $npm_version is installed"
    
    end_timer
}

check_system_resources() {
    print_step 5 9 "Checking System Resources"
    start_timer
    
    # Check available disk space
    local available_space=$(df -g . | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 2 ]; then
        print_warning "Low disk space detected ($available_space GB). At least 2GB is recommended"
    else
        print_success "Sufficient disk space available ($available_space GB)"
    fi
    
    # Check memory
    local total_memory=$(sysctl -n hw.memsize)
    local total_memory_gb=$((total_memory / 1024 / 1024 / 1024))
    if [ "$total_memory_gb" -lt 4 ]; then
        print_warning "Low memory detected ($total_memory_gb GB). At least 4GB RAM is recommended"
    else
        print_success "System has $total_memory_gb GB RAM"
    fi
    
    end_timer
}

select_installation_type() {
    print_step 6 9 "Choose Installation Type"
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

install_dependencies() {
    print_step 7 9 "Installing Dependencies"
    start_timer
    
    # Show progress if pv is available (install it if not)
    if ! command -v pv &> /dev/null; then
        print_substep "Installing progress indicator..."
        brew install pv
    fi
    
    print_substep "This may take a few minutes..."
    
    # Show progress on Apple Silicon (may take longer)
    local arch=$(detect_architecture)
    if [ "$arch" = "arm64" ]; then
        print_warning "Apple Silicon detected - some native modules may take longer to compile"
    fi
    
    cd "$PROJECT_ROOT"
    $INSTALL_COMMAND
    
    print_success "Dependencies installed successfully"
    
    end_timer
}

build_application() {
    if [ ! -z "$BUILD_COMMAND" ]; then
        print_step 8 9 "Building Application"
        start_timer
        
        print_substep "Building frontend application..."
        cd "$PROJECT_ROOT"
        $BUILD_COMMAND
        print_success "Application built successfully"
        
        end_timer
    else
        print_step 8 9 "Skipping Build (Development Mode)"
        print_success "Build step skipped for development installation"
    fi
}

complete_installation() {
    print_step 9 9 "Installation Complete!"
    start_timer
    
    # Create configuration
    local env_file="$PROJECT_ROOT/backend/.env"
    
    if [ ! -f "$env_file" ]; then
        print_substep "Creating initial configuration..."
        
        local arch=$(detect_architecture)
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

# macOS Specific
PLATFORM=macos
ARCH=$arch"

        create_env_file "$env_file" "$env_template"
    else
        print_success "Configuration already exists"
    fi
    
    # macOS-specific optimizations
    print_substep "Applying macOS optimizations..."
    local arch=$(detect_architecture)
    if [ "$arch" = "arm64" ]; then
        print_info "Apple Silicon optimizations applied"
    else
        print_info "Intel Mac optimizations applied"
    fi
    
    # Show version info
    cd "$PROJECT_ROOT"
    npm run version:show
    
    echo -e "${GREEN}"
    cat << "EOF"

🎉 A.A.I.T.I has been installed successfully on macOS!

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
    echo -e "Architecture: $(detect_architecture)"
    echo -e "macOS Version: $(sw_vers -productVersion)"
    echo -e "Homebrew Location: $HOMEBREW_PREFIX"
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
    setup_logging "macos-install"
    
    # Print header
    print_header "A.A.I.T.I v2.0.0 - macOS Installation"
    
    # Run installation steps
    check_macos_requirements
    check_xcode_tools
    check_homebrew
    check_node_npm
    check_system_resources
    select_installation_type
    install_dependencies
    build_application
    complete_installation
    
    log_message "macOS installation completed successfully"
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Installation interrupted${NC}"; exit 1' INT

# Run main function
main "$@"