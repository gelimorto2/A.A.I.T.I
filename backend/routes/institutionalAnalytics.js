/**
 * Institutional Analytics API Routes
 * REST API endpoints for institutional analytics services
 */

const express = require('express');
const router = express.Router();

module.exports = (institutionalAnalyticsService, logger) => {
    
    /**
     * GET /api/institutional-analytics/executive/:portfolioId
     * Get executive summary dashboard for a portfolio
     */
    router.get('/executive/:portfolioId', async (req, res) => {
        try {
            const { portfolioId } = req.params;
            const { timeframe = '30d' } = req.query;
            
            const summary = await institutionalAnalyticsService.getExecutiveSummary(portfolioId, timeframe);
            
            res.json({
                success: true,
                data: summary,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching executive summary', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch executive summary',
                message: error.message
            });
        }
    });

    /**
     * GET /api/institutional-analytics/pnl/:portfolioId
     * Get P&L attribution analysis for a portfolio
     */
    router.get('/pnl/:portfolioId', async (req, res) => {
        try {
            const { portfolioId } = req.params;
            const { timeframe = '1d' } = req.query;
            
            const attribution = await institutionalAnalyticsService.getPnLAttribution(portfolioId, timeframe);
            
            res.json({
                success: true,
                data: attribution,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching P&L attribution', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch P&L attribution',
                message: error.message
            });
        }
    });

    /**
     * GET /api/institutional-analytics/portfolio/:portfolioId
     * Get comprehensive portfolio analytics
     */
    router.get('/portfolio/:portfolioId', async (req, res) => {
        try {
            const { portfolioId } = req.params;
            
            const analytics = await institutionalAnalyticsService.getPortfolioAnalytics(portfolioId);
            
            res.json({
                success: true,
                data: analytics,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching portfolio analytics', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch portfolio analytics',
                message: error.message
            });
        }
    });

    /**
     * GET /api/institutional-analytics/risk/:portfolioId
     * Get risk management dashboard for a portfolio
     */
    router.get('/risk/:portfolioId', async (req, res) => {
        try {
            const { portfolioId } = req.params;
            const { scenarios } = req.query;
            
            const scenariosArray = scenarios ? scenarios.split(',') : ['base', 'stress', 'crisis'];
            
            const riskDashboard = await institutionalAnalyticsService.generateRiskDashboard(portfolioId, scenariosArray);
            
            res.json({
                success: true,
                data: riskDashboard,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching risk dashboard', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch risk dashboard',
                message: error.message
            });
        }
    });

    /**
     * POST /api/institutional-analytics/executive/generate
     * Generate fresh executive summary for a portfolio
     */
    router.post('/executive/generate', async (req, res) => {
        try {
            const { portfolioId, timeframe = '30d' } = req.body;
            
            if (!portfolioId) {
                return res.status(400).json({
                    success: false,
                    error: 'Portfolio ID is required'
                });
            }
            
            const summary = await institutionalAnalyticsService.generateExecutiveSummary(portfolioId, timeframe);
            
            res.json({
                success: true,
                data: summary,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error generating executive summary', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to generate executive summary',
                message: error.message
            });
        }
    });

    /**
     * POST /api/institutional-analytics/pnl/generate
     * Generate fresh P&L attribution analysis
     */
    router.post('/pnl/generate', async (req, res) => {
        try {
            const { portfolioId, timeframe = '1d' } = req.body;
            
            if (!portfolioId) {
                return res.status(400).json({
                    success: false,
                    error: 'Portfolio ID is required'
                });
            }
            
            const attribution = await institutionalAnalyticsService.generatePnLAttribution(portfolioId, timeframe);
            
            res.json({
                success: true,
                data: attribution,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error generating P&L attribution', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to generate P&L attribution',
                message: error.message
            });
        }
    });

    /**
     * POST /api/institutional-analytics/portfolio/analyze
     * Generate fresh portfolio analytics
     */
    router.post('/portfolio/analyze', async (req, res) => {
        try {
            const { portfolioId } = req.body;
            
            if (!portfolioId) {
                return res.status(400).json({
                    success: false,
                    error: 'Portfolio ID is required'
                });
            }
            
            const analytics = await institutionalAnalyticsService.generatePortfolioAnalytics(portfolioId);
            
            res.json({
                success: true,
                data: analytics,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error generating portfolio analytics', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to generate portfolio analytics',
                message: error.message
            });
        }
    });

    /**
     * POST /api/institutional-analytics/risk/assess
     * Generate fresh risk assessment
     */
    router.post('/risk/assess', async (req, res) => {
        try {
            const { portfolioId, scenarios = ['base', 'stress', 'crisis'] } = req.body;
            
            if (!portfolioId) {
                return res.status(400).json({
                    success: false,
                    error: 'Portfolio ID is required'
                });
            }
            
            const riskDashboard = await institutionalAnalyticsService.generateRiskDashboard(portfolioId, scenarios);
            
            res.json({
                success: true,
                data: riskDashboard,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error generating risk assessment', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to generate risk assessment',
                message: error.message
            });
        }
    });

    /**
     * GET /api/institutional-analytics/kpis/:portfolioId
     * Get key performance indicators for a portfolio
     */
    router.get('/kpis/:portfolioId', async (req, res) => {
        try {
            const { portfolioId } = req.params;
            const { timeframe = '30d' } = req.query;
            
            const summary = await institutionalAnalyticsService.getExecutiveSummary(portfolioId, timeframe);
            
            res.json({
                success: true,
                data: {
                    portfolioId,
                    timeframe,
                    kpis: summary.kpis,
                    performance: summary.performance,
                    timestamp: summary.timestamp
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching KPIs', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch KPIs',
                message: error.message
            });
        }
    });

    /**
     * GET /api/institutional-analytics/performance/:portfolioId
     * Get detailed performance metrics for a portfolio
     */
    router.get('/performance/:portfolioId', async (req, res) => {
        try {
            const { portfolioId } = req.params;
            const { timeframe = '30d' } = req.query;
            
            const summary = await institutionalAnalyticsService.getExecutiveSummary(portfolioId, timeframe);
            
            res.json({
                success: true,
                data: {
                    portfolioId,
                    timeframe,
                    performance: summary.performance,
                    risk: summary.risk,
                    timestamp: summary.timestamp
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error fetching performance metrics', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch performance metrics',
                message: error.message
            });
        }
    });

    /**
     * GET /api/institutional-analytics/comparison
     * Compare multiple portfolios
     */
    router.get('/comparison', async (req, res) => {
        try {
            const { portfolios, timeframe = '30d' } = req.query;
            
            if (!portfolios) {
                return res.status(400).json({
                    success: false,
                    error: 'Portfolio IDs are required'
                });
            }
            
            const portfolioIds = portfolios.split(',');
            const comparisons = [];
            
            for (const portfolioId of portfolioIds) {
                try {
                    const summary = await institutionalAnalyticsService.getExecutiveSummary(portfolioId.trim(), timeframe);
                    comparisons.push({
                        portfolioId: portfolioId.trim(),
                        kpis: summary.kpis,
                        performance: summary.performance,
                        risk: summary.risk
                    });
                } catch (error) {
                    comparisons.push({
                        portfolioId: portfolioId.trim(),
                        error: error.message
                    });
                }
            }
            
            res.json({
                success: true,
                data: {
                    timeframe,
                    portfolios: comparisons,
                    summary: {
                        total: portfolioIds.length,
                        successful: comparisons.filter(c => !c.error).length,
                        failed: comparisons.filter(c => c.error).length
                    }
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error comparing portfolios', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to compare portfolios',
                message: error.message
            });
        }
    });

    /**
     * GET /api/institutional-analytics/alerts/:portfolioId
     * Get alerts for a specific portfolio
     */
    router.get('/alerts/:portfolioId', async (req, res) => {
        try {
            const { portfolioId } = req.params;
            const { timeframe = '30d', severity } = req.query;
            
            const summary = await institutionalAnalyticsService.getExecutiveSummary(portfolioId, timeframe);
            const riskDashboard = await institutionalAnalyticsService.getRiskDashboard(portfolioId);
            
            let alerts = [...summary.alerts, ...riskDashboard.alerts];
            
            // Filter by severity if specified
            if (severity) {
                alerts = alerts.filter(alert => alert.severity === severity.toUpperCase());
            }
            
            res.json({
                success: true,
                data: {
                    portfolioId,
                    alerts,
                    summary: {
                        total: alerts.length,
                        high: alerts.filter(a => a.severity === 'HIGH').length,
                        medium: alerts.filter(a => a.severity === 'MEDIUM').length,
                        low: alerts.filter(a => a.severity === 'LOW').length
                    }
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

    /**
     * GET /api/institutional-analytics/status
     * Get institutional analytics service status
     */
    router.get('/status', async (req, res) => {
        try {
            const status = institutionalAnalyticsService.getServiceStatus();
            
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

    return router;
};