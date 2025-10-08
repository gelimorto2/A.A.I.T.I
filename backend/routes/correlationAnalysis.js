/**
 * Cross-Asset Correlation Analysis API Routes
 * REST API endpoints for correlation analysis service
 */

const express = require('express');
const router = express.Router();

module.exports = (correlationAnalyzer, logger) => {
    
    /**
     * POST /api/correlation-analysis/matrix
     * Calculate correlation matrix for specified assets
     */
    router.post('/matrix', async (req, res) => {
        try {
            const { assets, window = 90 } = req.body;
            
            if (!assets || !Array.isArray(assets) || assets.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'At least 2 assets required for correlation analysis'
                });
            }
            
            const correlationMatrix = await correlationAnalyzer.calculateCorrelationMatrix(
                assets, 
                parseInt(window)
            );
            
            res.json({
                success: true,
                data: correlationMatrix,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error calculating correlation matrix', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to calculate correlation matrix',
                message: error.message
            });
        }
    });

    /**
     * GET /api/correlation-analysis/sector-rotation
     * Analyze sector rotation patterns
     */
    router.get('/sector-rotation', async (req, res) => {
        try {
            const { lookback = 60 } = req.query;
            
            const rotationAnalysis = await correlationAnalyzer.analyzeSectorRotation(
                parseInt(lookback)
            );
            
            res.json({
                success: true,
                data: rotationAnalysis,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error analyzing sector rotation', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to analyze sector rotation',
                message: error.message
            });
        }
    });

    /**
     * POST /api/correlation-analysis/macro-exposure
     * Track macro factor exposure for assets
     */
    router.post('/macro-exposure', async (req, res) => {
        try {
            const { assets, factors } = req.body;
            
            if (!assets || !Array.isArray(assets) || assets.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Assets array is required'
                });
            }
            
            const exposureAnalysis = await correlationAnalyzer.trackMacroFactorExposure(
                assets, 
                factors
            );
            
            res.json({
                success: true,
                data: exposureAnalysis,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error tracking macro factor exposure', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to track macro factor exposure',
                message: error.message
            });
        }
    });

    /**
     * POST /api/correlation-analysis/dynamic
     * Analyze dynamic correlations across multiple time windows
     */
    router.post('/dynamic', async (req, res) => {
        try {
            const { assets, windows = [30, 60, 90, 180] } = req.body;
            
            if (!assets || !Array.isArray(assets) || assets.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'At least 2 assets required for dynamic correlation analysis'
                });
            }
            
            const dynamicAnalysis = await correlationAnalyzer.analyzeDynamicCorrelations(
                assets, 
                windows.map(w => parseInt(w))
            );
            
            res.json({
                success: true,
                data: dynamicAnalysis,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error analyzing dynamic correlations', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to analyze dynamic correlations',
                message: error.message
            });
        }
    });

    /**
     * POST /api/correlation-analysis/optimize-portfolio
     * Optimize portfolio for target correlation
     */
    router.post('/optimize-portfolio', async (req, res) => {
        try {
            const { assets, targetCorrelation = 0.3, constraints = {} } = req.body;
            
            if (!assets || !Array.isArray(assets) || assets.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'At least 2 assets required for portfolio optimization'
                });
            }
            
            const optimization = await correlationAnalyzer.optimizePortfolioCorrelations(
                assets, 
                parseFloat(targetCorrelation), 
                constraints
            );
            
            res.json({
                success: true,
                data: optimization,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error optimizing portfolio correlations', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to optimize portfolio correlations',
                message: error.message
            });
        }
    });

    /**
     * GET /api/correlation-analysis/heatmap/:assets
     * Get correlation heatmap data for visualization
     */
    router.get('/heatmap/:assets', async (req, res) => {
        try {
            const { assets } = req.params;
            const { window = 90 } = req.query;
            
            const assetsList = assets.split(',');
            
            if (assetsList.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'At least 2 assets required for correlation heatmap'
                });
            }
            
            const correlationMatrix = await correlationAnalyzer.calculateCorrelationMatrix(
                assetsList, 
                parseInt(window)
            );
            
            // Format data for heatmap visualization
            const heatmapData = {
                assets: assetsList,
                matrix: correlationMatrix.matrix,
                statistics: correlationMatrix.statistics,
                colorScale: generateColorScale(correlationMatrix.matrix),
                timestamp: new Date()
            };
            
            res.json({
                success: true,
                data: heatmapData,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error generating correlation heatmap', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to generate correlation heatmap',
                message: error.message
            });
        }
    });

    /**
     * GET /api/correlation-analysis/network/:assets
     * Get correlation network data for network visualization
     */
    router.get('/network/:assets', async (req, res) => {
        try {
            const { assets } = req.params;
            const { threshold = 0.5, window = 90 } = req.query;
            
            const assetsList = assets.split(',');
            
            if (assetsList.length < 3) {
                return res.status(400).json({
                    success: false,
                    error: 'At least 3 assets required for network analysis'
                });
            }
            
            const correlationMatrix = await correlationAnalyzer.calculateCorrelationMatrix(
                assetsList, 
                parseInt(window)
            );
            
            // Generate network data
            const networkData = {
                nodes: assetsList.map(asset => ({
                    id: asset,
                    label: asset,
                    size: calculateNodeSize(asset, correlationMatrix.matrix)
                })),
                edges: [],
                clusters: correlationMatrix.clusters,
                timestamp: new Date()
            };

            // Create edges for correlations above threshold
            const thresholdValue = parseFloat(threshold);
            for (let i = 0; i < assetsList.length; i++) {
                for (let j = i + 1; j < assetsList.length; j++) {
                    const correlation = correlationMatrix.matrix[assetsList[i]][assetsList[j]];
                    if (Math.abs(correlation) >= thresholdValue) {
                        networkData.edges.push({
                            source: assetsList[i],
                            target: assetsList[j],
                            weight: Math.abs(correlation),
                            correlation: correlation,
                            color: correlation > 0 ? 'green' : 'red'
                        });
                    }
                }
            }
            
            res.json({
                success: true,
                data: networkData,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error generating correlation network', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to generate correlation network',
                message: error.message
            });
        }
    });

    /**
     * GET /api/correlation-analysis/insights/:assets
     * Get correlation insights and recommendations
     */
    router.get('/insights/:assets', async (req, res) => {
        try {
            const { assets } = req.params;
            const { window = 90 } = req.query;
            
            const assetsList = assets.split(',');
            
            const correlationMatrix = await correlationAnalyzer.calculateCorrelationMatrix(
                assetsList, 
                parseInt(window)
            );
            
            // Get additional analysis
            const dynamicAnalysis = await correlationAnalyzer.analyzeDynamicCorrelations(
                assetsList, 
                [30, 60, 90]
            );
            
            const insights = {
                correlationInsights: correlationMatrix.insights,
                dynamicInsights: dynamicAnalysis.insights,
                diversificationScore: calculateDiversificationScore(correlationMatrix.matrix),
                riskConcentration: assessRiskConcentration(correlationMatrix),
                recommendations: generateRecommendations(correlationMatrix, dynamicAnalysis),
                timestamp: new Date()
            };
            
            res.json({
                success: true,
                data: insights,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error generating correlation insights', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to generate correlation insights',
                message: error.message
            });
        }
    });

    /**
     * GET /api/correlation-analysis/monitor
     * Real-time correlation monitoring for default assets
     */
    router.get('/monitor', async (req, res) => {
        try {
            const defaultAssets = ['BTC', 'ETH', 'ADA', 'SOL'];
            
            const currentCorrelations = await correlationAnalyzer.calculateCorrelationMatrix(defaultAssets, 30);
            const historicalCorrelations = await correlationAnalyzer.calculateCorrelationMatrix(defaultAssets, 90);
            
            const monitoringData = {
                current: currentCorrelations,
                historical: historicalCorrelations,
                changes: calculateCorrelationChanges(currentCorrelations.matrix, historicalCorrelations.matrix),
                alerts: generateCorrelationAlerts(currentCorrelations, historicalCorrelations),
                timestamp: new Date()
            };
            
            res.json({
                success: true,
                data: monitoringData,
                timestamp: new Date()
            });
            
        } catch (error) {
            logger.error('Error in correlation monitoring', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to monitor correlations',
                message: error.message
            });
        }
    });

    return router;
};

// Helper functions for data processing

function generateColorScale(matrix) {
    const assets = Object.keys(matrix);
    const colorData = [];
    
    assets.forEach((asset1, i) => {
        assets.forEach((asset2, j) => {
            colorData.push({
                x: i,
                y: j,
                value: matrix[asset1][asset2],
                color: getCorrelationColor(matrix[asset1][asset2])
            });
        });
    });
    
    return colorData;
}

function getCorrelationColor(correlation) {
    if (correlation > 0.7) return '#d32f2f'; // Strong positive - red
    if (correlation > 0.3) return '#ff9800'; // Moderate positive - orange
    if (correlation > -0.3) return '#4caf50'; // Weak - green
    if (correlation > -0.7) return '#2196f3'; // Moderate negative - blue
    return '#9c27b0'; // Strong negative - purple
}

function calculateNodeSize(asset, matrix) {
    // Node size based on average correlation with other assets
    const assets = Object.keys(matrix);
    let totalCorrelation = 0;
    let count = 0;
    
    assets.forEach(otherAsset => {
        if (asset !== otherAsset) {
            totalCorrelation += Math.abs(matrix[asset][otherAsset]);
            count++;
        }
    });
    
    const avgCorrelation = count > 0 ? totalCorrelation / count : 0;
    return 10 + avgCorrelation * 20; // Size between 10-30
}

function calculateDiversificationScore(matrix) {
    const assets = Object.keys(matrix);
    let totalCorrelation = 0;
    let count = 0;
    
    for (let i = 0; i < assets.length; i++) {
        for (let j = i + 1; j < assets.length; j++) {
            totalCorrelation += Math.abs(matrix[assets[i]][assets[j]]);
            count++;
        }
    }
    
    const avgAbsCorrelation = count > 0 ? totalCorrelation / count : 0;
    return Math.max(0, 1 - avgAbsCorrelation); // Higher score = better diversification
}

function assessRiskConcentration(correlationMatrix) {
    const strongCorrelations = correlationMatrix.statistics.strongCorrelations;
    
    return {
        level: strongCorrelations.length > 3 ? 'HIGH' : strongCorrelations.length > 1 ? 'MEDIUM' : 'LOW',
        count: strongCorrelations.length,
        affectedAssets: [...new Set(strongCorrelations.flatMap(sc => sc.pair))]
    };
}

function generateRecommendations(correlationMatrix, dynamicAnalysis) {
    const recommendations = [];
    
    // High correlation warning
    if (correlationMatrix.statistics.strongCorrelations.length > 0) {
        recommendations.push({
            type: 'REDUCE_CORRELATION',
            priority: 'HIGH',
            description: 'Consider reducing exposure to highly correlated assets',
            affected: correlationMatrix.statistics.strongCorrelations.map(sc => sc.pair).flat()
        });
    }

    // Diversification opportunity
    if (correlationMatrix.statistics.weakCorrelations.length > 0) {
        recommendations.push({
            type: 'INCREASE_ALLOCATION',
            priority: 'MEDIUM',
            description: 'Consider increasing allocation to weakly correlated assets',
            affected: correlationMatrix.statistics.weakCorrelations.map(wc => wc.pair).flat()
        });
    }

    return recommendations;
}

function calculateCorrelationChanges(currentMatrix, historicalMatrix) {
    const changes = {};
    const assets = Object.keys(currentMatrix);
    
    assets.forEach(asset1 => {
        changes[asset1] = {};
        assets.forEach(asset2 => {
            if (asset1 !== asset2) {
                const change = currentMatrix[asset1][asset2] - historicalMatrix[asset1][asset2];
                changes[asset1][asset2] = {
                    current: currentMatrix[asset1][asset2],
                    historical: historicalMatrix[asset1][asset2],
                    change: change,
                    percentChange: historicalMatrix[asset1][asset2] !== 0 ? 
                        (change / Math.abs(historicalMatrix[asset1][asset2])) * 100 : 0
                };
            }
        });
    });
    
    return changes;
}

function generateCorrelationAlerts(current, historical) {
    const alerts = [];
    
    // Alert for significant correlation increases
    const assets = Object.keys(current.matrix);
    assets.forEach(asset1 => {
        assets.forEach(asset2 => {
            if (asset1 < asset2) { // Avoid duplicates
                const currentCorr = current.matrix[asset1][asset2];
                const historicalCorr = historical.matrix[asset1][asset2];
                const change = currentCorr - historicalCorr;
                
                if (Math.abs(change) > 0.2) { // Significant change
                    alerts.push({
                        type: 'CORRELATION_CHANGE',
                        severity: Math.abs(change) > 0.4 ? 'HIGH' : 'MEDIUM',
                        assets: [asset1, asset2],
                        change: change,
                        current: currentCorr,
                        historical: historicalCorr,
                        message: `Correlation between ${asset1} and ${asset2} ${change > 0 ? 'increased' : 'decreased'} significantly`
                    });
                }
            }
        });
    });
    
    return alerts;
}