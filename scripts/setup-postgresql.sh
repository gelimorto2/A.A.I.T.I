#!/bin/bash

# PostgreSQL Development Setup Script
# This script sets up PostgreSQL for A.A.I.T.I development

set -e

echo "🐘 Setting up PostgreSQL for A.A.I.T.I development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-aaiti_user}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-secure_trading_password}
POSTGRES_DB=${POSTGRES_DB:-aaiti_production}
POSTGRES_TEST_DB=${POSTGRES_TEST_DB:-aaiti_test}

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${BLUE}Checking PostgreSQL connection...${NC}"
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d postgres -c '\q' 2>/dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is running and accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ Cannot connect to PostgreSQL${NC}"
        return 1
    fi
}

# Function to create databases
create_databases() {
    echo -e "${BLUE}Creating databases...${NC}"
    
    # Create production database
    PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d postgres -c "CREATE DATABASE $POSTGRES_DB;" 2>/dev/null || echo -e "${YELLOW}Database $POSTGRES_DB already exists${NC}"
    
    # Create test database
    PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d postgres -c "CREATE DATABASE $POSTGRES_TEST_DB;" 2>/dev/null || echo -e "${YELLOW}Database $POSTGRES_TEST_DB already exists${NC}"
    
    echo -e "${GREEN}✅ Databases created/verified${NC}"
}

# Function to run migrations
run_migrations() {
    echo -e "${BLUE}Running database migrations...${NC}"
    
    cd /workspaces/A.A.I.T.I/backend
    
    # Run migrations for production database
    POSTGRES_HOST=$POSTGRES_HOST \
    POSTGRES_PORT=$POSTGRES_PORT \
    POSTGRES_USER=$POSTGRES_USER \
    POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
    POSTGRES_DB=$POSTGRES_DB \
    npx knex migrate:latest --env production
    
    echo -e "${GREEN}✅ Migrations completed${NC}"
}

# Function to setup test environment
setup_test_env() {
    echo -e "${BLUE}Setting up test environment...${NC}"
    
    cd /workspaces/A.A.I.T.I/backend
    
    # Run migrations for test database
    POSTGRES_HOST=$POSTGRES_HOST \
    POSTGRES_PORT=$POSTGRES_PORT \
    POSTGRES_USER=$POSTGRES_USER \
    POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
    POSTGRES_DB=$POSTGRES_TEST_DB \
    npx knex migrate:latest --env test
    
    echo -e "${GREEN}✅ Test environment ready${NC}"
}

# Function to create environment file
create_env_file() {
    echo -e "${BLUE}Creating .env file...${NC}"
    
    cat > /workspaces/A.A.I.T.I/.env << EOF
# PostgreSQL Configuration
POSTGRES_HOST=$POSTGRES_HOST
POSTGRES_PORT=$POSTGRES_PORT
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=$POSTGRES_DB
POSTGRES_TEST_DB=$POSTGRES_TEST_DB

# Database URLs
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB
TEST_DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_TEST_DB

# Application Configuration
NODE_ENV=development
JWT_SECRET=your_super_secure_jwt_secret_key_here
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Exchange API Configuration (add your real keys)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here
BINANCE_TESTNET=true

# Redis Configuration (for caching and sessions)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Monitoring Configuration
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/combined.log
ERROR_LOG_FILE=./logs/error.log
EOF

    echo -e "${GREEN}✅ Environment file created${NC}"
}

# Function to verify setup
verify_setup() {
    echo -e "${BLUE}Verifying setup...${NC}"
    
    cd /workspaces/A.A.I.T.I/backend
    
    # Test database connection
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT version();' >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Production database connection verified${NC}"
    else
        echo -e "${RED}❌ Production database connection failed${NC}"
        exit 1
    fi
    
    # Test migrations
    local table_count=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
    
    if [ "$table_count" -gt 5 ]; then
        echo -e "${GREEN}✅ Database schema verified ($table_count tables)${NC}"
    else
        echo -e "${RED}❌ Database schema incomplete ($table_count tables)${NC}"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${GREEN}🚀 A.A.I.T.I PostgreSQL Setup${NC}"
    echo "=================================="
    
    # Check if PostgreSQL is available
    if ! check_postgres; then
        echo -e "${YELLOW}Starting PostgreSQL with Docker Compose...${NC}"
        cd /workspaces/A.A.I.T.I
        docker-compose -f docker-compose.prod.yml up -d postgres
        sleep 10
        
        if ! check_postgres; then
            echo -e "${RED}Failed to start PostgreSQL. Please check your configuration.${NC}"
            exit 1
        fi
    fi
    
    # Create databases
    create_databases
    
    # Create environment file
    create_env_file
    
    # Install dependencies if needed
    if [ ! -d "/workspaces/A.A.I.T.I/backend/node_modules" ]; then
        echo -e "${BLUE}Installing backend dependencies...${NC}"
        cd /workspaces/A.A.I.T.I/backend
        npm install
    fi
    
    # Run migrations
    run_migrations
    
    # Setup test environment
    setup_test_env
    
    # Verify setup
    verify_setup
    
    echo ""
    echo -e "${GREEN}🎉 PostgreSQL setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Update your API keys in .env file"
    echo "2. Run: cd backend && npm start"
    echo "3. Run migrations: ./scripts/migrate-to-postgresql.sh"
    echo "4. Run tests: npm test"
    echo ""
    echo -e "${BLUE}Database URLs:${NC}"
    echo "Production: postgresql://$POSTGRES_USER:****@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
    echo "Test:       postgresql://$POSTGRES_USER:****@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_TEST_DB"
}

# Run main function
main "$@"