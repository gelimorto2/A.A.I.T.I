const express = require('express');
const { authenticateToken, auditLog } = require('../middleware/auth');
const webhookService = require('../utils/webhookService');
const pluginSystem = require('../utils/pluginSystem');
const logger = require('../utils/logger');

const router = express.Router();

// =====================
// WEBHOOK ENDPOINTS
// =====================

/**
 * Register a new webhook
 */
router.post('/webhooks', authenticateToken, auditLog('register_webhook'), async (req, res) => {
  try {
    const { url, secret, events, integrationType, headers, metadata } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const webhookConfig = {
      url,
      secret,
      events: events || ['*'],
      integrationType: integrationType || 'custom',
      headers: headers || {},
      metadata: { ...metadata, userId: req.user.id }
    };

    const webhook = webhookService.registerWebhook(
      `webhook_${req.user.id}_${Date.now()}`,
      webhookConfig
    );

    res.json({
      success: true,
      webhook,
      message: 'Webhook registered successfully'
    });

  } catch (error) {
    logger.error('Error registering webhook:', error);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

/**
 * Register Zapier integration
 */
router.post('/webhooks/zapier', authenticateToken, auditLog('register_zapier'), async (req, res) => {
  try {
    const { webhookUrl, triggerType, targetApp, zapId } = req.body;
    
    if (!webhookUrl || !triggerType) {
      return res.status(400).json({ 
        error: 'Webhook URL and trigger type are required for Zapier integration' 
      });
    }

    const zapConfig = {
      webhookUrl,
      triggerType,
      targetApp: targetApp || 'Unknown',
      zapId: zapId || `zap_${Date.now()}`,
      userId: req.user.id
    };

    const zapierWebhook = webhookService.registerZapierIntegration(zapConfig);

    res.json({
      success: true,
      zapierWebhook,
      message: 'Zapier integration registered successfully'
    });

  } catch (error) {
    logger.error('Error registering Zapier integration:', error);
    res.status(500).json({ error: 'Failed to register Zapier integration' });
  }
});

/**
 * List all webhooks for user
 */
router.get('/webhooks', authenticateToken, (req, res) => {
  try {
    const allWebhooks = webhookService.listWebhooks();
    const userWebhooks = allWebhooks.filter(webhook => 
      webhook.metadata && webhook.metadata.userId === req.user.id
    );

    res.json({
      success: true,
      webhooks: userWebhooks,
      count: userWebhooks.length
    });

  } catch (error) {
    logger.error('Error listing webhooks:', error);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

/**
 * Test webhook
 */
router.post('/webhooks/:id/test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await webhookService.testWebhook(id);

    res.json({
      success: result.success,
      message: result.message || result.error,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error testing webhook:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

/**
 * Delete webhook
 */
router.delete('/webhooks/:id', authenticateToken, auditLog('delete_webhook'), (req, res) => {
  try {
    const { id } = req.params;
    const removed = webhookService.removeWebhook(id);

    if (removed) {
      res.json({ success: true, message: 'Webhook removed successfully' });
    } else {
      res.status(404).json({ error: 'Webhook not found' });
    }

  } catch (error) {
    logger.error('Error removing webhook:', error);
    res.status(500).json({ error: 'Failed to remove webhook' });
  }
});

// =====================
// PLUGIN ENDPOINTS
// =====================

/**
 * Register a new plugin
 */
router.post('/plugins', authenticateToken, auditLog('register_plugin'), async (req, res) => {
  try {
    const { name, description, code, parameters, category } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ error: 'Plugin name and code are required' });
    }

    const pluginConfig = {
      id: `plugin_${req.user.id}_${Date.now()}`,
      name,
      description: description || '',
      author: req.user.username || req.user.id,
      code,
      parameters: parameters || {},
      category: category || 'custom'
    };

    const plugin = await pluginSystem.registerPlugin(pluginConfig);

    res.json({
      success: true,
      plugin: {
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        author: plugin.author,
        category: plugin.category,
        createdAt: plugin.createdAt
      },
      message: 'Plugin registered successfully'
    });

  } catch (error) {
    logger.error('Error registering plugin:', error);
    res.status(400).json({ 
      error: 'Failed to register plugin',
      details: error.message
    });
  }
});

/**
 * Execute a plugin
 */
router.post('/plugins/:id/execute', authenticateToken, auditLog('execute_plugin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { data, parameters } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Data is required for plugin execution' });
    }

    const result = await pluginSystem.executePlugin(id, data, parameters);

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error executing plugin:', error);
    res.status(500).json({ 
      error: 'Failed to execute plugin',
      details: error.message
    });
  }
});

/**
 * List all plugins
 */
router.get('/plugins', authenticateToken, (req, res) => {
  try {
    const plugins = pluginSystem.listPlugins();
    
    res.json({
      success: true,
      plugins,
      count: plugins.length
    });

  } catch (error) {
    logger.error('Error listing plugins:', error);
    res.status(500).json({ error: 'Failed to list plugins' });
  }
});

/**
 * Get plugin details
 */
router.get('/plugins/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const plugin = pluginSystem.getPlugin(id);
    
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    res.json({
      success: true,
      plugin
    });

  } catch (error) {
    logger.error('Error getting plugin:', error);
    res.status(500).json({ error: 'Failed to get plugin' });
  }
});

/**
 * Toggle plugin enabled/disabled
 */
router.patch('/plugins/:id/toggle', authenticateToken, auditLog('toggle_plugin'), (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    const plugin = pluginSystem.togglePlugin(id, enabled);

    res.json({
      success: true,
      plugin: {
        id: plugin.id,
        name: plugin.name,
        enabled: plugin.enabled,
        lastUpdated: plugin.lastUpdated
      },
      message: `Plugin ${enabled ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    logger.error('Error toggling plugin:', error);
    res.status(500).json({ 
      error: 'Failed to toggle plugin',
      details: error.message
    });
  }
});

/**
 * Delete plugin
 */
router.delete('/plugins/:id', authenticateToken, auditLog('delete_plugin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pluginSystem.removePlugin(id);

    res.json({
      success: true,
      message: 'Plugin removed successfully'
    });

  } catch (error) {
    logger.error('Error removing plugin:', error);
    res.status(500).json({ 
      error: 'Failed to remove plugin',
      details: error.message
    });
  }
});

// =====================
// EXTERNAL DATA SOURCE ENDPOINTS
// =====================

/**
 * Register external data source
 */
router.post('/data-sources', authenticateToken, auditLog('register_data_source'), async (req, res) => {
  try {
    const { name, type, endpoint, authentication, refreshInterval, dataMapping } = req.body;
    
    if (!name || !type || !endpoint) {
      return res.status(400).json({ 
        error: 'Name, type, and endpoint are required for data source registration' 
      });
    }

    const sourceConfig = {
      name,
      type,
      endpoint,
      authentication: authentication || {},
      refreshInterval: refreshInterval || 300000, // 5 minutes default
      dataMapping: dataMapping || {},
      metadata: { userId: req.user.id }
    };

    const dataSource = webhookService.registerDataSource(sourceConfig);

    res.json({
      success: true,
      dataSource: {
        id: dataSource.id,
        name: dataSource.name,
        type: dataSource.type,
        endpoint: dataSource.endpoint,
        enabled: dataSource.enabled,
        createdAt: dataSource.createdAt
      },
      message: 'Data source registered successfully'
    });

  } catch (error) {
    logger.error('Error registering data source:', error);
    res.status(500).json({ error: 'Failed to register data source' });
  }
});

/**
 * Fetch data from external source
 */
router.post('/data-sources/:id/fetch', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await webhookService.fetchExternalData(id);

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching external data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch external data',
      details: error.message
    });
  }
});

/**
 * List all data sources
 */
router.get('/data-sources', authenticateToken, (req, res) => {
  try {
    const dataSources = webhookService.listDataSources();
    
    res.json({
      success: true,
      dataSources,
      count: dataSources.length
    });

  } catch (error) {
    logger.error('Error listing data sources:', error);
    res.status(500).json({ error: 'Failed to list data sources' });
  }
});

/**
 * Delete data source
 */
router.delete('/data-sources/:id', authenticateToken, auditLog('delete_data_source'), (req, res) => {
  try {
    const { id } = req.params;
    const removed = webhookService.removeDataSource(id);

    if (removed) {
      res.json({ success: true, message: 'Data source removed successfully' });
    } else {
      res.status(404).json({ error: 'Data source not found' });
    }

  } catch (error) {
    logger.error('Error removing data source:', error);
    res.status(500).json({ error: 'Failed to remove data source' });
  }
});

// =====================
// INTEGRATION STATISTICS
// =====================

/**
 * Get integration ecosystem statistics
 */
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const webhookStats = webhookService.getIntegrationStats();
    const pluginStats = pluginSystem.getPluginStats();

    const stats = {
      webhooks: webhookStats,
      plugins: pluginStats,
      overall: {
        totalIntegrations: webhookStats.total.webhooks + pluginStats.totalPlugins + webhookStats.total.dataSources,
        lastUpdated: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error getting integration stats:', error);
    res.status(500).json({ error: 'Failed to get integration statistics' });
  }
});

/**
 * Health check for all integrations
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const health = {
      webhookService: 'healthy',
      pluginSystem: 'healthy',
      totalWebhooks: webhookService.listWebhooks().length,
      totalPlugins: pluginSystem.listPlugins().length,
      totalDataSources: webhookService.listDataSources().length,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      health
    });

  } catch (error) {
    logger.error('Error checking integration health:', error);
    res.status(500).json({ error: 'Failed to check integration health' });
  }
});

module.exports = router;