const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const webhookService = require('../utils/webhookService');
const notificationService = require('../utils/notificationService');
const logger = require('../utils/logger');

// Webhook management routes
router.post('/webhooks', authenticateToken, async (req, res) => {
  try {
    const { url, secret, events, headers, enabled } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const webhook = webhookService.registerWebhook(webhookId, {
      url,
      secret,
      events,
      headers,
      enabled
    });

    res.json({
      message: 'Webhook registered successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        enabled: webhook.enabled,
        createdAt: webhook.createdAt
      }
    });
  } catch (error) {
    logger.error('Error registering webhook', { error: error.message, service: 'webhooks' });
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

router.get('/webhooks', authenticateToken, async (req, res) => {
  try {
    const webhooks = webhookService.listWebhooks();
    res.json({ webhooks });
  } catch (error) {
    logger.error('Error listing webhooks', { error: error.message, service: 'webhooks' });
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

router.delete('/webhooks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const removed = webhookService.removeWebhook(id);
    
    if (removed) {
      res.json({ message: 'Webhook removed successfully' });
    } else {
      res.status(404).json({ error: 'Webhook not found' });
    }
  } catch (error) {
    logger.error('Error removing webhook', { error: error.message, service: 'webhooks' });
    res.status(500).json({ error: 'Failed to remove webhook' });
  }
});

router.get('/webhooks/stats', authenticateToken, async (req, res) => {
  try {
    const stats = webhookService.getWebhookStats();
    res.json({ stats });
  } catch (error) {
    logger.error('Error getting webhook stats', { error: error.message, service: 'webhooks' });
    res.status(500).json({ error: 'Failed to get webhook stats' });
  }
});

// Test webhook endpoint
router.post('/webhooks/:id/test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const testData = req.body.data || { test: true, timestamp: new Date().toISOString() };
    
    const result = await webhookService.sendWebhook('test.webhook', testData, id);
    
    res.json({
      message: 'Test webhook sent',
      result
    });
  } catch (error) {
    logger.error('Error testing webhook', { error: error.message, service: 'webhooks' });
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

// Notification management routes
router.post('/notifications/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const subscription = notificationService.subscribe(userId, preferences);
    
    res.json({
      message: 'Subscribed to notifications successfully',
      subscription: {
        userId: subscription.userId,
        events: subscription.events,
        channels: subscription.channels,
        frequency: subscription.frequency,
        enabled: subscription.enabled
      }
    });
  } catch (error) {
    logger.error('Error subscribing to notifications', { error: error.message, service: 'notifications' });
    res.status(500).json({ error: 'Failed to subscribe to notifications' });
  }
});

router.delete('/notifications/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const removed = notificationService.unsubscribe(userId);
    
    if (removed) {
      res.json({ message: 'Unsubscribed from notifications successfully' });
    } else {
      res.status(404).json({ error: 'No subscription found' });
    }
  } catch (error) {
    logger.error('Error unsubscribing from notifications', { error: error.message, service: 'notifications' });
    res.status(500).json({ error: 'Failed to unsubscribe from notifications' });
  }
});

router.get('/notifications/stats', authenticateToken, async (req, res) => {
  try {
    const stats = notificationService.getStats();
    res.json({ stats });
  } catch (error) {
    logger.error('Error getting notification stats', { error: error.message, service: 'notifications' });
    res.status(500).json({ error: 'Failed to get notification stats' });
  }
});

// Test notification endpoint
router.post('/notifications/test', authenticateToken, async (req, res) => {
  try {
    const { type, data } = req.body;
    
    let result;
    switch (type) {
      case 'email':
        result = await notificationService.notifyAlert('info', 'Test notification from AAITI', 'manual');
        break;
      case 'webhook':
        result = await webhookService.sendWebhook('test.notification', data || { test: true });
        break;
      default:
        return res.status(400).json({ error: 'Invalid notification type. Use "email" or "webhook"' });
    }
    
    res.json({
      message: 'Test notification sent',
      result
    });
  } catch (error) {
    logger.error('Error sending test notification', { error: error.message, service: 'notifications' });
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

module.exports = router;