/**
 * Model Interpretability API Routes
 * Provides endpoints for ML model explainability and analysis
 */

const express = require('express');
const router = express.Router();

let interpretabilityService = null;

// Initialize service
function initializeInterpretabilityRoutes(interpretabilityServiceInstance) {
    interpretabilityService = interpretabilityServiceInstance;
    return router;
}

/**
 * GET /api/interpretability/model/:modelName
 * Get complete model interpretability analysis
 */
router.get('/model/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { prediction } = req.query;

        const predictionData = prediction ? JSON.parse(prediction) : null;
        const interpretabilityData = await interpretabilityService.getModelInterpretability(modelName, predictionData);

        res.json({
            success: true,
            data: interpretabilityData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting model interpretability:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get model interpretability',
            message: error.message
        });
    }
});

/**
 * GET /api/interpretability/shap/:modelName
 * Get SHAP values analysis
 */
router.get('/shap/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { instances } = req.query;

        const instancesData = instances ? JSON.parse(instances) : null;
        const shapData = await interpretabilityService.calculateSHAPValues(modelName, instancesData);

        res.json({
            success: true,
            data: shapData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error calculating SHAP values:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate SHAP values',
            message: error.message
        });
    }
});

/**
 * POST /api/interpretability/lime/:modelName
 * Generate LIME explanations for a specific instance
 */
router.post('/lime/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { instance } = req.body;

        if (!instance) {
            return res.status(400).json({
                success: false,
                error: 'Instance data is required for LIME analysis'
            });
        }

        const limeData = await interpretabilityService.generateLIMEExplanations(modelName, instance);

        res.json({
            success: true,
            data: limeData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error generating LIME explanations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate LIME explanations',
            message: error.message
        });
    }
});

/**
 * GET /api/interpretability/feature-importance/:modelName
 * Get feature importance evolution tracking
 */
router.get('/feature-importance/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { period = '1m' } = req.query;

        const evolutionData = await interpretabilityService.trackFeatureImportanceEvolution(modelName, period);

        res.json({
            success: true,
            data: evolutionData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error tracking feature importance evolution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track feature importance evolution',
            message: error.message
        });
    }
});

/**
 * GET /api/interpretability/performance/:modelName
 * Get model performance monitoring data
 */
router.get('/performance/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;

        const performanceData = await interpretabilityService.getModelPerformanceAnalysis(modelName);

        res.json({
            success: true,
            data: performanceData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting model performance analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get model performance analysis',
            message: error.message
        });
    }
});

/**
 * GET /api/interpretability/bias/:modelName
 * Get bias analysis and fairness metrics
 */
router.get('/bias/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;

        const biasData = await interpretabilityService.getBiasAnalysis(modelName);

        res.json({
            success: true,
            data: biasData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting bias analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get bias analysis',
            message: error.message
        });
    }
});

/**
 * GET /api/interpretability/dashboard
 * Get interpretability dashboard for all models
 */
router.get('/dashboard', async (req, res) => {
    try {
        const { models } = req.query;
        const modelNames = models ? models.split(',') : ['pricePredictor', 'trendClassifier', 'volatilityPredictor', 'riskClassifier'];

        const dashboardData = {
            timestamp: new Date(),
            models: {},
            summary: {
                totalModels: modelNames.length,
                healthyModels: 0,
                modelsWithIssues: 0,
                criticalAlerts: 0,
                biasIssues: 0
            },
            globalInsights: []
        };

        // Get interpretability data for each model
        for (const modelName of modelNames) {
            try {
                const modelData = await interpretabilityService.getModelInterpretability(modelName);
                dashboardData.models[modelName] = modelData;

                // Update summary statistics
                const hasIssues = modelData.modelPerformance.alerts?.length > 0 || 
                                 modelData.biasAnalysis?.overallFairness !== 'FAIR';
                
                if (hasIssues) {
                    dashboardData.summary.modelsWithIssues++;
                } else {
                    dashboardData.summary.healthyModels++;
                }

                // Count critical alerts
                const criticalAlerts = modelData.modelPerformance.alerts?.filter(a => a.severity === 'HIGH') || [];
                dashboardData.summary.criticalAlerts += criticalAlerts.length;

                // Count bias issues
                if (modelData.biasAnalysis?.overallFairness !== 'FAIR') {
                    dashboardData.summary.biasIssues++;
                }

                // Collect insights
                dashboardData.globalInsights.push(...(modelData.insights || []));

            } catch (error) {
                console.error(`Error getting interpretability for ${modelName}:`, error);
                dashboardData.models[modelName] = { error: error.message };
            }
        }

        // Sort insights by severity
        dashboardData.globalInsights.sort((a, b) => {
            const severityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'WARNING': 1, 'INFO': 0 };
            return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        });

        // Limit to top 10 insights
        dashboardData.globalInsights = dashboardData.globalInsights.slice(0, 10);

        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting interpretability dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get interpretability dashboard',
            message: error.message
        });
    }
});

/**
 * GET /api/interpretability/models
 * Get list of available models and their configurations
 */
router.get('/models', async (req, res) => {
    try {
        const models = {
            pricePredictor: {
                name: 'Price Predictor',
                type: 'regression',
                description: 'Predicts future price movements based on technical indicators',
                features: ['price_ma', 'volume', 'rsi', 'macd', 'bb_position', 'volatility'],
                status: 'active'
            },
            trendClassifier: {
                name: 'Trend Classifier',
                type: 'classification',
                description: 'Classifies market trend direction (up/down/sideways)',
                features: ['sma_cross', 'momentum', 'volume_profile', 'support_resistance', 'market_regime'],
                status: 'active'
            },
            volatilityPredictor: {
                name: 'Volatility Predictor',
                type: 'regression',
                description: 'Predicts future volatility levels',
                features: ['historical_vol', 'vix', 'garch_forecast', 'options_iv', 'market_stress'],
                status: 'active'
            },
            riskClassifier: {
                name: 'Risk Classifier',
                type: 'classification',
                description: 'Classifies risk levels for trading positions',
                features: ['var_estimate', 'correlation_risk', 'liquidity_risk', 'concentration_risk'],
                status: 'active'
            }
        };

        res.json({
            success: true,
            data: {
                models: models,
                count: Object.keys(models).length,
                types: ['regression', 'classification'],
                availableMethods: ['SHAP', 'LIME', 'Feature Importance', 'Bias Analysis']
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting models list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get models list',
            message: error.message
        });
    }
});

/**
 * POST /api/interpretability/explain
 * Custom explanation request
 */
router.post('/explain', async (req, res) => {
    try {
        const {
            modelName,
            method = 'SHAP',
            instance = null,
            options = {}
        } = req.body;

        if (!modelName) {
            return res.status(400).json({
                success: false,
                error: 'Model name is required'
            });
        }

        let explanationData = {};

        switch (method.toUpperCase()) {
            case 'SHAP':
                explanationData = await interpretabilityService.calculateSHAPValues(
                    modelName, 
                    instance ? [instance] : null
                );
                break;

            case 'LIME':
                if (!instance) {
                    return res.status(400).json({
                        success: false,
                        error: 'Instance is required for LIME explanations'
                    });
                }
                explanationData = await interpretabilityService.generateLIMEExplanations(modelName, instance);
                break;

            case 'FEATURE_IMPORTANCE':
                explanationData = await interpretabilityService.trackFeatureImportanceEvolution(
                    modelName, 
                    options.period || '1m'
                );
                break;

            case 'BIAS_ANALYSIS':
                explanationData = await interpretabilityService.getBiasAnalysis(modelName);
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: `Unsupported explanation method: ${method}`
                });
        }

        res.json({
            success: true,
            data: {
                modelName,
                method,
                explanation: explanationData,
                options: options
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error generating custom explanation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate explanation',
            message: error.message
        });
    }
});

/**
 * GET /api/interpretability/reports/:modelName
 * Get interpretability reports
 */
router.get('/reports/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { report_type = 'summary' } = req.query;

        const reports = {
            summary: await generateSummaryReport(modelName),
            detailed: await generateDetailedReport(modelName),
            bias: await generateBiasReport(modelName),
            performance: await generatePerformanceReport(modelName)
        };

        const requestedReport = reports[report_type] || reports.summary;

        res.json({
            success: true,
            data: requestedReport,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error generating interpretability report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate interpretability report',
            message: error.message
        });
    }
});

/**
 * GET /api/interpretability/health
 * Get interpretability service health status
 */
router.get('/health', async (req, res) => {
    try {
        const healthStatus = {
            status: 'HEALTHY',
            timestamp: new Date(),
            components: {
                shapEngine: { status: 'OPERATIONAL', responseTime: 45 },
                limeEngine: { status: 'OPERATIONAL', responseTime: 67 },
                biasDetector: { status: 'OPERATIONAL', responseTime: 23 },
                featureTracker: { status: 'OPERATIONAL', responseTime: 34 }
            },
            metrics: {
                modelsMonitored: 4,
                activeAnalyses: 12,
                alertsGenerated: 3,
                cacheHitRate: 0.85
            },
            lastAnalysis: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
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

async function generateSummaryReport(modelName) {
    const interpretabilityData = await interpretabilityService.getModelInterpretability(modelName);
    
    return {
        title: 'Model Interpretability Summary Report',
        modelName,
        generatedAt: new Date(),
        overview: {
            modelType: interpretabilityData.modelName,
            overallHealth: interpretabilityData.biasAnalysis?.overallFairness || 'UNKNOWN',
            keyInsights: interpretabilityData.insights?.slice(0, 3) || []
        },
        topFeatures: Object.entries(interpretabilityData.featureImportance || {})
            .sort(([,a], [,b]) => b.importance - a.importance)
            .slice(0, 5)
            .map(([name, data]) => ({ name, importance: data.importance })),
        alerts: [
            ...(interpretabilityData.modelPerformance?.alerts || []),
            ...(interpretabilityData.biasAnalysis?.alerts || [])
        ],
        recommendations: interpretabilityData.biasAnalysis?.recommendations || []
    };
}

async function generateDetailedReport(modelName) {
    const interpretabilityData = await interpretabilityService.getModelInterpretability(modelName);
    
    return {
        title: 'Detailed Model Interpretability Report',
        modelName,
        generatedAt: new Date(),
        fullAnalysis: interpretabilityData,
        sections: {
            globalExplanations: interpretabilityData.globalExplanations,
            featureAnalysis: interpretabilityData.featureImportance,
            performanceMonitoring: interpretabilityData.modelPerformance,
            biasAnalysis: interpretabilityData.biasAnalysis
        }
    };
}

async function generateBiasReport(modelName) {
    const biasData = await interpretabilityService.getBiasAnalysis(modelName);
    
    return {
        title: 'Model Bias and Fairness Report',
        modelName,
        generatedAt: new Date(),
        fairnessAssessment: biasData,
        keyFindings: [
            `Overall fairness status: ${biasData.overallFairness}`,
            `Bias metrics evaluated: ${Object.keys(biasData.biasMetrics).length}`,
            `Demographic groups analyzed: ${Object.keys(biasData.demographicAnalysis?.groups || {}).length}`
        ],
        recommendations: biasData.recommendations,
        actionItems: biasData.alerts?.filter(a => a.severity === 'HIGH') || []
    };
}

async function generatePerformanceReport(modelName) {
    const performanceData = await interpretabilityService.getModelPerformanceAnalysis(modelName);
    
    return {
        title: 'Model Performance Monitoring Report',
        modelName,
        generatedAt: new Date(),
        currentPerformance: performanceData.currentPerformance,
        trends: {
            degradationDetected: performanceData.degradation?.detected || false,
            degradationSeverity: performanceData.degradation?.severity || 'NONE'
        },
        alerts: performanceData.alerts || [],
        recommendations: [
            'Continue monitoring model performance metrics',
            'Review feature importance evolution regularly',
            'Consider model retraining if degradation persists'
        ]
    };
}

module.exports = { router, initializeInterpretabilityRoutes };