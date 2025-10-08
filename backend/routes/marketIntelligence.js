/**
 * Market Intelligence API Routes
 * REST API endpoints for market intelligence services
 */

const express = require('express');
const router = express.Router();

module.exports = (marketIntelligenceService, logger) => {
    
    /**
     * GET /api/market-intelligence/sentiment/:symbol
     * Get sentiment analysis for a specific symbol
     */
    router.get('/sentiment/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { sources } = req.query;
            
            const sourcesArray = sources ? sources.split(',') : ['news', 'social', 'technical'];
            
            const sentiment = await marketIntelligenceService.analyzeSentiment(symbol, sourcesArray);
            
            res.json({
                success: true,
                data: sentiment,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching sentiment analysis', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to analyze sentiment',
                message: error.message
            });
        }
    });

    /**
     * GET /api/market-intelligence/regime/:symbol
     * Get market regime detection for a specific symbol
     */
    router.get('/regime/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { lookback = 30 } = req.query;
            
            const regime = await marketIntelligenceService.detectMarketRegime(symbol, parseInt(lookback));
            
            res.json({
                success: true,
                data: regime,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error detecting market regime', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to detect market regime',
                message: error.message
            });
        }
    });

    /**
     * POST /api/market-intelligence/correlations
     * Analyze correlations between multiple symbols
     */
    router.post('/correlations', async (req, res) => {
        try {
            const { symbols, window = 90 } = req.body;
            
            if (!symbols || !Array.isArray(symbols) || symbols.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'At least 2 symbols required for correlation analysis'
                });
            }
            
            const correlations = await marketIntelligenceService.analyzeCorrelations(symbols, window);
            
            res.json({
                success: true,
                data: correlations,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error analyzing correlations', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to analyze correlations',
                message: error.message
            });
        }
    });

    /**
     * GET /api/market-intelligence/volatility/:symbol
     * Get volatility surface modeling for a symbol
     */
    router.get('/volatility/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { expiries, strikes } = req.query;
            
            // Parse query parameters
            const expiriesArray = expiries ? expiries.split(',').map(Number) : [7, 14, 30, 60, 90];
            const strikesArray = strikes ? strikes.split(',').map(Number) : [0.9, 0.95, 1.0, 1.05, 1.1];
            
            const volatilitySurface = await marketIntelligenceService.modelVolatilitySurface(
                symbol, 
                expiriesArray, 
                strikesArray
            );
            
            res.json({
                success: true,
                data: volatilitySurface,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error modeling volatility surface', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to model volatility surface',
                message: error.message
            });
        }
    });

    /**
     * GET /api/market-intelligence/technical/:symbol
     * Get advanced technical analysis for a symbol
     */
    router.get('/technical/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeframe = '1h', lookback = 200 } = req.query;
            
            const technicalAnalysis = await marketIntelligenceService.performAdvancedTechnicalAnalysis(
                symbol, 
                timeframe, 
                parseInt(lookback)
            );
            
            res.json({
                success: true,
                data: technicalAnalysis,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error performing technical analysis', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to perform technical analysis',
                message: error.message
            });
        }
    });

    /**
     * GET /api/market-intelligence/:symbol
     * Get comprehensive market intelligence for a symbol
     */
    router.get('/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            
            const intelligence = await marketIntelligenceService.getMarketIntelligence(symbol);
            
            res.json({
                success: true,
                data: intelligence,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching market intelligence', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch market intelligence',
                message: error.message
            });
        }
    });

    /**
     * GET /api/market-intelligence
     * Get market intelligence for all tracked symbols
     */
    router.get('/', async (req, res) => {
        try {
            const intelligence = await marketIntelligenceService.getAllMarketIntelligence();
            
            res.json({
                success: true,
                data: intelligence,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching all market intelligence', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch market intelligence',
                message: error.message
            });
        }
    });

    /**
     * GET /api/market-intelligence/status
     * Get market intelligence service status
     */
    router.get('/service/status', async (req, res) => {
        try {
            const status = marketIntelligenceService.getServiceStatus();
            
            res.json({
                success: true,
                data: status,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching service status', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch service status',
                message: error.message
            });
        }
    });

    /**
     * POST /api/market-intelligence/refresh
     * Force refresh of market intelligence data
     */
    router.post('/refresh', async (req, res) => {
        try {
            const { symbols } = req.body;
            const results = [];
            
            if (symbols && Array.isArray(symbols)) {
                // Refresh specific symbols
                for (const symbol of symbols) {
                    try {
                        const sentiment = await marketIntelligenceService.analyzeSentiment(symbol);
                        const regime = await marketIntelligenceService.detectMarketRegime(symbol);
                        results.push({ symbol, sentiment, regime, status: 'success' });
                    } catch (error) {
                        results.push({ symbol, status: 'error', error: error.message });
                    }
                }
            } else {
                // Refresh all symbols
                const intelligence = await marketIntelligenceService.getAllMarketIntelligence();
                for (const symbol of Object.keys(intelligence)) {
                    try {
                        const sentiment = await marketIntelligenceService.analyzeSentiment(symbol);
                        const regime = await marketIntelligenceService.detectMarketRegime(symbol);
                        results.push({ symbol, sentiment, regime, status: 'success' });
                    } catch (error) {
                        results.push({ symbol, status: 'error', error: error.message });
                    }
                }
            }
            
            res.json({
                success: true,
                data: {
                    refreshed: results.filter(r => r.status === 'success').length,
                    failed: results.filter(r => r.status === 'error').length,
                    results
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error refreshing market intelligence', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to refresh market intelligence',
                message: error.message
            });
        }
    });

    return router;
};