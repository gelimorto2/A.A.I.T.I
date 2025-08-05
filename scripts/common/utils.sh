#!/bin/bash

# A.A.I.T.I Common Utilities
# Shared functions and utilities for demo and installation scripts
# Version: 2.0.0

# Common script configuration
SCRIPT_VERSION="2.0.0"
PROJECT_NAME="A.A.I.T.I"
REQUIRED_DOCKER_VERSION="20.0"
REQUIRED_NODE_VERSION="18"
MIN_MEMORY_GB="4"
MIN_DISK_GB="2"

# Default ports
DEFAULT_FRONTEND_PORT="3000"
DEFAULT_BACKEND_PORT="5000"

# Color definitions
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    PURPLE='\033[0;35m'
    CYAN='\033[0;36m'
    WHITE='\033[1;37m'
    NC='\033[0m' # No Color
else
    # No colors for non-interactive terminals
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    PURPLE=''
    CYAN=''
    WHITE=''
    NC=''
fi

# Logging functions
setup_logging() {
    local log_name="$1"
    LOG_FILE="${PROJECT_ROOT}/${log_name}-$(date +%Y%m%d-%H%M%S).log"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting $PROJECT_NAME $log_name" > "$LOG_FILE"
}

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Progress display functions
print_header() {
    local title="$1"
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗"
    printf "║%*s║\n" 118 " "
    printf "║%*s%s%*s║\n" $((59 - ${#title}/2)) " " "$title" $((59 - ${#title}/2)) " "
    printf "║%*s║\n" 118 " "
    echo "╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

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
}

print_info() {
    echo -e "   ${CYAN}ℹ️  $1${NC}"
}

# System detection functions
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux";;
        Darwin*)    echo "macos";;
        CYGWIN*)    echo "windows";;
        MINGW*)     echo "windows";;
        MSYS*)      echo "windows";;
        *)          echo "unknown";;
    esac
}

detect_architecture() {
    uname -m
}

detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif command -v lsb_release &> /dev/null; then
        lsb_release -si | tr '[:upper:]' '[:lower:]'
    else
        echo "unknown"
    fi
}

# Docker-related functions
check_docker_installed() {
    command -v docker &> /dev/null
}

check_docker_running() {
    docker info &> /dev/null
}

get_docker_version() {
    docker --version | cut -d' ' -f3 | cut -d',' -f1
}

get_compose_command() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null; then
        echo "docker compose"
    else
        return 1
    fi
}

# System resource checks
get_available_memory_gb() {
    local os=$(detect_os)
    case $os in
        linux)
            free -g | awk 'NR==2{print $7}'
            ;;
        macos)
            echo $(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

get_available_disk_gb() {
    local path="${1:-.}"
    df -BG "$path" 2>/dev/null | awk 'NR==2{print $4}' | sed 's/G//' || echo "unknown"
}

check_port_available() {
    local port="$1"
    local os=$(detect_os)
    
    case $os in
        linux|macos)
            ! lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1
            ;;
        *)
            # Fallback check
            ! netstat -an 2>/dev/null | grep -q ":$port.*LISTEN"
            ;;
    esac
}

# Network and connectivity checks
check_internet_connectivity() {
    if command -v ping &> /dev/null; then
        ping -c 1 google.com &> /dev/null || ping -c 1 8.8.8.8 &> /dev/null
    elif command -v curl &> /dev/null; then
        curl -s --connect-timeout 5 google.com &> /dev/null
    else
        return 1
    fi
}

check_docker_network() {
    docker run --rm alpine:latest ping -c 1 google.com &> /dev/null
}

# Version comparison functions
version_compare() {
    local version1="$1"
    local operator="$2"
    local version2="$3"
    
    # Simple version comparison (handles major.minor.patch)
    local v1=$(echo "$version1" | tr '.' ' ')
    local v2=$(echo "$version2" | tr '.' ' ')
    
    case $operator in
        ">=")
            [ "$version1" = "$(echo -e "$version1\n$version2" | sort -V | tail -n1)" ]
            ;;
        "<=")
            [ "$version1" = "$(echo -e "$version1\n$version2" | sort -V | head -n1)" ]
            ;;
        "=")
            [ "$version1" = "$version2" ]
            ;;
        ">")
            [ "$version1" != "$version2" ] && version_compare "$version1" ">=" "$version2"
            ;;
        "<")
            [ "$version1" != "$version2" ] && version_compare "$version1" "<=" "$version2"
            ;;
        *)
            return 1
            ;;
    esac
}

# Service health checks
wait_for_service() {
    local url="$1"
    local max_attempts="${2:-30}"
    local delay="${3:-2}"
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" &> /dev/null; then
            return 0
        fi
        sleep $delay
        ((attempt++))
    done
    return 1
}

check_service_health() {
    local service_name="$1"
    local health_url="$2"
    
    print_substep "Checking $service_name health..."
    if wait_for_service "$health_url" 10 1; then
        print_success "$service_name is healthy"
        return 0
    else
        print_warning "$service_name health check failed"
        return 1
    fi
}

# Browser launching functions
open_browser() {
    local url="$1"
    local os=$(detect_os)
    
    case $os in
        linux)
            if command -v xdg-open &> /dev/null; then
                xdg-open "$url" &
                return 0
            fi
            ;;
        macos)
            if command -v open &> /dev/null; then
                open "$url" &
                return 0
            fi
            ;;
        windows)
            if command -v start &> /dev/null; then
                start "$url" &
                return 0
            fi
            ;;
    esac
    return 1
}

# Cleanup functions
cleanup_containers() {
    local compose_file="$1"
    local compose_cmd=$(get_compose_command)
    
    if [ -n "$compose_cmd" ] && [ -f "$compose_file" ]; then
        print_substep "Stopping containers..."
        $compose_cmd -f "$compose_file" down --remove-orphans &> /dev/null || true
        print_success "Containers stopped"
    fi
}

cleanup_volumes() {
    local pattern="$1"
    print_substep "Removing old volumes..."
    docker volume rm $(docker volume ls -q | grep -E "$pattern" | head -3) 2>/dev/null || true
    print_success "Volumes cleaned"
}

# Configuration functions
create_env_file() {
    local env_file="$1"
    local template="$2"
    
    if [ ! -f "$env_file" ]; then
        print_substep "Creating configuration file..."
        if [ -n "$template" ]; then
            echo "$template" > "$env_file"
        else
            create_default_env_file "$env_file"
        fi
        print_success "Configuration file created"
    else
        print_success "Configuration file already exists"
    fi
}

create_default_env_file() {
    local env_file="$1"
    cat > "$env_file" << EOF
# $PROJECT_NAME Configuration
NODE_ENV=production
PORT=$DEFAULT_BACKEND_PORT
JWT_SECRET=$(generate_secret)
LOG_LEVEL=info

# Database
DB_PATH=./database/aaiti.sqlite

# Frontend URL
FRONTEND_URL=http://localhost:$DEFAULT_FRONTEND_PORT

# Market Data
CACHE_TIMEOUT=60000
RATE_LIMIT_DELAY=1200

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600000

# System Information
OS=$(detect_os)
ARCH=$(detect_architecture)
EOF
}

generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32 2>/dev/null
    else
        echo "your-secret-key-here-$(date +%s)"
    fi
}

# Display functions
show_access_info() {
    local frontend_port="${1:-$DEFAULT_FRONTEND_PORT}"
    local backend_port="${2:-$DEFAULT_BACKEND_PORT}"
    
    echo -e "\n${WHITE}🌐 Access Points:${NC}"
    echo -e "   ${GREEN}🎯 Main Dashboard:${NC} http://localhost:$frontend_port"
    echo -e "   ${GREEN}📊 Trading Interface:${NC} http://localhost:$frontend_port/trading"
    echo -e "   ${GREEN}🤖 ML Models:${NC} http://localhost:$frontend_port/models"
    echo -e "   ${GREEN}📈 Portfolio Analytics:${NC} http://localhost:$frontend_port/portfolio"
    echo -e "   ${GREEN}🔧 Backend API:${NC} http://localhost:$backend_port"
    echo -e "   ${GREEN}❤️  Health Check:${NC} http://localhost:$backend_port/api/health"
    echo -e "   ${GREEN}📖 API Documentation:${NC} http://localhost:$backend_port/api/docs"
}

show_demo_features() {
    echo -e "\n${WHITE}🎮 Demo Features Available:${NC}"
    echo -e "   ${CYAN}• 6 months of realistic Bitcoin, Ethereum, and altcoin data${NC}"
    echo -e "   ${CYAN}• 16+ ML algorithms: ARIMA, SARIMA, Prophet, LSTM, SVM, Random Forest${NC}"
    echo -e "   ${CYAN}• Interactive trading simulations with paper trading${NC}"
    echo -e "   ${CYAN}• Real-time portfolio tracking and risk analysis${NC}"
    echo -e "   ${CYAN}• Performance backtesting with historical data${NC}"
    echo -e "   ${CYAN}• Market sentiment analysis and news integration${NC}"
    echo -e "   ${CYAN}• 5 pre-configured trading strategies ready to test${NC}"
}

show_troubleshooting() {
    local compose_cmd="$1"
    local compose_file="$2"
    
    echo -e "\n${WHITE}📋 Troubleshooting:${NC}"
    echo -e "   ${CYAN}• View logs: $compose_cmd -f $compose_file logs -f${NC}"
    echo -e "   ${CYAN}• Restart services: $compose_cmd -f $compose_file restart${NC}"
    echo -e "   ${CYAN}• Check status: $compose_cmd -f $compose_file ps${NC}"
    echo -e "   ${CYAN}• Full reset: $compose_cmd -f $compose_file down -v${NC}"
}

# Timer functions
start_timer() {
    STEP_START_TIME=$(date +%s)
}

end_timer() {
    if [ -n "$STEP_START_TIME" ]; then
        local step_end_time=$(date +%s)
        local duration=$((step_end_time - STEP_START_TIME))
        echo -e "   ${PURPLE}⏱️  Completed in ${duration}s${NC}"
        unset STEP_START_TIME
    fi
}

# Export all functions for sourcing
set -a
# All functions are now available when this script is sourced
set +a