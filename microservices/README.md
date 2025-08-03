# A.A.I.T.I Microservices Architecture

This directory contains the microservices implementation for production scalability.

## Services Overview

### Core Services
- **auth-service**: Authentication and authorization
- **trading-service**: Trading operations and order management  
- **analytics-service**: Data analytics and reporting
- **ml-service**: Machine learning models and predictions
- **notification-service**: Alerts and notifications
- **user-service**: User management and profiles

### Infrastructure Services
- **api-gateway**: Service routing and load balancing
- **service-discovery**: Service registration and discovery
- **monitoring-service**: Health checks and metrics collection

## Architecture Principles

1. **Service Independence**: Each service can be deployed and scaled independently
2. **Database Per Service**: Each service owns its data
3. **API-First**: All communication via well-defined APIs
4. **Resilience**: Built-in health checks and circuit breakers
5. **Observability**: Comprehensive logging and monitoring

## Development Setup

```bash
# Start all services in development mode
docker-compose -f docker-compose.microservices.yml up -d

# Start individual service for development
cd microservices/[service-name]
npm run dev
```

## Production Deployment

```bash
# Build and deploy all services
docker-compose -f docker-compose.production.yml up -d
```

## Service Communication

Services communicate via:
- HTTP/REST APIs for synchronous operations
- Message queues for asynchronous operations
- gRPC for high-performance internal communication

## Monitoring and Health

- Health checks: `/health` endpoint on each service
- Metrics: Prometheus-compatible metrics at `/metrics`
- Distributed tracing: Jaeger integration
- Service mesh: Istio support for production