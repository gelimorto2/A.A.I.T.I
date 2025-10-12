/**
 * Market Intelligence Service
 * Advanced market intelligence, sentiment analysis, and regime detection
 * 
 * Features:
 * - Real-time sentiment analysis from news and social media
 * - Market regime detection (bull/bear/sideways)
 * - Volatility surface modeling
 * - Cross-asset correlation analysis
 * - Technical analysis with advanced patterns
 */

const EventEmitter = require('events');
const axios = require('axios');
const crypto = require('crypto');

class MarketIntelligenceService extends EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
        this.sentimentCache = new Map();
        this.regimeCache = new Map();
        this.correlationMatrix = new Map();
        this.volatilitySurface = new Map();
        
        // Configuration
        this.config = {
            sentimentWindow: 24 * 60 * 60 * 1000, // 24 hours
            regimeWindow: 30 * 24 * 60 * 60 * 1000, // 30 days
            correlationWindow: 90 * 24 * 60 * 60 * 1000, // 90 days
            refreshInterval: 5 * 60 * 1000, // 5 minutes
            confidenceThreshold: 0.7
        };

        this.initializeService();
    }

    async initializeService() {
        this.logger.info('Initializing Market Intelligence Service');
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        // Initialize historical data
        await this.initializeHistoricalData();
        
        this.logger.info('Market Intelligence Service initialized successfully');
    }

    /**
     * Real-time Sentiment Analysis
     * Analyzes sentiment from multiple sources
     */
    async analyzeSentiment(symbol, sources = ['news', 'social', 'technical']) {
        const startTime = Date.now();
        
        try {
            const sentimentData = {
                symbol,
                timestamp: new Date(),
                sources: {},
                composite: null,
                confidence: 0,
                signals: []
            };

            // News sentiment analysis
            if (sources.includes('news')) {
                sentimentData.sources.news = await this.analyzeNewsSentiment(symbol);
            }

            // Social media sentiment
            if (sources.includes('social')) {
                sentimentData.sources.social = await this.analyzeSocialSentiment(symbol);
            }

            // Technical sentiment
            if (sources.includes('technical')) {
                sentimentData.sources.technical = await this.analyzeTechnicalSentiment(symbol);
            }

            // Calculate composite sentiment
            sentimentData.composite = this.calculateCompositeSentiment(sentimentData.sources);
            sentimentData.confidence = this.calculateSentimentConfidence(sentimentData.sources);

            // Generate trading signals
            sentimentData.signals = this.generateSentimentSignals(sentimentData);

            // Cache results
            this.sentimentCache.set(symbol, sentimentData);

            // Emit sentiment update
            this.emit('sentimentUpdate', sentimentData);

            this.logger.info(`Sentiment analysis completed for ${symbol}`, {
                duration: Date.now() - startTime,
                composite: sentimentData.composite,
                confidence: sentimentData.confidence
            });

            return sentimentData;

        } catch (error) {
            this.logger.error('Error in sentiment analysis', { symbol, error: error.message });
            throw error;
        }
    }

    /**
     * Market Regime Detection
     * Detects current market regime (bull/bear/sideways)
     */
    async detectMarketRegime(symbol, lookback = 30) {
        const startTime = Date.now();

        try {
            // Get historical price data
            const priceData = await this.getHistoricalPrices(symbol, lookback);
            
            const regimeData = {
                symbol,
                timestamp: new Date(),
                regime: null,
                confidence: 0,
                characteristics: {},
                signals: [],
                transitions: []
            };

            // Calculate regime indicators
            const indicators = await this.calculateRegimeIndicators(priceData);
            
            // Trend analysis
            const trendStrength = this.calculateTrendStrength(priceData);
            const volatilityRegime = this.analyzeVolatilityRegime(priceData);
            const momentumRegime = this.analyzeMomentumRegime(priceData);

            // Regime classification
            regimeData.regime = this.classifyRegime(indicators, trendStrength, volatilityRegime, momentumRegime);
            regimeData.confidence = this.calculateRegimeConfidence(indicators);

            // Regime characteristics
            regimeData.characteristics = {
                trendStrength,
                volatilityRegime,
                momentumRegime,
                support: indicators.support,
                resistance: indicators.resistance,
                volatility: indicators.volatility
            };

            // Generate regime signals
            regimeData.signals = this.generateRegimeSignals(regimeData);

            // Detect regime transitions
            const historicalRegime = this.regimeCache.get(symbol);
            if (historicalRegime && historicalRegime.regime !== regimeData.regime) {
                regimeData.transitions.push({
                    from: historicalRegime.regime,
                    to: regimeData.regime,
                    timestamp: new Date(),
                    confidence: regimeData.confidence
                });
            }

            // Cache results
            this.regimeCache.set(symbol, regimeData);

            // Emit regime update
            this.emit('regimeUpdate', regimeData);

            this.logger.info(`Market regime detection completed for ${symbol}`, {
                duration: Date.now() - startTime,
                regime: regimeData.regime,
                confidence: regimeData.confidence
            });

            return regimeData;

        } catch (error) {
            this.logger.error('Error in market regime detection', { symbol, error: error.message });
            throw error;
        }
    }

    /**
     * Cross-Asset Correlation Analysis
     * Analyzes correlations between different assets
     */
    async analyzeCorrelations(symbols, window = 90) {
        const startTime = Date.now();

        try {
            const correlationData = {
                symbols,
                timestamp: new Date(),
                window,
                matrix: {},
                networks: [],
                clusters: [],
                insights: []
            };

            // Get price data for all symbols
            const priceDataMap = new Map();
            for (const symbol of symbols) {
                priceDataMap.set(symbol, await this.getHistoricalPrices(symbol, window));
            }

            // Calculate correlation matrix
            correlationData.matrix = this.calculateCorrelationMatrix(priceDataMap);

            // Network analysis
            correlationData.networks = this.performNetworkAnalysis(correlationData.matrix);

            // Cluster analysis
            correlationData.clusters = this.performClusterAnalysis(correlationData.matrix);

            // Generate insights
            correlationData.insights = this.generateCorrelationInsights(correlationData);

            // Cache results
            this.correlationMatrix.set('latest', correlationData);

            // Emit correlation update
            this.emit('correlationUpdate', correlationData);

            this.logger.info('Correlation analysis completed', {
                duration: Date.now() - startTime,
                symbolCount: symbols.length,
                clusterCount: correlationData.clusters.length
            });

            return correlationData;

        } catch (error) {
            this.logger.error('Error in correlation analysis', { symbols, error: error.message });
            throw error;
        }
    }

    /**
     * Volatility Surface Modeling
     * Models implied volatility surfaces for options and derivatives
     */
    async modelVolatilitySurface(symbol, expiries, strikes) {
        const startTime = Date.now();

        try {
            const surfaceData = {
                symbol,
                timestamp: new Date(),
                expiries,
                strikes,
                surface: {},
                smile: {},
                termStructure: {},
                greeks: {},
                insights: []
            };

            // Calculate historical volatility
            const historicalVol = await this.calculateHistoricalVolatility(symbol);

            // Model implied volatility surface
            surfaceData.surface = await this.calculateImpliedVolatilitySurface(symbol, expiries, strikes);

            // Analyze volatility smile
            surfaceData.smile = this.analyzeVolatilitySmile(surfaceData.surface);

            // Calculate term structure
            surfaceData.termStructure = this.calculateVolatilityTermStructure(surfaceData.surface);

            // Calculate Greeks
            surfaceData.greeks = this.calculateGreeks(surfaceData.surface, strikes, expiries);

            // Generate volatility insights
            surfaceData.insights = this.generateVolatilityInsights(surfaceData, historicalVol);

            // Cache results
            this.volatilitySurface.set(symbol, surfaceData);

            // Emit volatility update
            this.emit('volatilityUpdate', surfaceData);

            this.logger.info(`Volatility surface modeling completed for ${symbol}`, {
                duration: Date.now() - startTime,
                expiriesCount: expiries.length,
                strikesCount: strikes.length
            });

            return surfaceData;

        } catch (error) {
            this.logger.error('Error in volatility surface modeling', { symbol, error: error.message });
            throw error;
        }
    }

    /**
     * Advanced Technical Analysis
     * Performs advanced technical analysis with pattern recognition
     */
    async performAdvancedTechnicalAnalysis(symbol, timeframe = '1h', lookback = 200) {
        const startTime = Date.now();

        try {
            const technicalData = {
                symbol,
                timeframe,
                timestamp: new Date(),
                patterns: [],
                indicators: {},
                levels: {},
                signals: [],
                confidence: 0
            };

            // Get OHLCV data
            const ohlcvData = await this.getOHLCVData(symbol, timeframe, lookback);

            // Pattern recognition
            technicalData.patterns = await this.recognizePatterns(ohlcvData);

            // Calculate advanced indicators
            technicalData.indicators = await this.calculateAdvancedIndicators(ohlcvData);

            // Support and resistance levels
            technicalData.levels = await this.calculateSupportResistanceLevels(ohlcvData);

            // Generate technical signals
            technicalData.signals = this.generateTechnicalSignals(technicalData);

            // Calculate overall confidence
            technicalData.confidence = this.calculateTechnicalConfidence(technicalData);

            this.logger.info(`Advanced technical analysis completed for ${symbol}`, {
                duration: Date.now() - startTime,
                patternsFound: technicalData.patterns.length,
                signalsGenerated: technicalData.signals.length,
                confidence: technicalData.confidence
            });

            return technicalData;

        } catch (error) {
            this.logger.error('Error in advanced technical analysis', { symbol, error: error.message });
            throw error;
        }
    }

    // Helper Methods

    async analyzeNewsSentiment(symbol) {
        // Simulated news sentiment analysis
        // In production, integrate with news APIs like Alpha Vantage, Finnhub, or NewsAPI
        return {
            score: Math.random() * 2 - 1, // -1 to 1
            magnitude: Math.random(),
            articles: Math.floor(Math.random() * 50) + 10,
            keywords: ['bullish', 'growth', 'strong'],
            confidence: Math.random() * 0.3 + 0.7
        };
    }

    async analyzeSocialSentiment(symbol) {
        // Simulated social media sentiment analysis
        // In production, integrate with Twitter API, Reddit API, etc.
        return {
            score: Math.random() * 2 - 1,
            magnitude: Math.random(),
            mentions: Math.floor(Math.random() * 1000) + 100,
            engagement: Math.random(),
            confidence: Math.random() * 0.3 + 0.6
        };
    }

    async analyzeTechnicalSentiment(symbol) {
        // Technical sentiment based on price action and indicators
        const ohlcv = await this.getOHLCVData(symbol, '1h', 24);
        const prices = ohlcv.map(candle => candle.close);
        const rsi = this.calculateRSI(prices);
        const macd = this.calculateMACD(prices);
        
        let score = 0;
        if (rsi[0] > 70) score -= 0.5;
        else if (rsi[0] < 30) score += 0.5;
        
        if (macd.signal > 0) score += 0.3;
        else score -= 0.3;

        return {
            score: Math.max(-1, Math.min(1, score)),
            indicators: { rsi: rsi[0], macd },
            confidence: 0.8
        };
    }

    async getOHLCVData(symbol, timeframe, lookback) {
        // Simulated OHLCV data
        const data = [];
        const basePrice = 50000 + Math.random() * 30000;
        
        for (let i = 0; i < lookback; i++) {
            const open = basePrice * (1 + (Math.random() - 0.5) * 0.05);
            const close = open * (1 + (Math.random() - 0.5) * 0.02);
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.01);
            const volume = Math.random() * 1000000;
            
            data.push({ open, high, low, close, volume });
        }
        
        return data;
    }

    calculateCompositeSentiment(sources) {
        let totalScore = 0;
        let totalWeight = 0;

        Object.entries(sources).forEach(([source, data]) => {
            const weight = this.getSentimentSourceWeight(source);
            totalScore += data.score * weight * data.confidence;
            totalWeight += weight * data.confidence;
        });

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    getSentimentSourceWeight(source) {
        const weights = {
            news: 0.4,
            social: 0.3,
            technical: 0.3
        };
        return weights[source] || 0.1;
    }

    calculateSentimentConfidence(sources) {
        const confidences = Object.values(sources).map(s => s.confidence);
        return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }

    generateSentimentSignals(sentimentData) {
        const signals = [];
        const { composite, confidence } = sentimentData;

        if (confidence > this.config.confidenceThreshold) {
            if (composite > 0.5) {
                signals.push({
                    type: 'BUY',
                    strength: composite,
                    confidence,
                    reason: 'Strong positive sentiment'
                });
            } else if (composite < -0.5) {
                signals.push({
                    type: 'SELL',
                    strength: Math.abs(composite),
                    confidence,
                    reason: 'Strong negative sentiment'
                });
            }
        }

        return signals;
    }

    async getHistoricalPrices(symbol, days) {
        // Simulated historical price data
        // In production, fetch from exchange APIs or data providers
        const prices = [];
        const basePrice = 50000 + Math.random() * 20000; // BTC-like price
        
        for (let i = days; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const price = basePrice * (1 + (Math.random() - 0.5) * 0.1);
            prices.push({ date, price });
        }
        
        return prices;
    }

    async calculateRegimeIndicators(priceData) {
        const prices = priceData.map(p => p.price);
        const returns = this.calculateReturns(prices);
        
        return {
            sma20: this.calculateSMA(prices, 20),
            sma50: this.calculateSMA(prices, 50),
            volatility: this.calculateVolatility(returns),
            skewness: this.calculateSkewness(returns),
            kurtosis: this.calculateKurtosis(returns),
            support: Math.min(...prices.slice(-20)),
            resistance: Math.max(...prices.slice(-20))
        };
    }

    calculateTrendStrength(priceData) {
        const prices = priceData.map(p => p.price);
        const sma20 = this.calculateSMA(prices, 20);
        const sma50 = this.calculateSMA(prices, 50);
        
        if (sma20[sma20.length - 1] > sma50[sma50.length - 1]) {
            return (sma20[sma20.length - 1] - sma50[sma50.length - 1]) / sma50[sma50.length - 1];
        } else {
            return (sma20[sma20.length - 1] - sma50[sma50.length - 1]) / sma50[sma50.length - 1];
        }
    }

    analyzeVolatilityRegime(priceData) {
        const prices = priceData.map(p => p.price);
        const returns = this.calculateReturns(prices);
        const volatility = this.calculateVolatility(returns);
        
        if (volatility > 0.03) return 'HIGH';
        else if (volatility > 0.015) return 'MEDIUM';
        else return 'LOW';
    }

    analyzeMomentumRegime(priceData) {
        const prices = priceData.map(p => p.price);
        const rsi = this.calculateRSI(prices);
        const currentRSI = rsi[rsi.length - 1];
        
        if (currentRSI > 70) return 'OVERBOUGHT';
        else if (currentRSI < 30) return 'OVERSOLD';
        else return 'NEUTRAL';
    }

    classifyRegime(indicators, trendStrength, volatilityRegime, momentumRegime) {
        // Simplified regime classification logic
        if (trendStrength > 0.05 && volatilityRegime !== 'HIGH') {
            return 'BULL';
        } else if (trendStrength < -0.05 && volatilityRegime !== 'HIGH') {
            return 'BEAR';
        } else {
            return 'SIDEWAYS';
        }
    }

    calculateRegimeConfidence(indicators) {
        // Simplified confidence calculation
        return Math.random() * 0.3 + 0.7; // 0.7 to 1.0
    }

    generateRegimeSignals(regimeData) {
        const signals = [];
        const { regime, confidence } = regimeData;

        if (confidence > this.config.confidenceThreshold) {
            if (regime === 'BULL') {
                signals.push({
                    type: 'REGIME_BULL',
                    confidence,
                    recommendation: 'Consider long positions'
                });
            } else if (regime === 'BEAR') {
                signals.push({
                    type: 'REGIME_BEAR',
                    confidence,
                    recommendation: 'Consider short positions or cash'
                });
            } else {
                signals.push({
                    type: 'REGIME_SIDEWAYS',
                    confidence,
                    recommendation: 'Range trading strategy'
                });
            }
        }

        return signals;
    }

    // Utility calculation methods
    calculateReturns(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        return returns;
    }

    calculateSMA(prices, period) {
        const sma = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }

    calculateVolatility(returns) {
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        return Math.sqrt(variance * 252); // Annualized
    }

    calculateRSI(prices, period = 14) {
        // Simplified RSI calculation
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
        const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
        
        if (avgLoss === 0) return [100];
        
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return [rsi];
    }

    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
        
        return {
            macd: macdLine,
            signal: macdLine > 0 ? 1 : -1
        };
    }

    calculateEMA(prices, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        ema[0] = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
        }
        
        return ema;
    }

    startPeriodicUpdates() {
        setInterval(async () => {
            try {
                // Update cached data periodically
                await this.refreshCachedData();
            } catch (error) {
                this.logger.error('Error in periodic update', { error: error.message });
            }
        }, this.config.refreshInterval);
    }

    async refreshCachedData() {
        // Refresh cached sentiment and regime data
        this.logger.info('Refreshing cached market intelligence data');
        
        // Clean up old cache entries
        this.cleanupCache();
    }

    cleanupCache() {
        const now = Date.now();
        
        // Clean sentiment cache
        for (const [key, value] of this.sentimentCache.entries()) {
            if (now - value.timestamp.getTime() > this.config.sentimentWindow) {
                this.sentimentCache.delete(key);
            }
        }
        
        // Clean regime cache
        for (const [key, value] of this.regimeCache.entries()) {
            if (now - value.timestamp.getTime() > this.config.regimeWindow) {
                this.regimeCache.delete(key);
            }
        }
    }

    async initializeHistoricalData() {
        this.logger.info('Initializing historical market intelligence data');
        
        // Initialize with sample data
        const popularSymbols = ['BTC', 'ETH', 'ADA', 'SOL', 'MATIC'];
        
        for (const symbol of popularSymbols) {
            try {
                await this.analyzeSentiment(symbol);
                await this.detectMarketRegime(symbol);
            } catch (error) {
                this.logger.warn(`Failed to initialize data for ${symbol}`, { error: error.message });
            }
        }
    }

    // Public API methods
    async getMarketIntelligence(symbol) {
        const sentiment = this.sentimentCache.get(symbol);
        const regime = this.regimeCache.get(symbol);
        
        return {
            symbol,
            timestamp: new Date(),
            sentiment,
            regime,
            status: 'active'
        };
    }

    async getAllMarketIntelligence() {
        const intelligence = {};
        
        for (const [symbol, sentiment] of this.sentimentCache.entries()) {
            const regime = this.regimeCache.get(symbol);
            intelligence[symbol] = { sentiment, regime };
        }
        
        return intelligence;
    }

    getServiceStatus() {
        return {
            status: 'active',
            cacheSize: {
                sentiment: this.sentimentCache.size,
                regime: this.regimeCache.size,
                correlation: this.correlationMatrix.size,
                volatility: this.volatilitySurface.size
            },
            lastUpdate: new Date(),
            uptime: process.uptime()
        };
    }

    // Additional helper methods for missing functionality
    async calculateHistoricalVolatility(symbol) {
        const prices = await this.getHistoricalPrices(symbol, 30);
        const returns = this.calculateReturns(prices.map(p => p.price));
        return this.calculateVolatility(returns);
    }

    async calculateImpliedVolatilitySurface(symbol, expiries, strikes) {
        // Simulated implied volatility surface
        const surface = {};
        
        expiries.forEach(expiry => {
            surface[expiry] = {};
            strikes.forEach(strike => {
                // Simplified Black-Scholes implied volatility simulation
                const baseVol = 0.25 + Math.random() * 0.5; // 25% to 75%
                const skew = Math.abs(strike - 1.0) * 0.1; // ATM skew
                surface[expiry][strike] = Math.max(0.1, baseVol + skew);
            });
        });
        
        return surface;
    }

    analyzeVolatilitySmile(surface) {
        // Analyze volatility smile patterns
        const smileAnalysis = {};
        
        Object.keys(surface).forEach(expiry => {
            const strikes = Object.keys(surface[expiry]).map(Number).sort((a, b) => a - b);
            const vols = strikes.map(strike => surface[expiry][strike]);
            
            const atmVol = surface[expiry][1.0] || vols[Math.floor(vols.length / 2)];
            const skew = vols[vols.length - 1] - vols[0]; // Right vs left wing
            
            smileAnalysis[expiry] = {
                atmVol,
                skew,
                convexity: this.calculateConvexity(strikes, vols)
            };
        });
        
        return smileAnalysis;
    }

    calculateVolatilityTermStructure(surface) {
        // Calculate term structure of volatility
        const termStructure = {};
        
        Object.keys(surface).forEach(expiry => {
            const strikes = Object.keys(surface[expiry]);
            const atmVol = surface[expiry][1.0] || surface[expiry][strikes[Math.floor(strikes.length / 2)]];
            termStructure[expiry] = atmVol;
        });
        
        return termStructure;
    }

    calculateGreeks(surface, strikes, expiries) {
        // Simplified Greeks calculation
        const greeks = {};
        
        expiries.forEach(expiry => {
            greeks[expiry] = {};
            strikes.forEach(strike => {
                const vol = surface[expiry][strike];
                const timeToExpiry = expiry / 365;
                const moneyness = strike;
                
                // Simplified Greeks (in production, use proper Black-Scholes formulas)
                greeks[expiry][strike] = {
                    delta: 0.5 + (moneyness - 1) * 0.5,
                    gamma: Math.exp(-0.5 * Math.pow((moneyness - 1) / vol, 2)) / (vol * Math.sqrt(2 * Math.PI * timeToExpiry)),
                    theta: -vol * 0.1 * timeToExpiry,
                    vega: 0.3 * Math.sqrt(timeToExpiry),
                    rho: timeToExpiry * 0.01
                };
            });
        });
        
        return greeks;
    }

    generateVolatilityInsights(surfaceData, historicalVol) {
        const insights = [];
        
        // Compare implied vs historical volatility
        const avgImpliedVol = this.calculateAverageImpliedVol(surfaceData.surface);
        const volPremium = avgImpliedVol - historicalVol;
        
        if (volPremium > 0.05) {
            insights.push({
                type: 'VOLATILITY_PREMIUM',
                message: `High volatility premium detected: ${(volPremium * 100).toFixed(1)}%`,
                impact: 'BEARISH'
            });
        } else if (volPremium < -0.05) {
            insights.push({
                type: 'VOLATILITY_DISCOUNT',
                message: `Volatility trading at discount: ${(Math.abs(volPremium) * 100).toFixed(1)}%`,
                impact: 'BULLISH'
            });
        }
        
        return insights;
    }

    calculateAverageImpliedVol(surface) {
        let totalVol = 0;
        let count = 0;
        
        Object.values(surface).forEach(expiry => {
            Object.values(expiry).forEach(vol => {
                totalVol += vol;
                count++;
            });
        });
        
        return count > 0 ? totalVol / count : 0;
    }

    calculateConvexity(strikes, vols) {
        if (vols.length < 3) return 0;
        
        // Simple convexity measure
        const midIndex = Math.floor(vols.length / 2);
        const leftVol = vols[0];
        const midVol = vols[midIndex];
        const rightVol = vols[vols.length - 1];
        
        return (leftVol + rightVol) / 2 - midVol;
    }

    // Missing correlation analysis methods
    calculateCorrelationMatrix(priceDataMap) {
        const symbols = Array.from(priceDataMap.keys());
        const matrix = {};
        
        symbols.forEach(symbol1 => {
            matrix[symbol1] = {};
            symbols.forEach(symbol2 => {
                if (symbol1 === symbol2) {
                    matrix[symbol1][symbol2] = 1.0;
                } else {
                    const prices1 = priceDataMap.get(symbol1).map(p => p.price);
                    const prices2 = priceDataMap.get(symbol2).map(p => p.price);
                    matrix[symbol1][symbol2] = this.calculateCorrelation(prices1, prices2);
                }
            });
        });
        
        return matrix;
    }

    calculateCorrelation(prices1, prices2) {
        const returns1 = this.calculateReturns(prices1);
        const returns2 = this.calculateReturns(prices2);
        
        const n = Math.min(returns1.length, returns2.length);
        if (n < 2) return 0;
        
        const mean1 = returns1.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
        const mean2 = returns2.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
        
        let numerator = 0;
        let denominator1 = 0;
        let denominator2 = 0;
        
        for (let i = 0; i < n; i++) {
            const diff1 = returns1[i] - mean1;
            const diff2 = returns2[i] - mean2;
            
            numerator += diff1 * diff2;
            denominator1 += diff1 * diff1;
            denominator2 += diff2 * diff2;
        }
        
        const denominator = Math.sqrt(denominator1 * denominator2);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    performNetworkAnalysis(correlationMatrix) {
        // Simplified network analysis
        const networks = [];
        const symbols = Object.keys(correlationMatrix);
        
        symbols.forEach(symbol => {
            const connections = [];
            Object.entries(correlationMatrix[symbol]).forEach(([otherSymbol, correlation]) => {
                if (symbol !== otherSymbol && Math.abs(correlation) > 0.5) {
                    connections.push({ symbol: otherSymbol, correlation });
                }
            });
            
            if (connections.length > 0) {
                networks.push({ symbol, connections });
            }
        });
        
        return networks;
    }

    performClusterAnalysis(correlationMatrix) {
        // Simplified clustering based on correlation thresholds
        const clusters = [];
        const symbols = Object.keys(correlationMatrix);
        const processed = new Set();
        
        symbols.forEach(symbol => {
            if (processed.has(symbol)) return;
            
            const cluster = [symbol];
            processed.add(symbol);
            
            symbols.forEach(otherSymbol => {
                if (symbol !== otherSymbol && !processed.has(otherSymbol)) {
                    const correlation = correlationMatrix[symbol][otherSymbol];
                    if (correlation > 0.7) {
                        cluster.push(otherSymbol);
                        processed.add(otherSymbol);
                    }
                }
            });
            
            if (cluster.length > 1) {
                clusters.push({
                    id: `cluster_${clusters.length + 1}`,
                    symbols: cluster,
                    avgCorrelation: this.calculateClusterCorrelation(cluster, correlationMatrix)
                });
            }
        });
        
        return clusters;
    }

    calculateClusterCorrelation(clusterSymbols, correlationMatrix) {
        let totalCorrelation = 0;
        let count = 0;
        
        for (let i = 0; i < clusterSymbols.length; i++) {
            for (let j = i + 1; j < clusterSymbols.length; j++) {
                totalCorrelation += correlationMatrix[clusterSymbols[i]][clusterSymbols[j]];
                count++;
            }
        }
        
        return count > 0 ? totalCorrelation / count : 0;
    }

    generateCorrelationInsights(correlationData) {
        const insights = [];
        
        // High correlation insights
        const highCorrelations = this.findHighCorrelations(correlationData.matrix);
        if (highCorrelations.length > 0) {
            insights.push({
                type: 'HIGH_CORRELATION',
                message: `Found ${highCorrelations.length} highly correlated pairs`,
                details: highCorrelations
            });
        }
        
        // Cluster insights
        if (correlationData.clusters.length > 0) {
            insights.push({
                type: 'CLUSTERING',
                message: `Identified ${correlationData.clusters.length} correlation clusters`,
                details: correlationData.clusters
            });
        }
        
        return insights;
    }

    findHighCorrelations(matrix) {
        const highCorrelations = [];
        const symbols = Object.keys(matrix);
        
        for (let i = 0; i < symbols.length; i++) {
            for (let j = i + 1; j < symbols.length; j++) {
                const correlation = matrix[symbols[i]][symbols[j]];
                if (Math.abs(correlation) > 0.8) {
                    highCorrelations.push({
                        pair: [symbols[i], symbols[j]],
                        correlation
                    });
                }
            }
        }
        
        return highCorrelations;
    }

    calculateSkewness(returns) {
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev === 0) return 0;
        
        const skewness = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 3), 0) / returns.length;
        return skewness;
    }

    calculateKurtosis(returns) {
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev === 0) return 0;
        
        const kurtosis = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 4), 0) / returns.length;
        return kurtosis - 3; // Excess kurtosis
    }
}

module.exports = MarketIntelligenceService;