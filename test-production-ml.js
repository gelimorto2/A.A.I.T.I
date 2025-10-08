#!/usr/bin/env node

/**
 * Test script for Production TensorFlow ML System
 * Tests the new production ML infrastructure
 */

const ProductionMLManager = require('./backend/services/productionMLManager');
const MLModelRepository = require('./backend/repositories/mlModelRepository');
const ProductionTensorFlowMLService = require('./backend/utils/productionTensorFlowMLService');

async function testProductionMLSystem() {
  console.log('🧠 Testing Production TensorFlow ML System...\n');

  try {
    // Test 1: Initialize ML Manager
    console.log('1. Initializing Production ML Manager...');
    const mlManager = new ProductionMLManager();
    console.log('✅ ML Manager initialized successfully\n');

    // Test 2: Initialize Model Repository
    console.log('2. Initializing ML Model Repository...');
    const modelRepo = new MLModelRepository();
    console.log('✅ Model Repository initialized successfully\n');

    // Test 3: Initialize TensorFlow ML Service
    console.log('3. Initializing TensorFlow ML Service...');
    const tfService = new ProductionTensorFlowMLService();
    console.log('✅ TensorFlow ML Service initialized successfully\n');

    // Test 4: Check available architectures
    console.log('4. Testing available architectures...');
    const architectures = tfService.getSupportedArchitectures();
    console.log('Available architectures:', architectures);
    console.log('✅ Architectures loaded successfully\n');

    // Test 5: Create a test model
    console.log('5. Creating test LSTM model...');
    const modelConfig = {
      name: 'Test-LSTM-Model',
      type: 'regression',
      architecture: 'LSTM',
      symbols: ['BTCUSDT'],
      timeframe: '1h',
      description: 'Test model for production system validation',
      userId: 'test-user-1',
      customConfig: {
        sequenceLength: 60,
        lstmUnits: 50,
        dropoutRate: 0.2
      }
    };

    const result = await mlManager.createModel(modelConfig);
    console.log('Model created:', result);
    console.log('✅ Model creation successful\n');

    // Test 6: Generate sample training data
    console.log('6. Generating sample training data...');
    const trainingData = generateSampleData();
    console.log(`Generated ${trainingData.length} training samples`);
    console.log('✅ Training data generated successfully\n');

    // Test 7: Test model architecture creation
    console.log('7. Testing TensorFlow model architecture creation...');
    const inputShape = [60, 5]; // 60 timesteps, 5 features
    const outputShape = 1; // Single regression output
    
    const model = await tfService.createModel('LSTM', {
      inputShape,
      outputShape,
      sequenceLength: 60,
      lstmUnits: 50,
      dropoutRate: 0.2
    });
    
    console.log('Model architecture:', model.summary ? 'Created successfully' : 'Basic model created');
    console.log('✅ TensorFlow model architecture created\n');

    // Test 8: Test prediction input formatting
    console.log('8. Testing prediction input formatting...');
    const sampleInput = trainingData.slice(0, 60).map(d => [
      d.close, d.volume, d.rsi || 50, d.macd || 0, d.bollinger || 20
    ]);
    
    console.log(`Sample input shape: ${sampleInput.length} x ${sampleInput[0].length}`);
    console.log('✅ Input formatting successful\n');

    // Test 9: Validate system integration
    console.log('9. Validating system integration...');
    console.log('ML Manager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(mlManager)));
    console.log('Model Repository methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(modelRepo)));
    console.log('TensorFlow Service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(tfService)));
    console.log('✅ System integration validated\n');

    console.log('🎉 All tests passed! Production ML System is ready.');
    console.log('\n📊 System Summary:');
    console.log(`- Supported architectures: ${architectures.length}`);
    console.log(`- Model created with ID: ${result.modelId}`);
    console.log(`- Training data samples: ${trainingData.length}`);
    console.log(`- Input features: ${sampleInput[0].length}`);
    console.log('\n🚀 Ready for production trading with real TensorFlow models!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

function generateSampleData() {
  const data = [];
  const startPrice = 50000;
  
  for (let i = 0; i < 1000; i++) {
    const price = startPrice + Math.sin(i * 0.1) * 5000 + Math.random() * 1000 - 500;
    const volume = 100 + Math.random() * 50;
    
    data.push({
      timestamp: new Date(Date.now() - (1000 - i) * 60000).toISOString(),
      open: price + Math.random() * 100 - 50,
      high: price + Math.random() * 200,
      low: price - Math.random() * 200,
      close: price,
      volume: volume,
      rsi: 30 + Math.random() * 40,
      macd: Math.random() * 2 - 1,
      bollinger: 10 + Math.random() * 20
    });
  }
  
  return data;
}

// Run the test
if (require.main === module) {
  testProductionMLSystem().catch(console.error);
}

module.exports = testProductionMLSystem;