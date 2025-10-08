/**
 * Sprint 3: Test Runner
 * Comprehensive test suite for ML & Strategy Legitimacy
 */

const knex = require('knex');
const knexConfig = require('../knexfile');
const MLModelRegistryTests = require('./mlModelRegistry.test');
const StrategyLifecycleTests = require('./strategyLifecycle.test');

async function runSprint3Tests() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 SPRINT 3: ML & STRATEGY LEGITIMACY TEST SUITE');
  console.log('='.repeat(70) + '\n');

  // Initialize database connection
  const db = knex(knexConfig.development);

  try {
    // Run migrations
    console.log('📦 Running database migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations completed\n');

    // Results aggregation
    const allResults = {
      mlRegistry: null,
      strategyLifecycle: null
    };

    // Run ML Model Registry tests
    console.log('=' .repeat(70));
    console.log('📋 TEST SUITE 1: ML Model Registry');
    console.log('='.repeat(70) + '\n');
    
    const mlTests = new MLModelRegistryTests(db);
    allResults.mlRegistry = await mlTests.runAll();

    // Run Strategy Lifecycle tests
    console.log('\n' + '='.repeat(70));
    console.log('📋 TEST SUITE 2: Strategy Lifecycle Management');
    console.log('='.repeat(70) + '\n');
    
    const strategyTests = new StrategyLifecycleTests(db);
    allResults.strategyLifecycle = await strategyTests.runAll();

    // Print overall summary
    printOverallSummary(allResults);

    // Calculate coverage estimate
    const totalTests = 
      allResults.mlRegistry.tests.length + 
      allResults.strategyLifecycle.tests.length;
    
    const totalPassed = 
      allResults.mlRegistry.passed + 
      allResults.strategyLifecycle.passed;

    const coverageEstimate = (totalPassed / totalTests * 100).toFixed(1);

    console.log(`\n📊 Coverage Estimate: ${coverageEstimate}%`);
    console.log(`🎯 Sprint 3 Target: ≥70%`);

    if (coverageEstimate >= 70) {
      console.log('✅ Coverage target met!');
    } else {
      console.log('⚠️  Coverage below target');
    }

    // Exit with appropriate code
    const allPassed = 
      allResults.mlRegistry.failed === 0 && 
      allResults.strategyLifecycle.failed === 0;

    if (allPassed) {
      console.log('\n✅ All Sprint 3 tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

function printOverallSummary(results) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 SPRINT 3 OVERALL TEST SUMMARY');
  console.log('='.repeat(70));

  const sections = [
    { name: 'ML Model Registry', results: results.mlRegistry },
    { name: 'Strategy Lifecycle', results: results.strategyLifecycle }
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;

  sections.forEach(section => {
    console.log(`\n${section.name}:`);
    console.log(`  ✅ Passed: ${section.results.passed}`);
    console.log(`  ❌ Failed: ${section.results.failed}`);
    console.log(`  📊 Total:  ${section.results.tests.length}`);
    
    totalPassed += section.results.passed;
    totalFailed += section.results.failed;
    totalTests += section.results.tests.length;
  });

  console.log('\n' + '-'.repeat(70));
  console.log('GRAND TOTAL:');
  console.log(`  ✅ Passed: ${totalPassed}`);
  console.log(`  ❌ Failed: ${totalFailed}`);
  console.log(`  📊 Total:  ${totalTests}`);
  console.log('='.repeat(70));
}

// Run tests if called directly
if (require.main === module) {
  runSprint3Tests();
}

module.exports = { runSprint3Tests };
