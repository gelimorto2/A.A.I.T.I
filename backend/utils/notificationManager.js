const axios = require('axios');
const logger = require('./logger');
const { getMetrics } = require('./prometheusMetrics');
const { getGitHubIssueReporter } = require('./githubIssueReporter');

/**
 * AAITI Enhanced Notification System
 * Slack/Discord integration and SMS alerting for critical events
 * Part of System Enhancements - Enhanced Monitoring & Alerting
 */

class NotificationManager {
  constructor(config = {}) {
    this.config = {
      slack: {
        webhookUrl: config.slackWebhook || process.env.SLACK_WEBHOOK_URL,
        channel: config.slackChannel || process.env.SLACK_CHANNEL || '#aaiti-alerts',
        username: config.slackUsername || 'AAITI Bot',
        emoji: config.slackEmoji || ':robot_face:',
        enabled: config.slackEnabled !== false && (config.slackWebhook || process.env.SLACK_WEBHOOK_URL)
      },
      discord: {
        webhookUrl: config.discordWebhook || process.env.DISCORD_WEBHOOK_URL,
        username: config.discordUsername || 'AAITI Bot',
        avatarUrl: config.discordAvatar || process.env.DISCORD_AVATAR_URL,
        enabled: config.discordEnabled !== false && (config.discordWebhook || process.env.DISCORD_WEBHOOK_URL)
      },
      sms: {
        provider: config.smsProvider || process.env.SMS_PROVIDER || 'twilio',
        accountSid: config.smsAccountSid || process.env.TWILIO_ACCOUNT_SID,
        authToken: config.smsAuthToken || process.env.TWILIO_AUTH_TOKEN,
        fromNumber: config.smsFromNumber || process.env.TWILIO_FROM_NUMBER,
        enabled: config.smsEnabled !== false && process.env.TWILIO_ACCOUNT_SID
      },
      email: {
        enabled: config.emailEnabled !== false,
        smtpHost: config.smtpHost || process.env.SMTP_HOST,
        smtpPort: config.smtpPort || process.env.SMTP_PORT || 587,
        smtpUser: config.smtpUser || process.env.SMTP_USER,
        smtpPass: config.smtpPass || process.env.SMTP_PASS,
        fromEmail: config.fromEmail || process.env.FROM_EMAIL || 'alerts@aaiti.trade'
      },
      alertLevels: {
        info: { color: '#36a64f', priority: 1 },
        warning: { color: '#ff9900', priority: 2 },
        error: { color: '#ff0000', priority: 3 },
        critical: { color: '#8b0000', priority: 4 }
      },
      rateLimiting: {
        enabled: config.rateLimitingEnabled !== false,
        windowMs: config.rateLimitWindow || 300000, // 5 minutes
        maxAlerts: config.maxAlertsPerWindow || 10
      }
    };

    // Rate limiting storage
    this.alertHistory = new Map();
    
    // Metrics integration
    this.metrics = getMetrics();
    
    // GitHub issue reporter integration
    this.githubReporter = getGitHubIssueReporter();
    
    // Add GitHub to config
    this.config.github = {
      enabled: config.githubEnabled !== false && (process.env.GITHUB_TOKEN || config.githubToken),
      autoCreateIssues: config.autoCreateIssues !== false,
      minSeverityForIssues: config.minSeverityForIssues || 'error' // error, critical
    };

    // Initialize notification providers
    this.initializeProviders();

    this.log('Notification Manager initialized', { 
      slack: this.config.slack.enabled,
      discord: this.config.discord.enabled,
      sms: this.config.sms.enabled,
      email: this.config.email.enabled,
      github: this.config.github.enabled
    });
  }

  /**
   * Initialize notification providers
   */
  async initializeProviders() {
    if (this.config.sms.enabled && this.config.sms.provider === 'twilio') {
      try {
        const twilio = require('twilio');
        this.twilioClient = twilio(this.config.sms.accountSid, this.config.sms.authToken);
        this.log('Twilio SMS client initialized');
      } catch (error) {
        this.log('Failed to initialize Twilio client', { error: error.message });
        this.config.sms.enabled = false;
      }
    }

    if (this.config.email.enabled) {
      try {
        const nodemailer = require('nodemailer');
        this.emailTransporter = nodemailer.createTransporter({
          host: this.config.email.smtpHost,
          port: this.config.email.smtpPort,
          secure: this.config.email.smtpPort === 465,
          auth: {
            user: this.config.email.smtpUser,
            pass: this.config.email.smtpPass
          }
        });
        this.log('Email transporter initialized');
      } catch (error) {
        this.log('Failed to initialize email transporter', { error: error.message });
        this.config.email.enabled = false;
      }
    }
  }

  /**
   * Send notification to all configured channels
   */
  async sendNotification(alert) {
    const normalizedAlert = this.normalizeAlert(alert);
    
    // Check rate limiting
    if (!this.checkRateLimit(normalizedAlert)) {
      this.log('Alert rate limited', { type: normalizedAlert.type, level: normalizedAlert.level });
      return false;
    }

    const results = {
      sent: [],
      failed: [],
      total: 0
    };

    // Send to Slack
    if (this.config.slack.enabled) {
      try {
        await this.sendSlackNotification(normalizedAlert);
        results.sent.push('slack');
      } catch (error) {
        results.failed.push({ channel: 'slack', error: error.message });
      }
      results.total++;
    }

    // Send to Discord
    if (this.config.discord.enabled) {
      try {
        await this.sendDiscordNotification(normalizedAlert);
        results.sent.push('discord');
      } catch (error) {
        results.failed.push({ channel: 'discord', error: error.message });
      }
      results.total++;
    }

    // Send SMS for critical alerts
    if (this.config.sms.enabled && normalizedAlert.level === 'critical' && normalizedAlert.phoneNumbers) {
      try {
        await this.sendSMSNotification(normalizedAlert);
        results.sent.push('sms');
      } catch (error) {
        results.failed.push({ channel: 'sms', error: error.message });
      }
      results.total++;
    }

    // Send email
    if (this.config.email.enabled && normalizedAlert.emailAddresses) {
      try {
        await this.sendEmailNotification(normalizedAlert);
        results.sent.push('email');
      } catch (error) {
        results.failed.push({ channel: 'email', error: error.message });
      }
      results.total++;
    }

    // Create GitHub issue for critical errors
    if (this.config.github.enabled && this.config.github.autoCreateIssues) {
      const shouldCreateIssue = this.shouldCreateGitHubIssue(normalizedAlert);
      if (shouldCreateIssue) {
        try {
          await this.createGitHubIssue(normalizedAlert);
          results.sent.push('github');
        } catch (error) {
          results.failed.push({ channel: 'github', error: error.message });
        }
        results.total++;
      }
    }

    // Record metrics
    this.recordNotificationMetrics(normalizedAlert, results);

    this.log('Notification sent', { 
      type: normalizedAlert.type,
      level: normalizedAlert.level,
      results
    });

    return results;
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(alert) {
    const slackPayload = {
      channel: this.config.slack.channel,
      username: this.config.slack.username,
      icon_emoji: this.config.slack.emoji,
      attachments: [
        {
          color: this.config.alertLevels[alert.level]?.color || '#36a64f',
          title: `🚨 ${alert.title}`,
          text: alert.description,
          fields: [
            {
              title: 'Level',
              value: alert.level.toUpperCase(),
              short: true
            },
            {
              title: 'Type',
              value: alert.type,
              short: true
            },
            {
              title: 'Timestamp',
              value: alert.timestamp,
              short: true
            }
          ],
          footer: 'AAITI Trading System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    // Add additional fields if provided
    if (alert.fields) {
      slackPayload.attachments[0].fields.push(...alert.fields);
    }

    // Add actions for critical alerts
    if (alert.level === 'critical') {
      slackPayload.attachments[0].actions = [
        {
          type: 'button',
          text: 'View Dashboard',
          url: alert.dashboardUrl || 'http://localhost:3000'
        },
        {
          type: 'button',
          text: 'Acknowledge',
          name: 'acknowledge',
          value: alert.id || 'unknown'
        }
      ];
    }

    const response = await axios.post(this.config.slack.webhookUrl, slackPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status !== 200) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Discord notification
   */
  async sendDiscordNotification(alert) {
    const discordPayload = {
      username: this.config.discord.username,
      avatar_url: this.config.discord.avatarUrl,
      embeds: [
        {
          title: `🚨 ${alert.title}`,
          description: alert.description,
          color: parseInt(this.config.alertLevels[alert.level]?.color.replace('#', ''), 16) || 0x36a64f,
          fields: [
            {
              name: 'Level',
              value: alert.level.toUpperCase(),
              inline: true
            },
            {
              name: 'Type',
              value: alert.type,
              inline: true
            },
            {
              name: 'Timestamp',
              value: alert.timestamp,
              inline: true
            }
          ],
          footer: {
            text: 'AAITI Trading System'
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    // Add additional fields if provided
    if (alert.fields) {
      discordPayload.embeds[0].fields.push(...alert.fields.map(field => ({
        name: field.title,
        value: field.value,
        inline: field.short || false
      })));
    }

    const response = await axios.post(this.config.discord.webhookUrl, discordPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status !== 204) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(alert) {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    const message = `🚨 AAITI ALERT\n${alert.title}\n${alert.description}\nLevel: ${alert.level.toUpperCase()}\nTime: ${alert.timestamp}`;

    const promises = alert.phoneNumbers.map(async (phoneNumber) => {
      return this.twilioClient.messages.create({
        body: message,
        from: this.config.sms.fromNumber,
        to: phoneNumber
      });
    });

    await Promise.all(promises);
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(alert) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized');
    }

    const emailHtml = this.generateEmailHTML(alert);
    
    const mailOptions = {
      from: this.config.email.fromEmail,
      to: alert.emailAddresses.join(', '),
      subject: `🚨 AAITI Alert: ${alert.title}`,
      html: emailHtml,
      text: `AAITI ALERT\n${alert.title}\n${alert.description}\nLevel: ${alert.level.toUpperCase()}\nTimestamp: ${alert.timestamp}`
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  /**
   * Generate HTML email template
   */
  generateEmailHTML(alert) {
    const levelColor = this.config.alertLevels[alert.level]?.color || '#36a64f';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: ${levelColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: bold; color: #333; }
          .field-value { color: #666; margin-top: 5px; }
          .footer { background-color: #f8f9fa; padding: 15px; text-align: center; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 AAITI Alert</h1>
            <h2>${alert.title}</h2>
          </div>
          <div class="content">
            <div class="field">
              <div class="field-label">Description:</div>
              <div class="field-value">${alert.description}</div>
            </div>
            <div class="field">
              <div class="field-label">Alert Level:</div>
              <div class="field-value">${alert.level.toUpperCase()}</div>
            </div>
            <div class="field">
              <div class="field-label">Alert Type:</div>
              <div class="field-value">${alert.type}</div>
            </div>
            <div class="field">
              <div class="field-label">Timestamp:</div>
              <div class="field-value">${alert.timestamp}</div>
            </div>
            ${alert.fields ? alert.fields.map(field => `
              <div class="field">
                <div class="field-label">${field.title}:</div>
                <div class="field-value">${field.value}</div>
              </div>
            `).join('') : ''}
          </div>
          <div class="footer">
            AAITI Trading System - Automated Alert
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Normalize alert object
   */
  normalizeAlert(alert) {
    return {
      id: alert.id || `alert_${Date.now()}`,
      title: alert.title || 'AAITI System Alert',
      description: alert.description || 'No description provided',
      level: alert.level || 'info',
      type: alert.type || 'system',
      timestamp: alert.timestamp || new Date().toISOString(),
      fields: alert.fields || [],
      phoneNumbers: alert.phoneNumbers || [],
      emailAddresses: alert.emailAddresses || [],
      dashboardUrl: alert.dashboardUrl
    };
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(alert) {
    if (!this.config.rateLimiting.enabled) {
      return true;
    }

    const now = Date.now();
    const window = this.config.rateLimiting.windowMs;
    const key = `${alert.type}_${alert.level}`;

    // Clean old entries
    for (const [alertKey, timestamps] of this.alertHistory.entries()) {
      this.alertHistory.set(alertKey, timestamps.filter(time => now - time < window));
    }

    // Get current alert count
    const alertTimes = this.alertHistory.get(key) || [];
    
    if (alertTimes.length >= this.config.rateLimiting.maxAlerts) {
      return false;
    }

    // Add current alert
    alertTimes.push(now);
    this.alertHistory.set(key, alertTimes);

    return true;
  }

  /**
   * Record notification metrics
   */
  recordNotificationMetrics(alert, results) {
    // Record sent notifications
    results.sent.forEach(channel => {
      if (this.metrics && this.metrics.recordNotificationSent) {
        this.metrics.recordNotificationSent(channel, alert.type, alert.level);
      }
    });

    // Record failed notifications
    results.failed.forEach(failure => {
      if (this.metrics && this.metrics.recordNotificationFailure) {
        this.metrics.recordNotificationFailure(failure.channel, alert.type, alert.level);
      }
    });
  }

  /**
   * Check if GitHub issue should be created
   */
  shouldCreateGitHubIssue(alert) {
    if (!this.config.github.enabled || !this.config.github.autoCreateIssues) {
      return false;
    }

    const minSeverity = this.config.github.minSeverityForIssues;
    const severityLevels = { info: 1, warning: 2, error: 3, critical: 4 };
    const alertLevel = severityLevels[alert.level] || 1;
    const minLevel = severityLevels[minSeverity] || 3;

    return alertLevel >= minLevel;
  }

  /**
   * Create GitHub issue for alert
   */
  async createGitHubIssue(alert) {
    if (!this.githubReporter) {
      throw new Error('GitHub issue reporter not initialized');
    }

    // Convert alert to error format for GitHub reporter
    const error = new Error(alert.title);
    error.description = alert.description;
    error.type = alert.type;
    error.level = alert.level;

    const context = {
      severity: alert.level,
      type: 'notification_alert',
      alert: {
        id: alert.id,
        type: alert.type,
        timestamp: alert.timestamp,
        fields: alert.fields
      },
      additionalInfo: `Alert Details:\n${JSON.stringify(alert, null, 2)}`
    };

    return await this.githubReporter.reportError(error, context);
  }

  /**
   * Create predefined alert types
   */
  createSystemAlert(title, description, level = 'info') {
    return this.sendNotification({
      title,
      description,
      level,
      type: 'system'
    });
  }

  createTradingAlert(title, description, symbol, side, level = 'info') {
    return this.sendNotification({
      title,
      description,
      level,
      type: 'trading',
      fields: [
        { title: 'Symbol', value: symbol, short: true },
        { title: 'Side', value: side, short: true }
      ]
    });
  }

  createRiskAlert(title, description, riskType, severity = 'warning') {
    return this.sendNotification({
      title,
      description,
      level: severity,
      type: 'risk',
      fields: [
        { title: 'Risk Type', value: riskType, short: true }
      ]
    });
  }

  createPerformanceAlert(title, description, metric, value, threshold) {
    return this.sendNotification({
      title,
      description,
      level: 'warning',
      type: 'performance',
      fields: [
        { title: 'Metric', value: metric, short: true },
        { title: 'Current Value', value: value, short: true },
        { title: 'Threshold', value: threshold, short: true }
      ]
    });
  }

  /**
   * Test all notification channels
   */
  async testNotifications() {
    const testAlert = {
      title: 'AAITI Notification Test',
      description: 'This is a test notification to verify all channels are working correctly.',
      level: 'info',
      type: 'test',
      phoneNumbers: process.env.TEST_PHONE_NUMBERS ? process.env.TEST_PHONE_NUMBERS.split(',') : [],
      emailAddresses: process.env.TEST_EMAIL_ADDRESSES ? process.env.TEST_EMAIL_ADDRESSES.split(',') : []
    };

    return this.sendNotification(testAlert);
  }

  /**
   * Get notification configuration
   */
  getConfig() {
    return {
      ...this.config,
      // Hide sensitive information
      slack: { ...this.config.slack, webhookUrl: this.config.slack.webhookUrl ? '[CONFIGURED]' : '[NOT CONFIGURED]' },
      discord: { ...this.config.discord, webhookUrl: this.config.discord.webhookUrl ? '[CONFIGURED]' : '[NOT CONFIGURED]' },
      sms: { ...this.config.sms, authToken: '[HIDDEN]' },
      email: { ...this.config.email, smtpPass: '[HIDDEN]' }
    };
  }

  /**
   * Log notification operations
   * @private
   */
  log(message, data = {}) {
    if (logger && typeof logger.info === 'function') {
      logger.info(`[Notifications] ${message}`, { service: 'notification-manager', ...data });
    } else {
      console.log(`[Notifications] ${message}`, data);
    }
  }
}

// Create singleton instance
let notificationInstance = null;

/**
 * Get notification manager instance
 * @param {object} config - Notification configuration
 * @returns {NotificationManager} - Notification manager instance
 */
function getNotificationManager(config = {}) {
  if (!notificationInstance) {
    notificationInstance = new NotificationManager(config);
  }
  return notificationInstance;
}

module.exports = {
  NotificationManager,
  getNotificationManager
};