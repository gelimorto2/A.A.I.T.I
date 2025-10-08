/**
 * Real-Time Intelligence API Routes
 * REST API endpoints for real-time intelligence services
 */

const express = require('express');
const router = express.Router();

module.exports = (realTimeIntelligenceEngine, logger) => {
    
    /**
     * GET /api/real-time-intelligence/microstructure/:symbol
     * Get real-time microstructure analysis for a symbol
     */
    router.get('/microstructure/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { depth = 10 } = req.query;
            
            const microstructure = await realTimeIntelligenceEngine.analyzeMicrostructure(symbol, parseInt(depth));
            
            res.json({
                success: true,
                data: microstructure,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching microstructure analysis', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to analyze microstructure',
                message: error.message
            });
        }
    });

    /**
     * GET /api/real-time-intelligence/anomalies/:symbol
     * Get real-time anomaly detection for a symbol
     */
    router.get('/anomalies/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeWindow = '5m' } = req.query;
            
            const anomalies = await realTimeIntelligenceEngine.detectAnomalies(symbol, timeWindow);
            
            res.json({
                success: true,
                data: anomalies,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error detecting anomalies', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to detect anomalies',
                message: error.message
            });
        }
    });

    /**
     * GET /api/real-time-intelligence/predictions/:symbol
     * Get real-time predictions for a symbol
     */
    router.get('/predictions/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { horizons } = req.query;
            
            const horizonsArray = horizons ? horizons.split(',') : ['1m', '5m', '15m', '1h'];
            
            const predictions = await realTimeIntelligenceEngine.generateRealTimePredictions(symbol, horizonsArray);
            
            res.json({
                success: true,
                data: predictions,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error generating predictions', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to generate predictions',
                message: error.message
            });
        }
    });

    /**
     * POST /api/real-time-intelligence/events
     * Process a market event for intelligence analysis
     */
    router.post('/events', async (req, res) => {
        try {
            const { event } = req.body;
            
            if (!event || !event.id || !event.type) {
                return res.status(400).json({
                    success: false,
                    error: 'Event ID and type are required'
                });
            }
            
            const eventIntelligence = await realTimeIntelligenceEngine.processMarketEvent(event);
            
            res.json({
                success: true,
                data: eventIntelligence,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error processing market event', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to process market event',
                message: error.message
            });
        }
    });

    /**
     * POST /api/real-time-intelligence/alternative-data
     * Process alternative data for intelligence analysis
     */
    router.post('/alternative-data', async (req, res) => {
        try {
            const { dataSource, data } = req.body;
            
            if (!dataSource || !data) {
                return res.status(400).json({
                    success: false,
                    error: 'Data source and data are required'
                });
            }
            
            const processedData = await realTimeIntelligenceEngine.processAlternativeData(dataSource, data);
            
            res.json({
                success: true,
                data: processedData,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error processing alternative data', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to process alternative data',
                message: error.message
            });
        }
    });

    /**
     * GET /api/real-time-intelligence/:symbol
     * Get comprehensive real-time intelligence for a symbol
     */
    router.get('/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            
            const intelligence = await realTimeIntelligenceEngine.getRealTimeIntelligence(symbol);
            
            res.json({
                success: true,
                data: intelligence,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching real-time intelligence', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch real-time intelligence',
                message: error.message
            });
        }
    });

    /**
     * GET /api/real-time-intelligence/streams/status
     * Get status of all real-time data streams
     */
    router.get('/streams/status', async (req, res) => {
        try {
            const status = realTimeIntelligenceEngine.getEngineStatus();
            
            res.json({
                success: true,
                data: status,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching streams status', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch streams status',
                message: error.message
            });
        }
    });

    /**
     * WebSocket endpoint for real-time intelligence updates
     * GET /api/real-time-intelligence/ws/:symbol
     */
    router.ws = (wss) => {
        // WebSocket handler for real-time updates
        wss.on('connection', (ws, req) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const symbol = url.pathname.split('/').pop();
            
            logger.info(`WebSocket connection established for ${symbol}`);
            
            // Send initial data
            realTimeIntelligenceEngine.getRealTimeIntelligence(symbol)
                .then(intelligence => {
                    ws.send(JSON.stringify({
                        type: 'initial',
                        symbol,
                        data: intelligence,
                        timestamp: new Date()
                    }));
                })
                .catch(error => {
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: error.message,
                        timestamp: new Date()
                    }));
                });
            
            // Set up real-time updates
            const microstructureHandler = (data) => {
                if (data.symbol === symbol) {
                    ws.send(JSON.stringify({
                        type: 'microstructure',
                        symbol,
                        data,
                        timestamp: new Date()
                    }));
                }
            };
            
            const anomalyHandler = (data) => {
                if (data.symbol === symbol) {
                    ws.send(JSON.stringify({
                        type: 'anomaly',
                        symbol,
                        data,
                        timestamp: new Date()
                    }));
                }
            };
            
            const predictionsHandler = (data) => {
                if (data.symbol === symbol) {
                    ws.send(JSON.stringify({
                        type: 'predictions',
                        symbol,
                        data,
                        timestamp: new Date()
                    }));
                }
            };
            
            const eventHandler = (data) => {
                if (data.affected && data.affected.includes(symbol)) {
                    ws.send(JSON.stringify({
                        type: 'event',
                        symbol,
                        data,
                        timestamp: new Date()
                    }));
                }
            };
            
            // Register event listeners
            realTimeIntelligenceEngine.on('microstructureUpdate', microstructureHandler);
            realTimeIntelligenceEngine.on('anomalyDetection', anomalyHandler);
            realTimeIntelligenceEngine.on('predictionsUpdate', predictionsHandler);
            realTimeIntelligenceEngine.on('eventIntelligence', eventHandler);
            
            // Handle WebSocket close
            ws.on('close', () => {
                logger.info(`WebSocket connection closed for ${symbol}`);
                
                // Remove event listeners
                realTimeIntelligenceEngine.removeListener('microstructureUpdate', microstructureHandler);
                realTimeIntelligenceEngine.removeListener('anomalyDetection', anomalyHandler);
                realTimeIntelligenceEngine.removeListener('predictionsUpdate', predictionsHandler);
                realTimeIntelligenceEngine.removeListener('eventIntelligence', eventHandler);
            });
            
            // Handle WebSocket errors
            ws.on('error', (error) => {
                logger.error(`WebSocket error for ${symbol}`, { error: error.message });
            });
            
            // Send periodic heartbeat
            const heartbeat = setInterval(() => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'heartbeat',
                        timestamp: new Date()
                    }));
                } else {
                    clearInterval(heartbeat);
                }
            }, 30000); // 30 seconds
        });
    };

    /**
     * GET /api/real-time-intelligence/signals/:symbol
     * Get current trading signals for a symbol
     */
    router.get('/signals/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { types } = req.query;
            
            const intelligence = await realTimeIntelligenceEngine.getRealTimeIntelligence(symbol);
            
            let signals = [];
            
            if (intelligence.microstructure && intelligence.microstructure.signals) {
                signals = signals.concat(intelligence.microstructure.signals);
            }
            
            if (intelligence.predictions && intelligence.predictions.signals) {
                signals = signals.concat(intelligence.predictions.signals);
            }
            
            // Filter by signal types if specified
            if (types) {
                const typeArray = types.split(',');
                signals = signals.filter(signal => typeArray.includes(signal.type));
            }
            
            res.json({
                success: true,
                data: {
                    symbol,
                    signals,
                    count: signals.length,
                    lastUpdate: intelligence.timestamp
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching trading signals', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch trading signals',
                message: error.message
            });
        }
    });

    /**
     * GET /api/real-time-intelligence/alerts
     * Get all current alerts from real-time intelligence
     */
    router.get('/alerts', async (req, res) => {
        try {
            const { severity, symbol } = req.query;
            
            const status = realTimeIntelligenceEngine.getEngineStatus();
            const symbols = symbol ? [symbol] : ['BTC', 'ETH', 'ADA', 'SOL', 'MATIC']; // Default symbols
            
            const alerts = [];
            
            for (const sym of symbols) {
                try {
                    const intelligence = await realTimeIntelligenceEngine.getRealTimeIntelligence(sym);
                    
                    if (intelligence.anomalies && intelligence.anomalies.alerts) {
                        alerts.push(...intelligence.anomalies.alerts.map(alert => ({
                            ...alert,
                            symbol: sym,
                            source: 'anomaly_detection'
                        })));
                    }
                } catch (error) {
                    logger.warn(`Failed to get alerts for ${sym}`, { error: error.message });
                }
            }
            
            // Filter by severity if specified
            let filteredAlerts = alerts;
            if (severity) {
                filteredAlerts = alerts.filter(alert => alert.severity === severity.toUpperCase());
            }
            
            res.json({
                success: true,
                data: {
                    alerts: filteredAlerts,
                    summary: {
                        total: filteredAlerts.length,
                        high: filteredAlerts.filter(a => a.severity === 'HIGH').length,
                        medium: filteredAlerts.filter(a => a.severity === 'MEDIUM').length,
                        low: filteredAlerts.filter(a => a.severity === 'LOW').length
                    },
                    engineStatus: status
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching alerts', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch alerts',
                message: error.message
            });
        }
    });

    return router;
};