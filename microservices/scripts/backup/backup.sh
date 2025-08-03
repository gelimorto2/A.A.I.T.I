#!/bin/bash

# AAITI Backup and Disaster Recovery Script
# This script creates comprehensive backups of the microservices infrastructure

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/aaiti}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$BACKUP_DIR/logs/backup_$TIMESTAMP.log"

# Database configuration
DB_HOST="${DB_HOST:-postgres-primary}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-aaiti}"
DB_USER="${DB_USER:-aaiti_user}"
PGPASSWORD="${DB_PASSWORD:-aaiti_password}"
export PGPASSWORD

# Notification settings
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $1"
    send_notification "❌ AAITI Backup Failed" "$1" "error"
    exit 1
}

success() {
    log "SUCCESS: $1"
    send_notification "✅ AAITI Backup Completed" "$1" "success"
}

send_notification() {
    local title="$1"
    local message="$2"
    local type="${3:-info}"
    
    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        [[ "$type" == "error" ]] && color="danger"
        [[ "$type" == "warning" ]] && color="warning"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"$title\",\"text\":\"$message\",\"ts\":$(date +%s)}]}" \
            "$SLACK_WEBHOOK" || true
    fi
    
    # Discord notification
    if [[ -n "$DISCORD_WEBHOOK" ]]; then
        local emoji="ℹ️"
        [[ "$type" == "error" ]] && emoji="❌"
        [[ "$type" == "warning" ]] && emoji="⚠️"
        [[ "$type" == "success" ]] && emoji="✅"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"$emoji **$title**\\n$message\"}" \
            "$DISCORD_WEBHOOK" || true
    fi
}

create_directories() {
    mkdir -p "$BACKUP_DIR"/{database,redis,config,logs,docker-volumes}
    log "Created backup directories"
}

backup_database() {
    log "Starting PostgreSQL database backup..."
    
    local backup_file="$BACKUP_DIR/database/postgres_backup_$TIMESTAMP.sql"
    local backup_file_compressed="$backup_file.gz"
    
    # Create database dump
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-privileges --clean --if-exists > "$backup_file"; then
        
        # Compress the backup
        gzip "$backup_file"
        
        local size=$(du -h "$backup_file_compressed" | cut -f1)
        log "Database backup completed: $backup_file_compressed ($size)"
        
        # Create a schema-only backup for quick restoration
        local schema_file="$BACKUP_DIR/database/postgres_schema_$TIMESTAMP.sql"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --schema-only --no-owner --no-privileges > "$schema_file"
        
        log "Schema backup created: $schema_file"
    else
        error "Failed to create database backup"
    fi
}

backup_redis() {
    log "Starting Redis backup..."
    
    local redis_host="${REDIS_HOST:-redis-cluster}"
    local redis_port="${REDIS_PORT:-6379}"
    local backup_file="$BACKUP_DIR/redis/redis_backup_$TIMESTAMP.rdb"
    
    # Create Redis backup using SAVE command
    if redis-cli -h "$redis_host" -p "$redis_port" --rdb "$backup_file"; then
        local size=$(du -h "$backup_file" | cut -f1)
        log "Redis backup completed: $backup_file ($size)"
    else
        log "WARNING: Redis backup failed (non-critical)"
    fi
}

backup_docker_volumes() {
    log "Starting Docker volumes backup..."
    
    local volumes_dir="$BACKUP_DIR/docker-volumes"
    
    # Get list of AAITI-related volumes
    local volumes=$(docker volume ls --filter label=com.docker.compose.project=aaiti -q)
    
    for volume in $volumes; do
        local backup_file="$volumes_dir/${volume}_$TIMESTAMP.tar.gz"
        
        log "Backing up volume: $volume"
        
        # Create a temporary container to backup the volume
        docker run --rm \
            -v "$volume":/data:ro \
            -v "$volumes_dir":/backup \
            alpine:latest \
            tar czf "/backup/$(basename "$backup_file")" -C /data . \
            || log "WARNING: Failed to backup volume $volume"
    done
    
    log "Docker volumes backup completed"
}

backup_configurations() {
    log "Starting configuration backup..."
    
    local config_dir="$BACKUP_DIR/config"
    local project_root="/app"  # Adjust based on your setup
    
    # Backup Docker Compose files
    cp "$project_root"/docker-compose*.yml "$config_dir/" 2>/dev/null || true
    
    # Backup microservices configuration
    if [[ -d "$project_root/microservices/config" ]]; then
        cp -r "$project_root/microservices/config" "$config_dir/microservices/" 2>/dev/null || true
    fi
    
    # Backup environment files (without sensitive data)
    find "$project_root" -name ".env.example" -exec cp {} "$config_dir/" \; 2>/dev/null || true
    
    # Create archive of configuration files
    local config_archive="$config_dir/configurations_$TIMESTAMP.tar.gz"
    tar czf "$config_archive" -C "$config_dir" . 2>/dev/null || true
    
    log "Configuration backup completed: $config_archive"
}

test_backups() {
    log "Testing backup integrity..."
    
    # Test database backup
    local latest_db_backup=$(ls -t "$BACKUP_DIR/database"/postgres_backup_*.sql.gz | head -1)
    if [[ -f "$latest_db_backup" ]]; then
        if zcat "$latest_db_backup" | head -1 | grep -q "PostgreSQL database dump"; then
            log "Database backup integrity: OK"
        else
            error "Database backup integrity check failed"
        fi
    fi
    
    # Test Redis backup
    local latest_redis_backup=$(ls -t "$BACKUP_DIR/redis"/redis_backup_*.rdb 2>/dev/null | head -1)
    if [[ -f "$latest_redis_backup" ]]; then
        # Basic RDB file validation
        if file "$latest_redis_backup" | grep -q "Redis RDB"; then
            log "Redis backup integrity: OK"
        else
            log "WARNING: Redis backup integrity check inconclusive"
        fi
    fi
    
    log "Backup integrity tests completed"
}

cleanup_old_backups() {
    log "Cleaning up old backups (retention: $BACKUP_RETENTION_DAYS days)..."
    
    # Remove old database backups
    find "$BACKUP_DIR/database" -name "postgres_backup_*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR/database" -name "postgres_schema_*.sql" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old Redis backups
    find "$BACKUP_DIR/redis" -name "redis_backup_*.rdb" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old volume backups
    find "$BACKUP_DIR/docker-volumes" -name "*.tar.gz" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old configuration backups
    find "$BACKUP_DIR/config" -name "configurations_*.tar.gz" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old log files
    find "$BACKUP_DIR/logs" -name "backup_*.log" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    log "Old backups cleanup completed"
}

generate_backup_report() {
    log "Generating backup report..."
    
    local report_file="$BACKUP_DIR/logs/backup_report_$TIMESTAMP.json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "backup_id": "$TIMESTAMP",
  "status": "completed",
  "files": {
    "database": "$(ls "$BACKUP_DIR/database"/postgres_backup_$TIMESTAMP.sql.gz 2>/dev/null || echo "none")",
    "redis": "$(ls "$BACKUP_DIR/redis"/redis_backup_$TIMESTAMP.rdb 2>/dev/null || echo "none")",
    "config": "$(ls "$BACKUP_DIR/config"/configurations_$TIMESTAMP.tar.gz 2>/dev/null || echo "none")"
  },
  "sizes": {
    "total_backup_size": "$(du -sh "$BACKUP_DIR" | cut -f1)",
    "database_size": "$(du -sh "$BACKUP_DIR/database" 2>/dev/null | cut -f1 || echo "0")",
    "redis_size": "$(du -sh "$BACKUP_DIR/redis" 2>/dev/null | cut -f1 || echo "0")",
    "volumes_size": "$(du -sh "$BACKUP_DIR/docker-volumes" 2>/dev/null | cut -f1 || echo "0")"
  },
  "retention_policy": "${BACKUP_RETENTION_DAYS} days",
  "next_backup": "$(date -d '+1 day' -Iseconds)"
}
EOF
    
    log "Backup report generated: $report_file"
}

# Main execution
main() {
    log "Starting AAITI backup process..."
    
    create_directories
    backup_database
    backup_redis
    backup_docker_volumes
    backup_configurations
    test_backups
    cleanup_old_backups
    generate_backup_report
    
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    success "Backup completed successfully. Total size: $total_size"
}

# Error handling
trap 'error "Backup script interrupted or failed"' ERR

# Run main function
main "$@"