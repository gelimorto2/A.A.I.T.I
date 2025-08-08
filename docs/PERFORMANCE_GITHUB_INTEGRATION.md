# Performance Improvements and GitHub Issue Reporting

This document describes the performance improvements and GitHub issue reporting features added to AAITI.

## Overview

The following enhancements have been implemented to improve AAITI's performance and add automated issue reporting:

1. **Performance Monitoring System** - Real-time monitoring of scripts, API calls, and system resources
2. **GitHub Issue Reporting** - Automated creation of GitHub issues for critical errors and performance problems  
3. **Enhanced Logging** - Integrated error reporting with existing logging infrastructure
4. **Performance Optimization** - Memory management, garbage collection, and request optimization
5. **Metrics Collection** - Comprehensive performance metrics and health monitoring

## Features Added

### 🚀 Performance Monitor (`utils/performanceMonitor.js`)

- **Script Performance Monitoring**: Track execution time, errors, and performance of individual scripts
- **API Call Monitoring**: Monitor response times, error rates, and performance of external API calls
- **System Resource Monitoring**: Track memory usage, CPU usage, and system health
- **Automatic Optimization**: Trigger garbage collection and memory optimization when thresholds are exceeded
- **Performance Metrics**: Collect and analyze comprehensive performance data

Key capabilities:
- Monitor script execution with `monitorScript(name, execution)`
- Monitor API calls with `monitorAPICall(endpoint, call)`
- Track database queries with `monitorDBQuery(type, query)`
- Automatic threshold monitoring for memory, CPU, and response times
- Performance optimization and garbage collection triggers

### 🐙 GitHub Issue Reporter (`utils/githubIssueReporter.js`)

- **Automatic Issue Creation**: Create GitHub issues for critical errors and performance problems
- **Smart Deduplication**: Prevent duplicate issues with intelligent deduplication
- **Rate Limiting**: Configurable rate limits to prevent issue spam
- **Severity Filtering**: Only create issues for errors above specified severity threshold
- **Context-Rich Issues**: Include stack traces, system information, and performance data
- **Pattern Exclusion**: Filter out common transient errors

Key capabilities:
- Report errors with `reportError(error, context)`
- Report performance issues with `reportPerformanceIssue(metric, value, threshold, context)`
- Report script errors with `reportScriptError(scriptName, error, context)`
- Test GitHub connection with `testConnection()`
- Configure severity thresholds, rate limits, and exclusion patterns

### 📊 Performance API Routes (`routes/performance.js`)

New API endpoints for monitoring and management:

- `GET /api/performance/metrics` - Get current performance metrics
- `GET /api/performance/github/status` - Get GitHub issue reporter status
- `POST /api/performance/github/test` - Test GitHub connection
- `POST /api/performance/github/test-issue` - Create a test GitHub issue
- `POST /api/performance/metrics/reset` - Reset performance metrics
- `POST /api/performance/optimize` - Trigger performance optimization
- `GET /api/performance/health` - Get system health status with performance indicators

### 🔧 Enhanced Services

**Market Data Service** (`utils/marketData.js`):
- Added performance monitoring to API calls
- Enhanced error tracking and statistics
- Improved caching and response time monitoring

**Logger** (`utils/logger.js`):
- Integrated GitHub issue reporting for critical errors
- Added performance issue reporting methods
- Enhanced error context and metadata

**Notification Manager** (`utils/notificationManager.js`):
- Integrated GitHub issue creation with existing notification system
- Added automatic issue creation for critical alerts
- Enhanced alert routing and filtering

## Configuration

### Environment Variables

Copy `.env.template` to `.env` and configure the following:

```bash
# GitHub Integration
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=gelimorto2
GITHUB_REPO=A.A.I.T.I
GITHUB_AUTO_CREATE_ISSUES=true
GITHUB_MIN_SEVERITY=error

# Performance Thresholds
MEMORY_THRESHOLD=0.85
CPU_THRESHOLD=0.80
RESPONSE_TIME_THRESHOLD=3000
ERROR_RATE_THRESHOLD=0.05

# Monitoring Intervals
MEMORY_CHECK_INTERVAL=30000
CPU_CHECK_INTERVAL=60000
GC_INTERVAL=300000
```

### GitHub Token Setup

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with `repo` permissions (or `public_repo` for public repos)
3. Add the token to your `.env` file as `GITHUB_TOKEN`

## Usage Examples

### Script Performance Monitoring

```javascript
const { getPerformanceMonitor } = require('./utils/performanceMonitor');

const performanceMonitor = getPerformanceMonitor();

// Monitor a script
const result = await performanceMonitor.monitorScript('myScript', async () => {
  // Your script logic here
  return 'script result';
});
```

### API Call Monitoring

```javascript
// Monitor an API call
const response = await performanceMonitor.monitorAPICall('external-api', async () => {
  return axios.get('https://api.example.com/data');
});
```

### Error Reporting

```javascript
const logger = require('./utils/logger');

try {
  // Some operation that might fail
} catch (error) {
  // This will automatically create a GitHub issue if configured
  await logger.reportError(error, {
    script: 'myScript',
    severity: 'error',
    user: 'user123'
  });
}
```

### Manual GitHub Issue Creation

```javascript
const { getGitHubIssueReporter } = require('./utils/githubIssueReporter');

const reporter = getGitHubIssueReporter();
const issue = await reporter.reportError(new Error('Something went wrong'), {
  severity: 'critical',
  script: 'trading-bot',
  additionalInfo: 'Additional context about the error'
});
```

## Testing and Demo

### Demo Script

Run the comprehensive demo script to test all features:

```bash
cd backend
node scripts/performance-demo.js
```

This will demonstrate:
- Script performance monitoring
- API call monitoring
- GitHub issue creation (if configured)
- Performance metrics collection
- Memory optimization

### API Testing

Test the new API endpoints:

```bash
# Check performance metrics
curl http://localhost:5000/api/performance/metrics

# Test GitHub connection
curl -X POST http://localhost:5000/api/performance/github/test

# Get health status
curl http://localhost:5000/api/performance/health

# Create test issue
curl -X POST http://localhost:5000/api/performance/github/test-issue \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Issue","description":"Testing GitHub integration"}'
```

## Performance Improvements

### Before vs After

**Before**:
- No systematic performance monitoring
- No automated error reporting
- Limited visibility into system performance
- Manual debugging and issue tracking

**After**:
- Real-time performance monitoring
- Automated GitHub issue creation for critical errors
- Comprehensive performance metrics and alerts
- Proactive performance optimization
- Enhanced debugging with rich error context

### Key Optimizations

1. **Memory Management**: Automatic garbage collection and memory optimization
2. **Request Monitoring**: Track and optimize API response times
3. **Error Handling**: Intelligent error filtering and reporting
4. **Caching**: Enhanced caching strategies for better performance
5. **Resource Monitoring**: CPU and memory usage tracking with alerts

### Performance Metrics

The system now tracks:
- Script execution times and error rates
- API call response times and success rates
- Memory and CPU usage patterns
- Database query performance
- Cache hit rates and efficiency
- Request throughput and error rates

## Monitoring and Alerts

### Health Checks

The system provides comprehensive health monitoring:
- Memory usage vs. thresholds
- CPU usage vs. thresholds  
- Request error rates
- Service availability
- GitHub integration status

### Alert Levels

- **Info**: General information, cached for metrics
- **Warning**: Performance thresholds exceeded, logged and tracked
- **Error**: System errors, creates GitHub issues
- **Critical**: Severe issues, immediate GitHub issue creation and notifications

### Rate Limiting

GitHub issue creation is rate-limited to prevent spam:
- Maximum 5 issues per hour by default
- Deduplication window to prevent duplicate issues
- Intelligent error filtering for common transient issues

## Security Considerations

- GitHub tokens should be stored securely in environment variables
- Access to performance endpoints should be restricted in production
- Error reports may contain sensitive information - review before enabling
- Rate limiting prevents abuse of GitHub API

## Troubleshooting

### Common Issues

1. **GitHub Issues Not Created**
   - Check `GITHUB_TOKEN` is set correctly
   - Verify token has correct permissions
   - Check rate limiting and severity filters

2. **Performance Monitoring Not Working**
   - Ensure services are properly initialized
   - Check environment variables are set
   - Verify monitoring thresholds are configured

3. **High Memory Usage**
   - Trigger manual optimization: `POST /api/performance/optimize`
   - Check garbage collection settings
   - Review memory threshold configuration

### Debug Commands

```bash
# Check GitHub status
curl http://localhost:5000/api/performance/github/status

# Get detailed performance metrics
curl http://localhost:5000/api/performance/metrics

# Trigger performance optimization
curl -X POST http://localhost:5000/api/performance/optimize
```

## Future Enhancements

Potential improvements for future versions:
- Integration with external monitoring services (Datadog, New Relic)
- Machine learning-based anomaly detection
- Automated performance tuning recommendations
- Integration with CI/CD pipelines for performance regression detection
- Enhanced visualization dashboard for performance metrics