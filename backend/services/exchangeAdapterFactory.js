const { IExchangeAdapter, ExchangeContractValidator } = require('../interfaces/IExchangeAdapter');
const MockExchangeAdapter = require('../adapters/MockExchangeAdapter');
const logger = require('../utils/logger');

/**
 * Exchange Adapter Factory
 * Creates and manages exchange adapter instances with contract validation
 */
class ExchangeAdapterFactory {
  constructor() {
    this.registeredAdapters = new Map();
    this.activeAdapters = new Map();
    this.contractValidationResults = new Map();
    
    // Register built-in adapters
    this.registerAdapter('mock', MockExchangeAdapter, {
      name: 'Mock Exchange',
      description: 'Mock exchange adapter for testing and development',
      capabilities: ['spot_trading', 'websocket_market_data', 'paper_trading'],
      supportedRegions: ['global'],
      requiredCredentials: ['apiKey', 'secretKey']
    });
  }

  /**
   * Register a new exchange adapter
   */
  registerAdapter(exchangeId, adapterClass, metadata = {}) {
    try {
      // Validate that the class extends IExchangeAdapter
      if (!(adapterClass.prototype instanceof IExchangeAdapter)) {
        throw new Error(`Adapter class must extend IExchangeAdapter`);
      }

      this.registeredAdapters.set(exchangeId, {
        adapterClass,
        metadata: {
          name: metadata.name || exchangeId,
          description: metadata.description || '',
          capabilities: metadata.capabilities || [],
          supportedRegions: metadata.supportedRegions || ['global'],
          requiredCredentials: metadata.requiredCredentials || [],
          version: metadata.version || '1.0.0',
          maintainer: metadata.maintainer || 'Unknown',
          registeredAt: new Date().toISOString()
        }
      });

      logger.info('Exchange adapter registered', { 
        exchangeId, 
        name: metadata.name,
        capabilities: metadata.capabilities 
      });

      return true;

    } catch (error) {
      logger.error('Failed to register exchange adapter', { exchangeId, error: error.message });
      throw error;
    }
  }

  /**
   * Create exchange adapter instance
   */
  async createAdapter(exchangeId, config = {}, validateContract = true) {
    try {
      const registration = this.registeredAdapters.get(exchangeId);
      if (!registration) {
        throw new Error(`Exchange adapter '${exchangeId}' not registered`);
      }

      // Create adapter instance
      const adapter = new registration.adapterClass(config);

      // Validate contract if requested
      if (validateContract) {
        const validationResult = await this.validateAdapterContract(exchangeId, adapter);
        if (validationResult.score < 90) {
          logger.warn('Adapter failed contract validation', {
            exchangeId,
            score: validationResult.score,
            failures: validationResult.failed.length
          });
        }
      }

      // Store active adapter
      const instanceId = this.generateInstanceId(exchangeId);
      this.activeAdapters.set(instanceId, {
        adapter,
        exchangeId,
        config,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        metadata: registration.metadata
      });

      logger.info('Exchange adapter created', { 
        exchangeId, 
        instanceId,
        contractScore: this.contractValidationResults.get(exchangeId)?.score || 'N/A'
      });

      return {
        instanceId,
        adapter,
        metadata: registration.metadata
      };

    } catch (error) {
      logger.error('Failed to create exchange adapter', { exchangeId, error: error.message });
      throw error;
    }
  }

  /**
   * Get adapter instance by ID
   */
  getAdapter(instanceId) {
    const instance = this.activeAdapters.get(instanceId);
    if (!instance) {
      throw new Error(`Adapter instance '${instanceId}' not found`);
    }

    // Update last used timestamp
    instance.lastUsed = new Date().toISOString();
    
    return instance.adapter;
  }

  /**
   * Destroy adapter instance
   */
  async destroyAdapter(instanceId) {
    try {
      const instance = this.activeAdapters.get(instanceId);
      if (!instance) {
        throw new Error(`Adapter instance '${instanceId}' not found`);
      }

      // Disconnect if connected
      if (instance.adapter.isConnected) {
        await instance.adapter.disconnect();
      }

      this.activeAdapters.delete(instanceId);

      logger.info('Exchange adapter destroyed', { instanceId });
      
      return true;

    } catch (error) {
      logger.error('Failed to destroy exchange adapter', { instanceId, error: error.message });
      throw error;
    }
  }

  /**
   * Validate adapter contract
   */
  async validateAdapterContract(exchangeId, adapter) {
    try {
      const validator = new ExchangeContractValidator(adapter);
      const results = await validator.validate();
      
      this.contractValidationResults.set(exchangeId, {
        ...results,
        validatedAt: new Date().toISOString(),
        report: validator.generateReport()
      });

      logger.info('Contract validation completed', {
        exchangeId,
        score: results.score,
        status: results.score >= 90 ? 'PASS' : 'FAIL'
      });

      return results;

    } catch (error) {
      logger.error('Contract validation failed', { exchangeId, error: error.message });
      throw error;
    }
  }

  /**
   * Get list of registered adapters
   */
  getRegisteredAdapters() {
    const adapters = [];
    
    for (const [exchangeId, registration] of this.registeredAdapters) {
      const contractResult = this.contractValidationResults.get(exchangeId);
      
      adapters.push({
        exchangeId,
        metadata: registration.metadata,
        contractValidation: contractResult ? {
          score: contractResult.score,
          status: contractResult.score >= 90 ? 'PASS' : 'FAIL',
          validatedAt: contractResult.validatedAt
        } : null
      });
    }

    return adapters;
  }

  /**
   * Get list of active adapter instances
   */
  getActiveAdapters() {
    const instances = [];
    
    for (const [instanceId, instance] of this.activeAdapters) {
      instances.push({
        instanceId,
        exchangeId: instance.exchangeId,
        isConnected: instance.adapter.isConnected,
        isAuthenticated: instance.adapter.isAuthenticated || false,
        createdAt: instance.createdAt,
        lastUsed: instance.lastUsed,
        capabilities: instance.adapter.getCapabilities(),
        metadata: instance.metadata
      });
    }

    return instances;
  }

  /**
   * Get contract validation report
   */
  getContractValidationReport(exchangeId) {
    const result = this.contractValidationResults.get(exchangeId);
    if (!result) {
      throw new Error(`No contract validation results for '${exchangeId}'`);
    }

    return result.report;
  }

  /**
   * Cleanup inactive adapters
   */
  async cleanupInactiveAdapters(maxIdleTime = 24 * 60 * 60 * 1000) { // 24 hours
    const now = Date.now();
    const toDestroy = [];

    for (const [instanceId, instance] of this.activeAdapters) {
      const lastUsed = new Date(instance.lastUsed).getTime();
      if (now - lastUsed > maxIdleTime) {
        toDestroy.push(instanceId);
      }
    }

    const results = [];
    for (const instanceId of toDestroy) {
      try {
        await this.destroyAdapter(instanceId);
        results.push({ instanceId, status: 'destroyed' });
      } catch (error) {
        results.push({ instanceId, status: 'error', error: error.message });
      }
    }

    logger.info('Inactive adapter cleanup completed', { 
      cleaned: results.filter(r => r.status === 'destroyed').length,
      errors: results.filter(r => r.status === 'error').length
    });

    return results;
  }

  /**
   * Test adapter connectivity
   */
  async testAdapterConnectivity(exchangeId, config = {}) {
    try {
      const { adapter, instanceId } = await this.createAdapter(exchangeId, config);
      
      const testResults = {
        exchangeId,
        instanceId,
        tests: {
          connect: { status: 'pending', duration: 0, error: null },
          authenticate: { status: 'pending', duration: 0, error: null },
          marketData: { status: 'pending', duration: 0, error: null },
          disconnect: { status: 'pending', duration: 0, error: null }
        }
      };

      // Test connection
      try {
        const startTime = Date.now();
        await adapter.connect();
        testResults.tests.connect.status = 'success';
        testResults.tests.connect.duration = Date.now() - startTime;
      } catch (error) {
        testResults.tests.connect.status = 'failed';
        testResults.tests.connect.error = error.message;
        return testResults; // Early return if connection fails
      }

      // Test authentication
      try {
        const startTime = Date.now();
        await adapter.authenticate();
        testResults.tests.authenticate.status = 'success';
        testResults.tests.authenticate.duration = Date.now() - startTime;
      } catch (error) {
        testResults.tests.authenticate.status = 'failed';
        testResults.tests.authenticate.error = error.message;
      }

      // Test market data (if symbols available)
      try {
        const startTime = Date.now();
        const symbols = adapter.getSupportedSymbols();
        if (symbols.length > 0) {
          await adapter.getMarketData(symbols[0]);
          testResults.tests.marketData.status = 'success';
          testResults.tests.marketData.duration = Date.now() - startTime;
        } else {
          testResults.tests.marketData.status = 'skipped';
        }
      } catch (error) {
        testResults.tests.marketData.status = 'failed';
        testResults.tests.marketData.error = error.message;
      }

      // Test disconnection
      try {
        const startTime = Date.now();
        await adapter.disconnect();
        testResults.tests.disconnect.status = 'success';
        testResults.tests.disconnect.duration = Date.now() - startTime;
      } catch (error) {
        testResults.tests.disconnect.status = 'failed';
        testResults.tests.disconnect.error = error.message;
      }

      // Cleanup
      await this.destroyAdapter(instanceId);

      return testResults;

    } catch (error) {
      logger.error('Adapter connectivity test failed', { exchangeId, error: error.message });
      throw error;
    }
  }

  /**
   * Get adapter health status
   */
  async getAdapterHealth(instanceId) {
    try {
      const adapter = this.getAdapter(instanceId);
      const health = await adapter.isHealthy();
      
      return {
        instanceId,
        healthy: health.success,
        data: health.data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        instanceId,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate unique instance ID
   */
  generateInstanceId(exchangeId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${exchangeId}_${timestamp}_${random}`;
  }

  /**
   * Get factory statistics
   */
  getStatistics() {
    return {
      registeredAdapters: this.registeredAdapters.size,
      activeAdapters: this.activeAdapters.size,
      contractValidations: this.contractValidationResults.size,
      adapters: this.getRegisteredAdapters().map(adapter => ({
        exchangeId: adapter.exchangeId,
        name: adapter.metadata.name,
        contractScore: adapter.contractValidation?.score || null,
        activeInstances: Array.from(this.activeAdapters.values())
          .filter(instance => instance.exchangeId === adapter.exchangeId).length
      }))
    };
  }
}

// Create singleton instance
const exchangeAdapterFactory = new ExchangeAdapterFactory();

module.exports = exchangeAdapterFactory;