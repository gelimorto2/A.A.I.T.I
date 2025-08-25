# Production-ready Docker build for A.A.I.T.I with optimized memory usage
FROM node:20-slim AS build-stage

# Install build dependencies
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    build-essential \
    pkg-config \
    ca-certificates \
    curl \
 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY .npmrc ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Build environment settings for maximum memory efficiency
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NODE_OPTIONS="--max-old-space-size=6144 --max-semi-space-size=256" \
    DISABLE_ESLINT_PLUGIN=true \
    TSC_COMPILE_ON_ERROR=true

# Install dependencies with optimizations
RUN npm ci --prefer-offline --no-progress --silent --production=false
RUN cd backend && npm ci --only=production --prefer-offline --no-progress --silent
RUN cd frontend && npm ci --prefer-offline --no-progress --silent

# Copy source code
COPY . .

# Build frontend for production (with retry fallback to less optimized build if first attempt exits early)
RUN set -eux; \
    cd frontend; \
    export GENERATE_SOURCEMAP=false SKIP_PREFLIGHT_CHECK=true DISABLE_ESLINT_PLUGIN=true TSC_COMPILE_ON_ERROR=true; \
    export NODE_OPTIONS="--max-old-space-size=4096"; \
    if ! npm run build --no-progress --silent; then \
        echo 'First build attempt failed, retrying with minimal optimizations...'; \
        rm -rf build && export NODE_OPTIONS="--max-old-space-size=3072" && npm run build --no-progress --silent || (echo 'Frontend build failed after retry' >&2; exit 1); \
    fi

# Production stage with minimal footprint
FROM node:20-slim AS production-stage

# Install runtime dependencies only
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    sqlite3 \
    curl \
    dumb-init \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/

# Production environment settings
ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NODE_OPTIONS="--max-old-space-size=4096 --max-semi-space-size=128"

# Install only production dependencies
RUN npm ci --only=production --prefer-offline --no-progress --silent
RUN cd backend && npm ci --only=production --prefer-offline --no-progress --silent

# Copy built application from build stage
COPY --from=build-stage /app/backend ./backend
COPY --from=build-stage /app/frontend/build ./frontend/build
COPY --from=build-stage /app/config ./config
COPY --from=build-stage /app/docs ./docs

# Create directories and non-root user (Debian-based syntax)
RUN mkdir -p ./data ./logs ./cache && \
    groupadd -g 1001 aaiti && \
    useradd -u 1001 -g aaiti -s /usr/sbin/nologin -d /app -M aaiti && \
    chown -R aaiti:aaiti /app

# Switch to non-root user
USER aaiti

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Optimized environment variables for production
ENV PORT=5000 \
    NODE_ENV=production \
    UV_THREADPOOL_SIZE=16 \
    NODE_OPTIONS="--max-old-space-size=4096 --max-semi-space-size=128" \
    FORCE_COLOR=0

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/server.js"]