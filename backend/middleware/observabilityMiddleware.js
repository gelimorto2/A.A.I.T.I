/**
 * Observability Middleware
 * Express middleware for automatic metrics collection and request instrumentation
 */

const ObservabilityService = require('../services/observabilityService');
const { logger } = require('../utils/logger');

// Global observability service instance
let observabilityService;

/**
 * Initialize observability service
 */
function initializeObservability() {
    if (!observabilityService) {
        observabilityService = new ObservabilityService();
        logger.info('Observability service initialized');
    }
    return observabilityService;
}

/**
 * HTTP Request instrumentation middleware
 */
function requestInstrumentation(req, res, next) {
    const startTime = Date.now();
    
    // Get observability service
    const obs = initializeObservability();
    
    // Extract request information
    const method = req.method;
    const route = req.route?.path || req.path || 'unknown';
    const userType = req.user?.role || 'anonymous';
    
    // Add request ID for tracing
    req.requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('x-request-id', req.requestId);
    
    // Intercept response to capture metrics
    const originalSend = res.send;
    res.send = function(data) {
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        const statusCode = res.statusCode;
        
        // Record HTTP request metrics
        obs.recordHttpRequest(method, route, statusCode, duration, userType);
        
        // Log request completion
        logger.info('HTTP request completed', {
            requestId: req.requestId,
            method,
            route,
            statusCode,
            duration: `${duration.toFixed(3)}s`,
            userType,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        
        return originalSend.call(this, data);
    };
    
    // Add observability service to request for use in routes
    req.observability = obs;
    
    next();
}

/**
 * Error tracking middleware
 */
function errorTracking(err, req, res, next) {
    const obs = req.observability || initializeObservability();
    
    // Determine error details
    const errorType = err.constructor.name || 'UnknownError';
    const severity = res.statusCode >= 500 ? 'critical' : 'warning';
    const component = req.route?.path?.split('/')[2] || 'unknown'; // Extract component from route
    
    // Record error metrics
    obs.recordError(component, errorType, severity);
    
    // Enhanced error logging
    logger.error('Request error occurred', {
        requestId: req.requestId,
        error: err.message,
        errorType,
        stack: err.stack,
        method: req.method,
        route: req.route?.path || req.path,
        statusCode: res.statusCode,
        component,
        severity,
        user: req.user?.id || 'anonymous'
    });
    
    next(err);
}

/**
 * Business metrics tracking middleware for trading operations
 */
function tradingInstrumentation(operationType) {
    return (req, res, next) => {
        const startTime = Date.now();
        const obs = req.observability || initializeObservability();
        
        // Intercept response to capture trading metrics
        const originalSend = res.send;
        res.send = function(data) {
            const duration = (Date.now() - startTime) / 1000;
            const status = res.statusCode < 400 ? 'success' : 'failure';
            const symbol = req.body?.symbol || req.params?.symbol || 'unknown';
            const mode = req.body?.mode || req.query?.mode || 'paper';
            
            // Record trading operation metrics
            obs.recordTradingOperation(operationType, status, symbol, mode, duration);
            
            return originalSend.call(this, data);
        };
        
        next();
    };
}

/**
 * Risk validation instrumentation
 */
function riskInstrumentation(req, res, next) {
    const startTime = Date.now();
    const obs = req.observability || initializeObservability();
    
    // Intercept response to capture risk metrics
    const originalSend = res.send;
    res.send = function(data) {
        const duration = (Date.now() - startTime) / 1000;
        
        try {
            const responseData = typeof data === 'string' ? JSON.parse(data) : data;
            const result = responseData.validation?.passed ? 'passed' : 'failed';
            const violations = responseData.validation?.violations || [];
            
            // Record risk validation metrics
            violations.forEach(violation => {
                obs.recordRiskValidation(result, violation.type, violation.severity, duration);
            });
            
            // If no violations, record a successful validation
            if (violations.length === 0) {
                obs.recordRiskValidation('passed', null, null, duration);
            }
            
        } catch (error) {
            // If we can't parse the response, just record the basic metrics
            obs.recordRiskValidation('unknown', null, null, duration);
        }
        
        return originalSend.call(this, data);
    };
    
    next();
}

/**
 * ML prediction instrumentation
 */
function mlInstrumentation(req, res, next) {
    const obs = req.observability || initializeObservability();
    
    // Intercept response to capture ML metrics
    const originalSend = res.send;
    res.send = function(data) {
        try {
            const responseData = typeof data === 'string' ? JSON.parse(data) : data;
            
            if (responseData.prediction || responseData.predictions) {
                const modelName = responseData.modelName || req.body?.modelName || 'unknown';
                const modelVersion = responseData.modelVersion || '1.0.0';
                const symbol = req.body?.symbol || req.params?.symbol || 'unknown';
                const predictionType = req.body?.predictionType || 'price';
                
                obs.recordMLPrediction(modelName, modelVersion, symbol, predictionType);
            }
            
        } catch (error) {
            logger.warn('Failed to parse ML response for metrics', { error: error.message });
        }
        
        return originalSend.call(this, data);
    };
    
    next();
}

/**
 * Database operation instrumentation
 */
function databaseInstrumentation(operation, table) {
    return {
        pre: (startTime = Date.now()) => startTime,
        post: (startTime, error = null) => {
            const obs = initializeObservability();
            const duration = (Date.now() - startTime) / 1000;
            
            obs.recordDatabaseOperation(operation, table, duration);
            
            if (error) {
                obs.recordError('database', error.constructor.name, 'warning');
            }
        }
    };
}

/**
 * System metrics collection
 */
function collectSystemMetrics() {
    const obs = initializeObservability();
    
    setInterval(() => {
        try {
            // Memory usage
            const memoryUsage = process.memoryUsage();
            
            // CPU usage (simplified)
            const cpuUsage = process.cpurUsage ? process.cpurUsage() : null;
            
            // Database connections (would need pool instance)
            const activeConnections = global.dbPool?.totalCount || 0;
            
            obs.updateSystemMetrics(memoryUsage, null, activeConnections);
            
        } catch (error) {
            logger.warn('System metrics collection failed', { error: error.message });
        }
    }, 15000); // Collect every 15 seconds
}

/**
 * Business metrics collection
 */
function collectBusinessMetrics() {
    const obs = initializeObservability();
    
    setInterval(async () => {
        try {
            // This would integrate with actual portfolio service
            // For now, we'll just set up the structure
            
            const portfolioValue = await getPortfolioValue?.('paper') || 0;
            const dailyPnL = await getDailyPnL?.('paper') || 0;
            
            obs.updateBusinessMetrics(portfolioValue, dailyPnL, 'paper', 'system');
            
        } catch (error) {
            logger.warn('Business metrics collection failed', { error: error.message });
        }
    }, 60000); // Collect every minute
}

/**
 * Health check instrumentation
 */
function healthCheckInstrumentation(req, res, next) {
    const obs = req.observability || initializeObservability();
    
    // Add observability status to health check
    req.observabilityStatus = obs.getAlertStatus();
    
    next();
}

/**
 * Initialize all observability instrumentation
 */
function initializeInstrumentation() {
    const obs = initializeObservability();
    
    // Start system metrics collection
    collectSystemMetrics();
    
    // Start business metrics collection
    collectBusinessMetrics();
    
    logger.info('Observability instrumentation initialized');
    
    return obs;
}

/**
 * Get observability service instance
 */
function getObservabilityService() {
    return observabilityService || initializeObservability();
}

module.exports = {
    initializeObservability,
    requestInstrumentation,
    errorTracking,
    tradingInstrumentation,
    riskInstrumentation,
    mlInstrumentation,
    databaseInstrumentation,
    healthCheckInstrumentation,
    initializeInstrumentation,
    getObservabilityService
};