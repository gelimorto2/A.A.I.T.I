#!/bin/bash

# AAITI Quick Start Script
# Choose your deployment scenario

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 AAITI Quick Start${NC}"
echo -e "${BLUE}===================${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker not found. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker found${NC}"

# Quick start options
echo -e "${BLUE}Choose your deployment:${NC}"
echo "1) 🎯 Production (Just AAITI)"
echo "2) 🔧 Development (with hot reload)"  
echo "3) 📊 Production + Monitoring"
echo "4) 🚀 Full Stack (everything)"
echo ""

read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo -e "${GREEN}🎯 Starting AAITI Production...${NC}"
        docker compose up -d aaiti
        echo -e "${GREEN}📊 Access AAITI at: http://localhost:5000${NC}"
        ;;
    2)
        echo -e "${GREEN}🔧 Starting Development Environment...${NC}"
        docker compose --profile development up -d
        echo -e "${GREEN}📊 Frontend: http://localhost:3000${NC}"
        echo -e "${GREEN}🔗 Backend: http://localhost:5001${NC}"
        ;;
    3)
        echo -e "${GREEN}📊 Starting Production + Monitoring...${NC}"
        docker compose --profile monitoring up -d
        echo -e "${GREEN}📊 AAITI: http://localhost:5000${NC}"
        echo -e "${GREEN}📈 Prometheus: http://localhost:9090${NC}"
        echo -e "${GREEN}📋 Grafana: http://localhost:3001 (admin/admin)${NC}"
        ;;
    4)
        echo -e "${GREEN}🚀 Starting Full Stack...${NC}"
        docker compose --profile production --profile monitoring --profile nginx --profile redis up -d
        echo -e "${GREEN}🌐 Nginx: http://localhost${NC}"
        echo -e "${GREEN}📊 AAITI: http://localhost:5000${NC}"
        echo -e "${GREEN}📈 Prometheus: http://localhost:9090${NC}"
        echo -e "${GREEN}📋 Grafana: http://localhost:3001${NC}"
        ;;
    *)
        echo -e "${YELLOW}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment started!${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "📋 View logs: docker compose logs -f"
echo "📊 Check status: docker compose ps"
echo "⏹️  Stop: docker compose down"
echo "🔄 Restart: docker compose restart"
echo ""

# Option to show logs
read -p "Show logs now? (y/n): " show_logs
if [[ $show_logs =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}📋 Showing logs (Ctrl+C to exit)...${NC}"
    docker compose logs -f
fi