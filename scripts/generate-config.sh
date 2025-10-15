#!/usr/bin/env bash
set -euo pipefail

# Simple interactive config generator for A.A.I.T.I
# Produces .env and seeds backend/config via credentials util on first run

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info(){ echo -e "${BLUE}ℹ️  $*${NC}"; }
ok(){ echo -e "${GREEN}✅ $*${NC}"; }
warn(){ echo -e "${YELLOW}⚠️  $*${NC}"; }
err(){ echo -e "${RED}❌ $*${NC}"; }

read_default(){ local prompt="$1"; local def="$2"; local var; read -r -p "$prompt [$def]: " var; echo "${var:-$def}"; }

main(){
  info "A.A.I.T.I configuration"

  # Mode selection
  echo "Select installation mode:";
  echo "  1) Production (Docker, optimized)";
  echo "  2) Development (hot reload, local)";
  read -r -p "Choose [1/2]: " mode_choice; mode_choice=${mode_choice:-1}
  if [[ "$mode_choice" == "2" ]]; then MODE="development"; else MODE="production"; fi

  PORT=$(read_default "HTTP port" "5000")
  LOG_LEVEL=$(read_default "Log level (error|warn|info|debug)" "info")

  # DB choice (sqlite default)
  echo "Database type:";
  echo "  1) SQLite (default)";
  echo "  2) PostgreSQL";
  read -r -p "Choose [1/2]: " db_choice; db_choice=${db_choice:-1}
  if [[ "$db_choice" == "2" ]]; then
    DB_TYPE="postgresql"
    DB_HOST=$(read_default "Postgres host" "localhost")
    DB_PORT=$(read_default "Postgres port" "5432")
    DB_NAME=$(read_default "Postgres database" "aaiti")
    DB_USER=$(read_default "Postgres user" "aaiti_user")
    DB_PASSWORD=$(read_default "Postgres password" "aaiti_password")
  else
    DB_TYPE="sqlite"
    DB_PATH=$(read_default "SQLite path" "./database/aaiti.sqlite")
  fi

  FRONTEND_URL=$(read_default "Frontend URL" "http://localhost:3000")
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "$(date +%s)$$$RANDOM")

  cat > .env <<EOF
NODE_ENV=${MODE}
PORT=${PORT}
LOG_LEVEL=${LOG_LEVEL}
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=${FRONTEND_URL}
EOF

  if [[ "$DB_TYPE" == "sqlite" ]]; then
cat >> .env <<EOF
DB_TYPE=sqlite
DB_PATH=${DB_PATH}
EOF
  else
cat >> .env <<EOF
DB_TYPE=postgresql
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF
  fi

  ok ".env written"

  # Seed credentials.enc with sane defaults if missing
  if [[ ! -f backend/config/credentials.enc ]]; then
    info "Seeding secure credentials (backend/config/credentials.enc)"
    node -e "(async()=>{const c=require('./backend/utils/credentials');c.initializeUserCredentials();console.log('seeded')})().catch(e=>{process.exit(0)})" || true
  else
    info "Existing secure credentials detected; leaving as-is"
  fi

  echo "Summary:"; echo "  MODE=$MODE"; echo "  PORT=$PORT"; echo "  LOG_LEVEL=$LOG_LEVEL"; echo "  DB_TYPE=$DB_TYPE"
  ok "Configuration complete"
}

main "$@"
