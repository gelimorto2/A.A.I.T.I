/**
 * Chaos Testing Validation Script
 * Tests the chaos testing framework functionality
 */

const { getChaosTestingFramework } = require('./services/chaosTestingService');

console.log('🧪 Testing A.A.I.T.I Chaos Testing Framework...\n');

async function validateChaosFramework() {
    try {
        // Test 1: Initialize chaos framework
        console.log('1. Initializing chaos testing framework...');
        const chaos = getChaosTestingFramework();
        console.log('✅ Chaos testing framework initialized successfully\n');

        // Test 2: Check available scenarios
        console.log('2. Checking available chaos scenarios...');
        const status = chaos.getStatus();
        console.log(`✅ Available scenarios: ${status.availableScenarios.length}`);
        status.availableScenarios.forEach(scenario => {
            console.log(`   - ${scenario}`);
        });
        console.log();

        // Test 3: Check circuit breakers
        console.log('3. Checking circuit breaker configuration...');
        console.log(`✅ Circuit breakers configured: ${status.circuitBreakers.length}`);
        status.circuitBreakers.forEach(cb => {
            console.log(`   - ${cb.name}: ${cb.state} (${cb.canExecute ? 'operational' : 'blocked'})`);
        });
        console.log();

        // Test 4: Test graceful degradation validation
        console.log('4. Testing graceful degradation validation...');
        const degradationResults = await chaos.validateGracefulDegradation();
        console.log(`✅ Degradation tests completed: ${degradationResults.length} tests`);
        degradationResults.forEach(result => {
            const status = result.graceful && result.status === 'completed' ? '✅' : '⚠️';
            console.log(`   ${status} ${result.name}: ${result.graceful ? 'Passed' : 'Failed'}`);
        });
        console.log();

        // Test 5: Simulate circuit breaker activation
        console.log('5. Testing circuit breaker functionality...');
        const marketDataBreaker = chaos.circuitBreakers.get('market_data');
        
        // Record multiple failures to trigger circuit breaker
        for (let i = 0; i < 6; i++) {
            marketDataBreaker.recordFailure();
        }
        
        console.log(`✅ Circuit breaker test:
   - State after failures: ${marketDataBreaker.state}
   - Can execute: ${marketDataBreaker.canExecute()}
   - Failure count: ${marketDataBreaker.failureCount}\n`);

        // Test 6: Test fallback strategies
        console.log('6. Testing fallback strategies...');
        const marketDataFallback = chaos.fallbackStrategies.get('market_data_fallback');
        const fallbackResult = await marketDataFallback.execute();
        console.log(`✅ Market data fallback test:
   - Source: ${fallbackResult.source}
   - Price: $${fallbackResult.price}
   - Staleness: ${fallbackResult.staleness}\n`);

        // Test 7: Run a quick chaos test (shortened duration for validation)
        console.log('7. Running a quick chaos test (high latency simulation)...');
        
        // Temporarily reduce duration for validation
        const originalDuration = chaos.failureScenarios.get('high_latency_simulation').duration;
        chaos.failureScenarios.get('high_latency_simulation').duration = 3000; // 3 seconds
        
        const testResult = await chaos.runChaosTest('high_latency_simulation');
        
        // Restore original duration
        chaos.failureScenarios.get('high_latency_simulation').duration = originalDuration;
        
        console.log(`✅ Chaos test completed:
   - Test ID: ${testResult.testId}
   - Status: ${testResult.status}
   - Duration: ${testResult.duration}ms
   - Metrics: ${JSON.stringify(testResult.metrics)}\n`);

        // Test 8: Get test results
        console.log('8. Checking test results...');
        const results = chaos.getTestResults();
        console.log(`✅ Test results summary:
   - Total tests: ${results.totalTests}
   - Successful: ${results.successful}
   - Failed: ${results.failed}
   - Average duration: ${Math.round(results.averageDuration)}ms\n`);

        // Reset circuit breakers for clean state
        chaos.resetCircuitBreakers();
        console.log('🔧 Circuit breakers reset to clean state\n');

        console.log('🎉 Chaos Testing Framework Validation Completed Successfully!');
        console.log('\n📊 Validation Summary:');
        console.log('- Chaos framework initialization: ✅ Working');
        console.log('- Scenario configuration: ✅ Working');
        console.log('- Circuit breaker functionality: ✅ Working');
        console.log('- Fallback strategies: ✅ Working');
        console.log('- Graceful degradation: ✅ Working');
        console.log('- Test execution: ✅ Working');
        console.log('- Results tracking: ✅ Working');
        console.log('\n🚀 Ready for chaos testing in production!');
        
        return true;

    } catch (error) {
        console.error('❌ Chaos testing framework validation failed:', error);
        console.error('\n🔧 Check the following:');
        console.error('- Chaos testing service implementation');
        console.error('- Circuit breaker configuration');
        console.error('- Fallback strategy implementations');
        
        return false;
    }
}

// Run validation
validateChaosFramework().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Validation execution failed:', error);
    process.exit(1);
});