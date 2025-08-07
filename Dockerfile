# Production-ready Docker build for A.A.I.T.I
FROM node:20-alpine AS base

# Install build dependencies
RUN apk update && apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev \
    curl \
    dumb-init

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY .npmrc ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Production environment settings
ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install all dependencies
RUN npm ci --prefer-offline --no-progress --silent
RUN cd backend && npm ci --only=production --prefer-offline --no-progress --silent
RUN cd frontend && npm ci --prefer-offline --no-progress --silent

# Copy source code
COPY . .

# Build frontend for production
RUN cd frontend && \
    GENERATE_SOURCEMAP=false \
    SKIP_PREFLIGHT_CHECK=true \
    NODE_OPTIONS="--max-old-space-size=2048" \
    npm run build

# Remove frontend source and keep only build
RUN rm -rf frontend/src frontend/public frontend/node_modules

# Create directories for data and logs
RUN mkdir -p ./data ./logs ./cache

# Create non-root user for security
RUN addgroup -g 1001 -S aaiti && \
    adduser -S aaiti -u 1001 -G aaiti

# Set proper ownership
RUN chown -R aaiti:aaiti /app

# Switch to non-root user
USER aaiti

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Optimized environment variables
ENV PORT=5000
ENV UV_THREADPOOL_SIZE=16
ENV NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=64"
ENV FORCE_COLOR=0

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/server.js"]