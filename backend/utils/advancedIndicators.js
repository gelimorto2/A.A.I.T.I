const { mean, standardDeviation } = require('simple-statistics');
const logger = require('./logger');

/**
 * Advanced Technical Indicators for ML Trading
 * Heavily enhanced indicator suite for sophisticated ML feature engineering
 */
class AdvancedIndicators {
  constructor() {
    logger.info('AdvancedIndicators initialized with 15+ sophisticated indicators');
  }

  /**
   * Stochastic Oscillator (%K and %D)
   */
  calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    if (closes.length < kPeriod) return { k: NaN, d: NaN };

    const kValues = [];
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
      const periodLows = lows.slice(i - kPeriod + 1, i + 1);
      const currentClose = closes[i];
      
      const highestHigh = Math.max(...periodHighs);
      const lowestLow = Math.min(...periodLows);
      
      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(k);
    }

    const dValues = [];
    for (let i = dPeriod - 1; i < kValues.length; i++) {
      const dValue = mean(kValues.slice(i - dPeriod + 1, i + 1));
      dValues.push(dValue);
    }

    return {
      k: kValues[kValues.length - 1] || NaN,
      d: dValues[dValues.length - 1] || NaN,
      kSeries: kValues,
      dSeries: dValues
    };
  }

  /**
   * Williams %R
   */
  calculateWilliamsR(highs, lows, closes, period = 14) {
    if (closes.length < period) return NaN;

    const periodHighs = highs.slice(-period);
    const periodLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  /**
   * Volume Weighted Average Price (VWAP)
   */
  calculateVWAP(prices, volumes) {
    if (prices.length !== volumes.length || prices.length === 0) return NaN;

    let totalVolumePrice = 0;
    let totalVolume = 0;

    for (let i = 0; i < prices.length; i++) {
      totalVolumePrice += prices[i] * volumes[i];
      totalVolume += volumes[i];
    }

    return totalVolume === 0 ? NaN : totalVolumePrice / totalVolume;
  }

  /**
   * Average True Range (ATR)
   */
  calculateATR(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return NaN;

    const trueRanges = [];
    for (let i = 1; i < closes.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    return mean(trueRanges.slice(-period));
  }

  /**
   * Commodity Channel Index (CCI)
   */
  calculateCCI(highs, lows, closes, period = 20) {
    if (closes.length < period) return NaN;

    const typicalPrices = [];
    for (let i = 0; i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }

    const smaTypical = mean(typicalPrices.slice(-period));
    const meanDeviation = mean(
      typicalPrices.slice(-period).map(tp => Math.abs(tp - smaTypical))
    );

    const currentTypical = typicalPrices[typicalPrices.length - 1];
    return (currentTypical - smaTypical) / (0.015 * meanDeviation);
  }

  /**
   * Money Flow Index (MFI)
   */
  calculateMFI(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period + 1) return NaN;

    const typicalPrices = [];
    const rawMoneyFlows = [];
    
    for (let i = 0; i < closes.length; i++) {
      const typical = (highs[i] + lows[i] + closes[i]) / 3;
      typicalPrices.push(typical);
      rawMoneyFlows.push(typical * volumes[i]);
    }

    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let i = 1; i <= period; i++) {
      const idx = typicalPrices.length - i;
      if (typicalPrices[idx] > typicalPrices[idx - 1]) {
        positiveFlow += rawMoneyFlows[idx];
      } else if (typicalPrices[idx] < typicalPrices[idx - 1]) {
        negativeFlow += rawMoneyFlows[idx];
      }
    }

    if (negativeFlow === 0) return 100;
    const moneyFlowRatio = positiveFlow / negativeFlow;
    return 100 - (100 / (1 + moneyFlowRatio));
  }

  /**
   * Parabolic SAR
   */
  calculateParabolicSAR(highs, lows, closes, step = 0.02, max = 0.2) {
    if (closes.length < 2) return NaN;

    let sar = lows[0];
    let trend = 1; // 1 for uptrend, -1 for downtrend
    let acceleration = step;
    let extremePoint = highs[0];

    const sarValues = [sar];

    for (let i = 1; i < closes.length; i++) {
      const prevSar = sar;
      
      // Calculate new SAR
      sar = prevSar + acceleration * (extremePoint - prevSar);
      
      // Check for trend reversal
      if (trend === 1) {
        if (lows[i] <= sar) {
          trend = -1;
          sar = extremePoint;
          extremePoint = lows[i];
          acceleration = step;
        } else {
          if (highs[i] > extremePoint) {
            extremePoint = highs[i];
            acceleration = Math.min(acceleration + step, max);
          }
          sar = Math.min(sar, lows[i - 1], i > 1 ? lows[i - 2] : lows[i - 1]);
        }
      } else {
        if (highs[i] >= sar) {
          trend = 1;
          sar = extremePoint;
          extremePoint = highs[i];
          acceleration = step;
        } else {
          if (lows[i] < extremePoint) {
            extremePoint = lows[i];
            acceleration = Math.min(acceleration + step, max);
          }
          sar = Math.max(sar, highs[i - 1], i > 1 ? highs[i - 2] : highs[i - 1]);
        }
      }
      
      sarValues.push(sar);
    }

    return sarValues[sarValues.length - 1];
  }

  /**
   * Ichimoku Cloud components
   */
  calculateIchimoku(highs, lows, closes) {
    const tenkanPeriod = 9;
    const kijunPeriod = 26;
    const senkouBPeriod = 52;

    if (closes.length < senkouBPeriod) {
      return {
        tenkanSen: NaN,
        kijunSen: NaN,
        senkouSpanA: NaN,
        senkouSpanB: NaN,
        chikouSpan: NaN
      };
    }

    // Tenkan-sen (Conversion Line)
    const tenkanHigh = Math.max(...highs.slice(-tenkanPeriod));
    const tenkanLow = Math.min(...lows.slice(-tenkanPeriod));
    const tenkanSen = (tenkanHigh + tenkanLow) / 2;

    // Kijun-sen (Base Line)
    const kijunHigh = Math.max(...highs.slice(-kijunPeriod));
    const kijunLow = Math.min(...lows.slice(-kijunPeriod));
    const kijunSen = (kijunHigh + kijunLow) / 2;

    // Senkou Span A (Leading Span A)
    const senkouSpanA = (tenkanSen + kijunSen) / 2;

    // Senkou Span B (Leading Span B)
    const senkouHigh = Math.max(...highs.slice(-senkouBPeriod));
    const senkouLow = Math.min(...lows.slice(-senkouBPeriod));
    const senkouSpanB = (senkouHigh + senkouLow) / 2;

    // Chikou Span (Lagging Span)
    const chikouSpan = closes.length >= 26 ? closes[closes.length - 26] : NaN;

    return {
      tenkanSen,
      kijunSen,
      senkouSpanA,
      senkouSpanB,
      chikouSpan
    };
  }

  /**
   * Chaikin Money Flow (CMF)
   */
  calculateCMF(highs, lows, closes, volumes, period = 21) {
    if (closes.length < period) return NaN;

    let cmfSum = 0;
    let volumeSum = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const moneyFlowMultiplier = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
      const moneyFlowVolume = moneyFlowMultiplier * volumes[i];
      
      cmfSum += moneyFlowVolume;
      volumeSum += volumes[i];
    }

    return volumeSum === 0 ? 0 : cmfSum / volumeSum;
  }

  /**
   * Volume Rate of Change (VROC)
   */
  calculateVROC(volumes, period = 12) {
    if (volumes.length < period + 1) return NaN;

    const currentVolume = volumes[volumes.length - 1];
    const pastVolume = volumes[volumes.length - 1 - period];
    
    return pastVolume === 0 ? 0 : ((currentVolume - pastVolume) / pastVolume) * 100;
  }

  /**
   * Accumulation/Distribution Line (A/D Line)
   */
  calculateADLine(highs, lows, closes, volumes) {
    if (closes.length === 0) return NaN;

    let adLine = 0;
    const adValues = [];

    for (let i = 0; i < closes.length; i++) {
      const moneyFlowMultiplier = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
      const moneyFlowVolume = moneyFlowMultiplier * volumes[i];
      
      adLine += moneyFlowVolume;
      adValues.push(adLine);
    }

    return adValues[adValues.length - 1];
  }

  /**
   * On-Balance Volume (OBV)
   */
  calculateOBV(closes, volumes) {
    if (closes.length < 2) return NaN;

    let obv = volumes[0];
    const obvValues = [obv];

    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        obv += volumes[i];
      } else if (closes[i] < closes[i - 1]) {
        obv -= volumes[i];
      }
      obvValues.push(obv);
    }

    return obvValues[obvValues.length - 1];
  }

  /**
   * Aroon Indicator
   */
  calculateAroon(highs, lows, period = 25) {
    if (highs.length < period) return { up: NaN, down: NaN, oscillator: NaN };

    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const highestHighIndex = recentHighs.indexOf(Math.max(...recentHighs));
    const lowestLowIndex = recentLows.indexOf(Math.min(...recentLows));
    
    const aroonUp = ((period - 1 - highestHighIndex) / (period - 1)) * 100;
    const aroonDown = ((period - 1 - lowestLowIndex) / (period - 1)) * 100;
    const aroonOscillator = aroonUp - aroonDown;

    return {
      up: aroonUp,
      down: aroonDown,
      oscillator: aroonOscillator
    };
  }

  /**
   * Ultimate Oscillator
   */
  calculateUltimateOscillator(highs, lows, closes, period1 = 7, period2 = 14, period3 = 28) {
    if (closes.length < period3 + 1) return NaN;

    const buyingPressures = [];
    const trueRanges = [];

    for (let i = 1; i < closes.length; i++) {
      const buyingPressure = closes[i] - Math.min(lows[i], closes[i - 1]);
      const trueRange = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      
      buyingPressures.push(buyingPressure);
      trueRanges.push(trueRange);
    }

    const calculateRatio = (period) => {
      const recentBP = buyingPressures.slice(-period);
      const recentTR = trueRanges.slice(-period);
      
      const sumBP = recentBP.reduce((a, b) => a + b, 0);
      const sumTR = recentTR.reduce((a, b) => a + b, 0);
      
      return sumTR === 0 ? 0 : sumBP / sumTR;
    };

    const ratio1 = calculateRatio(period1);
    const ratio2 = calculateRatio(period2);
    const ratio3 = calculateRatio(period3);

    return 100 * ((4 * ratio1) + (2 * ratio2) + ratio3) / 7;
  }

  /**
   * Market Facilitation Index (MFI)
   */
  calculateMarketFacilitationIndex(highs, lows, volumes) {
    if (highs.length === 0 || volumes.length === 0) return NaN;

    const currentIndex = highs.length - 1;
    const range = highs[currentIndex] - lows[currentIndex];
    const volume = volumes[currentIndex];

    return volume === 0 ? 0 : range / volume;
  }

  /**
   * Chande Momentum Oscillator (CMO)
   */
  calculateCMO(closes, period = 14) {
    if (closes.length < period + 1) return NaN;

    let sumUp = 0;
    let sumDown = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        sumUp += change;
      } else {
        sumDown += Math.abs(change);
      }
    }

    const totalMovement = sumUp + sumDown;
    return totalMovement === 0 ? 0 : ((sumUp - sumDown) / totalMovement) * 100;
  }

  /**
   * Generate comprehensive feature vector for ML models
   */
  generateMLFeatures(ohlcv, options = {}) {
    const {
      highs, lows, opens, closes, volumes,
      includeTechnical = true,
      includeVolume = true,
      includePrice = true,
      lookback = 50
    } = ohlcv;

    if (!closes || closes.length < lookback) {
      return [];
    }

    const features = [];

    // Price-based features
    if (includePrice) {
      const recentCloses = closes.slice(-lookback);
      const recentOpens = opens?.slice(-lookback) || recentCloses;
      
      // Returns
      features.push(
        (recentCloses[recentCloses.length - 1] - recentCloses[recentCloses.length - 2]) / recentCloses[recentCloses.length - 2],
        mean(recentCloses.slice(-5).map((c, i, arr) => i > 0 ? (c - arr[i-1]) / arr[i-1] : 0)),
        mean(recentCloses.slice(-10).map((c, i, arr) => i > 0 ? (c - arr[i-1]) / arr[i-1] : 0))
      );

      // Volatility
      const returns = recentCloses.slice(1).map((c, i) => (c - recentCloses[i]) / recentCloses[i]);
      features.push(standardDeviation(returns));

      // Price ratios
      features.push(
        recentCloses[recentCloses.length - 1] / recentCloses[recentCloses.length - 6] - 1,
        recentCloses[recentCloses.length - 1] / recentCloses[recentCloses.length - 21] - 1
      );
    }

    // Technical indicators
    if (includeTechnical && highs && lows) {
      const recentHighs = highs.slice(-lookback);
      const recentLows = lows.slice(-lookback);
      const recentCloses = closes.slice(-lookback);

      // Basic indicators
      features.push(
        this.calculateWilliamsR(recentHighs, recentLows, recentCloses),
        this.calculateCCI(recentHighs, recentLows, recentCloses),
        this.calculateCMO(recentCloses)
      );

      // Stochastic
      const stoch = this.calculateStochastic(recentHighs, recentLows, recentCloses);
      features.push(stoch.k, stoch.d);

      // Ichimoku
      const ichimoku = this.calculateIchimoku(recentHighs, recentLows, recentCloses);
      features.push(
        ichimoku.tenkanSen,
        ichimoku.kijunSen,
        (recentCloses[recentCloses.length - 1] - ichimoku.senkouSpanA) / ichimoku.senkouSpanA
      );

      // Aroon
      const aroon = this.calculateAroon(recentHighs, recentLows);
      features.push(aroon.oscillator);
    }

    // Volume-based features
    if (includeVolume && volumes) {
      const recentVolumes = volumes.slice(-lookback);
      const recentCloses = closes.slice(-lookback);
      const recentHighs = highs?.slice(-lookback) || recentCloses;
      const recentLows = lows?.slice(-lookback) || recentCloses;

      features.push(
        this.calculateVROC(recentVolumes),
        this.calculateOBV(recentCloses, recentVolumes),
        this.calculateCMF(recentHighs, recentLows, recentCloses, recentVolumes)
      );

      // VWAP relative position
      const vwap = this.calculateVWAP(recentCloses, recentVolumes);
      if (!isNaN(vwap)) {
        features.push((recentCloses[recentCloses.length - 1] - vwap) / vwap);
      }
    }

    // Filter out NaN and infinite values
    return features.filter(f => !isNaN(f) && isFinite(f));
  }

  /**
   * Calculate all indicators for a given dataset
   */
  calculateAllIndicators(ohlcv) {
    const { highs, lows, closes, volumes, opens } = ohlcv;
    
    if (!closes || closes.length < 50) {
      logger.warn('Insufficient data for indicator calculations');
      return {};
    }

    try {
      const indicators = {};

      // Price-based indicators
      if (highs && lows) {
        indicators.stochastic = this.calculateStochastic(highs, lows, closes);
        indicators.williamsR = this.calculateWilliamsR(highs, lows, closes);
        indicators.atr = this.calculateATR(highs, lows, closes);
        indicators.cci = this.calculateCCI(highs, lows, closes);
        indicators.parabolicSAR = this.calculateParabolicSAR(highs, lows, closes);
        indicators.ichimoku = this.calculateIchimoku(highs, lows, closes);
        indicators.aroon = this.calculateAroon(highs, lows);
        indicators.ultimateOscillator = this.calculateUltimateOscillator(highs, lows, closes);
      }

      // Price and volume indicators
      if (volumes) {
        indicators.mfi = this.calculateMFI(highs, lows, closes, volumes);
        indicators.cmf = this.calculateCMF(highs, lows, closes, volumes);
        indicators.vroc = this.calculateVROC(volumes);
        indicators.adLine = this.calculateADLine(highs, lows, closes, volumes);
        indicators.obv = this.calculateOBV(closes, volumes);
        indicators.vwap = this.calculateVWAP(closes, volumes);
        indicators.marketFacilitationIndex = this.calculateMarketFacilitationIndex(highs, lows, volumes);
      }

      // Price-only indicators
      indicators.cmo = this.calculateCMO(closes);

      logger.info('Advanced indicators calculated successfully', {
        indicatorCount: Object.keys(indicators).length,
        dataPoints: closes.length
      });

      return indicators;
    } catch (error) {
      logger.error('Error calculating advanced indicators:', error);
      return {};
    }
  }
}

module.exports = new AdvancedIndicators();