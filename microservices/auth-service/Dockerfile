# Multi-stage build for production optimization
FROM node:20-alpine AS base

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy shared utilities first
COPY ../shared ./shared

# Install shared dependencies
WORKDIR /app/shared
RUN npm ci --only=production --silent

# Set working directory for service
WORKDIR /app/service

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --silent

# Copy service code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aaiti -u 1001

# Create logs directory
RUN mkdir -p /app/logs && chown -R aaiti:nodejs /app

# Switch to non-root user
USER aaiti

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start service
CMD ["node", "index.js"]