# Multi-stage Docker build for AAITI - Performance Optimized
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk update && apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev \
    curl

# Set working directory
WORKDIR /app

# Performance: Copy package files first for better Docker layer caching
COPY package*.json ./
COPY .npmrc ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Performance: Install dependencies with optimized flags
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm ci --prefer-offline --no-progress --silent
RUN cd backend && npm ci --prefer-offline --no-progress --silent
RUN cd frontend && npm ci --prefer-offline --no-progress --silent

# Copy source code
COPY . .

# Performance: Build frontend with production optimizations
RUN cd frontend && \
    GENERATE_SOURCEMAP=false \
    SKIP_PREFLIGHT_CHECK=true \
    NODE_OPTIONS="--max-old-space-size=4096" \
    npm run build

# Production stage - Optimized Runtime
FROM node:20-alpine AS production

# Install only essential runtime dependencies
RUN apk update && apk add --no-cache \
    sqlite \
    curl \
    dumb-init

# Create app directory with proper permissions
WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY .npmrc ./
COPY backend/package*.json ./backend/

# Performance: Install production dependencies only with optimizations
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN npm ci --only=production --prefer-offline --no-progress --silent
RUN cd backend && npm ci --only=production --prefer-offline --no-progress --silent

# Copy built application
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/build ./frontend/build
COPY --from=builder /app/version.json ./

# Create directories for persistent data
RUN mkdir -p ./data ./logs ./cache

# Create non-root user with specific UID/GID for security
RUN addgroup -g 1001 -S aaiti && \
    adduser -S aaiti -u 1001 -G aaiti

# Set proper ownership for all app files
RUN chown -R aaiti:aaiti /app

# Switch to non-root user
USER aaiti

# Expose ports
EXPOSE 5000

# Performance: Enhanced health check with retries
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Performance: Set optimized environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV UV_THREADPOOL_SIZE=16
ENV NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=64"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV FORCE_COLOR=0

# Performance: Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Performance: Optimized startup command
CMD ["node", "backend/server.js"]