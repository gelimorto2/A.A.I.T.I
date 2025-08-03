# PostgreSQL Migration Scripts

This directory contains database migration scripts for the AAITI microservices architecture.

## Migration Strategy

1. **Gradual Migration**: Services can be migrated one by one from SQLite to PostgreSQL
2. **Data Preservation**: All existing data is preserved during migration
3. **Zero Downtime**: Services continue running during migration

## Migration Process

### 1. Setup PostgreSQL Cluster

```bash
# Using Docker Compose
docker-compose -f docker-compose.postgres.yml up -d
```

### 2. Run Initial Migration

```bash
# Migrate existing SQLite data to PostgreSQL
node migrate-sqlite-to-postgres.js
```

### 3. Update Service Configuration

Update environment variables for each service:
```bash
DB_TYPE=postgresql
DB_HOST=postgres-primary
DB_PORT=5432
DB_NAME=aaiti
DB_USER=aaiti_user
DB_PASSWORD=aaiti_password
```

## Database Schema

Each microservice owns its schema:

- **auth_service**: Users, sessions, permissions
- **trading_service**: Trading bots, orders, positions
- **analytics_service**: Market data, analysis results
- **ml_service**: Models, training data, predictions
- **notification_service**: Notifications, alerts, preferences

## High Availability Features

- **Primary-Replica Setup**: Write to primary, read from replicas
- **Connection Pooling**: Efficient connection management
- **Automatic Failover**: Switch to replica if primary fails
- **Backup Strategy**: Automated daily backups with point-in-time recovery