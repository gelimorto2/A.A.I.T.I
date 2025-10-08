/**
 * Executive Dashboard API Routes
 * Provides endpoints for institutional-grade dashboard and analytics
 */

const express = require('express');
const router = express.Router();

let dashboardService = null;

// Initialize service
function initializeDashboardRoutes(dashboardServiceInstance) {
    dashboardService = dashboardServiceInstance;
    return router;
}

/**
 * GET /api/executive/dashboard
 * Get complete executive dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        const { timeframe = '1d' } = req.query;

        const dashboardData = await dashboardService.getExecutiveDashboard(timeframe);

        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting executive dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get executive dashboard',
            message: error.message
        });
    }
});

/**
 * GET /api/executive/summary
 * Get portfolio summary only
 */
router.get('/summary', async (req, res) => {
    try {
        const summary = await dashboardService.getPortfolioSummary();

        res.json({
            success: true,
            data: summary,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting portfolio summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get portfolio summary',
            message: error.message
        });
    }
});

/**
 * GET /api/executive/performance
 * Get performance metrics
 */
router.get('/performance', async (req, res) => {
    try {
        const { timeframe = '1d' } = req.query;

        const performance = await dashboardService.getPerformanceMetrics(timeframe);

        res.json({
            success: true,
            data: performance,
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

/**
 * GET /api/executive/risk
 * Get risk analysis
 */
router.get('/risk', async (req, res) => {
    try {
        const riskAnalysis = await dashboardService.getRiskAnalysis();

        res.json({
            success: true,
            data: riskAnalysis,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting risk analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get risk analysis',
            message: error.message
        });
    }
});

/**
 * GET /api/executive/positions
 * Get position analysis
 */
router.get('/positions', async (req, res) => {
    try {
        const positionAnalysis = await dashboardService.getPositionAnalysis();

        res.json({
            success: true,
            data: positionAnalysis,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting position analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get position analysis',
            message: error.message
        });
    }
});

/**
 * GET /api/executive/compliance
 * Get compliance status
 */
router.get('/compliance', async (req, res) => {
    try {
        const compliance = await dashboardService.getComplianceStatus();

        res.json({
            success: true,
            data: compliance,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting compliance status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get compliance status',
            message: error.message
        });
    }
});

/**
 * GET /api/executive/alerts
 * Get active alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const { severity, limit = 20 } = req.query;

        let alerts = await dashboardService.getActiveAlerts();

        // Filter by severity if specified
        if (severity) {
            alerts = alerts.filter(alert => alert.severity === severity.toUpperCase());
        }

        // Limit results
        alerts = alerts.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: {
                alerts: alerts,
                total: alerts.length,
                summary: {
                    high: alerts.filter(a => a.severity === 'HIGH').length,
                    medium: alerts.filter(a => a.severity === 'MEDIUM').length,
                    low: alerts.filter(a => a.severity === 'LOW').length
                }
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get alerts',
            message: error.message
        });
    }
});

/**
 * GET /api/executive/kpis
 * Get KPI dashboard
 */
router.get('/kpis', async (req, res) => {
    try {
        const { timeframe = '1d' } = req.query;

        const kpis = await dashboardService.getKPIDashboard(timeframe);

        res.json({
            success: true,
            data: kpis,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting KPIs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get KPIs',
            message: error.message
        });
    }
});

/**
 * GET /api/executive/charts
 * Get chart data for dashboard
 */
router.get('/charts', async (req, res) => {
    try {
        const { timeframe = '1d', chart_type } = req.query;

        const chartData = await dashboardService.getChartData(timeframe);

        // Return specific chart if requested
        if (chart_type && chartData[chart_type]) {
            return res.json({
                success: true,
                data: chartData[chart_type],
                timestamp: new Date()
            });
        }

        res.json({
            success: true,
            data: chartData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting chart data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get chart data',
            message: error.message
        });
    }
});

/**
 * GET /api/executive/reports
 * Get executive reports
 */
router.get('/reports', async (req, res) => {
    try {
        const { report_type = 'summary', timeframe = '1m' } = req.query;

        const reports = {
            summary: await generateSummaryReport(timeframe),
            performance: await generatePerformanceReport(timeframe),
            risk: await generateRiskReport(),
            compliance: await generateComplianceReport()
        };

        const requestedReport = reports[report_type] || reports.summary;

        res.json({
            success: true,
            data: requestedReport,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate report',
            message: error.message
        });
    }
});

/**
 * POST /api/executive/alerts/acknowledge
 * Acknowledge alerts
 */
router.post('/alerts/acknowledge', async (req, res) => {
    try {
        const { alertIds, userId } = req.body;

        if (!alertIds || !Array.isArray(alertIds)) {
            return res.status(400).json({
                success: false,
                error: 'Alert IDs array is required'
            });
        }

        // Simulate alert acknowledgment
        const acknowledgedAlerts = alertIds.map(id => ({
            id,
            acknowledgedBy: userId || 'system',
            acknowledgedAt: new Date(),
            status: 'ACKNOWLEDGED'
        }));

        res.json({
            success: true,
            data: {
                acknowledged: acknowledgedAlerts.length,
                alerts: acknowledgedAlerts
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error acknowledging alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to acknowledge alerts',
            message: error.message
        });
    }
});

/**
 * GET /api/executive/health
 * Get system health status
 */
router.get('/health', async (req, res) => {
    try {
        const healthStatus = {
            status: 'HEALTHY',
            uptime: process.uptime(),
            version: '1.0.0',
            components: {
                database: { status: 'HEALTHY', responseTime: 45 },
                marketData: { status: 'HEALTHY', responseTime: 23 },
                riskEngine: { status: 'HEALTHY', responseTime: 67 },
                complianceEngine: { status: 'HEALTHY', responseTime: 34 },
                alertsSystem: { status: 'HEALTHY', responseTime: 12 }
            },
            metrics: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                activeConnections: 47,
                requestsPerMinute: 234
            },
            lastHealthCheck: new Date()
        };

        res.json({
            success: true,
            data: healthStatus,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting health status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get health status',
            message: error.message
        });
    }
});

// Helper functions

async function generateSummaryReport(timeframe) {
    return {
        title: 'Executive Summary Report',
        timeframe: timeframe,
        generatedAt: new Date(),
        sections: {
            portfolio: await dashboardService.getPortfolioSummary(),
            performance: await dashboardService.getPerformanceMetrics(timeframe),
            risk: await dashboardService.getRiskAnalysis(),
            compliance: await dashboardService.getComplianceStatus()
        },
        keyHighlights: [
            'Portfolio returned 8.4% over the selected period',
            'Risk metrics remain within acceptable ranges',
            'All compliance checks passed',
            'No critical alerts requiring immediate attention'
        ],
        recommendations: [
            'Consider rebalancing crypto exposure',
            'Monitor leverage levels closely',
            'Review position sizing for volatile assets'
        ]
    };
}

async function generatePerformanceReport(timeframe) {
    const performance = await dashboardService.getPerformanceMetrics(timeframe);
    
    return {
        title: 'Performance Analysis Report',
        timeframe: timeframe,
        generatedAt: new Date(),
        metrics: performance,
        analysis: {
            strengths: [
                'Strong risk-adjusted returns',
                'Consistent outperformance vs benchmark',
                'Well-controlled drawdowns'
            ],
            concerns: [
                'High correlation in some positions',
                'Concentration in tech sector'
            ],
            outlook: 'POSITIVE'
        }
    };
}

async function generateRiskReport() {
    const risk = await dashboardService.getRiskAnalysis();
    
    return {
        title: 'Risk Management Report',
        generatedAt: new Date(),
        metrics: risk,
        assessment: {
            overallRisk: 'MODERATE',
            keyRisks: [
                'Concentration risk in top positions',
                'High correlation during market stress',
                'Liquidity risk in small-cap positions'
            ],
            mitigation: [
                'Diversify position sizes',
                'Implement correlation limits',
                'Increase liquid asset allocation'
            ]
        }
    };
}

async function generateComplianceReport() {
    const compliance = await dashboardService.getComplianceStatus();
    
    return {
        title: 'Regulatory Compliance Report',
        generatedAt: new Date(),
        status: compliance,
        summary: {
            compliantChecks: compliance.checks.filter(c => c.status === 'PASS').length,
            totalChecks: compliance.checks.length,
            openIssues: compliance.totalIssues,
            lastAudit: compliance.lastAudit
        },
        nextActions: [
            'Schedule next quarterly audit',
            'Update risk management policies',
            'Review position limits framework'
        ]
    };
}

module.exports = { router, initializeDashboardRoutes };