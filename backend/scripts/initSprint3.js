#!/usr/bin/env node

/**
 * Sprint 3 Initialization Script
 * Initialize ML legitimacy features and strategy lifecycle management
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Sprint3MigrationService = require('../services/sprint3MigrationService');
const logger = require('../utils/logger');

async function initializeSprint3() {
  console.log('🚀 Initializing Sprint 3: ML & Strategy Legitimacy Features...\n');

  try {
    // Initialize migration service
    const migrationService = new Sprint3MigrationService();
    
    // Run initialization
    const result = await migrationService.initialize();
    
    console.log('✅ Sprint 3 Initialization Results:');
    console.log(`   Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Message: ${result.message}`);
    console.log('\n📋 Features Enabled:');
    
    result.features.forEach(feature => {
      console.log(`   ✓ ${feature}`);
    });

    // Validate completion
    console.log('\n🔍 Running Sprint 3 Validation...');
    const validation = await migrationService.validateSprint3Completion();
    
    console.log(`\n📊 Sprint 3 Status: ${validation.status} (${validation.coverage})`);
    
    if (validation.completedFeatures.length > 0) {
      console.log('\n✅ Completed Features:');
      validation.completedFeatures.forEach(feature => {
        console.log(`   ✓ ${feature}`);
      });
    }

    if (validation.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      validation.issues.forEach(issue => {
        console.log(`   ⚠️  ${issue}`);
      });
    }

    // Show TensorFlow status
    const status = migrationService.getStatus();
    console.log(`\n🧠 TensorFlow Status: ${status.tensorflowAvailable ? 'REAL INTEGRATION' : 'SIMULATION MODE'}`);
    
    if (status.simulationMode) {
      console.log('\n⚠️  IMPORTANT DISCLAIMERS:');
      status.disclaimers.forEach(disclaimer => {
        console.log(`   ⚠️  ${disclaimer}`);
      });
      console.log('\n💡 To enable real ML capabilities:');
      console.log('   npm install @tensorflow/tfjs-node');
      console.log('   Then restart the application');
    }

    console.log('\n🎯 Sprint 3 Initialization Complete!');
    console.log('   API Endpoints Available:');
    console.log('   • GET  /api/ml-models - List all ML models');
    console.log('   • POST /api/ml-models - Create new ML model');
    console.log('   • POST /api/ml-models/:id/train - Train model');
    console.log('   • POST /api/ml-models/:id/predict - Make predictions');
    console.log('   • POST /api/ml-models/:id/deploy - Deploy to production');
    console.log('   • GET  /api/strategies - List strategies');
    console.log('   • POST /api/strategies - Create strategy (draft)');
    console.log('   • POST /api/strategies/:id/validate - Submit for validation');
    console.log('   • POST /api/strategies/:id/approve - Approve strategy');
    console.log('   • POST /api/strategies/:id/deploy - Deploy strategy');

    process.exit(0);

  } catch (error) {
    console.error('❌ Sprint 3 Initialization Failed:', error.message);
    logger.error('Sprint 3 initialization error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Sprint 3 initialization interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Sprint 3 initialization terminated');
  process.exit(1);
});

// Run initialization
initializeSprint3();
