#!/bin/bash

# A.A.I.T.I Verbose Demo Script for Linux/macOS
# Version: 2.0.0
# This script provides detailed feedback and progress tracking for the demo

set -e

# Colors for enhanced output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Demo configuration
DEMO_START_TIME=$(date +%s)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/demo-$(date +%Y%m%d-%H%M%S).log"

# ASCII Art Header
print_header() {
    echo -e "${BLUE}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                          🚀 A.A.I.T.I v2.0.0 - VERBOSE DEMO LAUNCHER                                               ║
║                                  Auto AI Trading Interface - Complete Demo Experience                               ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Progress tracking functions
print_step() {
    local step_num="$1"
    local total_steps="$2"
    local description="$3"
    echo -e "\n${WHITE}[$step_num/$total_steps]${NC} ${BLUE}$description${NC}"
    echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
}

print_substep() {
    echo -e "   ${YELLOW}▶${NC} $1"
}

print_success() {
    echo -e "   ${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "   ${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "   ${RED}❌ $1${NC}"
    echo -e "   ${RED}See troubleshooting: $PROJECT_ROOT/docs/troubleshooting.md${NC}"
}

print_info() {
    echo -e "   ${CYAN}ℹ️  $1${NC}"
}

# Timing functions
start_timer() {
    STEP_START_TIME=$(date +%s)
}

end_timer() {
    local step_end_time=$(date +%s)
    local duration=$((step_end_time - STEP_START_TIME))
    echo -e "   ${PURPLE}⏱️  Completed in ${duration}s${NC}"
}

# Logging function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Main demo function
main() {
    print_header
    
    log_message "Starting A.A.I.T.I verbose demo"
    
    echo -e "${WHITE}Demo Overview:${NC}"
    echo -e "• ${GREEN}Sample trading data${NC} for realistic testing experience"
    echo -e "• ${GREEN}Pre-configured ML models${NC} with 16+ algorithms ready to evaluate"
    echo -e "• ${GREEN}Interactive dashboard${NC} showcasing complete trading interface"
    echo -e "• ${GREEN}Real-time simulation${NC} with live-like market data"
    echo -e "• ${GREEN}Automated browser launch${NC} for immediate access"
    echo ""
    echo -e "${CYAN}Log file: $LOG_FILE${NC}"
    echo -e "${CYAN}Project root: $PROJECT_ROOT${NC}"
    echo ""
    
    # Step 1: System Requirements Check
    print_step "1" "8" "Checking System Requirements & Dependencies"
    start_timer
    
    print_substep "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is required for the demo"
        echo -e "   ${WHITE}Install Docker:${NC}"
        echo -e "     Linux: https://docs.docker.com/engine/install/"
        echo -e "     macOS: https://docs.docker.com/desktop/install/mac-install/"
        log_message "ERROR: Docker not found"
        exit 1
    fi
    DOCKER_VERSION=$(docker --version)
    print_success "Docker detected: $DOCKER_VERSION"
    log_message "Docker version: $DOCKER_VERSION"
    
    print_substep "Checking Docker service status..."
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        echo -e "   ${WHITE}Start Docker service:${NC}"
        echo -e "     Linux: sudo systemctl start docker"
        echo -e "     macOS: Start Docker Desktop application"
        log_message "ERROR: Docker service not running"
        exit 1
    fi
    print_success "Docker service is running and accessible"
    
    print_substep "Determining Docker Compose command..."
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        COMPOSE_VERSION=$(docker-compose --version)
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        COMPOSE_VERSION=$(docker compose version)
    else
        print_error "Docker Compose is required but not found"
        log_message "ERROR: Docker Compose not found"
        exit 1
    fi
    print_success "Using: $COMPOSE_CMD ($COMPOSE_VERSION)"
    log_message "Docker Compose: $COMPOSE_CMD - $COMPOSE_VERSION"
    
    print_substep "Checking available system resources..."
    # Check available memory
    if command -v free &> /dev/null; then
        AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.1fGB", $7/1024}')
        print_info "Available memory: $AVAILABLE_MEM"
    fi
    
    # Check available disk space
    AVAILABLE_DISK=$(df -h "$PROJECT_ROOT" | awk 'NR==2{print $4}')
    print_info "Available disk space: $AVAILABLE_DISK"
    
    end_timer
    
    # Step 2: Pre-flight checks
    print_step "2" "8" "Pre-flight Environment Checks"
    start_timer
    
    print_substep "Checking for port conflicts..."
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3000 is already in use"
        print_info "The demo will try to stop conflicting services"
    else
        print_success "Port 3000 is available"
    fi
    
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 5000 is already in use"
        print_info "The demo will try to stop conflicting services"
    else
        print_success "Port 5000 is available"
    fi
    
    print_substep "Checking Docker network connectivity..."
    if docker run --rm alpine:latest ping -c 1 google.com &> /dev/null; then
        print_success "Docker network connectivity verified"
    else
        print_warning "Docker network connectivity issues detected"
    fi
    
    print_substep "Validating Docker Compose configuration..."
    cd "$PROJECT_ROOT"
    if $COMPOSE_CMD -f docker-compose.demo.yml config &> /dev/null; then
        print_success "Docker Compose configuration is valid"
    else
        print_error "Docker Compose configuration has issues"
        log_message "ERROR: Invalid docker-compose.demo.yml"
        exit 1
    fi
    
    end_timer
    
    # Step 3: Cleanup previous installations
    print_step "3" "8" "Cleaning Previous Demo Instances"
    start_timer
    
    print_substep "Stopping any running demo containers..."
    $COMPOSE_CMD -f docker-compose.demo.yml down --remove-orphans &> /dev/null || true
    print_success "Previous instances cleaned"
    
    print_substep "Removing old demo volumes if they exist..."
    docker volume rm $(docker volume ls -q | grep -E "(aaiti|demo)" | head -3) 2>/dev/null || true
    print_success "Old volumes cleaned"
    
    end_timer
    
    # Step 4: Building containers
    print_step "4" "8" "Building Demo Containers"
    start_timer
    
    print_substep "Building backend container..."
    print_info "This may take 2-5 minutes on first run"
    if $COMPOSE_CMD -f docker-compose.demo.yml build demo-backend --quiet; then
        print_success "Backend container built successfully"
    else
        print_error "Failed to build backend container"
        log_message "ERROR: Backend container build failed"
        exit 1
    fi
    
    print_substep "Building frontend container..."
    print_info "This may take 3-7 minutes on first run"
    if $COMPOSE_CMD -f docker-compose.demo.yml build demo-frontend --quiet; then
        print_success "Frontend container built successfully"
    else
        print_error "Failed to build frontend container"
        log_message "ERROR: Frontend container build failed"
        exit 1
    fi
    
    end_timer
    
    # Step 5: Starting services
    print_step "5" "8" "Starting Demo Services"
    start_timer
    
    print_substep "Starting backend service..."
    $COMPOSE_CMD -f docker-compose.demo.yml up -d demo-backend
    
    print_substep "Waiting for backend to be ready..."
    local max_attempts=30
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:5000/api/health &> /dev/null; then
            print_success "Backend service is ready"
            break
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Backend service failed to start properly"
        print_info "Check logs: $COMPOSE_CMD -f docker-compose.demo.yml logs demo-backend"
        exit 1
    fi
    
    print_substep "Starting frontend service..."
    $COMPOSE_CMD -f docker-compose.demo.yml up -d demo-frontend
    
    print_substep "Waiting for frontend to be ready..."
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000 &> /dev/null; then
            print_success "Frontend service is ready"
            break
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Frontend service failed to start properly"
        print_info "Check logs: $COMPOSE_CMD -f docker-compose.demo.yml logs demo-frontend"
        exit 1
    fi
    
    end_timer
    
    # Step 6: Health checks
    print_step "6" "8" "Performing System Health Checks"
    start_timer
    
    print_substep "Checking backend API health..."
    if HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health); then
        print_success "Backend API is healthy: $HEALTH_RESPONSE"
    else
        print_warning "Backend API health check failed"
    fi
    
    print_substep "Verifying demo data initialization..."
    if curl -s http://localhost:5000/api/demo/status | grep -q "ready"; then
        print_success "Demo data is initialized and ready"
    else
        print_warning "Demo data initialization may still be in progress"
    fi
    
    print_substep "Testing frontend responsiveness..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        print_success "Frontend is responding correctly"
    else
        print_warning "Frontend may still be loading"
    fi
    
    end_timer
    
    # Step 7: Demo features overview
    print_step "7" "8" "Demo Features & Access Information"
    start_timer
    
    echo -e "\n${WHITE}🌐 Access Points:${NC}"
    echo -e "   ${GREEN}🎯 Main Dashboard:${NC} http://localhost:3000"
    echo -e "   ${GREEN}📊 Trading Interface:${NC} http://localhost:3000/trading"
    echo -e "   ${GREEN}🤖 ML Models:${NC} http://localhost:3000/models"
    echo -e "   ${GREEN}📈 Portfolio Analytics:${NC} http://localhost:3000/portfolio"
    echo -e "   ${GREEN}🔧 Backend API:${NC} http://localhost:5000"
    echo -e "   ${GREEN}❤️  Health Check:${NC} http://localhost:5000/api/health"
    echo -e "   ${GREEN}📖 API Documentation:${NC} http://localhost:5000/api/docs"
    
    echo -e "\n${WHITE}🎮 Demo Features Available:${NC}"
    echo -e "   ${CYAN}• 6 months of realistic Bitcoin, Ethereum, and altcoin data${NC}"
    echo -e "   ${CYAN}• 16+ ML algorithms: ARIMA, SARIMA, Prophet, LSTM, SVM, Random Forest${NC}"
    echo -e "   ${CYAN}• Interactive trading simulations with paper trading${NC}"
    echo -e "   ${CYAN}• Real-time portfolio tracking and risk analysis${NC}"
    echo -e "   ${CYAN}• Performance backtesting with historical data${NC}"
    echo -e "   ${CYAN}• Market sentiment analysis and news integration${NC}"
    echo -e "   ${CYAN}• 5 pre-configured trading strategies ready to test${NC}"
    
    echo -e "\n${WHITE}📚 Quick Start Guide:${NC}"
    echo -e "   ${YELLOW}1.${NC} Visit http://localhost:3000 to access the main dashboard"
    echo -e "   ${YELLOW}2.${NC} Navigate to 'Models' to explore ML algorithms and predictions"
    echo -e "   ${YELLOW}3.${NC} Go to 'Trading' to test automated trading strategies"
    echo -e "   ${YELLOW}4.${NC} Check 'Portfolio' for risk analysis and performance tracking"
    echo -e "   ${YELLOW}5.${NC} Use 'Settings' to configure demo parameters"
    
    echo -e "\n${WHITE}🛑 Stop Demo:${NC}"
    echo -e "   ${RED}$COMPOSE_CMD -f docker-compose.demo.yml down${NC}"
    
    echo -e "\n${WHITE}📋 Troubleshooting:${NC}"
    echo -e "   ${CYAN}• View logs: $COMPOSE_CMD -f docker-compose.demo.yml logs -f${NC}"
    echo -e "   ${CYAN}• Restart services: $COMPOSE_CMD -f docker-compose.demo.yml restart${NC}"
    echo -e "   ${CYAN}• Check status: $COMPOSE_CMD -f docker-compose.demo.yml ps${NC}"
    echo -e "   ${CYAN}• Full reset: $COMPOSE_CMD -f docker-compose.demo.yml down -v && ./scripts/linux/demo-verbose.sh${NC}"
    
    end_timer
    
    # Step 8: Launch browser
    print_step "8" "8" "Launching Demo Interface"
    start_timer
    
    print_substep "Opening demo in default browser..."
    if command -v xdg-open &> /dev/null; then
        print_info "Using xdg-open to launch browser..."
        sleep 3
        xdg-open http://localhost:3000 &
        print_success "Browser launched successfully"
    elif command -v open &> /dev/null; then
        print_info "Using open to launch browser..."
        sleep 3
        open http://localhost:3000 &
        print_success "Browser launched successfully"
    else
        print_warning "Could not auto-launch browser"
        print_info "Please manually open: http://localhost:3000"
    fi
    
    end_timer
    
    # Final summary
    local total_time=$(($(date +%s) - DEMO_START_TIME))
    echo -e "\n${GREEN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                   🎉 DEMO LAUNCHED SUCCESSFULLY! 🎉                                                 ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "${WHITE}⏱️  Total setup time: ${total_time}s${NC}"
    echo -e "${WHITE}📊 Dashboard URL: ${GREEN}http://localhost:3000${NC}"
    echo -e "${WHITE}📁 Log file: ${CYAN}$LOG_FILE${NC}"
    echo -e "${WHITE}📖 Documentation: ${CYAN}$PROJECT_ROOT/docs/demo.md${NC}"
    echo ""
    echo -e "${YELLOW}The demo is now ready for evaluation. Enjoy exploring A.A.I.T.I!${NC}"
    echo -e "${CYAN}Press Ctrl+C when done, then run the stop command shown above.${NC}"
    
    log_message "Demo launched successfully in ${total_time}s"
}

# Trap function for cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Demo script interrupted. Services are still running.${NC}"
    echo -e "${CYAN}To stop: $COMPOSE_CMD -f docker-compose.demo.yml down${NC}"
    log_message "Demo script interrupted by user"
}

trap cleanup INT TERM

# Change to project root and run main function
cd "$PROJECT_ROOT"
main "$@"