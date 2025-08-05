#!/bin/bash

# A.A.I.T.I macOS Demo Implementation
# This script contains the macOS-specific demo logic

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

# macOS-specific demo functions
check_demo_requirements() {
    print_step 1 6 "Checking macOS Demo Requirements"
    start_timer
    
    # Check Docker installation
    if ! check_docker_installed; then
        print_error "Docker Desktop is required for the demo"
        echo ""
        echo "Please install Docker Desktop for Mac:"
        echo "https://docs.docker.com/desktop/install/mac-install/"
        echo ""
        exit 1
    fi
    
    print_success "Docker Desktop is installed"
    
    # Check if Docker is running
    if ! check_docker_running; then
        print_error "Docker Desktop is not running"
        echo "Please start Docker Desktop and try again"
        echo "You can find it in Applications or the menu bar"
        exit 1
    fi
    
    print_success "Docker Desktop is running"
    
    # Determine Docker Compose command
    COMPOSE_CMD=$(get_compose_command)
    if [ $? -ne 0 ]; then
        print_error "Docker Compose is required but not found"
        echo "Please ensure Docker Desktop is properly installed"
        exit 1
    fi
    
    print_success "Docker Compose is available ($COMPOSE_CMD)"
    
    end_timer
}

check_system_resources() {
    print_step 2 6 "Checking macOS System Resources"
    start_timer
    
    # Check memory (macOS specific)
    local total_memory=$(sysctl -n hw.memsize)
    local total_memory_gb=$((total_memory / 1024 / 1024 / 1024))
    
    if [ "$total_memory_gb" -lt 4 ]; then
        print_warning "System has less than 4GB RAM ($total_memory_gb GB). Demo may run slowly"
    else
        print_success "Sufficient memory available ($total_memory_gb GB)"
    fi
    
    # Check disk space (macOS specific)
    local disk_space=$(df -g . | tail -1 | awk '{print $4}')
    if [ "$disk_space" -lt 5 ]; then
        print_warning "Less than 5GB disk space available ($disk_space GB)"
    else
        print_success "Sufficient disk space available ($disk_space GB)"
    fi
    
    # Check ports
    if ! check_port_available 3000; then
        print_warning "Port 3000 is in use. Frontend may not be accessible"
    else
        print_success "Port 3000 is available"
    fi
    
    if ! check_port_available 5000; then
        print_warning "Port 5000 is in use. Backend may not be accessible"
    else
        print_success "Port 5000 is available"
    fi
    
    # Check Docker resource allocation
    print_substep "Checking Docker Desktop resource allocation..."
    local arch=$(detect_architecture)
    if [ "$arch" = "arm64" ]; then
        print_info "Apple Silicon Mac detected - Docker runs natively"
    else
        print_info "Intel Mac detected - ensure Docker Desktop has sufficient resources"
    fi
    
    end_timer
}

prepare_demo_environment() {
    print_step 3 6 "Preparing Demo Environment"
    start_timer
    
    cd "$PROJECT_ROOT"
    
    # Clean up any existing containers
    print_substep "Cleaning previous demo containers..."
    cleanup_containers "docker-compose.demo.yml"
    
    # Pull latest images if needed
    print_substep "Pulling Docker images..."
    $COMPOSE_CMD -f docker-compose.demo.yml pull --quiet || true
    
    print_success "Demo environment prepared"
    
    end_timer
}

start_demo_services() {
    print_step 4 6 "Starting Demo Services"
    start_timer
    
    cd "$PROJECT_ROOT"
    
    print_substep "Building and starting demo containers..."
    local arch=$(detect_architecture)
    
    if [ "$arch" = "arm64" ]; then
        print_info "Building for Apple Silicon architecture..."
        # Set platform for Apple Silicon
        export DOCKER_DEFAULT_PLATFORM=linux/arm64
    fi
    
    $COMPOSE_CMD -f docker-compose.demo.yml up -d --build
    
    if [ $? -ne 0 ]; then
        print_error "Failed to start demo services"
        print_info "Check Docker Desktop is running and has sufficient resources"
        exit 1
    fi
    
    print_success "Demo services started successfully"
    
    end_timer
}

wait_for_services() {
    print_step 5 6 "Waiting for Services to Start"
    start_timer
    
    # Wait for backend to be ready
    print_substep "Waiting for backend service..."
    if wait_for_service "http://localhost:5000/api/health" 30 2; then
        print_success "Backend service is ready"
    else
        print_warning "Backend service health check timeout"
        print_info "You can check logs with: $COMPOSE_CMD -f docker-compose.demo.yml logs"
    fi
    
    # Wait for frontend to be ready
    print_substep "Waiting for frontend service..."
    if wait_for_service "http://localhost:3000" 30 2; then
        print_success "Frontend service is ready"
    else
        print_warning "Frontend service may still be starting"
    fi
    
    end_timer
}

show_demo_info() {
    print_step 6 6 "Demo Ready!"
    start_timer
    
    echo -e "${GREEN}"
    cat << "EOF"
🎉 A.A.I.T.I Demo Started Successfully on macOS!
═══════════════════════════════════════════════════════════════
EOF
    echo -e "${NC}"
    
    show_access_info
    show_demo_features
    show_troubleshooting "$COMPOSE_CMD" "docker-compose.demo.yml"
    
    echo -e "\n${WHITE}📝 macOS Specific Tips:${NC}"
    echo -e "   ${CYAN}• Use cmd+click to open links in new tabs${NC}"
    echo -e "   ${CYAN}• Monitor resource usage in Docker Desktop dashboard${NC}"
    echo -e "   ${CYAN}• Demo works great with Safari, Chrome, and Firefox${NC}"
    echo -e "   ${CYAN}• When finished, stop with: $COMPOSE_CMD -f docker-compose.demo.yml down${NC}"
    
    # Show macOS specific information
    echo -e "\n${WHITE}🍎 macOS System Information:${NC}"
    echo -e "   ${CYAN}Architecture: $(detect_architecture)${NC}"
    echo -e "   ${CYAN}macOS Version: $(sw_vers -productVersion)${NC}"
    
    end_timer
    
    # Try to open browser (macOS specific)
    echo ""
    read -p "Open demo in your default browser now? (Y/n): " OPEN_BROWSER
    if [[ ! $OPEN_BROWSER =~ ^[Nn]$ ]]; then
        print_substep "Opening demo in browser..."
        sleep 3
        if open_browser "http://localhost:3000"; then
            print_success "Demo opened in browser"
        else
            print_info "Please manually open http://localhost:3000 in your browser"
        fi
    fi
}

# Main demo function
main() {
    # Set up logging
    setup_logging "macos-demo"
    
    # Print header
    print_header "A.A.I.T.I v2.0.0 - macOS Demo"
    
    print_info "This demo provides a complete A.A.I.T.I experience with sample data"
    print_info "Optimized for macOS and Docker Desktop"
    echo ""
    
    # Run demo steps
    check_demo_requirements
    check_system_resources
    prepare_demo_environment
    start_demo_services
    wait_for_services
    show_demo_info
    
    log_message "macOS demo completed successfully"
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Demo interrupted${NC}"; cleanup_containers "docker-compose.demo.yml"; exit 1' INT

# Run main function
main "$@"