#!/bin/bash
set -e

# A.A.I.T.I PostgreSQL Production Database Initialization
# This script sets up the production database with optimal settings for trading

echo "🏦 Initializing A.A.I.T.I Production Database..."

# Create production database and user if they don't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create trading-specific extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "btree_gin";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    CREATE EXTENSION IF NOT EXISTS "auto_explain";
    
    -- Create time-series extension for market data (if available)
    DO \$\$
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;
        RAISE NOTICE 'TimescaleDB extension created successfully';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'TimescaleDB not available, using standard PostgreSQL';
    END;
    \$\$;

    -- Create trading-specific schemas
    CREATE SCHEMA IF NOT EXISTS trading;
    CREATE SCHEMA IF NOT EXISTS ml_models;
    CREATE SCHEMA IF NOT EXISTS analytics;
    CREATE SCHEMA IF NOT EXISTS risk_management;
    CREATE SCHEMA IF NOT EXISTS audit;

    -- Set up database-level settings for trading workloads
    ALTER DATABASE $POSTGRES_DB SET timezone TO 'UTC';
    ALTER DATABASE $POSTGRES_DB SET default_transaction_isolation TO 'read committed';
    ALTER DATABASE $POSTGRES_DB SET statement_timeout TO '30000';
    ALTER DATABASE $POSTGRES_DB SET lock_timeout TO '10000';

    -- Create trading data user with appropriate permissions
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aaiti_trading') THEN
            CREATE ROLE aaiti_trading WITH LOGIN PASSWORD 'trading_secure_password_2025';
        END IF;
    END
    \$\$;

    -- Grant permissions for trading operations
    GRANT CONNECT ON DATABASE $POSTGRES_DB TO aaiti_trading;
    GRANT USAGE ON SCHEMA public, trading, ml_models, analytics, risk_management TO aaiti_trading;
    GRANT CREATE ON SCHEMA public, trading, ml_models, analytics, risk_management TO aaiti_trading;

    -- Create read-only user for analytics
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aaiti_readonly') THEN
            CREATE ROLE aaiti_readonly WITH LOGIN PASSWORD 'readonly_secure_password_2025';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE $POSTGRES_DB TO aaiti_readonly;
    GRANT USAGE ON SCHEMA public, trading, ml_models, analytics, risk_management TO aaiti_readonly;
    GRANT SELECT ON ALL TABLES IN SCHEMA public, trading, ml_models, analytics, risk_management TO aaiti_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public, trading, ml_models, analytics, risk_management GRANT SELECT ON TABLES TO aaiti_readonly;

EOSQL

echo "✅ A.A.I.T.I Production Database initialized successfully!"
echo "📊 Available schemas: public, trading, ml_models, analytics, risk_management, audit"
echo "👥 Users created: aaiti_trading (read/write), aaiti_readonly (read-only)"
echo "🔌 Extensions enabled: uuid-ossp, pg_trgm, btree_gin, btree_gist, pg_stat_statements"