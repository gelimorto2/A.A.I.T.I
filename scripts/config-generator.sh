#!/bin/bash

# A.A.I.T.I Configuration Generator
# Interactive script to generate .env configuration file

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Helper functions
print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${WHITE}       A.A.I.T.I Configuration Generator v2.0         ${BLUE}        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

read_with_default() {
    local prompt="$1"
    local default="$2"
    local value
    echo -ne "${WHITE}$prompt${NC} ${YELLOW}[$default]${NC}: "
    read -r value
    echo "${value:-$default}"
}

read_secret() {
    local prompt="$1"
    local value
    echo -ne "${WHITE}$prompt${NC}: "
    read -s value
    echo ""
    echo "$value"
}

read_choice() {
    local prompt="$1"
    shift
    local options=("$@")
    local choice
    
    echo -e "${WHITE}$prompt${NC}"
    for i in "${!options[@]}"; do
        echo "  $((i+1))) ${options[$i]}"
    done
    echo -ne "${CYAN}Select (1-${#options[@]})${NC}: "
    read -r choice
    
    # Validate and return index (0-based)
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
        echo "$((choice-1))"
    else
        echo "0"
    fi
}

generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex 32
    else
        echo "$(date +%s)$$$RANDOM" | sha256sum | cut -d' ' -f1
    fi
}

# Main configuration function
main() {
    print_header
    
    print_info "This wizard will help you configure your A.A.I.T.I installation."
    print_info "Press Enter to accept default values shown in [brackets]."
    echo ""
    
    # ========================================================================
    # 1. Installation Type
    # ========================================================================
    print_section "1. Installation Type"
    
    INSTALL_TYPE_IDX=$(read_choice "Choose installation type:" \
        "Production (Docker, optimized for live trading)" \
        "Development (Local with hot-reload, debugging)" \
        "Docker Development (Containerized with dev tools)")
    
    case $INSTALL_TYPE_IDX in
        0)
            NODE_ENV="production"
            INSTALL_TYPE="production"
            ;;
        1)
            NODE_ENV="development"
            INSTALL_TYPE="development"
            ;;
        2)
            NODE_ENV="development"
            INSTALL_TYPE="docker-dev"
            ;;
    esac
    
    print_success "Installation type: $INSTALL_TYPE"
    
    # ========================================================================
    # 2. Application Settings
    # ========================================================================
    print_section "2. Application Settings"
    
    PORT=$(read_with_default "Application port" "5000")
    LOG_LEVEL_IDX=$(read_choice "Log level:" "error" "warn" "info" "debug")
    LOG_LEVELS=("error" "warn" "info" "debug")
    LOG_LEVEL="${LOG_LEVELS[$LOG_LEVEL_IDX]}"
    
    FRONTEND_URL=$(read_with_default "Frontend URL" "http://localhost:3000")
    
    print_success "App will run on port $PORT with $LOG_LEVEL logging"
    
    # ========================================================================
    # 3. Database Configuration
    # ========================================================================
    print_section "3. Database Configuration"
    
    DB_TYPE_IDX=$(read_choice "Select database type:" \
        "SQLite (Simple, file-based - recommended for small deployments)" \
        "PostgreSQL (Production-grade, scalable)")
    
    if [ "$DB_TYPE_IDX" -eq 0 ]; then
        DB_TYPE="sqlite"
        DB_PATH=$(read_with_default "SQLite database path" "./database/aaiti.sqlite")
        print_success "Using SQLite at $DB_PATH"
    else
        DB_TYPE="postgresql"
        DB_HOST=$(read_with_default "PostgreSQL host" "localhost")
        DB_PORT=$(read_with_default "PostgreSQL port" "5432")
        DB_NAME=$(read_with_default "Database name" "aaiti")
        DB_USER=$(read_with_default "Database user" "aaiti_user")
        DB_PASSWORD=$(read_secret "Database password")
        print_success "Using PostgreSQL at $DB_HOST:$DB_PORT"
    fi
    
    # ========================================================================
    # 4. Security Settings
    # ========================================================================
    print_section "4. Security Settings"
    
    print_info "Generating secure JWT secret..."
    JWT_SECRET=$(generate_secret)
    print_success "JWT secret generated"
    
    print_info "Generating encryption key..."
    ENCRYPTION_KEY=$(generate_secret)
    print_success "Encryption key generated"
    
    SESSION_SECRET=$(generate_secret)
    print_success "Session secret generated"
    
    # ========================================================================
    # 5. Exchange API Keys (Optional)
    # ========================================================================
    print_section "5. Exchange API Keys (Optional)"
    
    print_info "Configure API keys for trading exchanges."
    print_warning "Leave blank to configure later through the dashboard."
    echo ""
    
    # Binance
    echo -e "${WHITE}Binance Configuration:${NC}"
    BINANCE_API_KEY=$(read_with_default "  Binance API Key" "")
    if [ -n "$BINANCE_API_KEY" ]; then
        BINANCE_API_SECRET=$(read_secret "  Binance API Secret")
        BINANCE_TESTNET=$(read_with_default "  Use testnet?" "true")
    else
        BINANCE_API_SECRET=""
        BINANCE_TESTNET="false"
    fi
    
    echo ""
    
    # Alpaca
    echo -e "${WHITE}Alpaca Configuration (Stock trading):${NC}"
    ALPACA_API_KEY=$(read_with_default "  Alpaca API Key" "")
    if [ -n "$ALPACA_API_KEY" ]; then
        ALPACA_API_SECRET=$(read_secret "  Alpaca API Secret")
        ALPACA_PAPER=$(read_with_default "  Use paper trading?" "true")
    else
        ALPACA_API_SECRET=""
        ALPACA_PAPER="false"
    fi
    
    echo ""
    
    # Polygon.io (Market Data)
    echo -e "${WHITE}Polygon.io Configuration (Market data):${NC}"
    POLYGON_API_KEY=$(read_with_default "  Polygon.io API Key" "")
    
    # ========================================================================
    # 6. Performance & Resource Settings
    # ========================================================================
    print_section "6. Performance Settings"
    
    if [ "$INSTALL_TYPE" = "production" ]; then
        UV_THREADPOOL_SIZE=$(read_with_default "UV thread pool size" "16")
        MAX_OLD_SPACE=$(read_with_default "Node.js max old space (MB)" "2048")
        CACHE_TTL=$(read_with_default "Cache TTL (seconds)" "300")
        RATE_LIMIT_WINDOW=$(read_with_default "Rate limit window (ms)" "900000")
        RATE_LIMIT_MAX=$(read_with_default "Rate limit max requests" "1000")
    else
        UV_THREADPOOL_SIZE="4"
        MAX_OLD_SPACE="1024"
        CACHE_TTL="60"
        RATE_LIMIT_WINDOW="60000"
        RATE_LIMIT_MAX="100"
    fi
    
    print_success "Performance settings configured"
    
    # ========================================================================
    # 7. Generate .env file
    # ========================================================================
    print_section "7. Generating Configuration File"
    
    ENV_FILE=".env"
    
    # Backup existing .env if present
    if [ -f "$ENV_FILE" ]; then
        BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$ENV_FILE" "$BACKUP_FILE"
        print_warning "Existing .env backed up to $BACKUP_FILE"
    fi
    
    # Write .env file
    cat > "$ENV_FILE" << EOF
# ========================================================================
# A.A.I.T.I Configuration File
# Generated: $(date)
# Installation Type: $INSTALL_TYPE
# ========================================================================

# ========================================================================
# Application Settings
# ========================================================================
NODE_ENV=$NODE_ENV
PORT=$PORT
LOG_LEVEL=$LOG_LEVEL
FRONTEND_URL=$FRONTEND_URL

# ========================================================================
# Database Configuration
# ========================================================================
DB_TYPE=$DB_TYPE
EOF

    if [ "$DB_TYPE" = "sqlite" ]; then
        cat >> "$ENV_FILE" << EOF
DB_PATH=$DB_PATH

# SQLite Optimization Settings
SQLITE_CACHE_SIZE=10000
SQLITE_SYNCHRONOUS=NORMAL
SQLITE_JOURNAL_MODE=WAL
EOF
    else
        cat >> "$ENV_FILE" << EOF
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
EOF
    fi

    cat >> "$ENV_FILE" << EOF

# ========================================================================
# Security Settings
# ========================================================================
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
SESSION_SECRET=$SESSION_SECRET
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# ========================================================================
# Exchange API Keys
# ========================================================================
# Binance
EOF

    if [ -n "$BINANCE_API_KEY" ]; then
        cat >> "$ENV_FILE" << EOF
BINANCE_API_KEY=$BINANCE_API_KEY
BINANCE_API_SECRET=$BINANCE_API_SECRET
BINANCE_TESTNET=$BINANCE_TESTNET
EOF
    else
        cat >> "$ENV_FILE" << EOF
# BINANCE_API_KEY=
# BINANCE_API_SECRET=
# BINANCE_TESTNET=true
EOF
    fi

    cat >> "$ENV_FILE" << EOF

# Alpaca (Stocks)
EOF

    if [ -n "$ALPACA_API_KEY" ]; then
        cat >> "$ENV_FILE" << EOF
ALPACA_API_KEY=$ALPACA_API_KEY
ALPACA_API_SECRET=$ALPACA_API_SECRET
ALPACA_PAPER=$ALPACA_PAPER
EOF
    else
        cat >> "$ENV_FILE" << EOF
# ALPACA_API_KEY=
# ALPACA_API_SECRET=
# ALPACA_PAPER=true
EOF
    fi

    cat >> "$ENV_FILE" << EOF

# Polygon.io (Market Data)
EOF

    if [ -n "$POLYGON_API_KEY" ]; then
        cat >> "$ENV_FILE" << EOF
POLYGON_API_KEY=$POLYGON_API_KEY
EOF
    else
        cat >> "$ENV_FILE" << EOF
# POLYGON_API_KEY=
EOF
    fi

    cat >> "$ENV_FILE" << EOF

# ========================================================================
# Performance & Resource Settings
# ========================================================================
UV_THREADPOOL_SIZE=$UV_THREADPOOL_SIZE
NODE_OPTIONS=--max-old-space-size=$MAX_OLD_SPACE
CACHE_TTL=$CACHE_TTL
API_RATE_LIMIT_WINDOW=$RATE_LIMIT_WINDOW
API_RATE_LIMIT_MAX=$RATE_LIMIT_MAX
CONCURRENT_REQUESTS=50

# ========================================================================
# Additional Settings
# ========================================================================
NPM_CONFIG_UPDATE_NOTIFIER=false
FORCE_COLOR=0
TZ=UTC

# ========================================================================
# Feature Flags
# ========================================================================
ENABLE_ML_MODELS=true
ENABLE_ADVANCED_STRATEGIES=true
ENABLE_BACKTESTING=true
ENABLE_PAPER_TRADING=true
ENABLE_WEBSOCKET=true
ENABLE_PROMETHEUS=false
ENABLE_GRAFANA=false

# ========================================================================
# Admin Setup (configured on first run)
# ========================================================================
# ADMIN_USERNAME=
# ADMIN_EMAIL=
# ADMIN_PASSWORD=
EOF

    print_success "Configuration file created: $ENV_FILE"
    
    # Set permissions
    chmod 600 "$ENV_FILE"
    print_success "Permissions set to 600 (owner read/write only)"
    
    # ========================================================================
    # Summary
    # ========================================================================
    print_section "Configuration Complete!"
    
    echo -e "${GREEN}✅ Installation type:${NC} $INSTALL_TYPE"
    echo -e "${GREEN}✅ Application port:${NC} $PORT"
    echo -e "${GREEN}✅ Database:${NC} $DB_TYPE"
    echo -e "${GREEN}✅ Log level:${NC} $LOG_LEVEL"
    
    if [ -n "$BINANCE_API_KEY" ]; then
        echo -e "${GREEN}✅ Binance API:${NC} Configured"
    fi
    if [ -n "$ALPACA_API_KEY" ]; then
        echo -e "${GREEN}✅ Alpaca API:${NC} Configured"
    fi
    if [ -n "$POLYGON_API_KEY" ]; then
        echo -e "${GREEN}✅ Polygon API:${NC} Configured"
    fi
    
    echo ""
    print_info "Configuration saved to: $ENV_FILE"
    print_warning "Keep this file secure! It contains sensitive API keys."
    echo ""
    
    echo -e "${CYAN}Next steps:${NC}"
    if [ "$INSTALL_TYPE" = "production" ] || [ "$INSTALL_TYPE" = "docker-dev" ]; then
        echo -e "  ${WHITE}1.${NC} Run: ${YELLOW}./install${NC} to start installation"
        echo -e "  ${WHITE}2.${NC} Access dashboard at: ${BLUE}http://localhost:$PORT${NC}"
    else
        echo -e "  ${WHITE}1.${NC} Install dependencies: ${YELLOW}npm install${NC}"
        echo -e "  ${WHITE}2.${NC} Run backend: ${YELLOW}cd backend && npm run dev${NC}"
        echo -e "  ${WHITE}3.${NC} Run frontend: ${YELLOW}cd frontend && npm start${NC}"
    fi
    echo ""
    
    echo -e "${YELLOW}💡 Tip:${NC} You can edit .env manually to update configuration later."
    echo ""
}

# Run main function
main
