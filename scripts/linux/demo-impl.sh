#!/bin/bash

# A.A.I.T.I Linux Demo Implementation
# This script contains the Linux-specific demo logic

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

# Linux-specific demo functions
check_demo_requirements() {
    print_step 1 6 "Checking Linux Demo Requirements"
    start_timer
    
    # Check Docker installation
    if ! check_docker_installed; then
        print_error "Docker is required for the demo"
        echo ""
        echo "Install Docker:"
        echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
        echo "  CentOS/RHEL: sudo yum install docker-ce"
        echo "  Fedora: sudo dnf install docker-ce"
        echo ""
        exit 1
    fi
    
    print_success "Docker is installed"
    
    # Check if Docker is running
    if ! check_docker_running; then
        print_error "Docker is not running"
        echo "Please start Docker and try again:"
        echo "  sudo systemctl start docker"
        exit 1
    fi
    
    print_success "Docker is running"
    
    # Determine Docker Compose command
    COMPOSE_CMD=$(get_compose_command)
    if [ $? -ne 0 ]; then
        print_error "Docker Compose is required but not found"
        echo "Please install Docker Compose"
        exit 1
    fi
    
    print_success "Docker Compose is available ($COMPOSE_CMD)"
    
    end_timer
}

check_system_resources() {
    print_step 2 6 "Checking System Resources"
    start_timer
    
    # Check memory
    local memory_gb=$(get_available_memory_gb)
    if [ "$memory_gb" != "unknown" ] && [ "$memory_gb" -lt 2 ]; then
        print_warning "System has less than 2GB RAM ($memory_gb GB). Demo may run slowly"
    else
        print_success "Sufficient memory available ($memory_gb GB)"
    fi
    
    # Check disk space
    local disk_space=$(get_available_disk_gb)
    if [ "$disk_space" != "unknown" ] && [ "$disk_space" -lt 5 ]; then
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
    $COMPOSE_CMD -f docker-compose.demo.yml up -d --build
    
    if [ $? -ne 0 ]; then
        print_error "Failed to start demo services"
        print_info "Check Docker is running and try again"
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
🎉 A.A.I.T.I Demo Started Successfully!
═══════════════════════════════════════════════════════════════
EOF
    echo -e "${NC}"
    
    show_access_info
    show_demo_features
    show_troubleshooting "$COMPOSE_CMD" "docker-compose.demo.yml"
    
    echo -e "\n${WHITE}📝 Next Steps:${NC}"
    echo -e "   ${CYAN}1. Open http://localhost:3000 in your browser${NC}"
    echo -e "   ${CYAN}2. Explore the demo features and sample data${NC}"
    echo -e "   ${CYAN}3. Try the ML models and trading simulations${NC}"
    echo -e "   ${CYAN}4. When finished, stop with: $COMPOSE_CMD -f docker-compose.demo.yml down${NC}"
    
    end_timer
    
    # Try to open browser
    echo ""
    read -p "Open demo in browser now? (Y/n): " OPEN_BROWSER
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
    setup_logging "linux-demo"
    
    # Print header
    print_header "A.A.I.T.I v2.0.0 - Linux Demo"
    
    print_info "This demo provides a complete A.A.I.T.I experience with sample data"
    print_info "Perfect for evaluation and testing all features"
    echo ""
    
    # Run demo steps
    check_demo_requirements
    check_system_resources
    prepare_demo_environment
    start_demo_services
    wait_for_services
    show_demo_info
    
    log_message "Linux demo completed successfully"
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Demo interrupted${NC}"; cleanup_containers "docker-compose.demo.yml"; exit 1' INT

# Run main function
main "$@"