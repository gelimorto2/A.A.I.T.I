/**
 * Simple Test Runner Script for Sprint 3 & 4 validation
 */

const ComprehensiveTestRunner = require('./comprehensiveTestRunner');
const knex = require('knex');
const knexConfig = require('../knexfile');

// Initialize knex with appropriate config
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];
const db = knex(config);

// Mock Express app for testing
const express = require('express');
const app = express();

async function main() {
  try {
    console.log('🔧 Initializing test environment...');
    
    // Initialize test runner
    const testRunner = new ComprehensiveTestRunner(app, db);
    
    console.log('🏃 Running comprehensive test suite...\n');
    
    // Run all tests
    const results = await testRunner.runAllTests();
    
    // Exit with appropriate code
    process.exit(results.success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Test execution interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test execution terminated');
  process.exit(1);
});

// Run the tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});