const axios = require('axios');
const logger = require('./logger');
const { getCredentials } = require('./credentials');

class WebhookService {
  constructor() {
    this.webhooks = new Map();
    this.credentials = getCredentials('webhooks') || {};
    this.retryAttempts = 3;
    this.timeout = 10000;
    
    logger.info('WebhookService initialized', { 
      service: 'webhooks',
      timeout: this.timeout,
      retryAttempts: this.retryAttempts
    });
  }

  /**
   * Register a webhook endpoint
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
      createdAt: new Date().toISOString()
    };

    this.webhooks.set(id, webhook);
    
    logger.info('Webhook registered', {
      webhookId: id,
      url: webhook.url,
      events: webhook.events,
      service: 'webhooks'
    });

    return webhook;
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
      createdAt: webhook.createdAt
    }));
  }
}

module.exports = new WebhookService();