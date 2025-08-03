const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const logger = require('./logger');

/**
 * Distributed Tracing Manager for AAITI Microservices
 */
class TracingManager {
  constructor(serviceName, version = '1.0.0') {
    this.serviceName = serviceName;
    this.version = version;
    this.tracer = null;
    this.provider = null;
    
    this.initialize();
  }

  initialize() {
    try {
      // Create tracer provider
      this.provider = new NodeTracerProvider({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: this.version,
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
        }),
        instrumentations: [getNodeAutoInstrumentations({
          // Disable some instrumentations if needed
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        })]
      });

      // Configure Jaeger exporter
      const jaegerExporter = new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces',
        tags: {
          service: this.serviceName,
          version: this.version,
          environment: process.env.NODE_ENV || 'development'
        }
      });

      // Add span processor
      this.provider.addSpanProcessor(
        new BatchSpanProcessor(jaegerExporter, {
          maxQueueSize: 1000,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 30000,
          maxExportBatchSize: 100
        })
      );

      // Register the provider
      this.provider.register();

      // Get tracer
      this.tracer = trace.getTracer(this.serviceName, this.version);

      logger.info('✅ Distributed tracing initialized', {
        service: this.serviceName,
        version: this.version,
        jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces'
      });

    } catch (error) {
      logger.error('❌ Failed to initialize tracing', {
        service: this.serviceName,
        error: error.message
      });
    }
  }

  /**
   * Create a new span
   */
  startSpan(name, options = {}) {
    if (!this.tracer) {
      return { end: () => {}, setStatus: () => {}, setAttributes: () => {} };
    }

    return this.tracer.startSpan(name, {
      kind: options.kind || undefined,
      parent: options.parent || undefined,
      attributes: {
        'service.name': this.serviceName,
        'service.version': this.version,
        ...options.attributes
      }
    });
  }

  /**
   * Create HTTP request middleware for Express
   */
  getExpressMiddleware() {
    return (req, res, next) => {
      const span = this.startSpan(`${req.method} ${req.route?.path || req.path}`, {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.route': req.route?.path || req.path,
          'http.user_agent': req.get('User-Agent'),
          'http.request_id': req.headers['x-request-id'] || require('crypto').randomUUID()
        }
      });

      // Add span to request context
      req.span = span;
      req.traceId = span.spanContext().traceId;

      // Set trace ID in response headers
      res.setHeader('X-Trace-ID', req.traceId);

      // Monitor response
      const originalSend = res.send;
      res.send = function(body) {
        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.response_size': Buffer.byteLength(body || '', 'utf8')
        });

        if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`
          });
        }

        span.end();
        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Trace database operations
   */
  traceDatabase(operation, query, params = []) {
    const span = this.startSpan(`db.${operation}`, {
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.statement': query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        'db.params_count': params.length
      }
    });

    return {
      span,
      end: (error = null, result = null) => {
        if (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          span.setAttributes({
            'db.error': error.message
          });
        } else if (result) {
          span.setAttributes({
            'db.rows_affected': result.rowCount || 0
          });
        }
        span.end();
      }
    };
  }

  /**
   * Trace service-to-service calls
   */
  traceServiceCall(serviceName, operation, data = {}) {
    const span = this.startSpan(`call.${serviceName}.${operation}`, {
      attributes: {
        'service.target': serviceName,
        'service.operation': operation,
        'service.caller': this.serviceName,
        'call.type': 'internal'
      }
    });

    return {
      span,
      end: (error = null, result = null) => {
        if (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          span.setAttributes({
            'call.error': error.message
          });
        } else if (result) {
          span.setAttributes({
            'call.success': true,
            'call.response_size': JSON.stringify(result).length
          });
        }
        span.end();
      }
    };
  }

  /**
   * Trace business operations
   */
  traceOperation(operationName, metadata = {}) {
    const span = this.startSpan(operationName, {
      attributes: {
        'operation.name': operationName,
        'operation.service': this.serviceName,
        ...metadata
      }
    });

    return {
      span,
      addEvent: (name, attributes = {}) => {
        span.addEvent(name, attributes);
      },
      setAttributes: (attributes) => {
        span.setAttributes(attributes);
      },
      end: (error = null) => {
        if (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          span.setAttributes({
            'operation.error': error.message
          });
        }
        span.end();
      }
    };
  }

  /**
   * Get current trace context for propagation
   */
  getCurrentContext() {
    return context.active();
  }

  /**
   * Run function in specific trace context
   */
  runInContext(ctx, fn) {
    return context.with(ctx, fn);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.provider) {
      await this.provider.shutdown();
      logger.info('✅ Tracing provider shut down gracefully', {
        service: this.serviceName
      });
    }
  }
}

// Helper function to create middleware for different services
const createTracingMiddleware = (serviceName, version) => {
  const tracing = new TracingManager(serviceName, version);
  return {
    middleware: tracing.getExpressMiddleware(),
    tracing
  };
};

module.exports = {
  TracingManager,
  createTracingMiddleware
};