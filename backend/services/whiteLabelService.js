/**
 * White Label Branding Service
 * 
 * Manages white-label branding and customization for tenant organizations:
 * - Brand assets (logos, favicons, images)
 * - Color schemes and themes
 * - Typography settings
 * - Custom CSS variables
 * - Email templates
 * - Multi-language support
 * 
 * @module services/whiteLabelService
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const db = require('../config/database');
const multiTenantService = require('./multiTenantService');

class WhiteLabelService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads/branding';
    this.allowedImageTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    
    this.defaultTheme = {
      // Primary colors
      primaryColor: '#0066CC',
      primaryColorLight: '#3385D6',
      primaryColorDark: '#004C99',
      
      // Secondary colors
      secondaryColor: '#6C757D',
      accentColor: '#28A745',
      
      // Background colors
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F8F9FA',
      cardColor: '#FFFFFF',
      
      // Text colors
      textPrimary: '#212529',
      textSecondary: '#6C757D',
      textDisabled: '#ADB5BD',
      
      // Status colors
      successColor: '#28A745',
      warningColor: '#FFC107',
      errorColor: '#DC3545',
      infoColor: '#17A2B8',
      
      // Border and divider
      borderColor: '#DEE2E6',
      dividerColor: '#E9ECEF',
      
      // Shadows
      shadowSmall: '0 2px 4px rgba(0,0,0,0.1)',
      shadowMedium: '0 4px 8px rgba(0,0,0,0.1)',
      shadowLarge: '0 8px 16px rgba(0,0,0,0.1)',
      
      // Typography
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSizeBase: '16px',
      fontSizeSmall: '14px',
      fontSizeLarge: '18px',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '700',
      
      // Spacing
      spacingUnit: '8px',
      borderRadius: '4px',
      
      // Layout
      containerMaxWidth: '1200px',
      sidebarWidth: '250px',
      headerHeight: '64px'
    };

    this.defaultBranding = {
      companyName: 'Trading Platform',
      tagline: 'Advanced AI-Powered Trading',
      logoUrl: '/assets/default-logo.svg',
      faviconUrl: '/assets/default-favicon.ico',
      supportEmail: 'support@example.com',
      termsUrl: '/terms',
      privacyUrl: '/privacy',
      socialLinks: {
        twitter: '',
        linkedin: '',
        facebook: ''
      }
    };
  }

  /**
   * Get organization branding
   */
  async getBranding(organizationId) {
    const branding = await db('tenant_configurations')
      .where({ organization_id: organizationId })
      .where('config_key', 'like', 'branding_%')
      .select('config_key', 'config_value', 'config_type');

    const brandingObj = { ...this.defaultBranding };

    branding.forEach(item => {
      const key = item.config_key.replace('branding_', '');
      let value = item.config_value;

      if (item.config_type === 'json') {
        value = JSON.parse(value);
      }

      brandingObj[key] = value;
    });

    return brandingObj;
  }

  /**
   * Update organization branding
   */
  async updateBranding(organizationId, branding, userId) {
    const allowedKeys = [
      'companyName', 'tagline', 'logoUrl', 'faviconUrl',
      'supportEmail', 'termsUrl', 'privacyUrl', 'socialLinks'
    ];

    for (const [key, value] of Object.entries(branding)) {
      if (allowedKeys.includes(key)) {
        const configKey = `branding_${key}`;
        const configType = typeof value === 'object' ? 'json' : 'string';

        await multiTenantService.setConfig(
          organizationId,
          configKey,
          value,
          configType
        );
      }
    }

    await this.logBrandingActivity(organizationId, userId, 'branding_updated', branding);

    logger.info('Branding updated', { organizationId, userId });

    return await this.getBranding(organizationId);
  }

  /**
   * Get organization theme
   */
  async getTheme(organizationId) {
    const theme = await db('tenant_configurations')
      .where({ organization_id: organizationId })
      .where('config_key', 'like', 'theme_%')
      .select('config_key', 'config_value');

    const themeObj = { ...this.defaultTheme };

    theme.forEach(item => {
      const key = item.config_key.replace('theme_', '');
      themeObj[key] = item.config_value;
    });

    return themeObj;
  }

  /**
   * Update organization theme
   */
  async updateTheme(organizationId, theme, userId) {
    for (const [key, value] of Object.entries(theme)) {
      if (this.defaultTheme.hasOwnProperty(key)) {
        await multiTenantService.setConfig(
          organizationId,
          `theme_${key}`,
          value,
          'string'
        );
      }
    }

    await this.logBrandingActivity(organizationId, userId, 'theme_updated', theme);

    logger.info('Theme updated', { organizationId, userId });

    return await this.getTheme(organizationId);
  }

  /**
   * Generate CSS variables from theme
   */
  generateCSSVariables(theme) {
    const cssVars = [];

    for (const [key, value] of Object.entries(theme)) {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      cssVars.push(`  --${cssKey}: ${value};`);
    }

    return `:root {\n${cssVars.join('\n')}\n}`;
  }

  /**
   * Upload brand asset (logo, favicon, etc.)
   */
  async uploadAsset(organizationId, file, assetType, userId) {
    // Validate file
    if (!this.allowedImageTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Allowed: PNG, JPEG, SVG, WebP');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`File too large. Max size: ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${organizationId}_${assetType}_${Date.now()}${ext}`;
    const filepath = path.join(this.uploadPath, filename);

    // Ensure upload directory exists
    await fs.mkdir(this.uploadPath, { recursive: true });

    // Save file
    await fs.writeFile(filepath, file.buffer);

    // Generate URL
    const assetUrl = `/uploads/branding/${filename}`;

    // Update branding configuration
    await multiTenantService.setConfig(
      organizationId,
      `branding_${assetType}Url`,
      assetUrl,
      'string'
    );

    await this.logBrandingActivity(organizationId, userId, 'asset_uploaded', {
      assetType,
      filename,
      url: assetUrl
    });

    logger.info('Asset uploaded', { organizationId, assetType, filename });

    return { url: assetUrl, filename };
  }

  /**
   * Get email templates for organization
   */
  async getEmailTemplates(organizationId) {
    const templates = await db('tenant_configurations')
      .where({ organization_id: organizationId })
      .where('config_key', 'like', 'email_template_%')
      .select('config_key', 'config_value');

    const templatesObj = {};

    templates.forEach(item => {
      const key = item.config_key.replace('email_template_', '');
      templatesObj[key] = item.config_value;
    });

    return templatesObj;
  }

  /**
   * Update email template
   */
  async updateEmailTemplate(organizationId, templateName, templateContent, userId) {
    await multiTenantService.setConfig(
      organizationId,
      `email_template_${templateName}`,
      templateContent,
      'string'
    );

    await this.logBrandingActivity(organizationId, userId, 'email_template_updated', {
      templateName
    });

    return { templateName, content: templateContent };
  }

  /**
   * Render email template with variables
   */
  renderEmailTemplate(template, variables) {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value);
    }

    return rendered;
  }

  /**
   * Get custom domain configuration
   */
  async getCustomDomain(organizationId) {
    const org = await db('organizations')
      .where({ id: organizationId })
      .first();

    return {
      domain: org.domain,
      sslEnabled: org.ssl_enabled || false,
      sslStatus: org.ssl_status || 'pending'
    };
  }

  /**
   * Update custom domain
   */
  async updateCustomDomain(organizationId, domain, userId) {
    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      throw new Error('Invalid domain format');
    }

    // Check if domain already in use
    const existing = await db('organizations')
      .where({ domain })
      .whereNot({ id: organizationId })
      .first();

    if (existing) {
      throw new Error('Domain already in use');
    }

    await db('organizations')
      .where({ id: organizationId })
      .update({
        domain,
        ssl_status: 'pending',
        updated_at: new Date()
      });

    await this.logBrandingActivity(organizationId, userId, 'domain_updated', { domain });

    logger.info('Custom domain updated', { organizationId, domain });

    return { domain, sslStatus: 'pending' };
  }

  /**
   * Get internationalization settings
   */
  async getI18nSettings(organizationId) {
    const defaultLanguage = await multiTenantService.getConfig(
      organizationId,
      'i18n_default_language',
      'en'
    );

    const enabledLanguages = await multiTenantService.getConfig(
      organizationId,
      'i18n_enabled_languages',
      ['en']
    );

    return {
      defaultLanguage,
      enabledLanguages: Array.isArray(enabledLanguages) ? enabledLanguages : [enabledLanguages]
    };
  }

  /**
   * Update internationalization settings
   */
  async updateI18nSettings(organizationId, settings, userId) {
    if (settings.defaultLanguage) {
      await multiTenantService.setConfig(
        organizationId,
        'i18n_default_language',
        settings.defaultLanguage,
        'string'
      );
    }

    if (settings.enabledLanguages) {
      await multiTenantService.setConfig(
        organizationId,
        'i18n_enabled_languages',
        settings.enabledLanguages,
        'json'
      );
    }

    await this.logBrandingActivity(organizationId, userId, 'i18n_updated', settings);

    return await this.getI18nSettings(organizationId);
  }

  /**
   * Export theme as JSON
   */
  async exportTheme(organizationId) {
    const theme = await this.getTheme(organizationId);
    const branding = await this.getBranding(organizationId);

    return {
      theme,
      branding,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Import theme from JSON
   */
  async importTheme(organizationId, themeData, userId) {
    if (themeData.theme) {
      await this.updateTheme(organizationId, themeData.theme, userId);
    }

    if (themeData.branding) {
      await this.updateBranding(organizationId, themeData.branding, userId);
    }

    await this.logBrandingActivity(organizationId, userId, 'theme_imported', {
      version: themeData.version
    });

    return {
      theme: await this.getTheme(organizationId),
      branding: await this.getBranding(organizationId)
    };
  }

  /**
   * Preview theme (generate preview URL)
   */
  async generateThemePreview(organizationId, theme) {
    const previewId = crypto.randomBytes(16).toString('hex');
    const previewData = {
      organizationId,
      theme,
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    };

    // Store preview data (in cache or temp storage)
    await multiTenantService.setConfig(
      organizationId,
      `theme_preview_${previewId}`,
      previewData,
      'json'
    );

    return {
      previewId,
      previewUrl: `/preview/${previewId}`,
      expiresAt: previewData.expiresAt
    };
  }

  /**
   * Get theme preview data
   */
  async getThemePreview(previewId, organizationId) {
    const previewData = await multiTenantService.getConfig(
      organizationId,
      `theme_preview_${previewId}`
    );

    if (!previewData) {
      throw new Error('Preview not found or expired');
    }

    if (new Date(previewData.expiresAt) < new Date()) {
      throw new Error('Preview expired');
    }

    return previewData;
  }

  /**
   * Reset to default theme
   */
  async resetTheme(organizationId, userId) {
    // Delete all theme configurations
    await db('tenant_configurations')
      .where({ organization_id: organizationId })
      .where('config_key', 'like', 'theme_%')
      .delete();

    await this.logBrandingActivity(organizationId, userId, 'theme_reset', {});

    return this.defaultTheme;
  }

  /**
   * Reset to default branding
   */
  async resetBranding(organizationId, userId) {
    // Delete all branding configurations
    await db('tenant_configurations')
      .where({ organization_id: organizationId })
      .where('config_key', 'like', 'branding_%')
      .delete();

    await this.logBrandingActivity(organizationId, userId, 'branding_reset', {});

    return this.defaultBranding;
  }

  /**
   * Log branding activity
   */
  async logBrandingActivity(organizationId, userId, action, changes) {
    await db('organization_activity_logs').insert({
      organization_id: organizationId,
      user_id: userId,
      action,
      resource_type: 'branding',
      changes: JSON.stringify(changes)
    });
  }

  /**
   * Validate color format
   */
  isValidColor(color) {
    // Hex color
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return true;
    }

    // RGB/RGBA
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
      return true;
    }

    return false;
  }

  /**
   * Get branding for subdomain/domain
   */
  async getBrandingByDomain(domain) {
    const org = await db('organizations')
      .where({ domain })
      .orWhere('slug', domain.split('.')[0])
      .whereNull('deleted_at')
      .first();

    if (!org) {
      return null;
    }

    return {
      organizationId: org.id,
      theme: await this.getTheme(org.id),
      branding: await this.getBranding(org.id)
    };
  }

  /**
   * Get organization ID by custom domain
   */
  async getOrganizationByDomain(domain) {
    const config = await multiTenantService.getConfig('custom_domain');

    if (config && config.domain === domain) {
      return config.organizationId;
    }

    return null;
  }

  /**
   * Get custom domain configuration
   */
  async getCustomDomain(organizationId) {
    return await multiTenantService.getConfig(organizationId, 'custom_domain');
  }

  /**
   * Get preview by token
   */
  async getPreview(previewToken) {
    const preview = await multiTenantService.getConfig(`preview_${previewToken}`);

    if (!preview) {
      return null;
    }

    // Check expiration
    if (new Date(preview.expiresAt) < new Date()) {
      // Delete expired preview
      await multiTenantService.deleteConfig(`preview_${previewToken}`);
      return null;
    }

    return preview;
  }

  /**
   * Check if white-label features are enabled
   */
  async isWhiteLabelEnabled(organizationId) {
    const org = await db('organizations')
      .where({ id: organizationId })
      .whereNull('deleted_at')
      .first();

    if (!org) {
      return false;
    }

    // Check if organization plan includes white-label
    const plansWithWhiteLabel = ['professional', 'enterprise'];
    return plansWithWhiteLabel.includes(org.plan_type);
  }

  /**
   * Render email template with variables
   */
  async renderEmailTemplate(organizationId, templateName, variables = {}) {
    const templates = await this.getEmailTemplates(organizationId);
    let template = templates[templateName];

    if (!template) {
      // Fallback to default template
      template = this.getDefaultEmailTemplate(templateName);
    }

    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    // Replace variables
    return template.replace(/{{(\w+)}}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Get default email template
   */
  getDefaultEmailTemplate(templateName) {
    const defaultTemplates = {
      welcome: `
        <h1>Welcome to {{companyName}}</h1>
        <p>Dear {{userName}},</p>
        <p>Thank you for joining {{companyName}}!</p>
        <p>Best regards,<br>The {{companyName}} Team</p>
        <p><a href="{{supportEmail}}">Contact Support</a></p>
      `,
      passwordReset: `
        <h1>Password Reset Request</h1>
        <p>Dear {{userName}},</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{{resetLink}}">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The {{companyName}} Team</p>
      `,
      invitation: `
        <h1>You're Invited to {{companyName}}</h1>
        <p>Dear {{userName}},</p>
        <p>You've been invited to join {{organizationName}} on {{companyName}}.</p>
        <p><a href="{{inviteLink}}">Accept Invitation</a></p>
        <p>Best regards,<br>The {{companyName}} Team</p>
      `
    };

    return defaultTemplates[templateName];
  }
}

module.exports = new WhiteLabelService();
