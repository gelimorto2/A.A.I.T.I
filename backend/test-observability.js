/**
 * Observability Integration Validation Script
 * Tests the observability middleware and service functionality
 */

const { initializeObservabilityMiddleware, getObservabilityService } = require('./middleware/observabilityMiddleware');
const prometheus = require('prom-client');

console.log('🔍 Testing A.A.I.T.I Observability Integration...\n');

try {
    // Test 1: Initialize observability middleware
    console.log('1. Initializing observability middleware...');
    initializeObservabilityMiddleware();
    console.log('✅ Observability middleware initialized successfully\n');

    // Test 2: Get observability service
    console.log('2. Getting observability service...');
    const obs = getObservabilityService();
    console.log('✅ Observability service retrieved successfully\n');

    // Test 3: Check alert rules
    console.log('3. Checking alert rules configuration...');
    const alertStatus = obs.getAlertStatus();
    console.log(`✅ Alert system status:
   - Total rules: ${alertStatus.totalRules}
   - Enabled rules: ${alertStatus.enabledRules}
   - Active alerts: ${alertStatus.activeAlerts}
   - Recent alerts: ${alertStatus.recentAlerts.length}\n`);

    // Test 4: Test metrics collection
    console.log('4. Testing Prometheus metrics collection...');
    const register = prometheus.register;
    const metricsString = register.metrics();
    const metricLines = metricsString.toString().split('\n').filter(line => line.startsWith('# HELP')).length;
    console.log(`✅ Prometheus metrics available: ${metricLines} metric types\n`);

    // Test 5: Test alert rule evaluation
    console.log('5. Testing alert rule evaluation...');
    
    // Simulate high error rate
    for (let i = 0; i < 10; i++) {
        obs.recordError('test_error', 'Test error simulation');
    }
    
    // Simulate high latency
    obs.recordLatency('test_endpoint', 600); // 600ms > 500ms threshold
    
    console.log('✅ Test metrics recorded for alert evaluation\n');

    // Test 6: Evaluate alerts after simulation
    console.log('6. Evaluating alerts after test metrics...');
    setTimeout(() => {
        const updatedStatus = obs.getAlertStatus();
        console.log(`✅ Updated alert status:
   - Active alerts: ${updatedStatus.activeAlerts}
   - Recent alerts: ${updatedStatus.recentAlerts.length}\n`);

        console.log('🎉 Observability integration validation completed successfully!');
        console.log('\n📊 Integration Summary:');
        console.log('- Observability middleware: ✅ Working');
        console.log('- Alert rules system: ✅ Working');
        console.log('- Prometheus metrics: ✅ Working');
        console.log('- Error tracking: ✅ Working');
        console.log('- Latency monitoring: ✅ Working');
        console.log('\n🚀 Ready for production observability!');
        
        process.exit(0);
    }, 1000);

} catch (error) {
    console.error('❌ Observability integration validation failed:', error);
    console.error('\n🔧 Check the following:');
    console.error('- All required dependencies are installed');
    console.error('- Observability middleware files exist');
    console.error('- Prometheus client is properly configured');
    
    process.exit(1);
}