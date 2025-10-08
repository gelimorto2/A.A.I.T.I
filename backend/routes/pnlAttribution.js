/**
 * P&L Attribution API Routes
 * Provides endpoints for performance attribution and analysis
 */

const express = require('express');
const router = express.Router();

let attributionService = null;

// Initialize service
function initializeAttributionRoutes(attributionServiceInstance) {
    attributionService = attributionServiceInstance;
    return router;
}

/**
 * GET /api/attribution/full/:portfolioId
 * Get complete P&L attribution analysis
 */
router.get('/full/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { period = '1d' } = req.query;

        const attributionData = await attributionService.getFullPnLAttribution(portfolioId, period);

        res.json({
            success: true,
            data: attributionData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting full P&L attribution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get P&L attribution',
            message: error.message
        });
    }
});

/**
 * GET /api/attribution/factors/:portfolioId
 * Get factor attribution analysis
 */
router.get('/factors/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { period = '1d' } = req.query;

        const factorAttribution = await attributionService.calculateFactorAttribution(portfolioId, period);

        res.json({
            success: true,
            data: factorAttribution,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting factor attribution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get factor attribution',
            message: error.message
        });
    }
});

/**
 * GET /api/attribution/strategies/:portfolioId
 * Get strategy attribution analysis
 */
router.get('/strategies/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { period = '1d' } = req.query;

        const strategyAttribution = await attributionService.calculateStrategyAttribution(portfolioId, period);

        res.json({
            success: true,
            data: strategyAttribution,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting strategy attribution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get strategy attribution',
            message: error.message
        });
    }
});

/**
 * GET /api/attribution/assets/:portfolioId
 * Get asset-level attribution analysis
 */
router.get('/assets/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { period = '1d' } = req.query;

        const assetAttribution = await attributionService.calculateAssetAttribution(portfolioId, period);

        res.json({
            success: true,
            data: assetAttribution,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting asset attribution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get asset attribution',
            message: error.message
        });
    }
});

/**
 * GET /api/attribution/risk-adjusted/:portfolioId
 * Get risk-adjusted returns analysis
 */
router.get('/risk-adjusted/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { period = '1d' } = req.query;

        const riskAdjustedReturns = await attributionService.calculateRiskAdjustedReturns(portfolioId, period);

        res.json({
            success: true,
            data: riskAdjustedReturns,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting risk-adjusted returns:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get risk-adjusted returns',
            message: error.message
        });
    }
});

/**
 * GET /api/attribution/benchmark/:portfolioId
 * Get benchmark attribution comparison
 */
router.get('/benchmark/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { period = '1d' } = req.query;

        const benchmarkAttribution = await attributionService.calculateBenchmarkAttribution(portfolioId, period);

        res.json({
            success: true,
            data: benchmarkAttribution,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting benchmark attribution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get benchmark attribution',
            message: error.message
        });
    }
});

/**
 * GET /api/attribution/decomposition/:portfolioId
 * Get P&L decomposition analysis
 */
router.get('/decomposition/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { period = '1d' } = req.query;

        const pnlDecomposition = await attributionService.decomposePnL(portfolioId, period);

        res.json({
            success: true,
            data: pnlDecomposition,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting P&L decomposition:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get P&L decomposition',
            message: error.message
        });
    }
});

/**
 * GET /api/attribution/dashboard
 * Get attribution dashboard for multiple portfolios
 */
router.get('/dashboard', async (req, res) => {
    try {
        const { portfolios, period = '1d' } = req.query;
        const portfolioIds = portfolios ? portfolios.split(',') : ['portfolio1', 'portfolio2'];

        const dashboardData = {
            timestamp: new Date(),
            period: period,
            portfolios: {},
            summary: {
                totalPnL: 0,
                topPerformers: [],
                bottomPerformers: [],
                bestStrategies: [],
                worstStrategies: []
            }
        };

        // Get attribution for each portfolio
        for (const portfolioId of portfolioIds) {
            try {
                const attribution = await attributionService.getFullPnLAttribution(portfolioId, period);
                dashboardData.portfolios[portfolioId] = attribution;
                dashboardData.summary.totalPnL += attribution.totalPnL;
            } catch (error) {
                console.error(`Error getting attribution for ${portfolioId}:`, error);
                dashboardData.portfolios[portfolioId] = { error: error.message };
            }
        }

        // Calculate summary statistics
        const validPortfolios = Object.values(dashboardData.portfolios).filter(p => !p.error);
        
        if (validPortfolios.length > 0) {
            // Top and bottom performers
            const sortedByPnL = validPortfolios.sort((a, b) => b.totalPnL - a.totalPnL);
            dashboardData.summary.topPerformers = sortedByPnL.slice(0, 3).map(p => ({
                portfolioId: Object.keys(dashboardData.portfolios).find(id => dashboardData.portfolios[id] === p),
                pnl: p.totalPnL,
                return: p.totalPnL / 10000000 // Assuming $10M portfolio
            }));

            dashboardData.summary.bottomPerformers = sortedByPnL.slice(-3).reverse().map(p => ({
                portfolioId: Object.keys(dashboardData.portfolios).find(id => dashboardData.portfolios[id] === p),
                pnl: p.totalPnL,
                return: p.totalPnL / 10000000
            }));

            // Best and worst strategies (aggregate across portfolios)
            const allStrategies = {};
            validPortfolios.forEach(p => {
                if (p.attribution && p.attribution.strategies) {
                    Object.entries(p.attribution.strategies).forEach(([strategy, data]) => {
                        if (!allStrategies[strategy]) {
                            allStrategies[strategy] = { totalContribution: 0, count: 0 };
                        }
                        allStrategies[strategy].totalContribution += data.contribution || 0;
                        allStrategies[strategy].count += 1;
                    });
                }
            });

            const strategySummary = Object.entries(allStrategies).map(([name, data]) => ({
                name,
                avgContribution: data.totalContribution / data.count,
                totalContribution: data.totalContribution
            }));

            dashboardData.summary.bestStrategies = strategySummary
                .sort((a, b) => b.avgContribution - a.avgContribution)
                .slice(0, 3);

            dashboardData.summary.worstStrategies = strategySummary
                .sort((a, b) => a.avgContribution - b.avgContribution)
                .slice(0, 3);
        }

        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting attribution dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get attribution dashboard',
            message: error.message
        });
    }
});

/**
 * GET /api/attribution/reports/:portfolioId
 * Get attribution reports
 */
router.get('/reports/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { report_type = 'summary', period = '1d' } = req.query;

        const reports = {
            summary: await generateSummaryReport(portfolioId, period),
            detailed: await generateDetailedReport(portfolioId, period),
            risk: await generateRiskReport(portfolioId, period),
            benchmark: await generateBenchmarkReport(portfolioId, period)
        };

        const requestedReport = reports[report_type] || reports.summary;

        res.json({
            success: true,
            data: requestedReport,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error generating attribution report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate attribution report',
            message: error.message
        });
    }
});

/**
 * POST /api/attribution/analyze
 * Custom attribution analysis
 */
router.post('/analyze', async (req, res) => {
    try {
        const {
            portfolioId,
            period = '1d',
            factors = ['all'],
            benchmark = 'SPY',
            riskAdjusted = true
        } = req.body;

        if (!portfolioId) {
            return res.status(400).json({
                success: false,
                error: 'Portfolio ID is required'
            });
        }

        const analysisData = {
            portfolioId,
            period,
            timestamp: new Date(),
            results: {}
        };

        // Get full attribution if 'all' factors requested
        if (factors.includes('all')) {
            analysisData.results.full = await attributionService.getFullPnLAttribution(portfolioId, period);
        } else {
            // Get specific factor attribution
            if (factors.includes('factors')) {
                analysisData.results.factors = await attributionService.calculateFactorAttribution(portfolioId, period);
            }
            if (factors.includes('strategies')) {
                analysisData.results.strategies = await attributionService.calculateStrategyAttribution(portfolioId, period);
            }
            if (factors.includes('assets')) {
                analysisData.results.assets = await attributionService.calculateAssetAttribution(portfolioId, period);
            }
        }

        // Add risk-adjusted metrics if requested
        if (riskAdjusted) {
            analysisData.results.riskAdjusted = await attributionService.calculateRiskAdjustedReturns(portfolioId, period);
        }

        // Add benchmark comparison
        analysisData.results.benchmark = await attributionService.calculateBenchmarkAttribution(portfolioId, period);

        res.json({
            success: true,
            data: analysisData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error performing custom attribution analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform attribution analysis',
            message: error.message
        });
    }
});

/**
 * GET /api/attribution/performance-metrics/:portfolioId
 * Get performance metrics summary
 */
router.get('/performance-metrics/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { period = '1d' } = req.query;

        const metrics = {
            portfolioId,
            period,
            timestamp: new Date(),
            pnl: await attributionService.getPortfolioPnL(portfolioId, period),
            riskAdjusted: await attributionService.calculateRiskAdjustedReturns(portfolioId, period),
            decomposition: await attributionService.decomposePnL(portfolioId, period)
        };

        // Add additional performance metrics
        metrics.summary = {
            totalReturn: metrics.pnl.return,
            annualizedReturn: metrics.pnl.return * (365 / getPeriodDays(period)),
            sharpeRatio: metrics.riskAdjusted.sharpeRatio,
            maxDrawdown: await attributionService.getMaxDrawdown(portfolioId, period),
            volatility: await attributionService.getPortfolioVolatility(portfolioId, period),
            beta: await attributionService.getPortfolioBeta(portfolioId, period)
        };

        res.json({
            success: true,
            data: metrics,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting performance metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get performance metrics',
            message: error.message
        });
    }
});

// Helper functions

async function generateSummaryReport(portfolioId, period) {
    const attribution = await attributionService.getFullPnLAttribution(portfolioId, period);
    
    return {
        title: 'P&L Attribution Summary Report',
        portfolioId,
        period,
        generatedAt: new Date(),
        overview: {
            totalPnL: attribution.totalPnL,
            totalReturn: attribution.totalPnL / 10000000,
            keyDrivers: attribution.insights.slice(0, 3)
        },
        topContributors: Object.entries(attribution.attribution.strategies)
            .sort(([,a], [,b]) => b.contribution - a.contribution)
            .slice(0, 5)
            .map(([name, data]) => ({ name, contribution: data.contribution })),
        riskMetrics: attribution.riskAdjusted,
        recommendations: [
            'Monitor top performing strategies for sustainability',
            'Consider rebalancing underperforming allocations',
            'Review risk-adjusted performance metrics'
        ]
    };
}

async function generateDetailedReport(portfolioId, period) {
    const attribution = await attributionService.getFullPnLAttribution(portfolioId, period);
    
    return {
        title: 'Detailed P&L Attribution Report',
        portfolioId,
        period,
        generatedAt: new Date(),
        fullAttribution: attribution,
        analysis: {
            factorBreakdown: attribution.attribution.factors,
            strategyBreakdown: attribution.attribution.strategies,
            assetBreakdown: attribution.attribution.assets,
            decomposition: attribution.decomposition
        },
        insights: attribution.insights
    };
}

async function generateRiskReport(portfolioId, period) {
    const riskAdjusted = await attributionService.calculateRiskAdjustedReturns(portfolioId, period);
    
    return {
        title: 'Risk-Adjusted Performance Report',
        portfolioId,
        period,
        generatedAt: new Date(),
        metrics: riskAdjusted,
        assessment: {
            riskLevel: riskAdjusted.sharpeRatio > 1.5 ? 'OPTIMAL' : riskAdjusted.sharpeRatio > 1.0 ? 'GOOD' : 'REVIEW_NEEDED',
            strengths: riskAdjusted.sharpeRatio > 1.0 ? ['Strong risk-adjusted returns'] : [],
            concerns: riskAdjusted.sharpeRatio < 1.0 ? ['Below optimal risk-adjusted performance'] : []
        }
    };
}

async function generateBenchmarkReport(portfolioId, period) {
    const benchmarkAttribution = await attributionService.calculateBenchmarkAttribution(portfolioId, period);
    
    return {
        title: 'Benchmark Comparison Report',
        portfolioId,
        period,
        generatedAt: new Date(),
        comparisons: benchmarkAttribution,
        summary: {
            outperformingBenchmarks: Object.entries(benchmarkAttribution)
                .filter(([, data]) => data.activeReturn > 0)
                .map(([benchmark]) => benchmark),
            underperformingBenchmarks: Object.entries(benchmarkAttribution)
                .filter(([, data]) => data.activeReturn < 0)
                .map(([benchmark]) => benchmark)
        }
    };
}

function getPeriodDays(period) {
    const periods = {
        '1d': 1,
        '1w': 7,
        '1m': 30,
        '3m': 90,
        '6m': 180,
        '1y': 365
    };
    return periods[period] || 30;
}

module.exports = { router, initializeAttributionRoutes };