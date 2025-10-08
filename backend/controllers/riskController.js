const logger = require('../utils/logger');

/**
 * Risk Management Controller
 * Handles risk management API endpoints for the A.A.I.T.I trading platform
 */
class RiskController {
  constructor(riskManager) {
    this.riskManager = riskManager;
  }

  /**
   * Get current risk status and metrics
   */
  async getRiskStatus(req, res) {
    try {
      const riskStatus = this.riskManager.getRiskStatus();
      
      res.status(200).json({
        success: true,
        data: {
          portfolio: {
            value: riskStatus.portfolioState.portfolioValue,
            exposure: riskStatus.portfolioState.totalExposure,
            exposureRatio: riskStatus.portfolioState.totalExposure / riskStatus.portfolioState.portfolioValue,
            drawdown: riskStatus.portfolioState.currentDrawdown,
            dailyPnL: riskStatus.portfolioState.dailyPnL,
            positionsCount: riskStatus.portfolioState.positions.size
          },
          metrics: riskStatus.riskMetrics,
          limits: {
            maxPositionSize: riskStatus.configuration.maxPositionSizeUSD,
            maxPortfolioExposure: riskStatus.configuration.maxPortfolioExposure,
            maxSymbolExposure: riskStatus.configuration.maxSymbolExposure,
            maxBotExposure: riskStatus.configuration.maxBotExposure,
            maxDrawdown: riskStatus.configuration.maxDrawdownPercent,
            dailyLossLimit: riskStatus.configuration.dailyLossLimit
          },
          lastUpdate: riskStatus.lastUpdate
        },
        timestamp: new Date().toISOString()
      });

      logger.debug('Risk status retrieved', {
        portfolioValue: riskStatus.portfolioState.portfolioValue,
        exposure: riskStatus.portfolioState.totalExposure,
        service: 'risk-controller'
      });
    } catch (error) {
      logger.error('Failed to get risk status', {
        error: error.message,
        service: 'risk-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve risk status',
        message: error.message
      });
    }
  }

  /**
   * Evaluate trade risk
   */
  async evaluateTradeRisk(req, res) {
    try {
      const { botId, symbol, side, quantity, price, metadata = {} } = req.body;

      // Validate required fields
      if (!botId || !symbol || !side || !quantity || !price) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['botId', 'symbol', 'side', 'quantity', 'price']
        });
      }

      // Validate trade parameters
      if (!['buy', 'sell'].includes(side)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid side',
          message: 'Side must be "buy" or "sell"'
        });
      }

      if (quantity <= 0 || price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid quantity or price',
          message: 'Quantity and price must be positive numbers'
        });
      }

      // Evaluate trade risk
      const riskAssessment = await this.riskManager.evaluateTradeRisk(
        botId,
        symbol,
        side,
        parseFloat(quantity),
        parseFloat(price),
        metadata
      );

      res.status(200).json({
        success: true,
        data: {
          approved: riskAssessment.approved,
          riskScore: riskAssessment.riskScore,
          originalQuantity: parseFloat(quantity),
          recommendedQuantity: riskAssessment.adjustedQuantity,
          adjustmentReason: riskAssessment.adjustedQuantity !== parseFloat(quantity) ? 
            'Position size adjusted for risk management' : null,
          warnings: riskAssessment.warnings,
          blockers: riskAssessment.blockers,
          recommendations: riskAssessment.recommendations,
          riskBreakdown: {
            hasPositionLimitIssues: riskAssessment.warnings.some(w => w.includes('position')),
            hasExposureLimitIssues: riskAssessment.warnings.some(w => w.includes('exposure')),
            hasDrawdownIssues: riskAssessment.blockers.some(b => b.includes('drawdown')),
            hasVolatilityIssues: riskAssessment.warnings.some(w => w.includes('volatility')),
            hasCorrelationIssues: riskAssessment.warnings.some(w => w.includes('correlation'))
          }
        },
        timestamp: new Date().toISOString()
      });

      logger.info('Trade risk evaluation completed', {
        botId,
        symbol,
        side,
        quantity,
        price,
        approved: riskAssessment.approved,
        riskScore: riskAssessment.riskScore,
        service: 'risk-controller'
      });
    } catch (error) {
      logger.error('Trade risk evaluation failed', {
        error: error.message,
        body: req.body,
        service: 'risk-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Risk evaluation failed',
        message: error.message
      });
    }
  }

  /**
   * Get risk configuration
   */
  async getRiskConfiguration(req, res) {
    try {
      const riskStatus = this.riskManager.getRiskStatus();
      
      res.status(200).json({
        success: true,
        data: riskStatus.configuration,
        timestamp: new Date().toISOString()
      });

      logger.debug('Risk configuration retrieved', {
        service: 'risk-controller'
      });
    } catch (error) {
      logger.error('Failed to get risk configuration', {
        error: error.message,
        service: 'risk-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve risk configuration',
        message: error.message
      });
    }
  }

  /**
   * Update risk configuration
   */
  async updateRiskConfiguration(req, res) {
    try {
      const updates = req.body;

      // Validate configuration updates
      const validFields = [
        'maxPositionSizeUSD',
        'maxPortfolioExposure',
        'maxSymbolExposure',
        'maxBotExposure',
        'maxDrawdownPercent',
        'dailyLossLimit',
        'volatilityLookbackDays',
        'baseVolatilityPercent',
        'maxVolatilityMultiplier',
        'maxCorrelatedPositions',
        'correlationThreshold',
        'riskCheckIntervalMs',
        'alertThreshold'
      ];

      const invalidFields = Object.keys(updates).filter(field => !validFields.includes(field));
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid configuration fields',
          invalidFields,
          validFields
        });
      }

      // Validate ranges
      const validationErrors = [];
      
      if (updates.maxPortfolioExposure !== undefined && (updates.maxPortfolioExposure <= 0 || updates.maxPortfolioExposure > 1)) {
        validationErrors.push('maxPortfolioExposure must be between 0 and 1');
      }
      
      if (updates.maxSymbolExposure !== undefined && (updates.maxSymbolExposure <= 0 || updates.maxSymbolExposure > 1)) {
        validationErrors.push('maxSymbolExposure must be between 0 and 1');
      }
      
      if (updates.maxBotExposure !== undefined && (updates.maxBotExposure <= 0 || updates.maxBotExposure > 1)) {
        validationErrors.push('maxBotExposure must be between 0 and 1');
      }
      
      if (updates.maxDrawdownPercent !== undefined && (updates.maxDrawdownPercent <= 0 || updates.maxDrawdownPercent > 1)) {
        validationErrors.push('maxDrawdownPercent must be between 0 and 1');
      }
      
      if (updates.dailyLossLimit !== undefined && (updates.dailyLossLimit <= 0 || updates.dailyLossLimit > 1)) {
        validationErrors.push('dailyLossLimit must be between 0 and 1');
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Configuration validation failed',
          validationErrors
        });
      }

      // Update configuration
      this.riskManager.updateRiskConfiguration(updates);

      res.status(200).json({
        success: true,
        message: 'Risk configuration updated successfully',
        updatedFields: Object.keys(updates),
        timestamp: new Date().toISOString()
      });

      logger.info('Risk configuration updated', {
        updatedFields: Object.keys(updates),
        updates,
        service: 'risk-controller'
      });
    } catch (error) {
      logger.error('Failed to update risk configuration', {
        error: error.message,
        body: req.body,
        service: 'risk-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update risk configuration',
        message: error.message
      });
    }
  }

  /**
   * Get detailed portfolio positions with risk analysis
   */
  async getPortfolioRiskAnalysis(req, res) {
    try {
      const riskStatus = this.riskManager.getRiskStatus();
      const positions = Array.from(riskStatus.portfolioState.positions.entries());
      
      // Group positions by bot and symbol
      const analysis = {
        byBot: new Map(),
        bySymbol: new Map(),
        correlationMatrix: Array.from(riskStatus.portfolioState.correlationMatrix.entries()),
        volatilityData: Array.from(riskStatus.portfolioState.volatilityData.entries())
      };

      // Analyze positions by bot
      positions.forEach(([key, position]) => {
        const [botId, symbol] = key.split(':');
        
        if (!analysis.byBot.has(botId)) {
          analysis.byBot.set(botId, {
            totalValue: 0,
            positions: [],
            exposure: 0,
            riskScore: 0
          });
        }
        
        const botAnalysis = analysis.byBot.get(botId);
        botAnalysis.totalValue += Math.abs(position.value);
        botAnalysis.positions.push({ symbol, ...position });
        botAnalysis.exposure = botAnalysis.totalValue / riskStatus.portfolioState.portfolioValue;
      });

      // Analyze positions by symbol
      positions.forEach(([key, position]) => {
        const [, symbol] = key.split(':');
        
        if (!analysis.bySymbol.has(symbol)) {
          analysis.bySymbol.set(symbol, {
            totalValue: 0,
            bots: [],
            exposure: 0,
            volatility: 0
          });
        }
        
        const symbolAnalysis = analysis.bySymbol.get(symbol);
        symbolAnalysis.totalValue += Math.abs(position.value);
        symbolAnalysis.bots.push(key.split(':')[0]);
        symbolAnalysis.exposure = symbolAnalysis.totalValue / riskStatus.portfolioState.portfolioValue;
        
        // Add volatility if available
        const volatilityData = riskStatus.portfolioState.volatilityData.get(symbol);
        if (volatilityData) {
          symbolAnalysis.volatility = volatilityData.volatility;
        }
      });

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalPositions: positions.length,
            totalBots: analysis.byBot.size,
            totalSymbols: analysis.bySymbol.size,
            portfolioValue: riskStatus.portfolioState.portfolioValue,
            totalExposure: riskStatus.portfolioState.totalExposure,
            currentDrawdown: riskStatus.portfolioState.currentDrawdown
          },
          byBot: Object.fromEntries(analysis.byBot),
          bySymbol: Object.fromEntries(analysis.bySymbol),
          riskMetrics: riskStatus.riskMetrics,
          correlations: analysis.correlationMatrix.map(([key, data]) => ({
            symbols: key,
            correlation: data.correlation,
            calculatedAt: data.calculatedAt
          })),
          volatilities: analysis.volatilityData.map(([symbol, data]) => ({
            symbol,
            volatility: data.volatility,
            calculatedAt: data.calculatedAt,
            sampleSize: data.sampleSize
          }))
        },
        timestamp: new Date().toISOString()
      });

      logger.debug('Portfolio risk analysis retrieved', {
        positionsCount: positions.length,
        botsCount: analysis.byBot.size,
        symbolsCount: analysis.bySymbol.size,
        service: 'risk-controller'
      });
    } catch (error) {
      logger.error('Failed to get portfolio risk analysis', {
        error: error.message,
        service: 'risk-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve portfolio risk analysis',
        message: error.message
      });
    }
  }

  /**
   * Get risk alerts and warnings
   */
  async getRiskAlerts(req, res) {
    try {
      const riskStatus = this.riskManager.getRiskStatus();
      const alerts = [];

      // Generate current alerts based on risk status
      const exposureRatio = riskStatus.portfolioState.totalExposure / riskStatus.portfolioState.portfolioValue;
      
      // Drawdown alerts
      if (riskStatus.portfolioState.currentDrawdown > riskStatus.configuration.maxDrawdownPercent * 0.8) {
        alerts.push({
          type: 'drawdown',
          severity: riskStatus.portfolioState.currentDrawdown > riskStatus.configuration.maxDrawdownPercent ? 'critical' : 'high',
          message: `Current drawdown: ${(riskStatus.portfolioState.currentDrawdown * 100).toFixed(2)}%`,
          threshold: riskStatus.configuration.maxDrawdownPercent,
          current: riskStatus.portfolioState.currentDrawdown,
          timestamp: new Date().toISOString()
        });
      }

      // Exposure alerts
      if (exposureRatio > riskStatus.configuration.maxPortfolioExposure * 0.8) {
        alerts.push({
          type: 'exposure',
          severity: exposureRatio > riskStatus.configuration.maxPortfolioExposure ? 'critical' : 'medium',
          message: `High portfolio exposure: ${(exposureRatio * 100).toFixed(1)}%`,
          threshold: riskStatus.configuration.maxPortfolioExposure,
          current: exposureRatio,
          timestamp: new Date().toISOString()
        });
      }

      // Daily P&L alerts
      const dailyLossRatio = Math.abs(riskStatus.portfolioState.dailyPnL) / riskStatus.portfolioState.portfolioValue;
      if (riskStatus.portfolioState.dailyPnL < 0 && dailyLossRatio > riskStatus.configuration.dailyLossLimit * 0.8) {
        alerts.push({
          type: 'daily_loss',
          severity: dailyLossRatio > riskStatus.configuration.dailyLossLimit ? 'critical' : 'high',
          message: `Daily loss: ${(dailyLossRatio * 100).toFixed(2)}%`,
          threshold: riskStatus.configuration.dailyLossLimit,
          current: dailyLossRatio,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        data: {
          alerts,
          alertsCount: alerts.length,
          criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
          highAlerts: alerts.filter(a => a.severity === 'high').length,
          mediumAlerts: alerts.filter(a => a.severity === 'medium').length,
          lastCheck: riskStatus.lastUpdate
        },
        timestamp: new Date().toISOString()
      });

      logger.debug('Risk alerts retrieved', {
        alertsCount: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        service: 'risk-controller'
      });
    } catch (error) {
      logger.error('Failed to get risk alerts', {
        error: error.message,
        service: 'risk-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve risk alerts',
        message: error.message
      });
    }
  }
}

module.exports = RiskController;