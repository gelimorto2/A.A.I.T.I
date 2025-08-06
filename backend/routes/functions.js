const express = require('express');
const router = express.Router();
const { functionRegistry } = require('../utils/functionRegistry');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Function Registry API Routes
 * Provides access to the comprehensive function catalog
 */

/**
 * GET /api/functions
 * Get all functions with optional filtering
 */
router.get('/', (req, res) => {
  try {
    const { category, importance, module, search } = req.query;
    
    let functions;
    
    if (search) {
      functions = functionRegistry.searchFunctions(search);
    } else {
      const filters = {};
      if (category) filters.category = category;
      if (importance) filters.importance = importance;
      if (module) filters.module = module;
      
      functions = functionRegistry.getFunctions(filters);
    }

    res.json({
      success: true,
      data: {
        functions,
        total: functions.length,
        filters: { category, importance, module, search }
      }
    });
  } catch (error) {
    logger.error('Error fetching functions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch functions'
    });
  }
});

/**
 * GET /api/functions/critical
 * Get only critical functions for quick reference
 */
router.get('/critical', (req, res) => {
  try {
    const functions = functionRegistry.getCriticalFunctions();
    
    res.json({
      success: true,
      data: {
        functions,
        total: functions.length,
        description: 'Critical functions for core A.A.I.T.I functionality'
      }
    });
  } catch (error) {
    logger.error('Error fetching critical functions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch critical functions'
    });
  }
});

/**
 * GET /api/functions/categories
 * Get all categories with their functions
 */
router.get('/categories', (req, res) => {
  try {
    const categories = functionRegistry.getCategoriesWithFunctions();
    
    res.json({
      success: true,
      data: {
        categories,
        total: Object.keys(categories).length
      }
    });
  } catch (error) {
    logger.error('Error fetching function categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch function categories'
    });
  }
});

/**
 * GET /api/functions/quick-reference
 * Get quick reference functions for different user levels
 */
router.get('/quick-reference', (req, res) => {
  try {
    const quickReference = functionRegistry.getQuickReference();
    
    res.json({
      success: true,
      data: quickReference,
      description: 'Functions organized by user experience level'
    });
  } catch (error) {
    logger.error('Error fetching quick reference:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quick reference'
    });
  }
});

/**
 * GET /api/functions/statistics
 * Get function registry statistics
 */
router.get('/statistics', (req, res) => {
  try {
    const statistics = functionRegistry.getStatistics();
    
    res.json({
      success: true,
      data: statistics,
      description: 'Function registry statistics and breakdown'
    });
  } catch (error) {
    logger.error('Error fetching function statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch function statistics'
    });
  }
});

/**
 * GET /api/functions/:functionName
 * Get detailed information about a specific function
 */
router.get('/:functionName', (req, res) => {
  try {
    const { functionName } = req.params;
    const functionDetails = functionRegistry.getFunctionDetails(functionName);
    
    if (!functionDetails) {
      return res.status(404).json({
        success: false,
        error: `Function '${functionName}' not found`
      });
    }

    res.json({
      success: true,
      data: functionDetails
    });
  } catch (error) {
    logger.error('Error fetching function details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch function details'
    });
  }
});

/**
 * GET /api/functions/category/:category
 * Get all functions in a specific category
 */
router.get('/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const functions = functionRegistry.getFunctionsByCategory(category.toUpperCase());
    
    res.json({
      success: true,
      data: {
        category,
        functions,
        total: functions.length
      }
    });
  } catch (error) {
    logger.error('Error fetching functions by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch functions by category'
    });
  }
});

/**
 * POST /api/functions/search
 * Advanced function search with multiple criteria
 */
router.post('/search', (req, res) => {
  try {
    const { 
      query, 
      categories = [], 
      importance = [], 
      modules = [],
      includeExamples = false 
    } = req.body;
    
    let results = [];
    
    if (query) {
      results = functionRegistry.searchFunctions(query);
    } else {
      results = functionRegistry.getFunctions();
    }
    
    // Apply additional filters
    if (categories.length > 0) {
      results = results.filter(fn => categories.includes(fn.category));
    }
    
    if (importance.length > 0) {
      results = results.filter(fn => importance.includes(fn.importance));
    }
    
    if (modules.length > 0) {
      results = results.filter(fn => modules.includes(fn.module));
    }
    
    // Sort by relevance (importance first, then alphabetically)
    const importanceOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    results.sort((a, b) => {
      const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
      return importanceDiff !== 0 ? importanceDiff : a.name.localeCompare(b.name);
    });
    
    // Optionally exclude examples for lighter responses
    if (!includeExamples) {
      results = results.map(fn => {
        const { example, ...rest } = fn;
        return rest;
      });
    }

    res.json({
      success: true,
      data: {
        results,
        total: results.length,
        searchCriteria: { query, categories, importance, modules }
      }
    });
  } catch (error) {
    logger.error('Error in advanced function search:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform function search'
    });
  }
});

module.exports = router;