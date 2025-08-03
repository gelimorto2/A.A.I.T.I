const express = require('express');
const semver = require('semver');
const logger = require('../utils/logger');
const { getMetrics } = require('../utils/prometheusMetrics');

/**
 * AAITI API Versioning System
 * Implements API versioning and backwards compatibility
 * Part of System Enhancements - API Enhancements
 */

class APIVersionManager {
  constructor() {
    this.versions = new Map();
    this.deprecatedVersions = new Map();
    this.defaultVersion = '2.0.0';
    this.supportedVersions = ['1.0.0', '1.1.0', '2.0.0'];
    this.metrics = getMetrics();

    // Version routing patterns
    this.versionPatterns = {
      header: 'X-API-Version',
      queryParam: 'version',
      pathPrefix: '/api/v',
      accept: 'application/vnd.aaiti.v'
    };

    this.initializeVersionRoutes();
    this.log('API Version Manager initialized', { 
      defaultVersion: this.defaultVersion,
      supportedVersions: this.supportedVersions 
    });
  }

  /**
   * Initialize version-specific routes
   */
  initializeVersionRoutes() {
    // Version 1.0.0 routes (legacy)
    this.versions.set('1.0.0', {
      router: express.Router(),
      deprecated: false,
      deprecationDate: null,
      endOfLifeDate: new Date('2025-12-31'),
      changes: [],
      middleware: this.createVersionMiddleware('1.0.0')
    });

    // Version 1.1.0 routes (current stable)
    this.versions.set('1.1.0', {
      router: express.Router(),
      deprecated: false,
      deprecationDate: null,
      endOfLifeDate: new Date('2026-06-30'),
      changes: [
        'Added enhanced analytics endpoints',
        'Improved error responses',
        'Added pagination to list endpoints'
      ],
      middleware: this.createVersionMiddleware('1.1.0')
    });

    // Version 2.0.0 routes (latest)
    this.versions.set('2.0.0', {
      router: express.Router(),
      deprecated: false,
      deprecationDate: null,
      endOfLifeDate: null,
      changes: [
        'GraphQL support added',
        'Enhanced caching layer',
        'Improved performance monitoring',
        'New notification system',
        'Breaking: Updated response formats',
        'Breaking: Removed deprecated endpoints'
      ],
      middleware: this.createVersionMiddleware('2.0.0')
    });

    this.setupVersionRoutes();
  }

  /**
   * Create version-specific middleware
   */
  createVersionMiddleware(version) {
    return (req, res, next) => {
      req.apiVersion = version;
      
      // Record metrics
      if (this.metrics) {
        this.metrics.recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, 0);
      }

      // Add version headers
      res.set('X-API-Version', version);
      res.set('X-Supported-Versions', this.supportedVersions.join(', '));

      // Check if version is deprecated
      const versionInfo = this.versions.get(version);
      if (versionInfo?.deprecated) {
        res.set('Deprecation', 'true');
        res.set('Sunset', versionInfo.endOfLifeDate?.toISOString());
        res.set('Link', `</api/v${this.defaultVersion}>; rel="successor-version"`);
      }

      next();
    };
  }

  /**
   * Setup routes for different versions
   */
  setupVersionRoutes() {
    // Version 1.0.0 - Legacy routes
    const v1Router = this.versions.get('1.0.0').router;
    
    v1Router.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    v1Router.get('/trades', (req, res) => {
      // Legacy trade format
      res.json({
        trades: [
          {
            id: 1,
            symbol: 'BTC/USD',
            amount: 1.0,
            price: 50000,
            timestamp: new Date().toISOString()
          }
        ]
      });
    });

    // Version 1.1.0 - Current stable
    const v1_1Router = this.versions.get('1.1.0').router;
    
    v1_1Router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: '1.1.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    v1_1Router.get('/trades', (req, res) => {
      const { page = 1, limit = 20 } = req.query;
      
      res.json({
        data: [
          {
            id: '1',
            symbol: 'BTC/USD',
            quantity: 1.0,
            price: 50000,
            side: 'buy',
            status: 'executed',
            timestamp: new Date().toISOString()
          }
        ],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 100,
          pages: 5
        }
      });
    });

    // Version 2.0.0 - Latest with breaking changes
    const v2Router = this.versions.get('2.0.0').router;
    
    v2Router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform
        },
        services: {
          database: 'healthy',
          cache: 'healthy',
          notifications: 'healthy'
        }
      });
    });

    v2Router.get('/trades', (req, res) => {
      const { page = 1, limit = 20, symbol, userId } = req.query;
      
      res.json({
        data: [
          {
            id: 'trade_001',
            userId: userId || 'user_001',
            symbol: symbol || 'BTC/USD',
            quantity: 1.0,
            price: 50000,
            side: 'BUY',
            type: 'MARKET',
            status: 'EXECUTED',
            timestamp: new Date().toISOString(),
            exchange: 'binance',
            fees: {
              amount: 25.0,
              currency: 'USD'
            },
            metadata: {
              orderId: 'order_001',
              executionId: 'exec_001'
            }
          }
        ],
        pagination: {
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit),
          totalItems: 100,
          totalPages: 5,
          hasNextPage: page < 5,
          hasPreviousPage: page > 1
        },
        meta: {
          requestId: req.headers['x-request-id'] || 'req_' + Date.now(),
          responseTime: Date.now() - req.startTime
        }
      });
    });
  }

  /**
   * Extract version from request
   */
  extractVersion(req) {
    let version = null;

    // Check path prefix first (/api/v2.0.0/...)
    const pathMatch = req.path.match(/^\/api\/v(\d+\.\d+\.\d+)/);
    if (pathMatch) {
      version = pathMatch[1];
    }

    // Check header
    if (!version && req.headers[this.versionPatterns.header.toLowerCase()]) {
      version = req.headers[this.versionPatterns.header.toLowerCase()];
    }

    // Check query parameter
    if (!version && req.query[this.versionPatterns.queryParam]) {
      version = req.query[this.versionPatterns.queryParam];
    }

    // Check Accept header
    if (!version) {
      const acceptHeader = req.headers.accept;
      if (acceptHeader) {
        const acceptMatch = acceptHeader.match(/application\/vnd\.aaiti\.v(\d+\.\d+\.\d+)/);
        if (acceptMatch) {
          version = acceptMatch[1];
        }
      }
    }

    // Default to latest version if none specified
    if (!version) {
      version = this.defaultVersion;
    }

    // Validate version
    if (!this.isVersionSupported(version)) {
      return null;
    }

    return version;
  }

  /**
   * Check if version is supported
   */
  isVersionSupported(version) {
    return this.supportedVersions.includes(version);
  }

  /**
   * Get the closest supported version
   */
  getClosestSupportedVersion(requestedVersion) {
    if (this.isVersionSupported(requestedVersion)) {
      return requestedVersion;
    }

    // Find the highest version that satisfies the range
    const satisfying = this.supportedVersions.filter(v => 
      semver.satisfies(v, `<=${requestedVersion}`)
    );

    if (satisfying.length > 0) {
      return semver.maxSatisfying(satisfying, '*');
    }

    // If no lower version satisfies, return the lowest supported version
    return semver.sort(this.supportedVersions)[0];
  }

  /**
   * Create version routing middleware
   */
  createVersionRouter() {
    const router = express.Router();

    // Version detection middleware
    router.use((req, res, next) => {
      const requestedVersion = this.extractVersion(req);
      
      if (!requestedVersion) {
        return res.status(400).json({
          error: 'Invalid API version',
          message: `Unsupported API version. Supported versions: ${this.supportedVersions.join(', ')}`,
          supportedVersions: this.supportedVersions
        });
      }

      const version = this.getClosestSupportedVersion(requestedVersion);
      req.apiVersion = version;
      req.startTime = Date.now();

      // Add version info to response headers
      res.set('X-API-Version', version);
      res.set('X-Requested-Version', requestedVersion);

      next();
    });

    // Route to version-specific handlers
    router.use((req, res, next) => {
      const version = req.apiVersion;
      const versionInfo = this.versions.get(version);

      if (!versionInfo) {
        return res.status(500).json({
          error: 'Version handler not found',
          message: `No handler found for version ${version}`
        });
      }

      // Apply version-specific middleware
      versionInfo.middleware(req, res, () => {
        // Forward to version-specific router
        versionInfo.router(req, res, next);
      });
    });

    return router;
  }

  /**
   * Add version-specific route
   */
  addRoute(version, method, path, handler) {
    const versionInfo = this.versions.get(version);
    if (!versionInfo) {
      throw new Error(`Version ${version} not found`);
    }

    versionInfo.router[method.toLowerCase()](path, handler);
    this.log('Route added', { version, method, path });
  }

  /**
   * Deprecate a version
   */
  deprecateVersion(version, endOfLifeDate) {
    const versionInfo = this.versions.get(version);
    if (!versionInfo) {
      throw new Error(`Version ${version} not found`);
    }

    versionInfo.deprecated = true;
    versionInfo.deprecationDate = new Date();
    versionInfo.endOfLifeDate = endOfLifeDate;

    this.deprecatedVersions.set(version, {
      deprecationDate: versionInfo.deprecationDate,
      endOfLifeDate: endOfLifeDate
    });

    this.log('Version deprecated', { version, endOfLifeDate });
  }

  /**
   * Get version information
   */
  getVersionInfo(version = null) {
    if (version) {
      const versionInfo = this.versions.get(version);
      if (!versionInfo) {
        return null;
      }

      return {
        version,
        deprecated: versionInfo.deprecated,
        deprecationDate: versionInfo.deprecationDate,
        endOfLifeDate: versionInfo.endOfLifeDate,
        changes: versionInfo.changes
      };
    }

    // Return all versions
    const allVersions = {};
    for (const [ver, info] of this.versions.entries()) {
      allVersions[ver] = {
        version: ver,
        deprecated: info.deprecated,
        deprecationDate: info.deprecationDate,
        endOfLifeDate: info.endOfLifeDate,
        changes: info.changes
      };
    }

    return {
      defaultVersion: this.defaultVersion,
      supportedVersions: this.supportedVersions,
      versions: allVersions
    };
  }

  /**
   * Create OpenAPI documentation for all versions
   */
  generateOpenAPISpec() {
    const specs = {};

    for (const [version] of this.versions.entries()) {
      specs[version] = {
        openapi: '3.0.0',
        info: {
          title: 'AAITI Trading API',
          version: version,
          description: `AAITI Trading API version ${version}`,
          contact: {
            name: 'AAITI Support',
            email: 'support@aaiti.trade'
          }
        },
        servers: [
          {
            url: `/api/v${version}`,
            description: `API v${version} server`
          }
        ],
        paths: this.generatePathsForVersion(version),
        components: this.generateComponentsForVersion(version)
      };
    }

    return specs;
  }

  /**
   * Generate paths for specific version
   */
  generatePathsForVersion(version) {
    // This would contain the actual OpenAPI path definitions
    // For now, returning a basic structure
    return {
      '/health': {
        get: {
          summary: 'Health check endpoint',
          responses: {
            200: {
              description: 'System health status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      version: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/trades': {
        get: {
          summary: 'Get trading history',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20 }
            }
          ],
          responses: {
            200: {
              description: 'Trading history',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Trade' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * Generate components for specific version
   */
  generateComponentsForVersion(version) {
    return {
      schemas: {
        Trade: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            symbol: { type: 'string' },
            quantity: { type: 'number' },
            price: { type: 'number' },
            side: { type: 'string', enum: ['BUY', 'SELL'] },
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    };
  }

  /**
   * Log version operations
   * @private
   */
  log(message, data = {}) {
    if (logger && typeof logger.info === 'function') {
      logger.info(`[API Version] ${message}`, { service: 'api-version-manager', ...data });
    } else {
      console.log(`[API Version] ${message}`, data);
    }
  }
}

// Create singleton instance
let versionManagerInstance = null;

/**
 * Get API version manager instance
 * @returns {APIVersionManager} - Version manager instance
 */
function getVersionManager() {
  if (!versionManagerInstance) {
    versionManagerInstance = new APIVersionManager();
  }
  return versionManagerInstance;
}

module.exports = {
  APIVersionManager,
  getVersionManager
};