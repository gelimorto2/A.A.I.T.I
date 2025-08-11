#!/usr/bin/env node

/**
 * AAITI Performance Test and GitHub Issue Reporting Demo Script
 * 
 * This script demonstrates the enhanced performance monitoring and
 * GitHub issue reporting capabilities added to AAITI.
 * 
 * Features demonstrated:
 * - Script performance monitoring
 * - API call monitoring with error handling
 * - Automatic GitHub issue creation for errors
 * - Memory and CPU monitoring
 * - Performance optimization triggers
 */

require('dotenv').config({ path: '../.env' });

const { getPerformanceMonitor } = require('../utils/performanceMonitor');
const { getGitHubIssueReporter } = require('../utils/githubIssueReporter');
const logger = require('../utils/logger');
const marketDataService = require('../utils/marketData');

class PerformanceDemo {
  constructor() {
    this.performanceMonitor = getPerformanceMonitor({
      reportToGitHub: true,
      alertOnThresholds: true
    });
    
    this.githubReporter = getGitHubIssueReporter({
      enabled: !!process.env.GITHUB_TOKEN,
      autoCreate: true
    });
    
    // Connect GitHub reporter to logger
    logger.setGitHubReporter(this.githubReporter);
    
    this.marketData = new marketDataService();
    
    console.log('🚀 AAITI Performance Demo Script Initialized');
    console.log('📊 GitHub Issue Reporting:', this.githubReporter.getStatus().enabled ? 'Enabled' : 'Disabled');
    console.log('📈 Performance Monitoring: Enabled');
  }

  /**
   * Demonstrate script performance monitoring
   */
  async testScriptPerformance() {
    console.log('\n📋 Testing Script Performance Monitoring...');
    
    // Test fast script
    await this.performanceMonitor.monitorScript('demo.fastScript', async () => {
      await this.simulateWork(100); // 100ms work
      return 'Fast script completed';
    });
    
    // Test slow script (will trigger warning)
    await this.performanceMonitor.monitorScript('demo.slowScript', async () => {
      await this.simulateWork(35000); // 35 seconds (will trigger timeout warning)
      return 'Slow script completed';
    });
    
    // Test script with error (will create GitHub issue if enabled)
    try {
      await this.performanceMonitor.monitorScript('demo.errorScript', async () => {
        await this.simulateWork(1000);
        throw new Error('Demo script error for GitHub issue reporting');
      });
    } catch (error) {
      console.log('✅ Expected error caught and reported');
    }
  }

  /**
   * Demonstrate API performance monitoring
   */
  async testAPIPerformance() {
    console.log('\n🌐 Testing API Performance Monitoring...');
    
    // Test successful API calls
    try {
      const quote1 = await this.marketData.getQuote('bitcoin');
      console.log(`✅ Bitcoin price: $${quote1.price}`);
      
      const quote2 = await this.marketData.getQuote('ethereum');
      console.log(`✅ Ethereum price: $${quote2.price}`);
      
      // Test cached response (should be much faster)
      const quote3 = await this.marketData.getQuote('bitcoin');
      console.log(`⚡ Bitcoin price (cached): $${quote3.price}`);
      
    } catch (error) {
      console.log('❌ API test failed:', error.message);
    }
    
    // Test API with invalid symbol (will trigger error handling)
    try {
      await this.performanceMonitor.monitorAPICall('demo.invalidAPI', async () => {
        throw new Error('Demo API error - invalid endpoint');
      });
    } catch (error) {
      console.log('✅ API error handled and monitored');
    }
  }

  /**
   * Demonstrate GitHub issue reporting
   */
  async testGitHubReporting() {
    console.log('\n🐙 Testing GitHub Issue Reporting...');
    
    if (!this.githubReporter.getStatus().enabled) {
      console.log('⚠️  GitHub reporting disabled (no GITHUB_TOKEN)');
      return;
    }
    
    try {
      // Test GitHub connection
      const connection = await this.githubReporter.testConnection();
      console.log('✅ GitHub connection test passed:', connection.repo);
      
      // Create a test issue (if enabled)
      const testError = new Error('Demo error for testing GitHub integration');
      testError.type = 'demo';
      
      const issue = await this.githubReporter.reportError(testError, {
        severity: 'info',
        type: 'demo_test',
        script: 'performance-demo',
        additionalInfo: 'This is a test issue created by the AAITI performance demo script',
        user: 'demo-user'
      });
      
      if (issue) {
        console.log('✅ Test GitHub issue created:', issue.html_url);
      } else {
        console.log('ℹ️  Test issue creation skipped (filtered or rate limited)');
      }
      
    } catch (error) {
      console.log('❌ GitHub test failed:', error.message);
    }
  }

  /**
   * Demonstrate performance metrics collection
   */
  async testPerformanceMetrics() {
    console.log('\n📊 Testing Performance Metrics Collection...');
    
    // Generate some load
    await this.simulateLoad();
    
    // Get performance metrics
    const metrics = this.performanceMonitor.getPerformanceMetrics();
    
    console.log('📈 Current Performance Metrics:');
    console.log(`  Memory Usage: ${(metrics.memory.usage * 100).toFixed(2)}%`);
    console.log(`  CPU Usage: ${(metrics.cpu.usage * 100).toFixed(2)}%`);
    console.log(`  Total Requests: ${metrics.requests.total}`);
    console.log(`  Success Rate: ${((1 - metrics.requests.errorRate) * 100).toFixed(2)}%`);
    console.log(`  Avg Response Time: ${metrics.requests.avgResponseTime.toFixed(2)}ms`);
    console.log(`  Scripts Monitored: ${metrics.scripts.length}`);
    console.log(`  API Endpoints Monitored: ${metrics.apiCalls.length}`);
    console.log(`  Uptime: ${Math.round(metrics.uptime)}s`);
    
    // Display top scripts by execution time
    if (metrics.scripts.length > 0) {
      console.log('\n🏃 Top Scripts by Average Execution Time:');
      metrics.scripts
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 5)
        .forEach((script, index) => {
          console.log(`  ${index + 1}. ${script.name}: ${script.avgTime.toFixed(2)}ms (${script.runs} runs, ${((script.errorRate || 0) * 100).toFixed(1)}% errors)`);
        });
    }
    
    // Display market data stats
    const marketStats = this.marketData.getRequestStats();
    console.log('\n🏪 Market Data Performance:');
    console.log(`  Total Requests: ${marketStats.total}`);
    console.log(`  Cache Hit Rate: ${marketStats.cacheHitRate.toFixed(1)}%`);
    console.log(`  Success Rate: ${marketStats.successRate.toFixed(1)}%`);
    console.log(`  Avg Response Time: ${marketStats.avgResponseTime.toFixed(2)}ms`);
  }

  /**
   * Demonstrate memory optimization
   */
  async testMemoryOptimization() {
    console.log('\n🧹 Testing Memory Optimization...');
    
    const beforeMemory = process.memoryUsage();
    console.log(`  Memory Before: ${Math.round(beforeMemory.heapUsed / 1024 / 1024)}MB`);
    
    // Create some memory pressure
    await this.createMemoryPressure();
    
    const duringMemory = process.memoryUsage();
    console.log(`  Memory During Load: ${Math.round(duringMemory.heapUsed / 1024 / 1024)}MB`);
    
    // Trigger optimization
    this.performanceMonitor.optimizeMemory();
    
    // Wait a bit for GC
    await this.simulateWork(1000);
    
    const afterMemory = process.memoryUsage();
    console.log(`  Memory After Optimization: ${Math.round(afterMemory.heapUsed / 1024 / 1024)}MB`);
    console.log(`  Memory Freed: ${Math.round((duringMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024)}MB`);
  }

  /**
   * Run comprehensive performance demonstration
   */
  async runDemo() {
    console.log('🚀 Starting AAITI Performance and GitHub Integration Demo\n');
    
    try {
      await this.testScriptPerformance();
      await this.testAPIPerformance();
      await this.testGitHubReporting();
      await this.testPerformanceMetrics();
      await this.testMemoryOptimization();
      
      console.log('\n✅ Demo completed successfully!');
      console.log('📊 Check the performance metrics endpoint: /api/performance/metrics');
      console.log('🐙 Check GitHub issues if reporting is enabled');
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      
      // This error should also be reported to GitHub if enabled
      logger.reportError(error, {
        script: 'performance-demo',
        severity: 'error'
      });
    }
  }

  // Helper methods for simulation

  async simulateWork(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  async simulateLoad() {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(this.simulateWork(100 + Math.random() * 200));
    }
    await Promise.all(promises);
  }

  async createMemoryPressure() {
    // Create temporary arrays to simulate memory usage
    const arrays = [];
    for (let i = 0; i < 100; i++) {
      arrays.push(new Array(10000).fill(Math.random()));
    }
    await this.simulateWork(500);
    // Arrays will be eligible for GC when function exits
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  const demo = new PerformanceDemo();
  demo.runDemo().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceDemo;