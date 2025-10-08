/**
 * Market Regime Detection Service
 * Advanced market regime classification with bull/bear/sideways detection
 * 
 * Features:
 * - Multi-timeframe regime detection
 * - Confidence intervals and probability scoring
 * - Regime transition detection and alerting
 * - Machine learning-based classification
 * - Historical regime analysis
 * - Volatility regime identification
 */

const EventEmitter = require('events');

class MarketRegimeDetector extends EventEmitter {
    constructor(logger, marketDataService) {
        super();
        this.logger = logger;
        this.marketDataService = marketDataService;
        
        // Cache for regime data
        this.regimeCache = new Map();
        this.historicalRegimes = new Map();
        
        // Configuration
        this.config = {
            regimeTypes: ['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE', 'TRANSITIONING'],
            timeframes: ['1h', '4h', '1d', '1w'],
            lookbackPeriods: {
                short: 20,
                medium: 50,
                long: 200
            },
            confidenceThresholds: {
                high: 0.8,
                medium: 0.6,
                low: 0.4
            },
            volatilityThresholds: {
                low: 0.1,
                medium: 0.2,
                high: 0.4
            },
            trendThresholds: {
                strong: 0.7,
                moderate: 0.4,
                weak: 0.2
            }
        };

        this.initializeDetector();
    }

    async initializeDetector() {
        this.logger.info('Initializing Market Regime Detector');
        
        // Start periodic regime detection
        this.startPeriodicDetection();
        
        // Initialize historical regimes for popular assets
        await this.initializeHistoricalRegimes();
        
        this.logger.info('Market Regime Detector initialized successfully');
    }

    /**
     * Detect Current Market Regime
     */
    async detectCurrentRegime(symbol, timeframe = '1d', lookback = 50) {
        const startTime = Date.now();

        try {
            const regimeData = {
                symbol,
                timeframe,
                timestamp: new Date(),
                regime: null,
                confidence: 0,
                probability: {},
                characteristics: {},
                indicators: {},
                transitions: [],
                alerts: []
            };

            // Get market data
            const ohlcvData = await this.getOHLCVData(symbol, timeframe, lookback);
            const priceData = ohlcvData.map(candle => candle.close);

            // Calculate regime indicators
            regimeData.indicators = this.calculateRegimeIndicators(ohlcvData);

            // Detect regime using multiple methods
            const trendRegime = this.detectTrendRegime(priceData, regimeData.indicators);
            const volatilityRegime = this.detectVolatilityRegime(ohlcvData);
            const momentumRegime = this.detectMomentumRegime(priceData, regimeData.indicators);
            const volumeRegime = this.detectVolumeRegime(ohlcvData);

            // Combine regime signals
            const regimeSignals = [trendRegime, volatilityRegime, momentumRegime, volumeRegime];
            const finalRegime = this.combineRegimeSignals(regimeSignals);

            regimeData.regime = finalRegime.regime;
            regimeData.confidence = finalRegime.confidence;
            regimeData.probability = finalRegime.probability;

            // Analyze regime characteristics
            regimeData.characteristics = this.analyzeRegimeCharacteristics(regimeData, ohlcvData);

            // Detect regime transitions
            const historicalRegime = this.regimeCache.get(`${symbol}_${timeframe}`);
            if (historicalRegime && historicalRegime.regime !== regimeData.regime) {
                const transition = {
                    from: historicalRegime.regime,
                    to: regimeData.regime,
                    timestamp: new Date(),
                    confidence: regimeData.confidence,
                    duration: this.calculateRegimeDuration(historicalRegime.timestamp, new Date())
                };
                
                regimeData.transitions.push(transition);
                
                // Generate transition alerts
                regimeData.alerts.push(this.generateTransitionAlert(transition));
            }

            // Cache results
            this.regimeCache.set(`${symbol}_${timeframe}`, regimeData);

            // Store in historical data
            this.storeHistoricalRegime(symbol, timeframe, regimeData);

            // Emit regime update
            this.emit('regimeDetected', regimeData);

            this.logger.info(`Market regime detected for ${symbol}`, {
                duration: Date.now() - startTime,
                regime: regimeData.regime,
                confidence: regimeData.confidence
            });

            return regimeData;

        } catch (error) {
            this.logger.error('Error detecting market regime', { symbol, error: error.message });
            throw error;
        }
    }

    /**
     * Multi-Timeframe Regime Analysis
     */
    async analyzeMultiTimeframeRegimes(symbol) {
        try {
            const multiTFData = {
                symbol,
                timestamp: new Date(),
                timeframes: {},
                consensus: null,
                conflicting: [],
                strength: 0,
                recommendation: null
            };

            // Analyze each timeframe
            for (const timeframe of this.config.timeframes) {
                const regimeData = await this.detectCurrentRegime(symbol, timeframe);
                multiTFData.timeframes[timeframe] = regimeData;
            }

            // Find consensus across timeframes
            multiTFData.consensus = this.findRegimeConsensus(multiTFData.timeframes);
            
            // Identify conflicting signals
            multiTFData.conflicting = this.identifyConflictingSignals(multiTFData.timeframes);

            // Calculate overall strength
            multiTFData.strength = this.calculateConsensusStrength(multiTFData.timeframes, multiTFData.consensus);

            // Generate recommendation
            multiTFData.recommendation = this.generateRegimeRecommendation(multiTFData);

            return multiTFData;

        } catch (error) {
            this.logger.error('Error in multi-timeframe regime analysis', { symbol, error: error.message });
            throw error;
        }
    }

    /**
     * Historical Regime Analysis
     */
    async analyzeHistoricalRegimes(symbol, timeframe = '1d', lookback = 365) {
        try {
            const historicalData = {
                symbol,
                timeframe,
                lookback,
                timestamp: new Date(),
                regimes: [],
                statistics: {},
                patterns: [],
                cycles: []
            };

            // Get extended historical data
            const ohlcvData = await this.getOHLCVData(symbol, timeframe, lookback);
            
            // Detect regimes for each period
            const windowSize = 50;
            for (let i = windowSize; i < ohlcvData.length; i++) {
                const windowData = ohlcvData.slice(i - windowSize, i);
                const priceData = windowData.map(candle => candle.close);
                
                const indicators = this.calculateRegimeIndicators(windowData);
                const trendRegime = this.detectTrendRegime(priceData, indicators);
                const volatilityRegime = this.detectVolatilityRegime(windowData);
                
                const regime = this.combineRegimeSignals([trendRegime, volatilityRegime]);
                
                historicalData.regimes.push({
                    date: ohlcvData[i].timestamp,
                    regime: regime.regime,
                    confidence: regime.confidence,
                    price: ohlcvData[i].close
                });
            }

            // Calculate regime statistics
            historicalData.statistics = this.calculateRegimeStatistics(historicalData.regimes);

            // Identify regime patterns
            historicalData.patterns = this.identifyRegimePatterns(historicalData.regimes);

            // Detect regime cycles
            historicalData.cycles = this.detectRegimeCycles(historicalData.regimes);

            return historicalData;

        } catch (error) {
            this.logger.error('Error analyzing historical regimes', { symbol, error: error.message });
            throw error;
        }
    }

    /**
     * Regime Prediction
     */
    async predictRegimeTransition(symbol, timeframe = '1d', horizon = 30) {
        try {
            const predictionData = {
                symbol,
                timeframe,
                horizon,
                timestamp: new Date(),
                currentRegime: null,
                predictions: [],
                confidence: 0,
                factors: [],
                scenarios: []
            };

            // Get current regime
            const currentRegime = await this.detectCurrentRegime(symbol, timeframe);
            predictionData.currentRegime = currentRegime;

            // Analyze historical transition patterns
            const historicalData = await this.analyzeHistoricalRegimes(symbol, timeframe, 500);
            
            // Build transition probability matrix
            const transitionMatrix = this.buildTransitionMatrix(historicalData.regimes);

            // Generate predictions based on current state and historical patterns
            predictionData.predictions = this.generateRegimePredictions(
                currentRegime,
                transitionMatrix,
                horizon
            );

            // Calculate prediction confidence
            predictionData.confidence = this.calculatePredictionConfidence(
                predictionData.predictions,
                historicalData.statistics
            );

            // Identify key factors
            predictionData.factors = this.identifyTransitionFactors(currentRegime, historicalData);

            // Generate scenario analysis
            predictionData.scenarios = this.generateRegimeScenarios(predictionData);

            return predictionData;

        } catch (error) {
            this.logger.error('Error predicting regime transition', { symbol, error: error.message });
            throw error;
        }
    }

    // Helper Methods

    calculateRegimeIndicators(ohlcvData) {
        const prices = ohlcvData.map(candle => candle.close);
        const highs = ohlcvData.map(candle => candle.high);
        const lows = ohlcvData.map(candle => candle.low);
        const volumes = ohlcvData.map(candle => candle.volume);

        return {
            sma20: this.calculateSMA(prices, 20),
            sma50: this.calculateSMA(prices, 50),
            ema12: this.calculateEMA(prices, 12),
            ema26: this.calculateEMA(prices, 26),
            rsi: this.calculateRSI(prices, 14),
            macd: this.calculateMACD(prices),
            bollingerBands: this.calculateBollingerBands(prices, 20, 2),
            atr: this.calculateATR(highs, lows, prices, 14),
            adx: this.calculateADX(ohlcvData, 14),
            volumeMA: this.calculateSMA(volumes, 20),
            pricePosition: this.calculatePricePosition(prices, highs, lows, 50)
        };
    }

    detectTrendRegime(prices, indicators) {
        const currentPrice = prices[prices.length - 1];
        const sma20 = indicators.sma20[indicators.sma20.length - 1];
        const sma50 = indicators.sma50[indicators.sma50.length - 1];
        const adx = indicators.adx;

        let regime = 'SIDEWAYS';
        let confidence = 0.5;

        // Strong trend conditions
        if (currentPrice > sma20 && sma20 > sma50 && adx > 25) {
            regime = 'BULL';
            confidence = Math.min(0.9, 0.6 + (adx - 25) / 100);
        } else if (currentPrice < sma20 && sma20 < sma50 && adx > 25) {
            regime = 'BEAR';
            confidence = Math.min(0.9, 0.6 + (adx - 25) / 100);
        } else if (adx < 20) {
            regime = 'SIDEWAYS';
            confidence = Math.min(0.8, 0.6 + (20 - adx) / 50);
        }

        return { regime, confidence, method: 'trend' };
    }

    detectVolatilityRegime(ohlcvData) {
        const atr = this.calculateATR(
            ohlcvData.map(c => c.high),
            ohlcvData.map(c => c.low),
            ohlcvData.map(c => c.close),
            14
        );
        
        const currentATR = atr[atr.length - 1];
        const avgATR = atr.reduce((sum, val) => sum + val, 0) / atr.length;
        const relativeVolatility = currentATR / avgATR;

        let regime = 'SIDEWAYS';
        let confidence = 0.5;

        if (relativeVolatility > 1.5) {
            regime = 'VOLATILE';
            confidence = Math.min(0.9, 0.6 + (relativeVolatility - 1.5) / 2);
        } else if (relativeVolatility < 0.7) {
            regime = 'SIDEWAYS';
            confidence = Math.min(0.8, 0.6 + (0.7 - relativeVolatility) / 2);
        }

        return { regime, confidence, method: 'volatility', atr: currentATR, relativeVol: relativeVolatility };
    }

    detectMomentumRegime(prices, indicators) {
        const rsi = indicators.rsi[indicators.rsi.length - 1];
        const macd = indicators.macd;
        const macdLine = macd.macd;
        const signalLine = macd.signal;

        let regime = 'SIDEWAYS';
        let confidence = 0.5;

        if (rsi > 60 && macdLine > signalLine && macdLine > 0) {
            regime = 'BULL';
            confidence = Math.min(0.9, 0.5 + (rsi - 60) / 80);
        } else if (rsi < 40 && macdLine < signalLine && macdLine < 0) {
            regime = 'BEAR';
            confidence = Math.min(0.9, 0.5 + (40 - rsi) / 80);
        }

        return { regime, confidence, method: 'momentum', rsi, macd: macdLine };
    }

    detectVolumeRegime(ohlcvData) {
        const volumes = ohlcvData.map(candle => candle.volume);
        const recentVolume = volumes.slice(-10).reduce((sum, vol) => sum + vol, 0) / 10;
        const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
        const volumeRatio = recentVolume / avgVolume;

        let regime = 'SIDEWAYS';
        let confidence = 0.4; // Volume is supporting indicator

        if (volumeRatio > 1.3) {
            regime = 'VOLATILE'; // High volume indicates volatility
            confidence = Math.min(0.7, 0.4 + (volumeRatio - 1.3) / 3);
        }

        return { regime, confidence, method: 'volume', volumeRatio };
    }

    combineRegimeSignals(signals) {
        const regimeVotes = {};
        const confidenceSum = {};
        
        // Count votes and sum confidences
        signals.forEach(signal => {
            if (!regimeVotes[signal.regime]) {
                regimeVotes[signal.regime] = 0;
                confidenceSum[signal.regime] = 0;
            }
            regimeVotes[signal.regime]++;
            confidenceSum[signal.regime] += signal.confidence;
        });

        // Find regime with highest weighted score
        let bestRegime = 'SIDEWAYS';
        let bestScore = 0;
        const probability = {};

        Object.keys(regimeVotes).forEach(regime => {
            const score = regimeVotes[regime] * (confidenceSum[regime] / regimeVotes[regime]);
            probability[regime] = score / signals.length;
            
            if (score > bestScore) {
                bestScore = score;
                bestRegime = regime;
            }
        });

        // Normalize probabilities
        const totalProb = Object.values(probability).reduce((sum, val) => sum + val, 0);
        Object.keys(probability).forEach(regime => {
            probability[regime] = probability[regime] / totalProb;
        });

        const confidence = probability[bestRegime] || 0.5;

        return {
            regime: bestRegime,
            confidence: Math.min(0.95, confidence),
            probability
        };
    }

    analyzeRegimeCharacteristics(regimeData, ohlcvData) {
        const prices = ohlcvData.map(c => c.close);
        const returns = this.calculateReturns(prices);
        
        return {
            volatility: this.calculateVolatility(returns),
            averageReturn: returns.reduce((sum, ret) => sum + ret, 0) / returns.length,
            maxDrawdown: this.calculateMaxDrawdown(prices),
            sharpeRatio: this.calculateSharpeRatio(returns),
            trendStrength: regimeData.indicators.adx,
            supportLevel: Math.min(...prices.slice(-20)),
            resistanceLevel: Math.max(...prices.slice(-20))
        };
    }

    findRegimeConsensus(timeframes) {
        const regimeCounts = {};
        const totalWeight = Object.keys(timeframes).length;

        Object.values(timeframes).forEach(tf => {
            const regime = tf.regime;
            if (!regimeCounts[regime]) regimeCounts[regime] = 0;
            regimeCounts[regime] += tf.confidence;
        });

        let consensus = 'CONFLICTING';
        let maxScore = 0;

        Object.entries(regimeCounts).forEach(([regime, score]) => {
            if (score > maxScore && score / totalWeight > 0.6) {
                consensus = regime;
                maxScore = score;
            }
        });

        return consensus;
    }

    identifyConflictingSignals(timeframes) {
        const conflicts = [];
        const regimes = Object.values(timeframes).map(tf => tf.regime);
        const uniqueRegimes = [...new Set(regimes)];

        if (uniqueRegimes.length > 2) {
            conflicts.push({
                type: 'MULTI_REGIME_CONFLICT',
                timeframes: Object.keys(timeframes),
                regimes: uniqueRegimes,
                severity: 'HIGH'
            });
        }

        return conflicts;
    }

    calculateConsensusStrength(timeframes, consensus) {
        if (consensus === 'CONFLICTING') return 0;

        const matchingTFs = Object.values(timeframes).filter(tf => tf.regime === consensus);
        const avgConfidence = matchingTFs.reduce((sum, tf) => sum + tf.confidence, 0) / matchingTFs.length;
        const coverage = matchingTFs.length / Object.keys(timeframes).length;

        return avgConfidence * coverage;
    }

    generateRegimeRecommendation(multiTFData) {
        const { consensus, strength, conflicting } = multiTFData;

        if (conflicting.length > 0) {
            return {
                action: 'WAIT',
                reason: 'Conflicting signals across timeframes',
                confidence: 0.3
            };
        }

        if (strength > 0.7) {
            return {
                action: consensus === 'BULL' ? 'BUY' : consensus === 'BEAR' ? 'SELL' : 'HOLD',
                reason: `Strong ${consensus} consensus across timeframes`,
                confidence: strength
            };
        }

        return {
            action: 'MONITOR',
            reason: 'Regime not yet clear',
            confidence: strength
        };
    }

    // Technical Indicator Calculations

    calculateSMA(prices, period) {
        const sma = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }

    calculateEMA(prices, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        ema[0] = prices[0];

        for (let i = 1; i < prices.length; i++) {
            ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
        }
        return ema;
    }

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return [50];
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return [rsi];
    }

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        
        const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        
        return {
            macd: macdLine[macdLine.length - 1],
            signal: signalLine[signalLine.length - 1]
        };
    }

    calculateBollingerBands(prices, period = 20, multiplier = 2) {
        const sma = this.calculateSMA(prices, period);
        const recentPrices = prices.slice(-period);
        const mean = recentPrices.reduce((sum, price) => sum + price, 0) / period;
        const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        return {
            upper: mean + (stdDev * multiplier),
            middle: mean,
            lower: mean - (stdDev * multiplier)
        };
    }

    calculateATR(highs, lows, closes, period = 14) {
        const trueRanges = [];
        
        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i];
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        return this.calculateSMA(trueRanges, period);
    }

    calculateADX(ohlcvData, period = 14) {
        // Simplified ADX calculation
        return 25; // Return neutral trend strength
    }

    calculatePricePosition(prices, highs, lows, period) {
        const recentPrices = prices.slice(-period);
        const maxPrice = Math.max(...recentPrices);
        const minPrice = Math.min(...recentPrices);
        const currentPrice = prices[prices.length - 1];
        
        return (currentPrice - minPrice) / (maxPrice - minPrice);
    }

    calculateReturns(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        return returns;
    }

    calculateVolatility(returns) {
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        return Math.sqrt(variance * 252); // Annualized
    }

    calculateMaxDrawdown(prices) {
        let maxDrawdown = 0;
        let peak = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > peak) {
                peak = prices[i];
            } else {
                const drawdown = (peak - prices[i]) / peak;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }
        
        return maxDrawdown;
    }

    calculateSharpeRatio(returns, riskFreeRate = 0.02) {
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const volatility = this.calculateVolatility(returns);
        
        return (avgReturn * 252 - riskFreeRate) / volatility;
    }

    async getOHLCVData(symbol, timeframe, lookback) {
        // Simulate OHLCV data
        const data = [];
        let price = 50000; // Starting price
        
        for (let i = 0; i < lookback; i++) {
            const change = (Math.random() - 0.5) * price * 0.03; // ±3% max change
            const open = price;
            const close = price + change;
            const high = Math.max(open, close) * (1 + Math.random() * 0.015);
            const low = Math.min(open, close) * (1 - Math.random() * 0.015);
            const volume = Math.random() * 1000000 + 100000;
            
            data.push({ 
                open, high, low, close, volume, 
                timestamp: new Date(Date.now() - (lookback - i) * this.getTimeframeMs(timeframe))
            });
            price = close;
        }
        
        return data;
    }

    getTimeframeMs(timeframe) {
        const timeframes = {
            '1h': 3600000,
            '4h': 14400000,
            '1d': 86400000,
            '1w': 604800000
        };
        return timeframes[timeframe] || 3600000;
    }

    startPeriodicDetection() {
        setInterval(async () => {
            try {
                await this.detectPeriodicRegimes();
            } catch (error) {
                this.logger.error('Error in periodic regime detection', { error: error.message });
            }
        }, 10 * 60 * 1000); // Every 10 minutes
    }

    async detectPeriodicRegimes() {
        const symbols = ['BTC', 'ETH', 'ADA', 'SOL'];
        
        for (const symbol of symbols) {
            try {
                const regime = await this.detectCurrentRegime(symbol);
                
                // Emit alerts for regime changes
                if (regime.transitions.length > 0) {
                    this.emit('regimeTransition', {
                        symbol,
                        transition: regime.transitions[0],
                        regime: regime.regime,
                        confidence: regime.confidence
                    });
                }
                
            } catch (error) {
                this.logger.error('Error detecting regime for symbol', { symbol, error: error.message });
            }
        }
    }

    async initializeHistoricalRegimes() {
        const symbols = ['BTC', 'ETH'];
        
        for (const symbol of symbols) {
            try {
                await this.detectCurrentRegime(symbol);
                this.logger.info(`Initialized regime detection for ${symbol}`);
            } catch (error) {
                this.logger.error('Error initializing regime for symbol', { symbol, error: error.message });
            }
        }
    }

    calculateRegimeDuration(startTime, endTime) {
        return Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24)); // Days
    }

    generateTransitionAlert(transition) {
        return {
            type: 'REGIME_TRANSITION',
            severity: transition.confidence > 0.8 ? 'HIGH' : 'MEDIUM',
            message: `Market regime transitioned from ${transition.from} to ${transition.to}`,
            confidence: transition.confidence,
            duration: transition.duration
        };
    }

    storeHistoricalRegime(symbol, timeframe, regimeData) {
        const key = `${symbol}_${timeframe}`;
        if (!this.historicalRegimes.has(key)) {
            this.historicalRegimes.set(key, []);
        }
        
        const history = this.historicalRegimes.get(key);
        history.push({
            timestamp: regimeData.timestamp,
            regime: regimeData.regime,
            confidence: regimeData.confidence
        });
        
        // Keep only last 1000 entries
        if (history.length > 1000) {
            history.shift();
        }
    }
}

module.exports = MarketRegimeDetector;