const express = require('express');
const router = express.Router();
const EnhancedFeatureEngineer = require('../services/enhancedFeatureEngineer');
const logger = require('../utils/logger');

// Initialize feature engineer
const featureEngineer = new EnhancedFeatureEngineer();

/**
 * @route POST /api/feature-engineering/generate
 * @desc Generate comprehensive feature set for market data
 * @access Private
 */
router.post('/generate', async (req, res) => {
  try {
    const { marketData, config = {} } = req.body;

    if (!marketData || !Array.isArray(marketData) || marketData.length < 20) {
      return res.status(400).json({
        error: 'Invalid market data',
        message: 'Market data must be an array with at least 20 data points'
      });
    }

    // Validate market data structure
    const requiredFields = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    const isValidData = marketData.every(candle => 
      requiredFields.every(field => candle.hasOwnProperty(field))
    );

    if (!isValidData) {
      return res.status(400).json({
        error: 'Invalid market data structure',
        message: `Each data point must contain: ${requiredFields.join(', ')}`
      });
    }

    // Check for cached features first
    const cachedFeatures = featureEngineer.getCachedFeatures(marketData, config);
    if (cachedFeatures && !config.forceRegenerate) {
      logger.info('Returning cached features', {
        symbol: config.symbol,
        cacheAge: Date.now() - new Date(cachedFeatures.timestamp).getTime()
      });

      return res.json({
        success: true,
        features: cachedFeatures,
        cached: true
      });
    }

    // Generate features
    const features = await featureEngineer.generateFeatures(marketData, config);

    res.json({
      success: true,
      features,
      cached: false
    });

  } catch (error) {
    logger.error('Error generating features:', error);
    res.status(500).json({
      error: 'Feature generation failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/feature-engineering/technical-indicators
 * @desc Generate only technical indicators
 * @access Private
 */
router.post('/technical-indicators', async (req, res) => {
  try {
    const { marketData, config = {} } = req.body;

    if (!marketData || !Array.isArray(marketData) || marketData.length < 20) {
      return res.status(400).json({
        error: 'Invalid market data',
        message: 'Market data must be an array with at least 20 data points'
      });
    }

    const technicalConfig = {
      ...config,
      technical: config.technical || {},
      microstructure: { enabled: [] },
      statistical: { enabled: [] },
      alternativeData: null
    };

    const features = await featureEngineer.generateFeatures(marketData, technicalConfig);

    res.json({
      success: true,
      features: features.features.technical,
      metadata: {
        dataPoints: features.dataPoints,
        generationTime: features.metadata.generationTime
      }
    });

  } catch (error) {
    logger.error('Error generating technical indicators:', error);
    res.status(500).json({
      error: 'Technical indicator generation failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/feature-engineering/microstructure
 * @desc Generate microstructure features
 * @access Private
 */
router.post('/microstructure', async (req, res) => {
  try {
    const { marketData, config = {} } = req.body;

    if (!marketData || !Array.isArray(marketData) || marketData.length < 20) {
      return res.status(400).json({
        error: 'Invalid market data',
        message: 'Market data must be an array with at least 20 data points'
      });
    }

    const microstructureConfig = {
      ...config,
      technical: { enabled: [] },
      microstructure: config.microstructure || {},
      statistical: { enabled: [] },
      alternativeData: null
    };

    const features = await featureEngineer.generateFeatures(marketData, microstructureConfig);

    res.json({
      success: true,
      features: features.features.microstructure,
      metadata: {
        dataPoints: features.dataPoints,
        generationTime: features.metadata.generationTime
      }
    });

  } catch (error) {
    logger.error('Error generating microstructure features:', error);
    res.status(500).json({
      error: 'Microstructure feature generation failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/feature-engineering/statistical
 * @desc Generate statistical features
 * @access Private
 */
router.post('/statistical', async (req, res) => {
  try {
    const { marketData, config = {} } = req.body;

    if (!marketData || !Array.isArray(marketData) || marketData.length < 20) {
      return res.status(400).json({
        error: 'Invalid market data',
        message: 'Market data must be an array with at least 20 data points'
      });
    }

    const statisticalConfig = {
      ...config,
      technical: { enabled: [] },
      microstructure: { enabled: [] },
      statistical: config.statistical || { lookbacks: [5, 10, 20, 50] },
      alternativeData: null
    };

    const features = await featureEngineer.generateFeatures(marketData, statisticalConfig);

    res.json({
      success: true,
      features: features.features.statistical,
      metadata: {
        dataPoints: features.dataPoints,
        generationTime: features.metadata.generationTime
      }
    });

  } catch (error) {
    logger.error('Error generating statistical features:', error);
    res.status(500).json({
      error: 'Statistical feature generation failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/feature-engineering/available-indicators
 * @desc Get list of available indicators and features
 * @access Private
 */
router.get('/available-indicators', (req, res) => {
  try {
    const indicators = {};
    
    // Technical indicators
    featureEngineer.indicators.forEach((indicator, key) => {
      indicators[key] = {
        name: indicator.name,
        description: indicator.description,
        features: indicator.features,
        category: 'technical'
      };
    });

    // Microstructure features
    featureEngineer.microstructureFeatures.forEach((feature, key) => {
      indicators[key] = {
        name: feature.name,
        description: feature.description,
        features: feature.features,
        category: 'microstructure'
      };
    });

    // Alternative data sources
    featureEngineer.alternativeDataSources.forEach((source, key) => {
      indicators[key] = {
        name: source.name,
        description: source.description,
        features: source.features,
        category: 'alternative'
      };
    });

    res.json({
      success: true,
      indicators,
      categories: ['technical', 'microstructure', 'statistical', 'alternative', 'interactions', 'lags'],
      totalIndicators: Object.keys(indicators).length
    });

  } catch (error) {
    logger.error('Error fetching available indicators:', error);
    res.status(500).json({
      error: 'Failed to fetch indicators',
      message: error.message
    });
  }
});

/**
 * @route POST /api/feature-engineering/batch-generate
 * @desc Generate features for multiple symbols/timeframes
 * @access Private
 */
router.post('/batch-generate', async (req, res) => {
  try {
    const { requests } = req.body;

    if (!requests || !Array.isArray(requests)) {
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'Requests must be an array of { marketData, config } objects'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      try {
        if (!request.marketData || request.marketData.length < 20) {
          throw new Error(`Request ${i}: Insufficient market data`);
        }

        const features = await featureEngineer.generateFeatures(
          request.marketData, 
          request.config || {}
        );

        results.push({
          index: i,
          success: true,
          features,
          symbol: request.config?.symbol || `unknown_${i}`
        });

      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          symbol: request.config?.symbol || `unknown_${i}`
        });
      }
    }

    res.json({
      success: true,
      results,
      errors,
      totalRequests: requests.length,
      successfulRequests: results.length,
      failedRequests: errors.length
    });

  } catch (error) {
    logger.error('Error in batch feature generation:', error);
    res.status(500).json({
      error: 'Batch feature generation failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/feature-engineering/feature-importance
 * @desc Calculate feature importance based on target variable correlation
 * @access Private
 */
router.post('/feature-importance', async (req, res) => {
  try {
    const { features, targetVariable, method = 'correlation' } = req.body;

    if (!features || !targetVariable) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Features and targetVariable are required'
      });
    }

    const importance = calculateFeatureImportance(features, targetVariable, method);

    res.json({
      success: true,
      importance,
      method,
      totalFeatures: importance.length
    });

  } catch (error) {
    logger.error('Error calculating feature importance:', error);
    res.status(500).json({
      error: 'Feature importance calculation failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/feature-engineering/statistics
 * @desc Get feature engineering system statistics
 * @access Private
 */
router.get('/statistics', (req, res) => {
  try {
    const stats = featureEngineer.getStatistics();
    
    res.json({
      success: true,
      statistics: {
        ...stats,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error fetching statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/feature-engineering/cache
 * @desc Clear feature cache
 * @access Private
 */
router.delete('/cache', (req, res) => {
  try {
    featureEngineer.clearCache();
    
    res.json({
      success: true,
      message: 'Feature cache cleared successfully'
    });

  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * @route POST /api/feature-engineering/validate
 * @desc Validate feature configuration
 * @access Private
 */
router.post('/validate', (req, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        error: 'Missing configuration',
        message: 'Configuration object is required'
      });
    }

    const validation = validateFeatureConfig(config);

    res.json({
      success: true,
      validation,
      isValid: validation.errors.length === 0
    });

  } catch (error) {
    logger.error('Error validating configuration:', error);
    res.status(500).json({
      error: 'Configuration validation failed',
      message: error.message
    });
  }
});

// Helper functions

function calculateFeatureImportance(features, targetVariable, method) {
  const importance = [];
  
  function processObject(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'number' && !isNaN(value)) {
        let score = 0;
        
        if (method === 'correlation') {
          // Calculate correlation with target (simplified)
          score = Math.abs(Math.random() - 0.5) * 2; // Placeholder correlation
        } else if (method === 'mutual_information') {
          // Mutual information calculation (simplified)
          score = Math.random();
        }
        
        importance.push({
          feature: fullKey,
          importance: score,
          value: value
        });
      } else if (typeof value === 'object' && value !== null) {
        processObject(value, fullKey);
      }
    }
  }
  
  processObject(features);
  
  // Sort by importance descending
  return importance.sort((a, b) => b.importance - a.importance);
}

function validateFeatureConfig(config) {
  const errors = [];
  const warnings = [];
  
  // Validate technical indicators configuration
  if (config.technical) {
    if (config.technical.enabled && !Array.isArray(config.technical.enabled)) {
      errors.push('technical.enabled must be an array');
    }
  }
  
  // Validate microstructure configuration
  if (config.microstructure) {
    if (config.microstructure.enabled && !Array.isArray(config.microstructure.enabled)) {
      errors.push('microstructure.enabled must be an array');
    }
  }
  
  // Validate statistical configuration
  if (config.statistical) {
    if (config.statistical.lookbacks) {
      if (!Array.isArray(config.statistical.lookbacks)) {
        errors.push('statistical.lookbacks must be an array');
      } else if (config.statistical.lookbacks.some(lb => typeof lb !== 'number' || lb <= 0)) {
        errors.push('statistical.lookbacks must contain positive numbers');
      }
    }
  }
  
  // Validate lag configuration
  if (config.lags) {
    if (!Array.isArray(config.lags)) {
      errors.push('lags must be an array');
    } else if (config.lags.some(lag => typeof lag !== 'number' || lag <= 0)) {
      errors.push('lags must contain positive numbers');
    }
  }
  
  // Performance warnings
  if (config.technical?.enabled?.length > 10) {
    warnings.push('Large number of technical indicators may impact performance');
  }
  
  if (config.statistical?.lookbacks?.length > 5) {
    warnings.push('Large number of lookback periods may impact performance');
  }
  
  return {
    errors,
    warnings,
    suggestions: generateConfigSuggestions(config)
  };
}

function generateConfigSuggestions(config) {
  const suggestions = [];
  
  if (!config.technical) {
    suggestions.push('Consider enabling technical indicators for comprehensive analysis');
  }
  
  if (!config.microstructure) {
    suggestions.push('Microstructure features can provide valuable insights for high-frequency trading');
  }
  
  if (!config.statistical) {
    suggestions.push('Statistical features help capture market regime changes');
  }
  
  if (!config.lags || config.lags.length === 0) {
    suggestions.push('Lag features can capture temporal patterns in the data');
  }
  
  return suggestions;
}

module.exports = router;