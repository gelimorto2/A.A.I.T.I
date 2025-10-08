/**
 * Advanced Technical Analysis API Routes
 * REST API endpoints for advanced technical analysis engine
 */

const express = require('express');
const router = express.Router();

module.exports = (technicalAnalysisEngine, logger) => {
    
    /**
     * GET /api/technical-analysis/comprehensive/:symbol
     * Get comprehensive technical analysis for a symbol
     */
    router.get('/comprehensive/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeframes, lookback } = req.query;
            
            const timeframesArray = timeframes ? timeframes.split(',') : ['1h', '4h', '1d'];
            const lookbackPeriod = lookback ? parseInt(lookback) : 200;
            
            const analysis = await technicalAnalysisEngine.performComprehensiveAnalysis(
                symbol, 
                timeframesArray, 
                lookbackPeriod
            );
            
            res.json({
                success: true,
                data: analysis,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error in comprehensive technical analysis', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to perform comprehensive technical analysis',
                message: error.message
            });
        }
    });

    /**
     * GET /api/technical-analysis/fibonacci/:symbol
     * Get Fibonacci retracements and extensions
     */
    router.get('/fibonacci/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeframe = '1h', lookback = 100 } = req.query;
            
            const fibonacci = await technicalAnalysisEngine.calculateFibonacciLevels(
                symbol, 
                timeframe, 
                parseInt(lookback)
            );
            
            res.json({
                success: true,
                data: fibonacci,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error calculating Fibonacci levels', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to calculate Fibonacci levels',
                message: error.message
            });
        }
    });

    /**
     * GET /api/technical-analysis/elliott-wave/:symbol
     * Get Elliott Wave pattern analysis
     */
    router.get('/elliott-wave/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeframe = '1h', lookback = 200 } = req.query;
            
            const elliottWave = await technicalAnalysisEngine.recognizeElliottWavePatterns(
                symbol, 
                timeframe, 
                parseInt(lookback)
            );
            
            res.json({
                success: true,
                data: elliottWave,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error recognizing Elliott Wave patterns', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to recognize Elliott Wave patterns',
                message: error.message
            });
        }
    });

    /**
     * GET /api/technical-analysis/support-resistance/:symbol
     * Get support and resistance levels
     */
    router.get('/support-resistance/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeframe = '1h', lookback = 200 } = req.query;
            
            const levels = await technicalAnalysisEngine.detectSupportResistanceLevels(
                symbol, 
                timeframe, 
                parseInt(lookback)
            );
            
            res.json({
                success: true,
                data: levels,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error detecting support/resistance levels', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to detect support/resistance levels',
                message: error.message
            });
        }
    });

    /**
     * GET /api/technical-analysis/patterns/:symbol
     * Get chart pattern recognition
     */
    router.get('/patterns/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeframe = '1h', lookback = 100 } = req.query;
            
            const patterns = await technicalAnalysisEngine.recognizeChartPatterns(
                symbol, 
                timeframe, 
                parseInt(lookback)
            );
            
            res.json({
                success: true,
                data: patterns,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error recognizing chart patterns', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to recognize chart patterns',
                message: error.message
            });
        }
    });

    /**
     * GET /api/technical-analysis/volume-profile/:symbol
     * Get volume profile analysis
     */
    router.get('/volume-profile/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeframe = '1h', lookback = 200 } = req.query;
            
            const volumeProfile = await technicalAnalysisEngine.analyzeVolumeProfile(
                symbol, 
                timeframe, 
                parseInt(lookback)
            );
            
            res.json({
                success: true,
                data: volumeProfile,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error analyzing volume profile', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to analyze volume profile',
                message: error.message
            });
        }
    });

    /**
     * GET /api/technical-analysis/signals/:symbol
     * Get trading signals based on technical analysis
     */
    router.get('/signals/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeframes } = req.query;
            
            const timeframesArray = timeframes ? timeframes.split(',') : ['1h', '4h'];
            
            // Get comprehensive analysis and extract signals
            const analysis = await technicalAnalysisEngine.performComprehensiveAnalysis(
                symbol, 
                timeframesArray, 
                100
            );
            
            const signals = {
                symbol,
                timestamp: new Date(),
                overall: analysis.summary.overall,
                confidence: analysis.summary.confidence,
                signals: analysis.summary.signals,
                alerts: analysis.summary.alerts,
                timeframes: {}
            };

            // Extract signals from each timeframe
            Object.entries(analysis.timeframes).forEach(([tf, tfAnalysis]) => {
                signals.timeframes[tf] = {
                    signals: tfAnalysis.signals,
                    confidence: tfAnalysis.confidence,
                    patterns: tfAnalysis.patterns.length,
                    fibonacci: tfAnalysis.fibonacci.activeZones || []
                };
            });
            
            res.json({
                success: true,
                data: signals,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error generating technical analysis signals', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to generate technical analysis signals',
                message: error.message
            });
        }
    });

    /**
     * GET /api/technical-analysis/scan
     * Scan multiple symbols for patterns and signals
     */
    router.get('/scan', async (req, res) => {
        try {
            const { symbols, pattern, minConfidence = 0.7 } = req.query;
            
            const symbolsList = symbols ? symbols.split(',') : ['BTC', 'ETH', 'ADA', 'SOL'];
            const scanResults = [];
            
            for (const symbol of symbolsList) {
                try {
                    const patterns = await technicalAnalysisEngine.recognizeChartPatterns(symbol);
                    
                    // Filter by pattern type if specified
                    let relevantPatterns = patterns.patterns;
                    if (pattern) {
                        relevantPatterns = patterns.patterns.filter(p => 
                            p.type.toLowerCase().includes(pattern.toLowerCase())
                        );
                    }
                    
                    // Filter by minimum confidence
                    relevantPatterns = relevantPatterns.filter(p => 
                        p.confidence >= parseFloat(minConfidence)
                    );
                    
                    if (relevantPatterns.length > 0) {
                        scanResults.push({
                            symbol,
                            patterns: relevantPatterns,
                            highestConfidence: Math.max(...relevantPatterns.map(p => p.confidence))
                        });
                    }
                    
                } catch (error) {
                    logger.warn('Error scanning symbol', { symbol, error: error.message });
                }
            }
            
            // Sort by highest confidence
            scanResults.sort((a, b) => b.highestConfidence - a.highestConfidence);
            
            res.json({
                success: true,
                data: {
                    scanned: symbolsList.length,
                    found: scanResults.length,
                    results: scanResults,
                    timestamp: new Date()
                }
            });
            
        } catch (error) {
            logger.error('Error in technical analysis scan', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to perform technical analysis scan',
                message: error.message
            });
        }
    });

    /**
     * POST /api/technical-analysis/alert
     * Set up pattern alerts for symbols
     */
    router.post('/alert', async (req, res) => {
        try {
            const { symbol, patterns, minConfidence = 0.8, webhook } = req.body;
            
            if (!symbol || !patterns || !Array.isArray(patterns)) {
                return res.status(400).json({
                    success: false,
                    error: 'Symbol and patterns array are required'
                });
            }
            
            // Subscribe to pattern alerts
            const alertId = `alert_${symbol}_${Date.now()}`;
            
            const alertHandler = (patternAlert) => {
                if (patternAlert.symbol === symbol && 
                    patterns.includes(patternAlert.pattern) &&
                    patternAlert.confidence >= minConfidence) {
                    
                    // Send webhook notification if provided
                    if (webhook) {
                        // In production, implement webhook sending
                        logger.info('Pattern alert triggered', { alertId, patternAlert });
                    }
                }
            };
            
            technicalAnalysisEngine.on('patternAlert', alertHandler);
            
            res.json({
                success: true,
                data: {
                    alertId,
                    symbol,
                    patterns,
                    minConfidence,
                    status: 'active',
                    webhook: !!webhook
                },
                message: 'Pattern alert created successfully'
            });
            
        } catch (error) {
            logger.error('Error creating pattern alert', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to create pattern alert',
                message: error.message
            });
        }
    });

    return router;
};