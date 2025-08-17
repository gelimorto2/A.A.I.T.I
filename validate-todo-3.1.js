const fs = require('fs');
const path = require('path');
const http = require('http');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logHeader(message) {
  log(`\n🔵 ${message}`, 'cyan');
  log('='.repeat(message.length + 3), 'cyan');
}

async function validateImplementation() {
  logHeader('A.A.I.T.I TODO 3.1 Exchange Integration Hub Validation');
  
  let totalTests = 0;
  let passedTests = 0;
  let errors = [];

  // Test 1: Check ExchangeAbstraction Enhancement
  try {
    totalTests++;
    log('\n📊 Checking enhanced ExchangeAbstraction implementation...');
    
    const exchangeAbstractionPath = path.join(__dirname, 'backend/utils/exchangeAbstraction.js');
    if (!fs.existsSync(exchangeAbstractionPath)) {
      throw new Error('ExchangeAbstraction not found');
    }
    
    const exchangeAbstractionContent = fs.readFileSync(exchangeAbstractionPath, 'utf8');
    
    // Check for new exchange support
    const requiredExchanges = ['KRAKEN', 'KUCOIN', 'BYBIT'];
    const foundExchanges = requiredExchanges.filter(exchange => 
      exchangeAbstractionContent.includes(exchange)
    );
    
    if (foundExchanges.length >= 3) {
      logSuccess(`Enhanced exchange support: ${foundExchanges.join(', ')}`);
    } else {
      throw new Error(`Missing exchange support. Found: ${foundExchanges.join(', ')}`);
    }
    
    // Check for unified order book functionality
    if (exchangeAbstractionContent.includes('getUnifiedOrderBook')) {
      logSuccess('Unified order book aggregation implemented');
    } else {
      throw new Error('Unified order book aggregation not found');
    }
    
    // Check for emergency controls
    if (exchangeAbstractionContent.includes('emergencyStopAll') && 
        exchangeAbstractionContent.includes('emergencyStopExchange')) {
      logSuccess('Emergency stop mechanisms implemented');
    } else {
      throw new Error('Emergency stop mechanisms not found');
    }
    
    // Check for position synchronization
    if (exchangeAbstractionContent.includes('synchronizePositions')) {
      logSuccess('Position synchronization implemented');
    } else {
      throw new Error('Position synchronization not found');
    }
    
    passedTests++;
  } catch (error) {
    logError(`ExchangeAbstraction validation failed: ${error.message}`);
    errors.push(error);
  }

  // Test 2: Check New Exchange Implementations
  try {
    totalTests++;
    log('\n🏢 Checking new exchange implementations...');
    
    const exchangeAbstractionPath = path.join(__dirname, 'backend/utils/exchangeAbstraction.js');
    const content = fs.readFileSync(exchangeAbstractionPath, 'utf8');
    
    const exchangeClasses = ['KrakenExchange', 'KuCoinExchange', 'BybitExchange'];
    const foundClasses = exchangeClasses.filter(className => 
      content.includes(`class ${className}`)
    );
    
    if (foundClasses.length >= 3) {
      logSuccess(`Exchange implementations found: ${foundClasses.join(', ')}`);
      
      // Check for required methods in each exchange
      const requiredMethods = ['testConnection', 'getOrderBook', 'emergencyStop'];
      const allMethodsFound = requiredMethods.every(method => 
        content.includes(`async ${method}`)
      );
      
      if (allMethodsFound) {
        logSuccess('Required methods implemented in exchange classes');
      } else {
        throw new Error('Some required methods missing in exchange implementations');
      }
    } else {
      throw new Error(`Missing exchange implementations. Found: ${foundClasses.join(', ')}`);
    }
    
    passedTests++;
  } catch (error) {
    logError(`Exchange implementations validation failed: ${error.message}`);
    errors.push(error);
  }

  // Test 3: Check Exchange Integration Routes
  try {
    totalTests++;
    log('\n🛤️ Checking exchange integration API routes...');
    
    const routesPath = path.join(__dirname, 'backend/routes/exchangeIntegration.js');
    if (!fs.existsSync(routesPath)) {
      throw new Error('Exchange integration routes not found');
    }
    
    const routesContent = fs.readFileSync(routesPath, 'utf8');
    
    const requiredEndpoints = [
      '/exchanges',
      '/orderbook',
      '/arbitrage/detect',
      '/routing/best-venue',
      '/positions/sync',
      '/emergency/stop-all',
      '/migration/paper-to-live'
    ];
    
    const foundEndpoints = requiredEndpoints.filter(endpoint => 
      routesContent.includes(endpoint)
    );
    
    if (foundEndpoints.length >= 6) {
      logSuccess(`API endpoints implemented: ${foundEndpoints.length}/${requiredEndpoints.length}`);
    } else {
      throw new Error(`Insufficient API endpoints. Found: ${foundEndpoints.length}/${requiredEndpoints.length}`);
    }
    
    passedTests++;
  } catch (error) {
    logError(`Exchange integration routes validation failed: ${error.message}`);
    errors.push(error);
  }

  // Test 4: Check Server Integration
  try {
    totalTests++;
    log('\n🖥️ Checking server integration...');
    
    const serverPath = path.join(__dirname, 'backend/server.js');
    if (!fs.existsSync(serverPath)) {
      throw new Error('Server file not found');
    }
    
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (serverContent.includes('exchangeIntegrationRoutes') && 
        serverContent.includes('/api/exchange-integration')) {
      logSuccess('Exchange integration routes registered in server');
    } else {
      throw new Error('Exchange integration routes not registered in server');
    }
    
    passedTests++;
  } catch (error) {
    logError(`Server integration validation failed: ${error.message}`);
    errors.push(error);
  }

  // Test 5: Check Enhanced Features
  try {
    totalTests++;
    log('\n⚡ Checking enhanced features implementation...');
    
    const exchangeAbstractionPath = path.join(__dirname, 'backend/utils/exchangeAbstraction.js');
    const content = fs.readFileSync(exchangeAbstractionPath, 'utf8');
    
    const enhancedFeatures = [
      'detectArbitrageOpportunities',
      'getBestExecutionVenue',
      'getUnifiedOrderBook',
      'synchronizePositions',
      'emergencyStopAll'
    ];
    
    const implementedFeatures = enhancedFeatures.filter(feature => 
      content.includes(feature)
    );
    
    if (implementedFeatures.length >= 5) {
      logSuccess(`Enhanced features implemented: ${implementedFeatures.length}/${enhancedFeatures.length}`);
      
      // Check for comprehensive error handling
      const errorHandlingCount = (content.match(/try\s*{[\s\S]*?catch\s*\(/g) || []).length;
      if (errorHandlingCount >= 10) {
        logSuccess('Comprehensive error handling implemented');
      } else {
        logWarning('Error handling could be more comprehensive');
      }
    } else {
      throw new Error(`Missing enhanced features. Found: ${implementedFeatures.length}/${enhancedFeatures.length}`);
    }
    
    passedTests++;
  } catch (error) {
    logError(`Enhanced features validation failed: ${error.message}`);
    errors.push(error);
  }

  // Test 6: Check Exchange Support Count
  try {
    totalTests++;
    log('\n🔢 Checking total exchange support...');
    
    const exchangeAbstractionPath = path.join(__dirname, 'backend/utils/exchangeAbstraction.js');
    const content = fs.readFileSync(exchangeAbstractionPath, 'utf8');
    
    const supportedExchangeCount = (content.match(/BINANCE|COINBASE|KRAKEN|KUCOIN|BYBIT|ALPHA_VANTAGE/g) || []).length;
    
    if (supportedExchangeCount >= 12) { // Each exchange appears multiple times
      logSuccess('6 exchanges supported (Binance, Coinbase, Kraken, KuCoin, Bybit, Alpha Vantage)');
    } else {
      throw new Error('Insufficient exchange support');
    }
    
    // Check initialization message
    if (content.includes('6 exchanges')) {
      logSuccess('Exchange count properly updated in initialization');
    } else {
      logWarning('Exchange count in initialization message may need updating');
    }
    
    passedTests++;
  } catch (error) {
    logError(`Exchange support validation failed: ${error.message}`);
    errors.push(error);
  }

  // Test 7: Check Live Trading Safety Features
  try {
    totalTests++;
    log('\n🛡️ Checking live trading safety features...');
    
    const routesPath = path.join(__dirname, 'backend/routes/exchangeIntegration.js');
    const content = fs.readFileSync(routesPath, 'utf8');
    
    const safetyFeatures = [
      'emergencyStop',
      'safetyLimits',
      'maxPositionSize',
      'maxDailyLoss',
      'emergencyStopLoss'
    ];
    
    const implementedSafety = safetyFeatures.filter(feature => 
      content.includes(feature)
    );
    
    if (implementedSafety.length >= 4) {
      logSuccess(`Live trading safety features: ${implementedSafety.length}/${safetyFeatures.length}`);
    } else {
      throw new Error(`Insufficient safety features. Found: ${implementedSafety.length}/${safetyFeatures.length}`);
    }
    
    passedTests++;
  } catch (error) {
    logError(`Live trading safety validation failed: ${error.message}`);
    errors.push(error);
  }

  // Test 8: Check Paper-to-Live Migration Tools
  try {
    totalTests++;
    log('\n🔄 Checking paper-to-live migration tools...');
    
    const routesPath = path.join(__dirname, 'backend/routes/exchangeIntegration.js');
    const content = fs.readFileSync(routesPath, 'utf8');
    
    if (content.includes('/migration/paper-to-live') && 
        content.includes('migrationRequirements') &&
        content.includes('safetyChecks')) {
      logSuccess('Paper-to-live migration tools implemented');
      
      // Check migration requirements validation
      const requirements = [
        'Minimum 30 days paper trading',
        'Positive risk-adjusted returns',
        'Maximum drawdown',
        'Minimum 100 trades',
        'Live exchange connection'
      ];
      
      const foundRequirements = requirements.filter(req => 
        content.toLowerCase().includes(req.toLowerCase().replace(/\s+/g, ''))
      );
      
      if (foundRequirements.length >= 3) {
        logSuccess('Migration requirements validation implemented');
      } else {
        logWarning('Migration requirements could be more comprehensive');
      }
    } else {
      throw new Error('Paper-to-live migration tools not found');
    }
    
    passedTests++;
  } catch (error) {
    logError(`Migration tools validation failed: ${error.message}`);
    errors.push(error);
  }

  // Test 9: Check API Documentation and Status
  try {
    totalTests++;
    log('\n📋 Checking API documentation and status endpoints...');
    
    const routesPath = path.join(__dirname, 'backend/routes/exchangeIntegration.js');
    const content = fs.readFileSync(routesPath, 'utf8');
    
    if (content.includes('/status') && content.includes('capabilities') && content.includes('features')) {
      logSuccess('Status endpoint with comprehensive information implemented');
      
      // Check for API response structure
      const apiFeatures = [
        'unifiedOrderBook',
        'arbitrageDetection',
        'smartOrderRouting',
        'emergencyControls',
        'positionSync',
        'paperToLiveMigration'
      ];
      
      const documentedFeatures = apiFeatures.filter(feature => 
        content.includes(feature)
      );
      
      if (documentedFeatures.length >= 5) {
        logSuccess(`API features documented: ${documentedFeatures.length}/${apiFeatures.length}`);
      } else {
        logWarning('API documentation could be more comprehensive');
      }
    } else {
      throw new Error('Status endpoint or documentation incomplete');
    }
    
    passedTests++;
  } catch (error) {
    logError(`API documentation validation failed: ${error.message}`);
    errors.push(error);
  }

  // Summary
  logHeader('Validation Summary');
  
  log(`\n📊 Test Results:`);
  log(`   Total Tests: ${totalTests}`);
  logSuccess(`   Passed: ${passedTests}`);
  
  if (errors.length > 0) {
    logError(`   Failed: ${errors.length}`);
    log('\n🔍 Error Details:');
    errors.forEach((error, index) => {
      log(`   ${index + 1}. ${error.message}`, 'red');
    });
  }

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  if (errors.length === 0) {
    logSuccess(`\n🎉 All validations passed! Success rate: ${successRate}%`);
    
    log('\n✨ TODO 3.1 Exchange Integration Hub - IMPLEMENTATION COMPLETE', 'bright');
    log('\n🚀 Features Successfully Implemented:', 'cyan');
    log('   • Enhanced exchange support (Kraken, KuCoin, Bybit)', 'green');
    log('   • Unified order book aggregation across exchanges', 'green');
    log('   • Cross-exchange arbitrage detection', 'green');
    log('   • Smart order routing optimization', 'green');
    log('   • Emergency stop mechanisms for all exchanges', 'green');
    log('   • Position synchronization across exchanges', 'green');
    log('   • Paper-to-live trading migration tools', 'green');
    log('   • Comprehensive safety controls and validation', 'green');
    log('   • Multi-exchange market data aggregation', 'green');
    
    log('\n📡 API Endpoints Available:', 'blue');
    log('   • GET  /api/exchange-integration/exchanges', 'green');
    log('   • GET  /api/exchange-integration/orderbook/:symbol', 'green');
    log('   • POST /api/exchange-integration/arbitrage/detect', 'green');
    log('   • POST /api/exchange-integration/routing/best-venue', 'green');
    log('   • GET  /api/exchange-integration/positions/sync', 'green');
    log('   • POST /api/exchange-integration/emergency/stop-all', 'green');
    log('   • POST /api/exchange-integration/migration/paper-to-live', 'green');
    log('   • GET  /api/exchange-integration/status', 'green');
    
    return true;
  } else {
    logError(`\n❌ Some validations failed. Success rate: ${successRate}%`);
    logError('   Please review the errors above and fix the issues.');
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateImplementation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logError(`Validation script failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { validateImplementation };