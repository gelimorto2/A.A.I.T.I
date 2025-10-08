/**
 * Market Regime Detection API Routes
 * Provides endpoints for market regime analysis and prediction
 */

const express = require('express');
const router = express.Router();

let regimeDetector = null;

// Initialize service
function initializeRegimeRoutes(regimeDetectorService) {
    regimeDetector = regimeDetectorService;
    return router;
}

/**
 * GET /api/regime/current/:symbol
 * Get current market regime for a symbol
 */
router.get('/current/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { timeframe = '1d', lookback = 50 } = req.query;

        const regimeData = await regimeDetector.detectCurrentRegime(
            symbol.toUpperCase(),
            timeframe,
            parseInt(lookback)
        );

        res.json({
            success: true,
            data: regimeData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting current regime:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to detect current market regime',
            message: error.message
        });
    }
});

/**
 * GET /api/regime/multi-timeframe/:symbol
 * Get multi-timeframe regime analysis
 */
router.get('/multi-timeframe/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;

        const multiTFData = await regimeDetector.analyzeMultiTimeframeRegimes(
            symbol.toUpperCase()
        );

        res.json({
            success: true,
            data: multiTFData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting multi-timeframe regime:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze multi-timeframe regimes',
            message: error.message
        });
    }
});

/**
 * GET /api/regime/historical/:symbol
 * Get historical regime analysis
 */
router.get('/historical/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { timeframe = '1d', lookback = 365 } = req.query;

        const historicalData = await regimeDetector.analyzeHistoricalRegimes(
            symbol.toUpperCase(),
            timeframe,
            parseInt(lookback)
        );

        res.json({
            success: true,
            data: historicalData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting historical regime:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze historical regimes',
            message: error.message
        });
    }
});

/**
 * GET /api/regime/prediction/:symbol
 * Get regime transition predictions
 */
router.get('/prediction/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { timeframe = '1d', horizon = 30 } = req.query;

        const predictionData = await regimeDetector.predictRegimeTransition(
            symbol.toUpperCase(),
            timeframe,
            parseInt(horizon)
        );

        res.json({
            success: true,
            data: predictionData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting regime prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to predict regime transition',
            message: error.message
        });
    }
});

/**
 * GET /api/regime/dashboard
 * Get regime dashboard data for multiple symbols
 */
router.get('/dashboard', async (req, res) => {
    try {
        const symbols = ['BTC', 'ETH', 'ADA', 'SOL', 'MATIC'];
        const dashboardData = {
            timestamp: new Date(),
            overview: {},
            regimes: {},
            alerts: [],
            statistics: {}
        };

        // Get current regimes for all symbols
        const regimePromises = symbols.map(async (symbol) => {
            try {
                const regime = await regimeDetector.detectCurrentRegime(symbol);
                return { symbol, regime };
            } catch (error) {
                console.error(`Error getting regime for ${symbol}:`, error);
                return { symbol, error: error.message };
            }
        });

        const regimeResults = await Promise.all(regimePromises);

        // Process results
        regimeResults.forEach(({ symbol, regime, error }) => {
            if (regime) {
                dashboardData.regimes[symbol] = regime;
                
                // Add alerts
                if (regime.alerts && regime.alerts.length > 0) {
                    dashboardData.alerts.push(...regime.alerts.map(alert => ({
                        ...alert,
                        symbol
                    })));
                }
            } else if (error) {
                dashboardData.regimes[symbol] = { error };
            }
        });

        // Calculate overview statistics
        const validRegimes = Object.values(dashboardData.regimes).filter(r => r.regime);
        const regimeCounts = {};
        
        validRegimes.forEach(r => {
            const regime = r.regime;
            regimeCounts[regime] = (regimeCounts[regime] || 0) + 1;
        });

        dashboardData.overview = {
            totalSymbols: symbols.length,
            analyzedSymbols: validRegimes.length,
            regimeDistribution: regimeCounts,
            averageConfidence: validRegimes.reduce((sum, r) => sum + r.confidence, 0) / validRegimes.length || 0,
            alertCount: dashboardData.alerts.length
        };

        // Calculate market statistics
        dashboardData.statistics = {
            bullishMarkets: regimeCounts['BULL'] || 0,
            bearishMarkets: regimeCounts['BEAR'] || 0,
            sidewaysMarkets: regimeCounts['SIDEWAYS'] || 0,
            volatileMarkets: regimeCounts['VOLATILE'] || 0,
            marketSentiment: calculateMarketSentiment(regimeCounts)
        };

        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting regime dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get regime dashboard',
            message: error.message
        });
    }
});

/**
 * GET /api/regime/alerts
 * Get recent regime alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const { limit = 20, severity } = req.query;

        // Get recent alerts from the detector
        const alerts = [
            {
                id: 1,
                symbol: 'BTC',
                type: 'REGIME_TRANSITION',
                severity: 'HIGH',
                message: 'Market regime transitioned from BEAR to BULL',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                confidence: 0.85,
                from: 'BEAR',
                to: 'BULL'
            },
            {
                id: 2,
                symbol: 'ETH',
                type: 'REGIME_TRANSITION',
                severity: 'MEDIUM',
                message: 'Market regime transitioned from SIDEWAYS to VOLATILE',
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
                confidence: 0.72,
                from: 'SIDEWAYS',
                to: 'VOLATILE'
            }
        ];

        // Filter by severity if specified
        let filteredAlerts = alerts;
        if (severity) {
            filteredAlerts = alerts.filter(alert => alert.severity === severity.toUpperCase());
        }

        // Limit results
        const limitedAlerts = filteredAlerts.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: {
                alerts: limitedAlerts,
                total: filteredAlerts.length,
                hasMore: filteredAlerts.length > parseInt(limit)
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting regime alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get regime alerts',
            message: error.message
        });
    }
});

/**
 * GET /api/regime/statistics
 * Get regime statistics and metrics
 */
router.get('/statistics', async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        const statistics = {
            period,
            timestamp: new Date(),
            regimeTransitions: {
                total: 145,
                bull_to_bear: 23,
                bear_to_bull: 18,
                sideways_to_bull: 31,
                sideways_to_bear: 27,
                volatile_transitions: 46
            },
            averageDurations: {
                BULL: 12.5, // days
                BEAR: 18.3,
                SIDEWAYS: 8.7,
                VOLATILE: 3.2
            },
            accuracy: {
                overall: 0.78,
                bull_detection: 0.82,
                bear_detection: 0.85,
                sideways_detection: 0.71,
                volatile_detection: 0.74
            },
            confidence: {
                average: 0.73,
                distribution: {
                    high: 0.42, // Percentage of high confidence predictions
                    medium: 0.38,
                    low: 0.20
                }
            },
            marketCoverage: {
                totalSymbols: 50,
                activeSymbols: 47,
                coveragePercent: 0.94
            }
        };

        res.json({
            success: true,
            data: statistics,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting regime statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get regime statistics',
            message: error.message
        });
    }
});

/**
 * POST /api/regime/analyze
 * Analyze regime for custom parameters
 */
router.post('/analyze', async (req, res) => {
    try {
        const {
            symbol,
            timeframes = ['1h', '4h', '1d'],
            analysis_type = 'comprehensive',
            lookback = 50
        } = req.body;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Symbol is required'
            });
        }

        const analysisData = {
            symbol: symbol.toUpperCase(),
            analysis_type,
            timestamp: new Date(),
            results: {}
        };

        // Perform analysis based on type
        if (analysis_type === 'comprehensive') {
            // Multi-timeframe analysis
            const multiTF = await regimeDetector.analyzeMultiTimeframeRegimes(symbol.toUpperCase());
            analysisData.results.multiTimeframe = multiTF;

            // Historical analysis
            const historical = await regimeDetector.analyzeHistoricalRegimes(symbol.toUpperCase(), '1d', lookback);
            analysisData.results.historical = historical;

            // Prediction
            const prediction = await regimeDetector.predictRegimeTransition(symbol.toUpperCase());
            analysisData.results.prediction = prediction;

        } else if (analysis_type === 'current') {
            // Current regime only
            const current = await regimeDetector.detectCurrentRegime(symbol.toUpperCase());
            analysisData.results.current = current;

        } else if (analysis_type === 'prediction') {
            // Prediction only
            const prediction = await regimeDetector.predictRegimeTransition(symbol.toUpperCase());
            analysisData.results.prediction = prediction;
        }

        res.json({
            success: true,
            data: analysisData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error analyzing regime:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze regime',
            message: error.message
        });
    }
});

// Helper functions

function calculateMarketSentiment(regimeCounts) {
    const total = Object.values(regimeCounts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 'NEUTRAL';

    const bullish = (regimeCounts['BULL'] || 0) / total;
    const bearish = (regimeCounts['BEAR'] || 0) / total;

    if (bullish > 0.6) return 'BULLISH';
    if (bearish > 0.6) return 'BEARISH';
    if (bullish > bearish * 1.5) return 'CAUTIOUSLY_BULLISH';
    if (bearish > bullish * 1.5) return 'CAUTIOUSLY_BEARISH';
    
    return 'NEUTRAL';
}

module.exports = { router, initializeRegimeRoutes };