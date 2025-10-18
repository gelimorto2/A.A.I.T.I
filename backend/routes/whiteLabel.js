/**
 * White Label API Routes
 * 
 * Provides REST API endpoints for white-label customization:
 * - Branding management
 * - Theme customization
 * - Asset uploads
 * - Email templates
 * - Custom domains
 * - Internationalization
 * 
 * @module routes/whiteLabel
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const whiteLabelService = require('../services/whiteLabelService');
const { authenticateToken } = require('../middleware/auth');
const {
  resolveTenantContext,
  requireTenant,
  requireAdmin
} = require('../middleware/multiTenant');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Apply authentication and tenant context
router.use(authenticateToken);
router.use(resolveTenantContext);

/**
 * @route GET /api/white-label/branding
 * @desc Get organization branding
 * @access Organization Member
 */
router.get('/branding', requireTenant, async (req, res) => {
  try {
    const branding = await whiteLabelService.getBranding(req.organizationId);

    res.json({
      success: true,
      data: branding
    });
  } catch (error) {
    logger.error('Error fetching branding', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/white-label/branding
 * @desc Update organization branding
 * @access Organization Admin
 */
router.put('/branding', requireTenant, requireAdmin, async (req, res) => {
  try {
    const branding = await whiteLabelService.updateBranding(
      req.organizationId,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      data: branding
    });
  } catch (error) {
    logger.error('Error updating branding', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/white-label/branding/reset
 * @desc Reset branding to defaults
 * @access Organization Admin
 */
router.post('/branding/reset', requireTenant, requireAdmin, async (req, res) => {
  try {
    const branding = await whiteLabelService.resetBranding(
      req.organizationId,
      req.user.id
    );

    res.json({
      success: true,
      data: branding,
      message: 'Branding reset to defaults'
    });
  } catch (error) {
    logger.error('Error resetting branding', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/white-label/theme
 * @desc Get organization theme
 * @access Organization Member
 */
router.get('/theme', requireTenant, async (req, res) => {
  try {
    const theme = await whiteLabelService.getTheme(req.organizationId);

    res.json({
      success: true,
      data: theme
    });
  } catch (error) {
    logger.error('Error fetching theme', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/white-label/theme
 * @desc Update organization theme
 * @access Organization Admin
 */
router.put('/theme', requireTenant, requireAdmin, async (req, res) => {
  try {
    const theme = await whiteLabelService.updateTheme(
      req.organizationId,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      data: theme
    });
  } catch (error) {
    logger.error('Error updating theme', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/white-label/theme/reset
 * @desc Reset theme to defaults
 * @access Organization Admin
 */
router.post('/theme/reset', requireTenant, requireAdmin, async (req, res) => {
  try {
    const theme = await whiteLabelService.resetTheme(
      req.organizationId,
      req.user.id
    );

    res.json({
      success: true,
      data: theme,
      message: 'Theme reset to defaults'
    });
  } catch (error) {
    logger.error('Error resetting theme', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/white-label/theme/css
 * @desc Get theme as CSS variables
 * @access Organization Member
 */
router.get('/theme/css', requireTenant, async (req, res) => {
  try {
    const theme = await whiteLabelService.getTheme(req.organizationId);
    const css = whiteLabelService.generateCSSVariables(theme);

    res.type('text/css').send(css);
  } catch (error) {
    logger.error('Error generating CSS', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/white-label/theme/preview
 * @desc Generate theme preview
 * @access Organization Admin
 */
router.post('/theme/preview', requireTenant, requireAdmin, async (req, res) => {
  try {
    const preview = await whiteLabelService.generateThemePreview(
      req.organizationId,
      req.body
    );

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    logger.error('Error generating preview', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/white-label/theme/export
 * @desc Export theme as JSON
 * @access Organization Admin
 */
router.post('/theme/export', requireTenant, requireAdmin, async (req, res) => {
  try {
    const themeData = await whiteLabelService.exportTheme(req.organizationId);

    res.json({
      success: true,
      data: themeData
    });
  } catch (error) {
    logger.error('Error exporting theme', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/white-label/theme/import
 * @desc Import theme from JSON
 * @access Organization Admin
 */
router.post('/theme/import', requireTenant, requireAdmin, async (req, res) => {
  try {
    const result = await whiteLabelService.importTheme(
      req.organizationId,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      data: result,
      message: 'Theme imported successfully'
    });
  } catch (error) {
    logger.error('Error importing theme', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/white-label/assets/upload
 * @desc Upload brand asset (logo, favicon, etc.)
 * @access Organization Admin
 */
router.post('/assets/upload', 
  requireTenant, 
  requireAdmin, 
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      const { assetType } = req.body;

      if (!assetType) {
        return res.status(400).json({
          success: false,
          error: 'assetType is required (logo, favicon, banner, etc.)'
        });
      }

      const result = await whiteLabelService.uploadAsset(
        req.organizationId,
        req.file,
        assetType,
        req.user.id
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error uploading asset', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/white-label/email-templates
 * @desc Get email templates
 * @access Organization Admin
 */
router.get('/email-templates', requireTenant, requireAdmin, async (req, res) => {
  try {
    const templates = await whiteLabelService.getEmailTemplates(req.organizationId);

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Error fetching email templates', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/white-label/email-templates/:name
 * @desc Update email template
 * @access Organization Admin
 */
router.put('/email-templates/:name', requireTenant, requireAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Template content is required'
      });
    }

    const result = await whiteLabelService.updateEmailTemplate(
      req.organizationId,
      name,
      content,
      req.user.id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error updating email template', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/white-label/domain
 * @desc Get custom domain configuration
 * @access Organization Admin
 */
router.get('/domain', requireTenant, requireAdmin, async (req, res) => {
  try {
    const domainConfig = await whiteLabelService.getCustomDomain(req.organizationId);

    res.json({
      success: true,
      data: domainConfig
    });
  } catch (error) {
    logger.error('Error fetching domain config', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/white-label/domain
 * @desc Update custom domain
 * @access Organization Admin
 */
router.put('/domain', requireTenant, requireAdmin, async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required'
      });
    }

    const result = await whiteLabelService.updateCustomDomain(
      req.organizationId,
      domain,
      req.user.id
    );

    res.json({
      success: true,
      data: result,
      message: 'Domain updated. SSL configuration pending.'
    });
  } catch (error) {
    logger.error('Error updating domain', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/white-label/i18n
 * @desc Get internationalization settings
 * @access Organization Admin
 */
router.get('/i18n', requireTenant, requireAdmin, async (req, res) => {
  try {
    const i18nSettings = await whiteLabelService.getI18nSettings(req.organizationId);

    res.json({
      success: true,
      data: i18nSettings
    });
  } catch (error) {
    logger.error('Error fetching i18n settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/white-label/i18n
 * @desc Update internationalization settings
 * @access Organization Admin
 */
router.put('/i18n', requireTenant, requireAdmin, async (req, res) => {
  try {
    const result = await whiteLabelService.updateI18nSettings(
      req.organizationId,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error updating i18n settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/white-label/public/:domain
 * @desc Get public branding by domain (no auth required)
 * @access Public
 */
router.get('/public/:domain', async (req, res) => {
  try {
    const { domain } = req.params;

    const branding = await whiteLabelService.getBrandingByDomain(domain);

    if (!branding) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: branding
    });
  } catch (error) {
    logger.error('Error fetching public branding', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
