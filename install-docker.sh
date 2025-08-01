#!/bin/bash

# AAITI Docker Installation Script
# Production-Ready Docker-First Installation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="aaiti"

echo -e "${BLUE}🚀 AAITI Docker Installation Script${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is installed
check_docker() {
    print_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first:"
        echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
        echo "  macOS: Download Docker Desktop from https://docker.com"
        echo "  Windows: Download Docker Desktop from https://docker.com"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
    
    print_status "Docker is installed and running"
}

# Check Docker Compose
check_docker_compose() {
    print_info "Checking Docker Compose..."
    
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    print_status "Docker Compose is available"
}

# Check system requirements
check_system_requirements() {
    print_info "Checking system requirements..."
    
    # Check available memory (Linux)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
        
        if [ $MEMORY_GB -lt 2 ]; then
            print_warning "System has less than 2GB RAM. AAITI may run slowly."
        else
            print_status "System has ${MEMORY_GB}GB RAM"
        fi
    fi
    
    # Check disk space
    DISK_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ $DISK_SPACE -lt 5 ]; then
        print_warning "Less than 5GB disk space available"
    else
        print_status "Sufficient disk space available"
    fi
}

# Installation menu
show_installation_menu() {
    echo ""
    echo -e "${BLUE}Select installation type:${NC}"
    echo "1) 🎯 Production (Recommended)"
    echo "2) 🔧 Development" 
    echo "3) 📊 Production + Monitoring (Prometheus/Grafana)"
    echo "4) 🌐 Production + Nginx Reverse Proxy"
    echo "5) 💾 Production + Redis Caching"
    echo "6) 🚀 Full Stack (All services)"
    echo ""
    read -p "Enter your choice (1-6): " INSTALL_TYPE
}

# Set compose profiles based on installation type
set_compose_profiles() {
    case $INSTALL_TYPE in
        1)
            PROFILES=""
            DESCRIPTION="Production AAITI"
            ;;
        2)
            PROFILES="--profile development"
            DESCRIPTION="Development AAITI"
            ;;
        3)
            PROFILES="--profile production --profile monitoring"
            DESCRIPTION="Production + Monitoring"
            ;;
        4)
            PROFILES="--profile production --profile nginx"
            DESCRIPTION="Production + Nginx"
            ;;
        5)
            PROFILES="--profile production --profile redis"
            DESCRIPTION="Production + Redis"
            ;;
        6)
            PROFILES="--profile production --profile monitoring --profile nginx --profile redis"
            DESCRIPTION="Full Stack"
            ;;
        *)
            print_error "Invalid selection"
            exit 1
            ;;
    esac
}

# Pull and build images
build_and_start() {
    print_info "Building and starting $DESCRIPTION..."
    
    # Build the main application
    docker compose build aaiti
    
    # Start services based on profiles
    if [ -n "$PROFILES" ]; then
        docker compose $PROFILES up -d
    else
        docker compose up -d aaiti
    fi
    
    print_status "Services started successfully!"
}

# Wait for services to be ready
wait_for_services() {
    print_info "Waiting for services to be ready..."
    
    # Wait for main application
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker compose exec -T aaiti curl -f http://localhost:5000/api/health &> /dev/null; then
            print_status "AAITI backend is ready!"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_warning "AAITI backend health check timeout. Check logs with: docker compose logs aaiti"
    fi
}

# Show service information
show_service_info() {
    echo ""
    echo -e "${GREEN}🎉 Installation Complete!${NC}"
    echo -e "${GREEN}========================${NC}"
    echo ""
    echo "📊 AAITI Neural Command Deck: http://localhost:5000"
    
    if [[ "$PROFILES" == *"monitoring"* ]]; then
        echo "📈 Prometheus: http://localhost:9090"
        echo "📋 Grafana: http://localhost:3001 (admin/admin)"
    fi
    
    if [[ "$PROFILES" == *"nginx"* ]]; then
        echo "🌐 Nginx Proxy: http://localhost"
    fi
    
    if [[ "$PROFILES" == *"redis"* ]]; then
        echo "💾 Redis: localhost:6379"
    fi
    
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "📋 View logs: docker compose logs -f"
    echo "🔄 Restart: docker compose restart"
    echo "⏹️  Stop: docker compose down"
    echo "🔧 Shell access: docker compose exec aaiti sh"
    echo ""
}

# Show logs option
show_logs_option() {
    echo ""
    read -p "Would you like to view the logs now? (y/n): " SHOW_LOGS
    if [[ $SHOW_LOGS =~ ^[Yy]$ ]]; then
        echo ""
        print_info "Showing logs (Ctrl+C to exit)..."
        docker compose logs -f
    fi
}

# Main installation flow
main() {
    check_docker
    check_docker_compose
    check_system_requirements
    show_installation_menu
    set_compose_profiles
    
    echo ""
    print_info "Installing: $DESCRIPTION"
    print_info "This may take a few minutes..."
    echo ""
    
    build_and_start
    wait_for_services
    show_service_info
    show_logs_option
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Installation interrupted${NC}"; exit 1' INT

# Run main function
main

print_status "AAITI Docker installation completed successfully!"