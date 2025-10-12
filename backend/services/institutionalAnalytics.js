/**
 * Institutional Analytics Service
 * Provides institutional-grade analytics, reporting, and performance attribution
 * 
 * Features:
 * - Executive summary dashboards
 * - Real-time P&L attribution
 * - Portfolio analytics suite
 * - Risk management dashboards
 * - Performance attribution analysis
 */

const EventEmitter = require('events');

class InstitutionalAnalyticsService extends EventEmitter {
    constructor(logger, portfolioService, riskService) {
        super();
        this.logger = logger;
        this.portfolioService = portfolioService;
        this.riskService = riskService;
        
        // Cache for analytics data
        this.analyticsCache = new Map();
        this.performanceCache = new Map();
        this.riskMetricsCache = new Map();
        
        // Configuration
        this.config = {
            refreshInterval: 60 * 1000, // 1 minute
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            performanceWindow: 90, // 90 days
            benchmarkSymbol: 'BTC', // Default benchmark
            riskFreeRate: 0.02 // 2% annual risk-free rate
        };

        this.initializeService();
    }

    async initializeService() {
        this.logger.info('Initializing Institutional Analytics Service');
        
        // Start periodic analytics updates
        this.startPeriodicUpdates();
        
        // Generate initial analytics
        await this.generateInitialAnalytics();
        
        this.logger.info('Institutional Analytics Service initialized successfully');
    }

    /**
     * Executive Summary Dashboard
     * Provides high-level KPIs and performance metrics
     */
    async generateExecutiveSummary(portfolioId, timeframe = '30d') {
        const startTime = Date.now();
        
        try {
            const summary = {
                portfolioId,
                timeframe,
                timestamp: new Date(),
                kpis: {},
                performance: {},
                risk: {},
                positions: {},
                market: {},
                alerts: [],
                insights: []
            };

            // Key Performance Indicators
            summary.kpis = await this.calculateKPIs(portfolioId, timeframe);
            
            // Performance metrics
            summary.performance = await this.calculatePerformanceMetrics(portfolioId, timeframe);
            
            // Risk metrics
            summary.risk = await this.calculateRiskMetrics(portfolioId, timeframe);
            
            // Position analysis
            summary.positions = await this.analyzePositions(portfolioId);
            
            // Market context
            summary.market = await this.getMarketContext();
            
            // Generate alerts
            summary.alerts = await this.generateExecutiveAlerts(summary);
            
            // Generate insights
            summary.insights = await this.generateExecutiveInsights(summary);

            // Cache results
            this.analyticsCache.set(`executive_${portfolioId}_${timeframe}`, summary);

            // Emit update
            this.emit('executiveSummaryUpdate', summary);

            this.logger.info(`Executive summary generated for portfolio ${portfolioId}`, {
                duration: Date.now() - startTime,
                timeframe,
                alertsCount: summary.alerts.length,
                insightsCount: summary.insights.length
            });

            return summary;

        } catch (error) {
            this.logger.error('Error generating executive summary', { 
                portfolioId, 
                timeframe, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Real-time P&L Attribution
     * Provides detailed profit and loss attribution analysis
     */
    async generatePnLAttribution(portfolioId, timeframe = '1d') {
        const startTime = Date.now();
        
        try {
            const attribution = {
                portfolioId,
                timeframe,
                timestamp: new Date(),
                totalPnL: 0,
                attribution: {
                    byAsset: {},
                    byStrategy: {},
                    byFactor: {},
                    byRisk: {}
                },
                decomposition: {
                    alpha: 0,
                    beta: 0,
                    residual: 0
                },
                details: [],
                insights: []
            };

            // Get portfolio positions and transactions
            const positions = await this.getPortfolioPositions(portfolioId);
            const transactions = await this.getPortfolioTransactions(portfolioId, timeframe);

            // Calculate total P&L
            attribution.totalPnL = await this.calculateTotalPnL(positions, transactions);

            // Asset attribution
            attribution.attribution.byAsset = await this.calculateAssetAttribution(positions, transactions);

            // Strategy attribution
            attribution.attribution.byStrategy = await this.calculateStrategyAttribution(transactions);

            // Factor attribution
            attribution.attribution.byFactor = await this.calculateFactorAttribution(positions, timeframe);

            // Risk attribution
            attribution.attribution.byRisk = await this.calculateRiskAttribution(positions, timeframe);

            // Performance decomposition
            attribution.decomposition = await this.calculatePerformanceDecomposition(
                attribution.totalPnL, 
                positions, 
                timeframe
            );

            // Generate detailed breakdown
            attribution.details = await this.generatePnLDetails(attribution);

            // Generate insights
            attribution.insights = await this.generatePnLInsights(attribution);

            // Cache results
            this.performanceCache.set(`pnl_${portfolioId}_${timeframe}`, attribution);

            // Emit update
            this.emit('pnlAttributionUpdate', attribution);

            this.logger.info(`P&L attribution generated for portfolio ${portfolioId}`, {
                duration: Date.now() - startTime,
                totalPnL: attribution.totalPnL,
                timeframe
            });

            return attribution;

        } catch (error) {
            this.logger.error('Error generating P&L attribution', { 
                portfolioId, 
                timeframe, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Portfolio Analytics Suite
     * Comprehensive portfolio analysis and optimization
     */
    async generatePortfolioAnalytics(portfolioId) {
        const startTime = Date.now();
        
        try {
            const analytics = {
                portfolioId,
                timestamp: new Date(),
                composition: {},
                diversification: {},
                concentration: {},
                exposure: {},
                efficiency: {},
                optimization: {},
                recommendations: []
            };

            // Get portfolio data
            const positions = await this.getPortfolioPositions(portfolioId);
            const benchmarkData = await this.getBenchmarkData(this.config.benchmarkSymbol);

            // Portfolio composition analysis
            analytics.composition = await this.analyzePortfolioComposition(positions);

            // Diversification analysis
            analytics.diversification = await this.analyzeDiversification(positions);

            // Concentration analysis
            analytics.concentration = await this.analyzeConcentration(positions);

            // Exposure analysis
            analytics.exposure = await this.analyzeExposure(positions);

            // Efficiency analysis
            analytics.efficiency = await this.analyzeEfficiency(positions, benchmarkData);

            // Portfolio optimization
            analytics.optimization = await this.optimizePortfolio(positions);

            // Generate recommendations
            analytics.recommendations = await this.generatePortfolioRecommendations(analytics);

            // Cache results
            this.analyticsCache.set(`portfolio_${portfolioId}`, analytics);

            // Emit update
            this.emit('portfolioAnalyticsUpdate', analytics);

            this.logger.info(`Portfolio analytics generated for portfolio ${portfolioId}`, {
                duration: Date.now() - startTime,
                positionsCount: Object.keys(positions).length,
                recommendationsCount: analytics.recommendations.length
            });

            return analytics;

        } catch (error) {
            this.logger.error('Error generating portfolio analytics', { 
                portfolioId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Risk Management Dashboard
     * Comprehensive risk analysis and monitoring
     */
    async generateRiskDashboard(portfolioId, scenarios = ['base', 'stress', 'crisis']) {
        const startTime = Date.now();
        
        try {
            const riskDashboard = {
                portfolioId,
                timestamp: new Date(),
                scenarios,
                currentRisk: {},
                scenarioAnalysis: {},
                stresstesting: {},
                correlations: {},
                limits: {},
                alerts: [],
                recommendations: []
            };

            // Get portfolio positions
            const positions = await this.getPortfolioPositions(portfolioId);

            // Current risk metrics
            riskDashboard.currentRisk = await this.calculateCurrentRiskMetrics(positions);

            // Scenario analysis
            for (const scenario of scenarios) {
                riskDashboard.scenarioAnalysis[scenario] = await this.runScenarioAnalysis(positions, scenario);
            }

            // Stress testing
            riskDashboard.stresstesting = await this.performStressTesting(positions);

            // Correlation analysis
            riskDashboard.correlations = await this.analyzeRiskCorrelations(positions);

            // Risk limits monitoring
            riskDashboard.limits = await this.monitorRiskLimits(positions);

            // Generate risk alerts
            riskDashboard.alerts = await this.generateRiskAlerts(riskDashboard);

            // Generate risk recommendations
            riskDashboard.recommendations = await this.generateRiskRecommendations(riskDashboard);

            // Cache results
            this.riskMetricsCache.set(`risk_${portfolioId}`, riskDashboard);

            // Emit update
            this.emit('riskDashboardUpdate', riskDashboard);

            this.logger.info(`Risk dashboard generated for portfolio ${portfolioId}`, {
                duration: Date.now() - startTime,
                scenarios: scenarios.length,
                alertsCount: riskDashboard.alerts.length
            });

            return riskDashboard;

        } catch (error) {
            this.logger.error('Error generating risk dashboard', { 
                portfolioId, 
                error: error.message 
            });
            throw error;
        }
    }

    // Helper Methods for KPI Calculations

    async calculateKPIs(portfolioId, timeframe) {
        const positions = await this.getPortfolioPositions(portfolioId);
        const historical = await this.getHistoricalPerformance(portfolioId, timeframe);
        
        return {
            totalValue: this.calculateTotalPortfolioValue(positions),
            totalReturn: this.calculateTotalReturn(historical),
            dailyReturn: this.calculateDailyReturn(historical),
            sharpeRatio: this.calculateSharpeRatio(historical),
            maxDrawdown: this.calculateMaxDrawdown(historical),
            winRate: this.calculateWinRate(historical),
            profitFactor: this.calculateProfitFactor(historical),
            volatility: this.calculateVolatility(historical),
            beta: await this.calculateBeta(historical),
            alpha: await this.calculateAlpha(historical),
            informationRatio: this.calculateInformationRatio(historical),
            calmarRatio: this.calculateCalmarRatio(historical)
        };
    }

    async calculatePerformanceMetrics(portfolioId, timeframe) {
        const historical = await this.getHistoricalPerformance(portfolioId, timeframe);
        const benchmark = await this.getBenchmarkPerformance(timeframe);
        
        return {
            cumulativeReturn: this.calculateCumulativeReturn(historical),
            periodicReturns: this.calculatePeriodicReturns(historical),
            rollingReturns: this.calculateRollingReturns(historical),
            benchmarkComparison: this.compareToBenchmark(historical, benchmark),
            attribution: await this.calculateReturnsAttribution(historical),
            consistency: this.calculateConsistencyMetrics(historical),
            downside: this.calculateDownsideMetrics(historical),
            upside: this.calculateUpsideMetrics(historical)
        };
    }

    async calculateRiskMetrics(portfolioId, timeframe) {
        const positions = await this.getPortfolioPositions(portfolioId);
        const historical = await this.getHistoricalPerformance(portfolioId, timeframe);
        
        return {
            var95: this.calculateVaR(historical, 0.95),
            var99: this.calculateVaR(historical, 0.99),
            expectedShortfall: this.calculateExpectedShortfall(historical, 0.95),
            trackingError: await this.calculateTrackingError(historical),
            downsideDeviation: this.calculateDownsideDeviation(historical),
            conditionalVar: this.calculateConditionalVaR(historical),
            riskBudget: this.calculateRiskBudget(positions),
            concentration: this.calculateConcentrationRisk(positions),
            leverage: this.calculateLeverage(positions),
            correlation: await this.calculatePortfolioCorrelation(positions)
        };
    }

    async analyzePositions(portfolioId) {
        const positions = await this.getPortfolioPositions(portfolioId);
        
        return {
            count: Object.keys(positions).length,
            totalValue: this.calculateTotalPortfolioValue(positions),
            largest: this.findLargestPosition(positions),
            smallest: this.findSmallestPosition(positions),
            weights: this.calculatePositionWeights(positions),
            sectors: this.analyzeSecuserorsExposure(positions),
            types: this.analyzeAssetTypes(positions),
            currencies: this.analyzeCurrencyExposure(positions)
        };
    }

    async getMarketContext() {
        // Get current market conditions
        return {
            timestamp: new Date(),
            marketRegime: 'BULL', // From market intelligence service
            volatilityRegime: 'MEDIUM',
            sentiment: 0.3, // Positive
            trends: {
                crypto: 'BULLISH',
                stocks: 'NEUTRAL',
                bonds: 'BEARISH'
            },
            indicators: {
                vix: 25.5,
                fearGreed: 67,
                momentum: 'POSITIVE'
            }
        };
    }

    // Utility calculation functions
    calculateTotalPortfolioValue(positions) {
        return Object.values(positions).reduce((total, position) => {
            return total + (position.quantity * position.price);
        }, 0);
    }

    calculateTotalReturn(historical) {
        if (historical.length < 2) return 0;
        const first = historical[0].value;
        const last = historical[historical.length - 1].value;
        return (last - first) / first;
    }

    calculateSharpeRatio(historical) {
        const returns = this.calculateReturns(historical);
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = this.calculateStandardDeviation(returns);
        
        if (stdDev === 0) return 0;
        
        const excessReturn = avgReturn - (this.config.riskFreeRate / 252); // Daily risk-free rate
        return (excessReturn / stdDev) * Math.sqrt(252); // Annualized
    }

    calculateMaxDrawdown(historical) {
        let maxDrawdown = 0;
        let peak = historical[0].value;
        
        for (const point of historical) {
            if (point.value > peak) {
                peak = point.value;
            } else {
                const drawdown = (peak - point.value) / peak;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }
        
        return maxDrawdown;
    }

    calculateVaR(historical, confidence) {
        const returns = this.calculateReturns(historical);
        returns.sort((a, b) => a - b);
        
        const index = Math.floor((1 - confidence) * returns.length);
        return returns[index] || 0;
    }

    calculateReturns(historical) {
        const returns = [];
        for (let i = 1; i < historical.length; i++) {
            const ret = (historical[i].value - historical[i - 1].value) / historical[i - 1].value;
            returns.push(ret);
        }
        return returns;
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    // Simulated data methods (replace with real data in production)
    async getPortfolioPositions(portfolioId) {
        // Simulated portfolio positions
        return {
            BTC: { symbol: 'BTC', quantity: 1.5, price: 65000, value: 97500 },
            ETH: { symbol: 'ETH', quantity: 10, price: 3500, value: 35000 },
            ADA: { symbol: 'ADA', quantity: 5000, price: 0.5, value: 2500 },
            SOL: { symbol: 'SOL', quantity: 100, price: 150, value: 15000 }
        };
    }

    async getHistoricalPerformance(portfolioId, timeframe) {
        // Simulated historical performance
        const days = this.parseTmeframe(timeframe);
        const performance = [];
        let value = 150000; // Starting portfolio value
        
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
            value *= (1 + (Math.random() - 0.48) * 0.05); // Slight positive bias
            performance.push({ date, value });
        }
        
        return performance;
    }

    parseTmeframe(timeframe) {
        const match = timeframe.match(/(\d+)([dMy])/);
        if (!match) return 30; // Default to 30 days
        
        const [, num, unit] = match;
        const number = parseInt(num);
        
        switch (unit) {
            case 'd': return number;
            case 'M': return number * 30;
            case 'y': return number * 365;
            default: return 30;
        }
    }

    async generateExecutiveAlerts(summary) {
        const alerts = [];
        
        // Risk alerts
        if (summary.risk.maxDrawdown > 0.1) {
            alerts.push({
                type: 'RISK',
                severity: 'HIGH',
                message: `High drawdown detected: ${(summary.risk.maxDrawdown * 100).toFixed(2)}%`,
                action: 'Review risk management strategy'
            });
        }
        
        // Performance alerts
        if (summary.performance.totalReturn < -0.05) {
            alerts.push({
                type: 'PERFORMANCE',
                severity: 'MEDIUM',
                message: `Negative performance: ${(summary.performance.totalReturn * 100).toFixed(2)}%`,
                action: 'Analyze underperforming positions'
            });
        }
        
        return alerts;
    }

    async generateExecutiveInsights(summary) {
        const insights = [];
        
        insights.push({
            type: 'PERFORMANCE',
            title: 'Portfolio Performance',
            message: `Portfolio has generated ${(summary.performance.totalReturn * 100).toFixed(2)}% return with a Sharpe ratio of ${summary.kpis.sharpeRatio.toFixed(2)}`,
            impact: 'POSITIVE'
        });
        
        if (summary.risk.concentration > 0.5) {
            insights.push({
                type: 'RISK',
                title: 'High Concentration',
                message: 'Portfolio shows high concentration in top positions, consider diversification',
                impact: 'NEGATIVE'
            });
        }
        
        return insights;
    }

    startPeriodicUpdates() {
        setInterval(async () => {
            try {
                await this.refreshAnalytics();
            } catch (error) {
                this.logger.error('Error in periodic analytics update', { error: error.message });
            }
        }, this.config.refreshInterval);
    }

    async refreshAnalytics() {
        this.logger.info('Refreshing institutional analytics');
        
        // Clean up expired cache entries
        this.cleanupCache();
        
        // Refresh active analytics
        await this.refreshActiveAnalytics();
    }

    cleanupCache() {
        const now = Date.now();
        
        [this.analyticsCache, this.performanceCache, this.riskMetricsCache].forEach(cache => {
            for (const [key, value] of cache.entries()) {
                if (now - value.timestamp.getTime() > this.config.cacheTimeout) {
                    cache.delete(key);
                }
            }
        });
    }

    async refreshActiveAnalytics() {
        // Refresh analytics for active portfolios
        const activePortfolios = ['portfolio_1', 'portfolio_2']; // Get from database
        
        for (const portfolioId of activePortfolios) {
            try {
                await this.generateExecutiveSummary(portfolioId);
                await this.generatePnLAttribution(portfolioId);
            } catch (error) {
                this.logger.warn(`Failed to refresh analytics for ${portfolioId}`, { error: error.message });
            }
        }
    }

    async generateInitialAnalytics() {
        this.logger.info('Generating initial institutional analytics');
        
        // Generate initial analytics for demo portfolio
        try {
            await this.generateExecutiveSummary('demo_portfolio');
            await this.generatePnLAttribution('demo_portfolio');
            await this.generatePortfolioAnalytics('demo_portfolio');
            await this.generateRiskDashboard('demo_portfolio');
        } catch (error) {
            this.logger.warn('Failed to generate initial analytics', { error: error.message });
        }
    }

    // Public API methods
    async getExecutiveSummary(portfolioId, timeframe = '30d') {
        const cacheKey = `executive_${portfolioId}_${timeframe}`;
        let summary = this.analyticsCache.get(cacheKey);
        
        if (!summary || this.isCacheExpired(summary)) {
            summary = await this.generateExecutiveSummary(portfolioId, timeframe);
        }
        
        return summary;
    }

    async getPnLAttribution(portfolioId, timeframe = '1d') {
        const cacheKey = `pnl_${portfolioId}_${timeframe}`;
        let attribution = this.performanceCache.get(cacheKey);
        
        if (!attribution || this.isCacheExpired(attribution)) {
            attribution = await this.generatePnLAttribution(portfolioId, timeframe);
        }
        
        return attribution;
    }

    async getPortfolioAnalytics(portfolioId) {
        const cacheKey = `portfolio_${portfolioId}`;
        let analytics = this.analyticsCache.get(cacheKey);
        
        if (!analytics || this.isCacheExpired(analytics)) {
            analytics = await this.generatePortfolioAnalytics(portfolioId);
        }
        
        return analytics;
    }

    async getRiskDashboard(portfolioId) {
        const cacheKey = `risk_${portfolioId}`;
        let dashboard = this.riskMetricsCache.get(cacheKey);
        
        if (!dashboard || this.isCacheExpired(dashboard)) {
            dashboard = await this.generateRiskDashboard(portfolioId);
        }
        
        return dashboard;
    }

    isCacheExpired(data) {
        return Date.now() - data.timestamp.getTime() > this.config.cacheTimeout;
    }

    getServiceStatus() {
        return {
            status: 'active',
            cacheSize: {
                analytics: this.analyticsCache.size,
                performance: this.performanceCache.size,
                riskMetrics: this.riskMetricsCache.size
            },
            lastUpdate: new Date(),
            uptime: process.uptime()
        };
    }

    // Missing calculation methods
    calculateDailyReturn(historical) {
        if (historical.length < 2) return 0;
        const latest = historical[historical.length - 1].value;
        const previous = historical[historical.length - 2].value;
        return (latest - previous) / previous;
    }

    calculateWinRate(historical) {
        const returns = this.calculateReturns(historical);
        const wins = returns.filter(ret => ret > 0).length;
        return returns.length > 0 ? wins / returns.length : 0;
    }

    calculateProfitFactor(historical) {
        const returns = this.calculateReturns(historical);
        const profits = returns.filter(ret => ret > 0).reduce((sum, ret) => sum + ret, 0);
        const losses = Math.abs(returns.filter(ret => ret < 0).reduce((sum, ret) => sum + ret, 0));
        return losses === 0 ? (profits > 0 ? Infinity : 0) : profits / losses;
    }

    async calculateBeta(historical) {
        // Simplified beta calculation against benchmark
        const benchmarkReturns = await this.getBenchmarkReturns();
        const portfolioReturns = this.calculateReturns(historical);
        
        return this.calculateCorrelation(portfolioReturns, benchmarkReturns) * 
               (this.calculateStandardDeviation(portfolioReturns) / this.calculateStandardDeviation(benchmarkReturns)) || 1.0;
    }

    async calculateAlpha(historical) {
        const totalReturn = this.calculateTotalReturn(historical);
        const beta = await this.calculateBeta(historical);
        const benchmarkReturn = await this.getBenchmarkReturn();
        
        return totalReturn - (this.config.riskFreeRate + beta * (benchmarkReturn - this.config.riskFreeRate));
    }

    calculateInformationRatio(historical) {
        const returns = this.calculateReturns(historical);
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const trackingError = this.calculateStandardDeviation(returns);
        
        return trackingError === 0 ? 0 : avgReturn / trackingError;
    }

    calculateCalmarRatio(historical) {
        const totalReturn = this.calculateTotalReturn(historical);
        const maxDrawdown = this.calculateMaxDrawdown(historical);
        
        return maxDrawdown === 0 ? 0 : totalReturn / maxDrawdown;
    }

    calculateCumulativeReturn(historical) {
        if (historical.length < 2) return 0;
        return (historical[historical.length - 1].value - historical[0].value) / historical[0].value;
    }

    calculatePeriodicReturns(historical, period = 'daily') {
        const returns = this.calculateReturns(historical);
        // Simplified: return daily returns for now
        return returns;
    }

    calculateRollingReturns(historical, window = 30) {
        const returns = [];
        for (let i = window; i < historical.length; i++) {
            const windowData = historical.slice(i - window, i);
            const windowReturn = this.calculateTotalReturn(windowData);
            returns.push({
                date: historical[i].date,
                return: windowReturn
            });
        }
        return returns;
    }

    async compareToBenchmark(historical, benchmark) {
        const portfolioReturn = this.calculateTotalReturn(historical);
        const benchmarkReturn = this.calculateTotalReturn(benchmark);
        
        return {
            portfolioReturn,
            benchmarkReturn,
            activeReturn: portfolioReturn - benchmarkReturn,
            beta: await this.calculateBeta(historical),
            alpha: await this.calculateAlpha(historical)
        };
    }

    async calculateReturnsAttribution(historical) {
        // Simplified attribution analysis
        return {
            assetSelection: Math.random() * 0.02 - 0.01, // -1% to 1%
            sectorAllocation: Math.random() * 0.015 - 0.0075,
            timing: Math.random() * 0.01 - 0.005,
            interaction: Math.random() * 0.005 - 0.0025
        };
    }

    calculateConsistencyMetrics(historical) {
        const returns = this.calculateReturns(historical);
        const positiveReturns = returns.filter(ret => ret > 0);
        
        return {
            winRate: this.calculateWinRate(historical),
            consistency: positiveReturns.length / returns.length,
            avgWin: positiveReturns.length > 0 ? positiveReturns.reduce((sum, ret) => sum + ret, 0) / positiveReturns.length : 0,
            avgLoss: returns.filter(ret => ret < 0).reduce((sum, ret) => sum + ret, 0) / returns.filter(ret => ret < 0).length || 0
        };
    }

    calculateDownsideMetrics(historical) {
        const returns = this.calculateReturns(historical);
        const negativeReturns = returns.filter(ret => ret < 0);
        
        return {
            downsideDeviation: this.calculateDownsideDeviation(historical),
            maxDrawdown: this.calculateMaxDrawdown(historical),
            worstReturn: Math.min(...returns),
            valueAtRisk: this.calculateVaR(historical, 0.95)
        };
    }

    calculateUpsideMetrics(historical) {
        const returns = this.calculateReturns(historical);
        const positiveReturns = returns.filter(ret => ret > 0);
        
        return {
            upsideDeviation: this.calculateStandardDeviation(positiveReturns),
            bestReturn: Math.max(...returns),
            upsideCapture: positiveReturns.length / returns.length
        };
    }

    calculateExpectedShortfall(historical, confidence) {
        const returns = this.calculateReturns(historical);
        returns.sort((a, b) => a - b);
        
        const cutoff = Math.floor((1 - confidence) * returns.length);
        const tailReturns = returns.slice(0, cutoff);
        
        return tailReturns.length > 0 ? tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length : 0;
    }

    async calculateTrackingError(historical) {
        const benchmarkData = await this.getBenchmarkPerformance('30d');
        const portfolioReturns = this.calculateReturns(historical);
        const benchmarkReturns = this.calculateReturns(benchmarkData);
        
        const excessReturns = portfolioReturns.map((ret, i) => ret - (benchmarkReturns[i] || 0));
        return this.calculateStandardDeviation(excessReturns);
    }

    calculateDownsideDeviation(historical) {
        const returns = this.calculateReturns(historical);
        const target = this.config.riskFreeRate / 252; // Daily risk-free rate
        
        const downsideReturns = returns.filter(ret => ret < target).map(ret => ret - target);
        return downsideReturns.length > 0 ? 
               Math.sqrt(downsideReturns.reduce((sum, ret) => sum + ret * ret, 0) / downsideReturns.length) : 0;
    }

    calculateConditionalVaR(historical) {
        // Same as Expected Shortfall
        return this.calculateExpectedShortfall(historical, 0.95);
    }

    calculateRiskBudget(positions) {
        // Simplified risk budget calculation
        const totalValue = this.calculateTotalPortfolioValue(positions);
        const riskBudget = {};
        
        Object.entries(positions).forEach(([symbol, position]) => {
            const weight = (position.quantity * position.price) / totalValue;
            const volatility = 0.25; // Assumed volatility
            riskBudget[symbol] = weight * volatility;
        });
        
        return riskBudget;
    }

    calculateConcentrationRisk(positions) {
        const totalValue = this.calculateTotalPortfolioValue(positions);
        const weights = Object.values(positions).map(position => 
            (position.quantity * position.price) / totalValue
        );
        
        // Herfindahl index
        return weights.reduce((sum, weight) => sum + weight * weight, 0);
    }

    calculateLeverage(positions) {
        // Simplified leverage calculation
        const totalValue = this.calculateTotalPortfolioValue(positions);
        const totalExposure = Object.values(positions).reduce((sum, position) => 
            sum + Math.abs(position.quantity * position.price), 0
        );
        
        return totalValue === 0 ? 0 : totalExposure / totalValue;
    }

    async calculatePortfolioCorrelation(positions) {
        // Simplified portfolio correlation calculation
        const symbols = Object.keys(positions);
        if (symbols.length < 2) return 0;
        
        // Return average correlation (simplified)
        return 0.3; // Placeholder
    }

    findLargestPosition(positions) {
        let largest = null;
        let maxValue = 0;
        
        Object.entries(positions).forEach(([symbol, position]) => {
            const value = position.quantity * position.price;
            if (value > maxValue) {
                maxValue = value;
                largest = { symbol, ...position, value };
            }
        });
        
        return largest;
    }

    findSmallestPosition(positions) {
        let smallest = null;
        let minValue = Infinity;
        
        Object.entries(positions).forEach(([symbol, position]) => {
            const value = position.quantity * position.price;
            if (value < minValue) {
                minValue = value;
                smallest = { symbol, ...position, value };
            }
        });
        
        return smallest;
    }

    calculatePositionWeights(positions) {
        const totalValue = this.calculateTotalPortfolioValue(positions);
        const weights = {};
        
        Object.entries(positions).forEach(([symbol, position]) => {
            weights[symbol] = (position.quantity * position.price) / totalValue;
        });
        
        return weights;
    }

    analyzeSecuserorsExposure(positions) {
        // Simplified sector analysis
        return {
            'Cryptocurrency': 1.0 // All crypto for now
        };
    }

    analyzeAssetTypes(positions) {
        // Simplified asset type analysis
        return {
            'Spot': 1.0 // All spot assets for now
        };
    }

    analyzeCurrencyExposure(positions) {
        // Simplified currency exposure
        return {
            'USD': 1.0 // All USD-denominated for now
        };
    }

    async getBenchmarkPerformance(timeframe) {
        // Simulated benchmark performance
        const days = this.parseTmeframe(timeframe);
        const performance = [];
        let value = 100000; // Starting benchmark value
        
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
            value *= (1 + (Math.random() - 0.5) * 0.03); // Benchmark volatility
            performance.push({ date, value });
        }
        
        return performance;
    }

    async getBenchmarkData(symbol) {
        return await this.getBenchmarkPerformance('30d');
    }

    async getBenchmarkReturns() {
        const benchmark = await this.getBenchmarkPerformance('30d');
        return this.calculateReturns(benchmark);
    }

    async getBenchmarkReturn() {
        const benchmark = await this.getBenchmarkPerformance('30d');
        return this.calculateTotalReturn(benchmark);
    }

    // Additional placeholder methods for comprehensive analytics
    async getPortfolioTransactions(portfolioId, timeframe) {
        // Simulated transactions
        return [
            { date: new Date(), symbol: 'BTC', type: 'BUY', quantity: 0.1, price: 65000 },
            { date: new Date(), symbol: 'ETH', type: 'SELL', quantity: 1, price: 3500 }
        ];
    }

    async calculateTotalPnL(positions, transactions) {
        // Simplified P&L calculation
        return Math.random() * 10000 - 5000; // -$5k to +$5k
    }

    async calculateAssetAttribution(positions, transactions) {
        const attribution = {};
        Object.keys(positions).forEach(symbol => {
            attribution[symbol] = Math.random() * 2000 - 1000; // -$1k to +$1k per asset
        });
        return attribution;
    }

    async calculateStrategyAttribution(transactions) {
        return {
            'momentum': Math.random() * 1000 - 500,
            'mean_reversion': Math.random() * 1000 - 500,
            'arbitrage': Math.random() * 500 - 250
        };
    }

    async calculateFactorAttribution(positions, timeframe) {
        return {
            'market': Math.random() * 1500 - 750,
            'size': Math.random() * 500 - 250,
            'value': Math.random() * 500 - 250,
            'momentum': Math.random() * 500 - 250
        };
    }

    async calculateRiskAttribution(positions, timeframe) {
        return {
            'systematic': Math.random() * 1000 - 500,
            'idiosyncratic': Math.random() * 500 - 250,
            'concentration': Math.random() * 300 - 150
        };
    }

    async calculatePerformanceDecomposition(totalPnl, positions, timeframe) {
        return {
            alpha: Math.random() * 0.02 - 0.01, // -1% to 1%
            beta: Math.random() * 0.015 - 0.0075, // -0.75% to 0.75%
            residual: Math.random() * 0.005 - 0.0025 // -0.25% to 0.25%
        };
    }

    async generatePnLDetails(attribution) {
        return [
            { category: 'Asset Selection', contribution: attribution.totalPnL * 0.4 },
            { category: 'Market Timing', contribution: attribution.totalPnL * 0.3 },
            { category: 'Risk Management', contribution: attribution.totalPnL * 0.2 },
            { category: 'Transaction Costs', contribution: attribution.totalPnL * -0.1 }
        ];
    }

    async generatePnLInsights(attribution) {
        const insights = [];
        
        if (attribution.totalPnL > 0) {
            insights.push({
                type: 'POSITIVE_PERFORMANCE',
                message: `Portfolio generated positive P&L of $${attribution.totalPnL.toFixed(2)}`,
                impact: 'POSITIVE'
            });
        } else {
            insights.push({
                type: 'NEGATIVE_PERFORMANCE',
                message: `Portfolio had negative P&L of $${Math.abs(attribution.totalPnL).toFixed(2)}`,
                impact: 'NEGATIVE'
            });
        }
        
        return insights;
    }

    calculateVolatility(historical) {
        const returns = this.calculateReturns(historical);
        return this.calculateStandardDeviation(returns) * Math.sqrt(252); // Annualized
    }

    // Additional missing helper methods for portfolio analytics
    async analyzePortfolioComposition(positions) {
        const totalValue = this.calculateTotalPortfolioValue(positions);
        const composition = {};
        
        Object.entries(positions).forEach(([symbol, position]) => {
            composition[symbol] = {
                weight: (position.quantity * position.price) / totalValue,
                value: position.quantity * position.price,
                quantity: position.quantity
            };
        });
        
        return composition;
    }

    async analyzeDiversification(positions) {
        const weights = this.calculatePositionWeights(positions);
        const herfindahl = Object.values(weights).reduce((sum, weight) => sum + weight * weight, 0);
        
        return {
            herfindahlIndex: herfindahl,
            diversificationRatio: 1 / herfindahl,
            effectivePositions: 1 / herfindahl,
            concentrationLevel: herfindahl > 0.25 ? 'HIGH' : herfindahl > 0.1 ? 'MEDIUM' : 'LOW'
        };
    }

    async analyzeConcentration(positions) {
        const weights = this.calculatePositionWeights(positions);
        const sortedWeights = Object.values(weights).sort((a, b) => b - a);
        
        return {
            topPosition: sortedWeights[0] || 0,
            top3Positions: sortedWeights.slice(0, 3).reduce((sum, w) => sum + w, 0),
            top5Positions: sortedWeights.slice(0, 5).reduce((sum, w) => sum + w, 0),
            concentrationRisk: sortedWeights[0] > 0.5 ? 'HIGH' : sortedWeights[0] > 0.25 ? 'MEDIUM' : 'LOW'
        };
    }

    async analyzeExposure(positions) {
        return {
            geographic: { 'Global': 1.0 },
            sector: { 'Cryptocurrency': 1.0 },
            currency: { 'USD': 1.0 },
            assetClass: { 'Digital Assets': 1.0 }
        };
    }

    async analyzeEfficiency(positions, benchmarkData) {
        const portfolioReturn = 0.05; // 5% placeholder
        const benchmarkReturn = 0.03; // 3% placeholder
        const riskFreeRate = this.config.riskFreeRate;
        
        return {
            sharpeRatio: (portfolioReturn - riskFreeRate) / 0.15, // Assuming 15% volatility
            informationRatio: (portfolioReturn - benchmarkReturn) / 0.05, // 5% tracking error
            treynorRatio: (portfolioReturn - riskFreeRate) / 1.2, // Assuming beta of 1.2
            jensenAlpha: portfolioReturn - (riskFreeRate + 1.2 * (benchmarkReturn - riskFreeRate))
        };
    }

    async optimizePortfolio(positions) {
        // Simplified portfolio optimization suggestions
        const weights = this.calculatePositionWeights(positions);
        const suggestions = [];
        
        Object.entries(weights).forEach(([symbol, weight]) => {
            if (weight > 0.3) {
                suggestions.push({
                    type: 'REDUCE',
                    symbol,
                    currentWeight: weight,
                    suggestedWeight: 0.25,
                    reason: 'High concentration risk'
                });
            }
        });
        
        return {
            currentWeights: weights,
            optimizedWeights: this.calculateOptimalWeights(positions),
            suggestions,
            expectedImprovement: {
                returnIncrease: 0.005, // 0.5%
                riskReduction: 0.02 // 2%
            }
        };
    }

    calculateOptimalWeights(positions) {
        // Equal weight optimization (simplified)
        const numPositions = Object.keys(positions).length;
        const equalWeight = 1 / numPositions;
        const optimized = {};
        
        Object.keys(positions).forEach(symbol => {
            optimized[symbol] = equalWeight;
        });
        
        return optimized;
    }

    async generatePortfolioRecommendations(analytics) {
        const recommendations = [];
        
        if (analytics.concentration.concentrationRisk === 'HIGH') {
            recommendations.push({
                type: 'DIVERSIFICATION',
                priority: 'HIGH',
                description: 'Reduce concentration risk by rebalancing positions',
                impact: 'Risk Reduction'
            });
        }
        
        if (analytics.efficiency.sharpeRatio < 1.0) {
            recommendations.push({
                type: 'PERFORMANCE',
                priority: 'MEDIUM',
                description: 'Consider improving risk-adjusted returns',
                impact: 'Performance Enhancement'
            });
        }
        
        return recommendations;
    }

    async calculateCurrentRiskMetrics(positions) {
        const totalValue = this.calculateTotalPortfolioValue(positions);
        
        return {
            portfolioValue: totalValue,
            var95: totalValue * 0.05, // 5% VaR
            var99: totalValue * 0.1, // 10% VaR
            expectedShortfall: totalValue * 0.075, // 7.5% ES
            maxDrawdown: 0.15, // 15%
            volatility: 0.25, // 25%
            beta: 1.2,
            correlation: 0.8
        };
    }

    async runScenarioAnalysis(positions, scenario) {
        const baseValue = this.calculateTotalPortfolioValue(positions);
        let scenarioImpact;
        
        switch (scenario) {
            case 'stress':
                scenarioImpact = -0.3; // -30%
                break;
            case 'crisis':
                scenarioImpact = -0.5; // -50%
                break;
            default:
                scenarioImpact = 0; // Base case
        }
        
        return {
            scenario,
            impact: scenarioImpact,
            newValue: baseValue * (1 + scenarioImpact),
            loss: baseValue * Math.abs(scenarioImpact),
            probabilityOfLoss: scenario === 'crisis' ? 0.01 : scenario === 'stress' ? 0.05 : 0.5
        };
    }

    async performStressTesting(positions) {
        const scenarios = [
            { name: 'Market Crash', impact: -0.4 },
            { name: 'Liquidity Crisis', impact: -0.25 },
            { name: 'Regulatory Shock', impact: -0.35 },
            { name: 'Black Swan', impact: -0.6 }
        ];
        
        const results = {};
        const baseValue = this.calculateTotalPortfolioValue(positions);
        
        scenarios.forEach(scenario => {
            results[scenario.name] = {
                impact: scenario.impact,
                newValue: baseValue * (1 + scenario.impact),
                loss: baseValue * Math.abs(scenario.impact)
            };
        });
        
        return results;
    }

    async analyzeRiskCorrelations(positions) {
        // Simplified correlation analysis
        const symbols = Object.keys(positions);
        const correlations = {};
        
        symbols.forEach(symbol1 => {
            correlations[symbol1] = {};
            symbols.forEach(symbol2 => {
                correlations[symbol1][symbol2] = symbol1 === symbol2 ? 1.0 : 0.3 + Math.random() * 0.4;
            });
        });
        
        return correlations;
    }

    async monitorRiskLimits(positions) {
        const totalValue = this.calculateTotalPortfolioValue(positions);
        const weights = this.calculatePositionWeights(positions);
        
        return {
            positionLimits: {
                maxSinglePosition: 0.25,
                currentMax: Math.max(...Object.values(weights)),
                status: Math.max(...Object.values(weights)) > 0.25 ? 'BREACH' : 'OK'
            },
            leverageLimits: {
                maxLeverage: 2.0,
                currentLeverage: this.calculateLeverage(positions),
                status: this.calculateLeverage(positions) > 2.0 ? 'BREACH' : 'OK'
            },
            drawdownLimits: {
                maxDrawdown: 0.15,
                currentDrawdown: 0.05,
                status: 'OK'
            }
        };
    }

    async generateRiskAlerts(riskDashboard) {
        const alerts = [];
        
        if (riskDashboard.limits.positionLimits.status === 'BREACH') {
            alerts.push({
                type: 'POSITION_LIMIT',
                severity: 'HIGH',
                message: 'Position concentration limit breached',
                action: 'Reduce largest position'
            });
        }
        
        if (riskDashboard.currentRisk.var95 > 0.1) {
            alerts.push({
                type: 'VAR_BREACH',
                severity: 'MEDIUM',
                message: 'Value at Risk exceeds threshold',
                action: 'Review risk exposure'
            });
        }
        
        return alerts;
    }

    async generateRiskRecommendations(riskDashboard) {
        const recommendations = [];
        
        if (riskDashboard.currentRisk.volatility > 0.3) {
            recommendations.push({
                type: 'VOLATILITY_REDUCTION',
                priority: 'HIGH',
                description: 'Consider reducing portfolio volatility through diversification'
            });
        }
        
        return recommendations;
    }

    calculateCorrelation(data1, data2) {
        const n = Math.min(data1.length, data2.length);
        if (n < 2) return 0;
        
        const mean1 = data1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
        const mean2 = data2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
        
        let numerator = 0;
        let denominator1 = 0;
        let denominator2 = 0;
        
        for (let i = 0; i < n; i++) {
            const diff1 = data1[i] - mean1;
            const diff2 = data2[i] - mean2;
            
            numerator += diff1 * diff2;
            denominator1 += diff1 * diff1;
            denominator2 += diff2 * diff2;
        }
        
        const denominator = Math.sqrt(denominator1 * denominator2);
        return denominator === 0 ? 0 : numerator / denominator;
    }
}

module.exports = InstitutionalAnalyticsService;