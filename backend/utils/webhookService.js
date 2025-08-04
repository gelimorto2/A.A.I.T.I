const axios = require('axios');
const crypto = require('crypto');
const logger = require('./logger');
const { getCredentials } = require('./credentials');

class WebhookService {
  constructor() {
    this.webhooks = new Map();
    this.credentials = getCredentials('webhooks') || {};
    this.retryAttempts = 3;
    this.timeout = 10000;
    this.zapierEndpoints = new Map();
    this.externalDataSources = new Map();
    
    // Integration ecosystem configurations
    this.integrationTypes = {
      ZAPIER: 'zapier',
      DISCORD: 'discord',
      SLACK: 'slack',
      TELEGRAM: 'telegram',
      CUSTOM: 'custom',
      DATA_SOURCE: 'data_source'
    };
    
    logger.info('Enhanced WebhookService initialized with integration ecosystem support', { 
      service: 'webhooks',
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      integrationTypes: Object.keys(this.integrationTypes)
    });
  }

  /**
   * Register a webhook endpoint with enhanced integration support
   */
  registerWebhook(id, config) {
    const webhook = {
      id,
      url: config.url,
      secret: config.secret,
      events: config.events || ['*'],
      enabled: config.enabled !== false,
      headers: config.headers || {},
      retryCount: 0,
      lastTriggered: null,
      createdAt: new Date().toISOString(),
      // Enhanced integration properties
      integrationType: config.integrationType || this.integrationTypes.CUSTOM,
      authentication: config.authentication || {},
      transformTemplate: config.transformTemplate || null,
      rateLimiting: config.rateLimiting || { requests: 100, period: 3600 }, // 100 requests per hour
      metadata: config.metadata || {}
    };

    this.webhooks.set(id, webhook);
    
    logger.info('Enhanced webhook registered', {
      webhookId: id,
      url: webhook.url,
      events: webhook.events,
      integrationType: webhook.integrationType,
      service: 'webhooks'
    });

    return webhook;
  }

  /**
   * Register Zapier integration endpoint
   */
  registerZapierIntegration(zapConfig) {
    const zapierWebhook = {
      id: `zapier_${Date.now()}`,
      url: zapConfig.webhookUrl,
      integrationType: this.integrationTypes.ZAPIER,
      events: zapConfig.triggers || ['trade_executed', 'alert_triggered', 'portfolio_update'],
      enabled: true,
      zapierMetadata: {
        zapId: zapConfig.zapId,
        triggerType: zapConfig.triggerType,
        targetApp: zapConfig.targetApp
      },
      transformTemplate: this.getZapierTransformTemplate(zapConfig.triggerType)
    };

    this.zapierEndpoints.set(zapierWebhook.id, zapierWebhook);
    this.registerWebhook(zapierWebhook.id, zapierWebhook);

    logger.info('Zapier integration registered', {
      zapId: zapConfig.zapId,
      triggerType: zapConfig.triggerType,
      targetApp: zapConfig.targetApp
    });

    return zapierWebhook;
  }

  /**
   * Register external data source integration
   */
  registerDataSource(sourceConfig) {
    const dataSource = {
      id: `datasource_${Date.now()}`,
      name: sourceConfig.name,
      type: sourceConfig.type, // 'api', 'rss', 'websocket', etc.
      endpoint: sourceConfig.endpoint,
      authentication: sourceConfig.authentication || {},
      refreshInterval: sourceConfig.refreshInterval || 300000, // 5 minutes default
      dataMapping: sourceConfig.dataMapping || {},
      enabled: sourceConfig.enabled !== false,
      lastFetch: null,
      createdAt: new Date().toISOString()
    };

    this.externalDataSources.set(dataSource.id, dataSource);

    logger.info('External data source registered', {
      sourceId: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      endpoint: dataSource.endpoint
    });

    return dataSource;
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(eventType, data, targetWebhookId = null) {
    const webhooksToNotify = targetWebhookId 
      ? [this.webhooks.get(targetWebhookId)].filter(Boolean)
      : Array.from(this.webhooks.values()).filter(webhook => 
          webhook.enabled && 
          (webhook.events.includes('*') || webhook.events.includes(eventType))
        );

    if (webhooksToNotify.length === 0) {
      logger.debug('No webhooks to notify for event', { eventType, service: 'webhooks' });
      return;
    }

    const results = await Promise.allSettled(
      webhooksToNotify.map(webhook => this.executeWebhook(webhook, eventType, data))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    logger.info('Webhook notifications sent', {
      eventType,
      total: results.length,
      successful,
      failed,
      service: 'webhooks'
    });

    return { total: results.length, successful, failed };
  }

  /**
   * Execute individual webhook with retry logic
   */
  async executeWebhook(webhook, eventType, data, attempt = 1) {
    try {
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data,
        webhook_id: webhook.id
      };

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'AAITI-Webhook/1.1.0',
        ...webhook.headers
      };

      // Add signature if secret is provided
      if (webhook.secret) {
        const crypto = require('crypto');
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-AAITI-Signature'] = `sha256=${signature}`;
      }

      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: this.timeout,
        validateStatus: (status) => status >= 200 && status < 300
      });

      // Update webhook stats
      webhook.lastTriggered = new Date().toISOString();
      webhook.retryCount = 0;

      logger.info('Webhook executed successfully', {
        webhookId: webhook.id,
        eventType,
        status: response.status,
        attempt,
        service: 'webhooks'
      });

      return { success: true, status: response.status };

    } catch (error) {
      webhook.retryCount++;

      logger.warn('Webhook execution failed', {
        webhookId: webhook.id,
        eventType,
        attempt,
        error: error.message,
        status: error.response?.status,
        service: 'webhooks'
      });

      // Retry logic
      if (attempt < this.retryAttempts && (!error.response || error.response.status >= 500)) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWebhook(webhook, eventType, data, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Send trading notifications
   */
  async notifyTrade(tradeData) {
    return this.sendWebhook('trade.executed', {
      type: 'trade',
      symbol: tradeData.symbol,
      side: tradeData.side,
      quantity: tradeData.quantity,
      price: tradeData.price,
      botId: tradeData.botId,
      timestamp: tradeData.timestamp
    });
  }

  /**
   * Send system alerts
   */
  async notifyAlert(alertData) {
    return this.sendWebhook('system.alert', {
      type: 'alert',
      level: alertData.level, // info, warning, error, critical
      message: alertData.message,
      source: alertData.source,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send backtest completion notifications
   */
  async notifyBacktest(backtestData) {
    return this.sendWebhook('backtest.completed', {
      type: 'backtest',
      backtestId: backtestData.id,
      status: backtestData.status,
      results: backtestData.results,
      duration: backtestData.duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats() {
    const stats = {};
    
    for (const [id, webhook] of this.webhooks) {
      stats[id] = {
        enabled: webhook.enabled,
        events: webhook.events,
        lastTriggered: webhook.lastTriggered,
        retryCount: webhook.retryCount,
        createdAt: webhook.createdAt
      };
    }

    return stats;
  }

  /**
   * Remove webhook
   */
  removeWebhook(id) {
    const removed = this.webhooks.delete(id);
    
    if (removed) {
      logger.info('Webhook removed', { webhookId: id, service: 'webhooks' });
    }

    return removed;
  }

  /**
   * List all webhooks
   */
  listWebhooks() {
    return Array.from(this.webhooks.values()).map(webhook => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      lastTriggered: webhook.lastTriggered,
      createdAt: webhook.createdAt,
      integrationType: webhook.integrationType
    }));
  }

  /**
   * Get Zapier transform template based on trigger type
   */
  getZapierTransformTemplate(triggerType) {
    const templates = {
      trade_executed: {
        title: "Trade Executed",
        description: "{{symbol}} {{side}} order for {{quantity}} at ${{price}}",
        fields: {
          symbol: "{{symbol}}",
          side: "{{side}}",
          quantity: "{{quantity}}",
          price: "{{price}}",
          timestamp: "{{timestamp}}"
        }
      },
      alert_triggered: {
        title: "Alert Triggered",
        description: "{{level}} alert: {{message}}",
        fields: {
          level: "{{level}}",
          message: "{{message}}",
          source: "{{source}}",
          timestamp: "{{timestamp}}"
        }
      },
      portfolio_update: {
        title: "Portfolio Updated",
        description: "Portfolio value changed to ${{totalValue}}",
        fields: {
          totalValue: "{{totalValue}}",
          change: "{{change}}",
          changePercent: "{{changePercent}}",
          timestamp: "{{timestamp}}"
        }
      }
    };

    return templates[triggerType] || templates.trade_executed;
  }

  /**
   * Transform data using template
   */
  transformDataWithTemplate(data, template) {
    if (!template) return data;

    const transformed = { ...template };
    
    // Replace template variables with actual data
    const replaceVariables = (obj, data) => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
      } else if (typeof obj === 'object' && obj !== null) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceVariables(value, data);
        }
        return result;
      }
      return obj;
    };

    return replaceVariables(transformed, data);
  }

  /**
   * Fetch data from external data source
   */
  async fetchExternalData(sourceId) {
    const dataSource = this.externalDataSources.get(sourceId);
    if (!dataSource || !dataSource.enabled) {
      throw new Error(`Data source ${sourceId} not found or disabled`);
    }

    try {
      const headers = {};
      
      // Add authentication headers
      if (dataSource.authentication.type === 'bearer') {
        headers['Authorization'] = `Bearer ${dataSource.authentication.token}`;
      } else if (dataSource.authentication.type === 'api_key') {
        headers[dataSource.authentication.headerName || 'X-API-Key'] = dataSource.authentication.apiKey;
      }

      const response = await axios.get(dataSource.endpoint, {
        headers,
        timeout: this.timeout
      });

      // Apply data mapping if specified
      let mappedData = response.data;
      if (dataSource.dataMapping && Object.keys(dataSource.dataMapping).length > 0) {
        mappedData = this.applyDataMapping(response.data, dataSource.dataMapping);
      }

      // Update last fetch time
      dataSource.lastFetch = new Date().toISOString();

      logger.info('External data fetched successfully', {
        sourceId,
        dataSize: JSON.stringify(mappedData).length,
        endpoint: dataSource.endpoint
      });

      return {
        success: true,
        data: mappedData,
        source: dataSource.name,
        fetchedAt: dataSource.lastFetch
      };

    } catch (error) {
      logger.error('Failed to fetch external data', {
        sourceId,
        endpoint: dataSource.endpoint,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Apply data mapping transformation
   */
  applyDataMapping(data, mapping) {
    const mapped = {};
    
    for (const [targetKey, sourcePath] of Object.entries(mapping)) {
      const value = this.getNestedValue(data, sourcePath);
      if (value !== undefined) {
        mapped[targetKey] = value;
      }
    }

    return mapped;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get all external data sources
   */
  listDataSources() {
    return Array.from(this.externalDataSources.values()).map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      endpoint: source.endpoint,
      enabled: source.enabled,
      lastFetch: source.lastFetch,
      createdAt: source.createdAt
    }));
  }

  /**
   * Remove external data source
   */
  removeDataSource(sourceId) {
    const removed = this.externalDataSources.delete(sourceId);
    
    if (removed) {
      logger.info('External data source removed', { sourceId });
    }

    return removed;
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const testData = {
      type: 'test',
      message: 'This is a test webhook from A.A.I.T.I',
      timestamp: new Date().toISOString()
    };

    try {
      await this.executeWebhook(webhook, 'test', testData);
      return { success: true, message: 'Webhook test successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get integration ecosystem statistics
   */
  getIntegrationStats() {
    const zapierCount = this.zapierEndpoints.size;
    const dataSourceCount = this.externalDataSources.size;
    const totalWebhooks = this.webhooks.size;
    
    const byType = {};
    for (const webhook of this.webhooks.values()) {
      byType[webhook.integrationType] = (byType[webhook.integrationType] || 0) + 1;
    }

    return {
      total: {
        webhooks: totalWebhooks,
        zapierIntegrations: zapierCount,
        dataSources: dataSourceCount
      },
      byType,
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = new WebhookService();