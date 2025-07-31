# Multi-stage Docker build for AAITI
FROM node:20-alpine as builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ sqlite

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --prefer-offline --no-fund --no-audit
RUN cd backend && npm ci --prefer-offline --no-fund --no-audit
RUN cd frontend && npm ci --prefer-offline --no-fund --no-audit

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine as production

# Install runtime dependencies
RUN apk add --no-cache sqlite python3 make g++

# Create app directory
WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies only
RUN npm ci --only=production --prefer-offline --no-fund --no-audit
RUN cd backend && npm ci --only=production --prefer-offline --no-fund --no-audit

# Copy built application
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/build ./frontend/build
COPY --from=builder /app/version.json ./
COPY --from=builder /app/.npmrc ./

# Create non-root user
RUN addgroup -g 1001 -S aaiti && adduser -S aaiti -u 1001
RUN chown -R aaiti:aaiti /app
USER aaiti

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the application
CMD ["npm", "start"]