# AAITI Docker Makefile
# Simplified Docker operations for AAITI

.DEFAULT_GOAL := help
.PHONY: help build up down logs clean install dev prod monitor full restart status health shell

# Configuration
COMPOSE_FILE := docker-compose.yml
PROJECT_NAME := aaiti

# Colors
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
BLUE := \033[34m
NC := \033[0m

help: ## Show this help message
	@echo "$(BLUE)AAITI Docker Management$(NC)"
	@echo "======================="
	@echo ""
	@echo "$(GREEN)Quick Start Commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)Examples:$(NC)"
	@echo "  make install     # Install and start production"
	@echo "  make dev        # Start development environment"
	@echo "  make monitor    # Start with monitoring tools"
	@echo "  make logs       # View application logs"
	@echo "  make shell      # Access application shell"

build: ## Build Docker images
	@echo "$(BLUE)🔨 Building AAITI Docker images...$(NC)"
	docker compose build --no-cache

up: ## Start production services
	@echo "$(BLUE)🚀 Starting AAITI production services...$(NC)"
	docker compose up -d
	@$(MAKE) --no-print-directory status

down: ## Stop all services
	@echo "$(BLUE)⏹️  Stopping AAITI services...$(NC)"
	docker compose down

install: build up ## Build and start production (recommended)
	@echo "$(GREEN)✅ AAITI installation complete!$(NC)"
	@echo "$(GREEN)📊 Access AAITI at: http://localhost:5000$(NC)"

dev: ## Start development environment with hot reload
	@echo "$(BLUE)🔧 Starting AAITI development environment...$(NC)"
	docker compose --profile development up -d
	@echo "$(GREEN)🔧 Development environment started$(NC)"
	@echo "$(GREEN)📊 Frontend: http://localhost:3000$(NC)"
	@echo "$(GREEN)🔗 Backend: http://localhost:5001$(NC)"

prod: ## Start production with nginx reverse proxy
	@echo "$(BLUE)🌐 Starting AAITI production with nginx...$(NC)"
	docker compose --profile production --profile nginx up -d
	@echo "$(GREEN)🌐 Production with nginx started$(NC)"
	@echo "$(GREEN)📊 Access via: http://localhost$(NC)"

monitor: ## Start production with monitoring tools
	@echo "$(BLUE)📈 Starting AAITI with monitoring...$(NC)"
	docker compose --profile production --profile monitoring up -d
	@echo "$(GREEN)📈 Monitoring stack started$(NC)"
	@echo "$(GREEN)📊 AAITI: http://localhost:5000$(NC)"
	@echo "$(GREEN)📈 Prometheus: http://localhost:9090$(NC)"
	@echo "$(GREEN)📋 Grafana: http://localhost:3001 (admin/admin)$(NC)"

full: ## Start all services (full stack)
	@echo "$(BLUE)🚀 Starting full AAITI stack...$(NC)"
	docker compose --profile production --profile monitoring --profile nginx --profile redis up -d
	@echo "$(GREEN)🚀 Full stack started$(NC)"
	@echo "$(GREEN)🌐 Nginx: http://localhost$(NC)"
	@echo "$(GREEN)📊 AAITI: http://localhost:5000$(NC)"
	@echo "$(GREEN)📈 Prometheus: http://localhost:9090$(NC)"
	@echo "$(GREEN)📋 Grafana: http://localhost:3001$(NC)"
	@echo "$(GREEN)💾 Redis: localhost:6379$(NC)"

restart: ## Restart all services
	@echo "$(BLUE)🔄 Restarting AAITI services...$(NC)"
	docker compose restart
	@$(MAKE) --no-print-directory status

logs: ## View application logs
	@echo "$(BLUE)📋 Showing AAITI logs (Ctrl+C to exit)...$(NC)"
	docker compose logs -f aaiti

logs-all: ## View all service logs
	@echo "$(BLUE)📋 Showing all logs (Ctrl+C to exit)...$(NC)"
	docker compose logs -f

status: ## Show service status
	@echo "$(BLUE)📊 AAITI Service Status:$(NC)"
	@docker compose ps
	@echo ""
	@$(MAKE) --no-print-directory health

health: ## Check application health
	@echo "$(BLUE)🏥 Checking AAITI health...$(NC)"
	@if docker compose exec -T aaiti curl -f http://localhost:5000/api/health > /dev/null 2>&1; then \
		echo "$(GREEN)✅ AAITI backend is healthy$(NC)"; \
	else \
		echo "$(RED)❌ AAITI backend is not responding$(NC)"; \
	fi

shell: ## Access application shell
	@echo "$(BLUE)🐚 Accessing AAITI shell...$(NC)"
	docker compose exec aaiti sh

shell-root: ## Access application shell as root
	@echo "$(BLUE)🐚 Accessing AAITI shell as root...$(NC)"
	docker compose exec --user root aaiti sh

clean: ## Clean up containers and volumes
	@echo "$(YELLOW)⚠️  This will remove all AAITI containers and volumes!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(RED)🧹 Cleaning AAITI containers and volumes...$(NC)"; \
		docker compose down -v --remove-orphans; \
		docker system prune -f; \
		echo "$(GREEN)✅ Cleanup complete$(NC)"; \
	else \
		echo "$(BLUE)ℹ️  Cleanup cancelled$(NC)"; \
	fi

clean-force: ## Force clean without confirmation
	@echo "$(RED)🧹 Force cleaning AAITI containers and volumes...$(NC)"
	docker compose down -v --remove-orphans
	docker system prune -f
	@echo "$(GREEN)✅ Force cleanup complete$(NC)"

update: ## Update and restart services
	@echo "$(BLUE)📥 Updating AAITI...$(NC)"
	git pull
	@$(MAKE) --no-print-directory build
	@$(MAKE) --no-print-directory restart
	@echo "$(GREEN)✅ Update complete$(NC)"

backup: ## Backup application data
	@echo "$(BLUE)💾 Creating AAITI backup...$(NC)"
	mkdir -p ./backups
	docker compose exec -T aaiti tar czf - /app/data | cat > ./backups/aaiti-backup-$$(date +%Y%m%d_%H%M%S).tar.gz
	@echo "$(GREEN)💾 Backup created in ./backups/$(NC)"

restore: ## Restore from backup (specify BACKUP_FILE=filename)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)❌ Please specify backup file: make restore BACKUP_FILE=filename$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)📥 Restoring from $(BACKUP_FILE)...$(NC)"
	cat ./backups/$(BACKUP_FILE) | docker compose exec -T aaiti tar xzf - -C /
	@$(MAKE) --no-print-directory restart
	@echo "$(GREEN)📥 Restore complete$(NC)"

# Docker system maintenance
docker-clean: ## Clean Docker system
	@echo "$(BLUE)🧹 Cleaning Docker system...$(NC)"
	docker system prune -f
	docker volume prune -f
	docker network prune -f
	@echo "$(GREEN)✅ Docker system cleaned$(NC)"

# Performance monitoring
perf: ## Show performance statistics
	@echo "$(BLUE)⚡ AAITI Performance Statistics:$(NC)"
	@echo ""
	@echo "$(YELLOW)Container Resource Usage:$(NC)"
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
	@echo ""
	@echo "$(YELLOW)Volume Usage:$(NC)"
	@docker system df -v | grep aaiti || true

# Development helpers
test: ## Run tests in container
	@echo "$(BLUE)🧪 Running AAITI tests...$(NC)"
	docker compose exec aaiti npm test

lint: ## Run linting in container
	@echo "$(BLUE)🔍 Running linting...$(NC)"
	docker compose exec aaiti npm run lint || echo "No lint script found"

# Quick access to common tasks
start: up ## Alias for 'up'
stop: down ## Alias for 'down'
ps: status ## Alias for 'status'