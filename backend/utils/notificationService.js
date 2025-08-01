const nodemailer = require('nodemailer');
const logger = require('./logger');
const webhookService = require('./webhookService');
const { getCredentials } = require('./credentials');

class NotificationService {
  constructor() {
    this.credentials = getCredentials('notifications') || {};
    this.emailTransporter = null;
    this.subscriptions = new Map();
    this.rateLimits = new Map();
    
    this.initializeEmailTransporter();
    
    logger.info('NotificationService initialized', { 
      service: 'notifications',
      hasEmail: !!this.emailTransporter
    });
  }

  /**
   * Initialize email transporter if credentials are available
   */
  initializeEmailTransporter() {
    try {
      if (this.credentials.email?.host && this.credentials.email?.auth?.user) {
        this.emailTransporter = nodemailer.createTransporter({
          host: this.credentials.email.host,
          port: this.credentials.email.port || 587,
          secure: this.credentials.email.secure || false,
          auth: this.credentials.email.auth,
          tls: {
            rejectUnauthorized: false
          }
        });

        logger.info('Email transporter initialized', { 
          host: this.credentials.email.host,
          port: this.credentials.email.port,
          service: 'notifications'
        });
      } else {
        logger.info('Email credentials not configured, email notifications disabled', { 
          service: 'notifications'
        });
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter', { 
        error: error.message,
        service: 'notifications' 
      });
    }
  }

  /**
   * Subscribe user to notifications
   */
  subscribe(userId, preferences) {
    const subscription = {
      userId,
      email: preferences.email,
      webhook: preferences.webhook,
      events: preferences.events || ['trade.executed', 'system.alert'],
      channels: preferences.channels || ['email'],
      frequency: preferences.frequency || 'immediate', // immediate, hourly, daily
      enabled: preferences.enabled !== false,
      createdAt: new Date().toISOString()
    };

    this.subscriptions.set(userId, subscription);
    
    logger.info('User subscribed to notifications', {
      userId,
      events: subscription.events,
      channels: subscription.channels,
      service: 'notifications'
    });

    return subscription;
  }

  /**
   * Check rate limits for notifications
   */
  checkRateLimit(userId, eventType) {
    const key = `${userId}:${eventType}`;
    const now = Date.now();
    const limit = this.rateLimits.get(key);

    if (!limit) {
      this.rateLimits.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
      return true;
    }

    if (now > limit.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (limit.count >= 10) { // Max 10 notifications per minute per event type
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Send notification to all subscribed users
   */
  async sendNotification(eventType, data) {
    const subscribers = Array.from(this.subscriptions.values()).filter(sub => 
      sub.enabled && sub.events.includes(eventType)
    );

    if (subscribers.length === 0) {
      logger.debug('No subscribers for event', { eventType, service: 'notifications' });
      return;
    }

    const results = await Promise.allSettled(
      subscribers.map(subscriber => this.sendToSubscriber(subscriber, eventType, data))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    logger.info('Notifications sent', {
      eventType,
      total: results.length,
      successful,
      failed,
      service: 'notifications'
    });

    return { total: results.length, successful, failed };
  }

  /**
   * Send notification to individual subscriber
   */
  async sendToSubscriber(subscriber, eventType, data) {
    if (!this.checkRateLimit(subscriber.userId, eventType)) {
      logger.warn('Rate limit exceeded for user', {
        userId: subscriber.userId,
        eventType,
        service: 'notifications'
      });
      return;
    }

    const promises = [];

    // Send email notification
    if (subscriber.channels.includes('email') && subscriber.email && this.emailTransporter) {
      promises.push(this.sendEmailNotification(subscriber, eventType, data));
    }

    // Send webhook notification
    if (subscriber.channels.includes('webhook') && subscriber.webhook) {
      promises.push(webhookService.sendWebhook(eventType, data, subscriber.webhook));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(subscriber, eventType, data) {
    try {
      const subject = this.generateEmailSubject(eventType, data);
      const html = this.generateEmailTemplate(eventType, data);

      const mailOptions = {
        from: this.credentials.email?.from || 'noreply@aaiti.trading',
        to: subscriber.email,
        subject,
        html
      };

      await this.emailTransporter.sendMail(mailOptions);

      logger.info('Email notification sent', {
        userId: subscriber.userId,
        email: subscriber.email,
        eventType,
        service: 'notifications'
      });

    } catch (error) {
      logger.error('Failed to send email notification', {
        userId: subscriber.userId,
        eventType,
        error: error.message,
        service: 'notifications'
      });
      throw error;
    }
  }

  /**
   * Generate email subject line
   */
  generateEmailSubject(eventType, data) {
    switch (eventType) {
      case 'trade.executed':
        return `AAITI: Trade Executed - ${data.symbol} ${data.side}`;
      case 'system.alert':
        return `AAITI: ${data.level.toUpperCase()} Alert - ${data.message}`;
      case 'backtest.completed':
        return `AAITI: Backtest Completed - ${data.status}`;
      case 'bot.status.changed':
        return `AAITI: Bot Status Changed - ${data.botId}`;
      default:
        return `AAITI: Notification - ${eventType}`;
    }
  }

  /**
   * Generate email HTML template
   */
  generateEmailTemplate(eventType, data) {
    const baseTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚀 AAITI Notification</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">Auto AI Trading Interface</p>
        </div>
        <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e1e1e1;">
          {{CONTENT}}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e1e1e1;">
          <p style="font-size: 12px; color: #666; margin: 0;">
            This notification was sent by AAITI v1.1.0 at ${new Date().toISOString()}
          </p>
        </div>
      </div>
    `;

    let content = '';

    switch (eventType) {
      case 'trade.executed':
        content = `
          <h2 style="color: #2e7d32;">✅ Trade Executed</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold;">Symbol:</td><td style="padding: 8px;">${data.symbol}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Side:</td><td style="padding: 8px;">${data.side.toUpperCase()}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Quantity:</td><td style="padding: 8px;">${data.quantity}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Price:</td><td style="padding: 8px;">$${data.price}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Bot ID:</td><td style="padding: 8px;">${data.botId}</td></tr>
          </table>
        `;
        break;
      case 'system.alert':
        const alertColor = data.level === 'error' || data.level === 'critical' ? '#d32f2f' : 
                          data.level === 'warning' ? '#f57c00' : '#1976d2';
        content = `
          <h2 style="color: ${alertColor};">⚠️ System Alert</h2>
          <p><strong>Level:</strong> ${data.level.toUpperCase()}</p>
          <p><strong>Message:</strong> ${data.message}</p>
          <p><strong>Source:</strong> ${data.source}</p>
        `;
        break;
      case 'backtest.completed':
        content = `
          <h2 style="color: #1976d2;">📊 Backtest Completed</h2>
          <p><strong>Status:</strong> ${data.status}</p>
          <p><strong>Duration:</strong> ${data.duration}</p>
          ${data.results ? `<p><strong>Results:</strong> ${JSON.stringify(data.results, null, 2)}</p>` : ''}
        `;
        break;
      default:
        content = `
          <h2 style="color: #1976d2;">📢 Notification</h2>
          <p><strong>Event:</strong> ${eventType}</p>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(data, null, 2)}
          </pre>
        `;
    }

    return baseTemplate.replace('{{CONTENT}}', content);
  }

  /**
   * Send specific notification types
   */
  async notifyTrade(tradeData) {
    return this.sendNotification('trade.executed', tradeData);
  }

  async notifyAlert(level, message, source = 'system') {
    return this.sendNotification('system.alert', { level, message, source });
  }

  async notifyBacktest(backtestData) {
    return this.sendNotification('backtest.completed', backtestData);
  }

  async notifyBotStatusChange(botId, oldStatus, newStatus) {
    return this.sendNotification('bot.status.changed', { botId, oldStatus, newStatus });
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      totalSubscriptions: this.subscriptions.size,
      emailEnabled: !!this.emailTransporter,
      rateLimits: this.rateLimits.size,
      subscribers: Array.from(this.subscriptions.values()).map(sub => ({
        userId: sub.userId,
        events: sub.events,
        channels: sub.channels,
        enabled: sub.enabled
      }))
    };
  }

  /**
   * Unsubscribe user
   */
  unsubscribe(userId) {
    const removed = this.subscriptions.delete(userId);
    
    if (removed) {
      logger.info('User unsubscribed from notifications', { userId, service: 'notifications' });
    }

    return removed;
  }
}

module.exports = new NotificationService();