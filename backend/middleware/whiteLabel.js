/**
 * White Label Middleware
 * 
 * Provides middleware for white-label functionality:
 * - Theme injection
 * - Domain resolution
 * - Branding context
 * - Custom CSS loading
 * 
 * @module middleware/whiteLabel
 */

const whiteLabelService = require('../services/whiteLabelService');
const logger = require('../utils/logger');

/**
 * Resolve organization by custom domain
 * Checks if request is from a custom domain and loads org context
 */
async function resolveDomainContext(req, res, next) {
  try {
    const hostname = req.hostname;

    // Skip for localhost and default domains
    const skipDomains = ['localhost', '127.0.0.1', process.env.DEFAULT_DOMAIN];
    if (skipDomains.includes(hostname)) {
      return next();
    }

    // Check if this is a custom domain
    const orgId = await whiteLabelService.getOrganizationByDomain(hostname);

    if (orgId) {
      req.customDomain = hostname;
      req.organizationId = orgId;
      req.resolvedBy = 'custom-domain';
    }

    next();
  } catch (error) {
    logger.error('Error resolving domain context', { error: error.message });
    next(); // Continue even if domain resolution fails
  }
}

/**
 * Inject theme context into request
 * Loads organization theme and attaches to request
 */
async function injectThemeContext(req, res, next) {
  try {
    if (!req.organizationId) {
      return next();
    }

    const theme = await whiteLabelService.getTheme(req.organizationId);

    req.theme = theme;

    next();
  } catch (error) {
    logger.error('Error injecting theme context', { error: error.message });
    next(); // Continue even if theme loading fails
  }
}

/**
 * Inject branding context into request
 * Loads organization branding and attaches to request
 */
async function injectBrandingContext(req, res, next) {
  try {
    if (!req.organizationId) {
      return next();
    }

    const branding = await whiteLabelService.getBranding(req.organizationId);

    req.branding = branding;

    next();
  } catch (error) {
    logger.error('Error injecting branding context', { error: error.message });
    next(); // Continue even if branding loading fails
  }
}

/**
 * Inject complete white-label context (theme + branding)
 */
async function injectWhiteLabelContext(req, res, next) {
  try {
    if (!req.organizationId) {
      return next();
    }

    const [theme, branding] = await Promise.all([
      whiteLabelService.getTheme(req.organizationId),
      whiteLabelService.getBranding(req.organizationId)
    ]);

    req.whiteLabel = {
      theme,
      branding,
      organizationId: req.organizationId,
      customDomain: req.customDomain
    };

    next();
  } catch (error) {
    logger.error('Error injecting white-label context', { error: error.message });
    next(); // Continue even if loading fails
  }
}

/**
 * Generate and inject theme CSS into HTML responses
 * Automatically adds <style> tag with CSS variables
 */
function injectThemeCSS(req, res, next) {
  const originalSend = res.send;

  res.send = function (data) {
    if (req.theme && typeof data === 'string' && data.includes('</head>')) {
      const css = whiteLabelService.generateCSSVariables(req.theme);
      const styleTag = `<style id="white-label-theme">${css}</style>`;
      
      data = data.replace('</head>', `${styleTag}\n</head>`);
    }

    originalSend.call(this, data);
  };

  next();
}

/**
 * Add theme headers to response
 * Useful for SPA/API clients to access theme
 */
function addThemeHeaders(req, res, next) {
  if (req.theme) {
    res.setHeader('X-Theme-Primary-Color', req.theme.colors?.primary || '#1976d2');
    res.setHeader('X-Theme-Secondary-Color', req.theme.colors?.secondary || '#424242');
    res.setHeader('X-Theme-Font-Family', req.theme.typography?.fontFamily || 'Roboto, sans-serif');
  }

  if (req.branding) {
    res.setHeader('X-Branding-Company-Name', req.branding.companyName || 'A.A.I.T.I');
    res.setHeader('X-Branding-Logo-Url', req.branding.logoUrl || '');
  }

  next();
}

/**
 * Validate theme preview token
 * Used for temporary theme previews
 */
async function validatePreviewToken(req, res, next) {
  try {
    const { previewToken } = req.query;

    if (!previewToken) {
      return res.status(400).json({
        success: false,
        error: 'Preview token required'
      });
    }

    const preview = await whiteLabelService.getPreview(previewToken);

    if (!preview) {
      return res.status(404).json({
        success: false,
        error: 'Preview not found or expired'
      });
    }

    req.previewTheme = preview.theme;
    req.organizationId = preview.organizationId;

    next();
  } catch (error) {
    logger.error('Error validating preview token', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Apply preview theme instead of active theme
 */
async function applyPreviewTheme(req, res, next) {
  try {
    const { previewToken } = req.query;

    if (previewToken) {
      const preview = await whiteLabelService.getPreview(previewToken);

      if (preview) {
        req.theme = preview.theme;
        req.isPreview = true;
      }
    }

    next();
  } catch (error) {
    logger.error('Error applying preview theme', { error: error.message });
    next(); // Continue with regular theme
  }
}

/**
 * Check if white-label features are enabled for organization
 */
async function checkWhiteLabelEnabled(req, res, next) {
  try {
    if (!req.organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization context required'
      });
    }

    const isEnabled = await whiteLabelService.isWhiteLabelEnabled(req.organizationId);

    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: 'White-label features not enabled for this organization'
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking white-label status', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get theme CSS for organization
 * Utility function to generate CSS from theme
 */
function getThemeCSS(organizationId) {
  return async (req, res) => {
    try {
      const theme = await whiteLabelService.getTheme(organizationId);
      const css = whiteLabelService.generateCSSVariables(theme);

      res.type('text/css').send(css);
    } catch (error) {
      logger.error('Error generating theme CSS', { error: error.message });
      res.status(500).send('/* Error loading theme */');
    }
  };
}

/**
 * Customize email template with branding
 * Replaces variables in email templates
 */
async function customizeEmailTemplate(organizationId, templateName, variables = {}) {
  try {
    const branding = await whiteLabelService.getBranding(organizationId);
    const template = await whiteLabelService.renderEmailTemplate(
      organizationId,
      templateName,
      {
        ...variables,
        companyName: branding.companyName,
        logoUrl: branding.logoUrl,
        supportEmail: branding.supportEmail,
        termsUrl: branding.termsUrl,
        privacyUrl: branding.privacyUrl
      }
    );

    return template;
  } catch (error) {
    logger.error('Error customizing email template', { error: error.message });
    throw error;
  }
}

/**
 * Middleware to attach email customizer to request
 */
function attachEmailCustomizer(req, res, next) {
  req.customizeEmail = async (templateName, variables) => {
    if (!req.organizationId) {
      throw new Error('Organization context required for email customization');
    }

    return customizeEmailTemplate(req.organizationId, templateName, variables);
  };

  next();
}

module.exports = {
  resolveDomainContext,
  injectThemeContext,
  injectBrandingContext,
  injectWhiteLabelContext,
  injectThemeCSS,
  addThemeHeaders,
  validatePreviewToken,
  applyPreviewTheme,
  checkWhiteLabelEnabled,
  getThemeCSS,
  customizeEmailTemplate,
  attachEmailCustomizer
};
