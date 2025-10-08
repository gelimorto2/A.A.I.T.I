/**
 * Cross-Asset Correlation Analysis Service
 * Provides advanced correlation analysis between different assets
 * 
 * Features:
 * - Real-time correlation matrices
 * - Sector rotation analysis
 * - Macro factor exposure tracking
 * - Dynamic correlation analysis
 * - Risk diversification insights
 * - Portfolio correlation optimization
 */

const EventEmitter = require('events');

class CrossAssetCorrelationAnalyzer extends EventEmitter {
    constructor(logger, marketDataService) {
        super();
        this.logger = logger;
        this.marketDataService = marketDataService;
        
        // Cache for correlation data
        this.correlationCache = new Map();
        this.priceDataCache = new Map();
        
        // Configuration
        this.config = {
            defaultWindow: 90, // 90 days
            shortWindow: 30,   // 30 days
            longWindow: 180,   // 180 days
            refreshInterval: 5 * 60 * 1000, // 5 minutes
            correlationThresholds: {
                high: 0.7,
                moderate: 0.3,
                low: 0.1
            },
            sectors: {
                'CRYPTO_MAJOR': ['BTC', 'ETH'],
                'CRYPTO_DEFI': ['UNI', 'AAVE', 'COMP'],
                'CRYPTO_LAYER1': ['ADA', 'SOL', 'DOT'],
                'CRYPTO_STORAGE': ['FIL', 'AR'],
                'TRADITIONAL_EQUITY': ['SPY', 'QQQ'],
                'COMMODITIES': ['GLD', 'SLV'],
                'BONDS': ['TLT', 'IEF']
            },
            macroFactors: ['VIX', 'DXY', 'TNX', 'OIL']
        };

        this.initializeAnalyzer();
    }

    async initializeAnalyzer() {
        this.logger.info('Initializing Cross-Asset Correlation Analyzer');
        
        // Start periodic correlation updates
        this.startPeriodicUpdates();
        
        // Initialize with default assets
        await this.initializeDefaultCorrelations();
        
        this.logger.info('Cross-Asset Correlation Analyzer initialized successfully');
    }

    /**
     * Calculate Real-time Correlation Matrix
     */
    async calculateCorrelationMatrix(assets, window = this.config.defaultWindow) {
        const startTime = Date.now();

        try {
            const correlationData = {
                assets,
                window,
                timestamp: new Date(),
                matrix: {},
                statistics: {
                    avgCorrelation: 0,
                    maxCorrelation: -1,
                    minCorrelation: 1,
                    strongCorrelations: [],
                    weakCorrelations: []
                },
                clusters: [],
                insights: []
            };

            // Get price data for all assets
            const priceDataMap = new Map();
            for (const asset of assets) {
                priceDataMap.set(asset, await this.getPriceReturns(asset, window));
            }

            // Calculate pairwise correlations
            for (let i = 0; i < assets.length; i++) {
                correlationData.matrix[assets[i]] = {};
                
                for (let j = 0; j < assets.length; j++) {
                    if (i === j) {
                        correlationData.matrix[assets[i]][assets[j]] = 1.0;
                    } else {
                        const correlation = this.calculatePearsonCorrelation(
                            priceDataMap.get(assets[i]),
                            priceDataMap.get(assets[j])
                        );
                        correlationData.matrix[assets[i]][assets[j]] = correlation;
                    }
                }
            }

            // Calculate statistics
            correlationData.statistics = this.calculateCorrelationStatistics(correlationData.matrix);

            // Perform clustering
            correlationData.clusters = this.performCorrelationClustering(correlationData.matrix);

            // Generate insights
            correlationData.insights = this.generateCorrelationInsights(correlationData);

            // Cache results
            this.correlationCache.set(`matrix_${assets.join('_')}_${window}`, correlationData);

            // Emit correlation update
            this.emit('correlationUpdate', correlationData);

            this.logger.info('Correlation matrix calculated', {
                duration: Date.now() - startTime,
                assetCount: assets.length,
                avgCorrelation: correlationData.statistics.avgCorrelation
            });

            return correlationData;

        } catch (error) {
            this.logger.error('Error calculating correlation matrix', { assets, error: error.message });
            throw error;
        }
    }

    /**
     * Analyze Sector Rotation
     */
    async analyzeSectorRotation(lookback = 60) {
        try {
            const rotationData = {
                timestamp: new Date(),
                lookback,
                sectors: {},
                rotation: {
                    inflow: [],
                    outflow: [],
                    momentum: {}
                },
                trends: {},
                signals: []
            };

            // Analyze each sector
            for (const [sectorName, assets] of Object.entries(this.config.sectors)) {
                const sectorAnalysis = await this.analyzeSectorPerformance(assets, lookback);
                rotationData.sectors[sectorName] = sectorAnalysis;

                // Calculate momentum
                rotationData.rotation.momentum[sectorName] = sectorAnalysis.momentum;

                // Identify rotation patterns
                if (sectorAnalysis.momentum > 0.1) {
                    rotationData.rotation.inflow.push({
                        sector: sectorName,
                        momentum: sectorAnalysis.momentum,
                        strength: this.calculateRotationStrength(sectorAnalysis)
                    });
                } else if (sectorAnalysis.momentum < -0.1) {
                    rotationData.rotation.outflow.push({
                        sector: sectorName,
                        momentum: sectorAnalysis.momentum,
                        strength: this.calculateRotationStrength(sectorAnalysis)
                    });
                }
            }

            // Sort by momentum
            rotationData.rotation.inflow.sort((a, b) => b.momentum - a.momentum);
            rotationData.rotation.outflow.sort((a, b) => a.momentum - b.momentum);

            // Identify trends
            rotationData.trends = this.identifyRotationTrends(rotationData);

            // Generate rotation signals
            rotationData.signals = this.generateRotationSignals(rotationData);

            return rotationData;

        } catch (error) {
            this.logger.error('Error analyzing sector rotation', { error: error.message });
            throw error;
        }
    }

    /**
     * Track Macro Factor Exposure
     */
    async trackMacroFactorExposure(assets, factors = this.config.macroFactors) {
        try {
            const exposureData = {
                assets,
                factors,
                timestamp: new Date(),
                exposures: {},
                sensitivities: {},
                hedging: {
                    recommendations: [],
                    effectiveness: {}
                },
                risks: []
            };

            // Calculate exposure to each macro factor
            for (const asset of assets) {
                exposureData.exposures[asset] = {};
                exposureData.sensitivities[asset] = {};

                for (const factor of factors) {
                    const exposure = await this.calculateMacroExposure(asset, factor);
                    exposureData.exposures[asset][factor] = exposure;

                    // Calculate sensitivity (beta)
                    const sensitivity = await this.calculateFactorSensitivity(asset, factor);
                    exposureData.sensitivities[asset][factor] = sensitivity;
                }
            }

            // Generate hedging recommendations
            exposureData.hedging.recommendations = this.generateHedgingRecommendations(exposureData);

            // Assess hedging effectiveness
            exposureData.hedging.effectiveness = this.assessHedgingEffectiveness(exposureData);

            // Identify macro risks
            exposureData.risks = this.identifyMacroRisks(exposureData);

            return exposureData;

        } catch (error) {
            this.logger.error('Error tracking macro factor exposure', { error: error.message });
            throw error;
        }
    }

    /**
     * Dynamic Correlation Analysis
     * Analyzes how correlations change over time
     */
    async analyzeDynamicCorrelations(assets, windows = [30, 60, 90, 180]) {
        try {
            const dynamicData = {
                assets,
                windows,
                timestamp: new Date(),
                correlations: {},
                trends: {},
                stability: {},
                regimes: [],
                insights: []
            };

            // Calculate correlations for different time windows
            for (const window of windows) {
                dynamicData.correlations[window] = await this.calculateCorrelationMatrix(assets, window);
            }

            // Analyze correlation trends
            dynamicData.trends = this.analyzeCorrelationTrends(dynamicData.correlations);

            // Assess correlation stability
            dynamicData.stability = this.assessCorrelationStability(dynamicData.correlations);

            // Identify correlation regimes
            dynamicData.regimes = this.identifyCorrelationRegimes(dynamicData);

            // Generate dynamic insights
            dynamicData.insights = this.generateDynamicInsights(dynamicData);

            return dynamicData;

        } catch (error) {
            this.logger.error('Error analyzing dynamic correlations', { error: error.message });
            throw error;
        }
    }

    /**
     * Portfolio Correlation Optimization
     */
    async optimizePortfolioCorrelations(assets, targetCorrelation = 0.3, constraints = {}) {
        try {
            const optimizationData = {
                assets,
                targetCorrelation,
                timestamp: new Date(),
                currentCorrelations: {},
                optimizedWeights: {},
                diversificationScore: 0,
                improvements: [],
                alternatives: []
            };

            // Get current correlation matrix
            const correlationMatrix = await this.calculateCorrelationMatrix(assets);
            optimizationData.currentCorrelations = correlationMatrix.matrix;

            // Calculate current diversification score
            const currentScore = this.calculateDiversificationScore(correlationMatrix.matrix);
            
            // Optimize weights to achieve target correlation
            const optimization = this.optimizeWeightsForTarget(
                correlationMatrix.matrix, 
                targetCorrelation, 
                constraints
            );
            
            optimizationData.optimizedWeights = optimization.weights;
            optimizationData.diversificationScore = optimization.score;

            // Identify improvement opportunities
            optimizationData.improvements = this.identifyDiversificationImprovements(
                correlationMatrix.matrix,
                assets
            );

            // Suggest alternative assets
            optimizationData.alternatives = this.suggestAlternativeAssets(
                correlationMatrix.matrix,
                assets
            );

            return optimizationData;

        } catch (error) {
            this.logger.error('Error optimizing portfolio correlations', { error: error.message });
            throw error;
        }
    }

    // Helper Methods

    async getPriceReturns(asset, lookback) {
        // Check cache first
        const cacheKey = `${asset}_${lookback}`;
        if (this.priceDataCache.has(cacheKey)) {
            const cached = this.priceDataCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
                return cached.returns;
            }
        }

        // Simulate price data and calculate returns
        const prices = [];
        let price = 100; // Starting price
        
        for (let i = 0; i < lookback; i++) {
            price += (Math.random() - 0.5) * price * 0.05; // ±5% daily change
            prices.push(price);
        }

        // Calculate returns
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }

        // Cache results
        this.priceDataCache.set(cacheKey, {
            returns,
            timestamp: Date.now()
        });

        return returns;
    }

    calculatePearsonCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0) return 0;

        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    calculateCorrelationStatistics(matrix) {
        const correlations = [];
        const assets = Object.keys(matrix);

        // Collect all correlation values (excluding diagonal)
        for (let i = 0; i < assets.length; i++) {
            for (let j = i + 1; j < assets.length; j++) {
                correlations.push(matrix[assets[i]][assets[j]]);
            }
        }

        if (correlations.length === 0) {
            return { avgCorrelation: 0, maxCorrelation: 0, minCorrelation: 0, strongCorrelations: [], weakCorrelations: [] };
        }

        const avgCorrelation = correlations.reduce((sum, val) => sum + val, 0) / correlations.length;
        const maxCorrelation = Math.max(...correlations);
        const minCorrelation = Math.min(...correlations);

        // Find strong and weak correlations
        const strongCorrelations = [];
        const weakCorrelations = [];

        for (let i = 0; i < assets.length; i++) {
            for (let j = i + 1; j < assets.length; j++) {
                const corr = matrix[assets[i]][assets[j]];
                if (Math.abs(corr) >= this.config.correlationThresholds.high) {
                    strongCorrelations.push({
                        pair: [assets[i], assets[j]],
                        correlation: corr
                    });
                } else if (Math.abs(corr) <= this.config.correlationThresholds.low) {
                    weakCorrelations.push({
                        pair: [assets[i], assets[j]],
                        correlation: corr
                    });
                }
            }
        }

        return {
            avgCorrelation: parseFloat(avgCorrelation.toFixed(3)),
            maxCorrelation: parseFloat(maxCorrelation.toFixed(3)),
            minCorrelation: parseFloat(minCorrelation.toFixed(3)),
            strongCorrelations,
            weakCorrelations
        };
    }

    performCorrelationClustering(matrix) {
        const assets = Object.keys(matrix);
        const clusters = [];
        const processed = new Set();

        assets.forEach(asset => {
            if (processed.has(asset)) return;

            const cluster = [asset];
            processed.add(asset);

            // Find highly correlated assets
            assets.forEach(otherAsset => {
                if (asset !== otherAsset && !processed.has(otherAsset)) {
                    const correlation = matrix[asset][otherAsset];
                    if (correlation >= this.config.correlationThresholds.high) {
                        cluster.push(otherAsset);
                        processed.add(otherAsset);
                    }
                }
            });

            if (cluster.length > 1) {
                clusters.push({
                    id: `cluster_${clusters.length + 1}`,
                    assets: cluster,
                    avgCorrelation: this.calculateClusterAvgCorrelation(cluster, matrix),
                    size: cluster.length
                });
            }
        });

        return clusters.sort((a, b) => b.avgCorrelation - a.avgCorrelation);
    }

    calculateClusterAvgCorrelation(assets, matrix) {
        let totalCorrelation = 0;
        let count = 0;

        for (let i = 0; i < assets.length; i++) {
            for (let j = i + 1; j < assets.length; j++) {
                totalCorrelation += matrix[assets[i]][assets[j]];
                count++;
            }
        }

        return count > 0 ? totalCorrelation / count : 0;
    }

    generateCorrelationInsights(correlationData) {
        const insights = [];

        // High correlation insights
        if (correlationData.statistics.strongCorrelations.length > 0) {
            insights.push({
                type: 'HIGH_CORRELATION_WARNING',
                severity: 'warning',
                message: `Found ${correlationData.statistics.strongCorrelations.length} highly correlated asset pairs`,
                impact: 'Reduced diversification benefits',
                recommendation: 'Consider replacing some assets with lower-correlated alternatives'
            });
        }

        // Low correlation opportunities
        if (correlationData.statistics.weakCorrelations.length > 0) {
            insights.push({
                type: 'DIVERSIFICATION_OPPORTUNITY',
                severity: 'info',
                message: `Identified ${correlationData.statistics.weakCorrelations.length} weakly correlated pairs`,
                impact: 'Strong diversification potential',
                recommendation: 'Consider increasing allocation to these uncorrelated assets'
            });
        }

        // Clustering insights
        if (correlationData.clusters.length > 0) {
            insights.push({
                type: 'CORRELATION_CLUSTERING',
                severity: 'info',
                message: `Assets naturally group into ${correlationData.clusters.length} correlation clusters`,
                impact: 'Portfolio structure visibility',
                recommendation: 'Balance allocation across different clusters for optimal diversification'
            });
        }

        return insights;
    }

    async analyzeSectorPerformance(assets, lookback) {
        // Calculate sector performance metrics
        const returns = [];
        for (const asset of assets) {
            const assetReturns = await this.getPriceReturns(asset, lookback);
            returns.push(assetReturns);
        }

        // Calculate average sector return
        const avgReturn = returns.reduce((sum, assetReturns) => {
            const assetAvg = assetReturns.reduce((s, r) => s + r, 0) / assetReturns.length;
            return sum + assetAvg;
        }, 0) / returns.length;

        // Calculate momentum (recent vs historical performance)
        const recentReturns = returns.map(r => r.slice(-10)); // Last 10 periods
        const historicalReturns = returns.map(r => r.slice(0, -10));

        const recentAvg = recentReturns.reduce((sum, assetReturns) => {
            const assetAvg = assetReturns.reduce((s, r) => s + r, 0) / assetReturns.length;
            return sum + assetAvg;
        }, 0) / recentReturns.length;

        const historicalAvg = historicalReturns.reduce((sum, assetReturns) => {
            const assetAvg = assetReturns.reduce((s, r) => s + r, 0) / assetReturns.length;
            return sum + assetAvg;
        }, 0) / historicalReturns.length;

        return {
            avgReturn,
            momentum: recentAvg - historicalAvg,
            recentPerformance: recentAvg,
            historicalPerformance: historicalAvg,
            volatility: this.calculateVolatility(returns.flat())
        };
    }

    calculateRotationStrength(sectorAnalysis) {
        return Math.abs(sectorAnalysis.momentum) * (1 + Math.abs(sectorAnalysis.avgReturn));
    }

    identifyRotationTrends(rotationData) {
        return {
            riskOn: rotationData.rotation.inflow.some(s => ['CRYPTO_MAJOR', 'TRADITIONAL_EQUITY'].includes(s.sector)),
            riskOff: rotationData.rotation.inflow.some(s => ['BONDS', 'COMMODITIES'].includes(s.sector)),
            cryptoRotation: rotationData.rotation.inflow.filter(s => s.sector.startsWith('CRYPTO')).length > 0
        };
    }

    generateRotationSignals(rotationData) {
        const signals = [];

        // Risk-on/risk-off signals
        if (rotationData.trends.riskOn) {
            signals.push({
                type: 'RISK_ON',
                strength: 0.8,
                description: 'Capital flowing into risk assets'
            });
        }

        if (rotationData.trends.riskOff) {
            signals.push({
                type: 'RISK_OFF',
                strength: 0.8,
                description: 'Capital flowing into safe haven assets'
            });
        }

        return signals;
    }

    async calculateMacroExposure(asset, factor) {
        // Simulate macro exposure calculation
        const assetReturns = await this.getPriceReturns(asset, 90);
        const factorReturns = await this.getPriceReturns(factor, 90);
        
        return this.calculatePearsonCorrelation(assetReturns, factorReturns);
    }

    async calculateFactorSensitivity(asset, factor) {
        // Calculate beta (sensitivity) to macro factor
        const assetReturns = await this.getPriceReturns(asset, 90);
        const factorReturns = await this.getPriceReturns(factor, 90);
        
        // Simple linear regression to calculate beta
        const correlation = this.calculatePearsonCorrelation(assetReturns, factorReturns);
        const assetVol = this.calculateVolatility(assetReturns);
        const factorVol = this.calculateVolatility(factorReturns);
        
        return correlation * (assetVol / factorVol);
    }

    calculateVolatility(returns) {
        if (returns.length === 0) return 0;
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance * 252); // Annualized volatility
    }

    generateHedgingRecommendations(exposureData) {
        // Generate hedging recommendations based on exposures
        return [
            { factor: 'VIX', hedge: 'VIX calls', effectiveness: 0.8 },
            { factor: 'DXY', hedge: 'Currency hedged ETFs', effectiveness: 0.7 }
        ];
    }

    assessHedgingEffectiveness(exposureData) {
        return { overall: 0.75, byFactor: { VIX: 0.8, DXY: 0.7 } };
    }

    identifyMacroRisks(exposureData) {
        return [
            { risk: 'Dollar strength impact', severity: 'medium', affectedAssets: ['BTC', 'ETH'] }
        ];
    }

    startPeriodicUpdates() {
        setInterval(async () => {
            try {
                await this.updateDefaultCorrelations();
            } catch (error) {
                this.logger.error('Error in periodic correlation update', { error: error.message });
            }
        }, this.config.refreshInterval);
    }

    async initializeDefaultCorrelations() {
        const defaultAssets = ['BTC', 'ETH', 'ADA', 'SOL'];
        await this.calculateCorrelationMatrix(defaultAssets);
    }

    async updateDefaultCorrelations() {
        const defaultAssets = ['BTC', 'ETH', 'ADA', 'SOL'];
        const correlations = await this.calculateCorrelationMatrix(defaultAssets);
        
        this.emit('correlationUpdate', {
            type: 'periodic_update',
            data: correlations
        });
    }
}

module.exports = CrossAssetCorrelationAnalyzer;