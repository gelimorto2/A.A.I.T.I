const axios = require('axios');
const logger = require('./logger');

/**
 * GitHub Issue Reporter for AAITI
 * Automatically creates GitHub issues for critical errors and performance issues
 * Integrates with existing notification system
 */

class GitHubIssueReporter {
  constructor(config = {}) {
    this.config = {
      // GitHub API configuration
      token: config.githubToken || process.env.GITHUB_TOKEN,
      owner: config.owner || process.env.GITHUB_OWNER || 'gelimorto2',
      repo: config.repo || process.env.GITHUB_REPO || 'A.A.I.T.I',
      baseUrl: config.baseUrl || 'https://api.github.com',
      
      // Issue creation settings
      enabled: config.enabled !== false && (config.githubToken || process.env.GITHUB_TOKEN),
      autoCreate: config.autoCreate !== false,
      assignees: config.assignees || [],
      labels: config.labels || ['bug', 'auto-generated', 'aaiti'],
      
      // Rate limiting and deduplication
      rateLimitDelay: config.rateLimitDelay || 60000, // 1 minute between issues
      deduplicationWindow: config.deduplicationWindow || 3600000, // 1 hour
      maxIssuesPerHour: config.maxIssuesPerHour || 5,
      
      // Error filtering
      minSeverity: config.minSeverity || 'error', // info, warning, error, critical
      excludePatterns: config.excludePatterns || [
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /network/i,
        /temporary/i
      ],
      
      // Performance thresholds
      performanceThresholds: {
        responseTime: config.responseTimeThreshold || 5000, // 5 seconds
        memoryUsage: config.memoryThreshold || 0.9, // 90% of available memory
        cpuUsage: config.cpuThreshold || 0.9, // 90% CPU usage
        errorRate: config.errorRateThreshold || 0.1 // 10% error rate
      }
    };

    // Track recent issues to prevent duplicates
    this.recentIssues = new Map();
    this.issueCount = 0;
    this.lastHourReset = Date.now();

    // Initialize if enabled
    if (this.config.enabled) {
      logger.info('GitHub Issue Reporter initialized', {
        owner: this.config.owner,
        repo: this.config.repo,
        autoCreate: this.config.autoCreate
      });
    } else {
      logger.warn('GitHub Issue Reporter disabled - no token provided');
    }
  }

  /**
   * Report an error to GitHub Issues
   */
  async reportError(error, context = {}) {
    if (!this.config.enabled || !this.config.autoCreate) {
      return false;
    }

    try {
      // Check rate limits and deduplication
      if (!this.shouldCreateIssue(error, context)) {
        return false;
      }

      const issue = this.formatErrorIssue(error, context);
      const result = await this.createGitHubIssue(issue);
      
      if (result) {
        this.recordIssueCreation(error, result, context);
        logger.info('GitHub issue created for error', {
          issueNumber: result.number,
          issueUrl: result.html_url,
          error: error.message
        });
      }

      return result;
    } catch (err) {
      logger.error('Failed to create GitHub issue', err);
      return false;
    }
  }

  /**
   * Report performance issues to GitHub
   */
  async reportPerformanceIssue(metric, value, threshold, context = {}) {
    if (!this.config.enabled || !this.config.autoCreate) {
      return false;
    }

    try {
      const performanceError = new Error(`Performance threshold exceeded: ${metric}`);
      performanceError.metric = metric;
      performanceError.value = value;
      performanceError.threshold = threshold;
      performanceError.type = 'performance';

      const perfContext = {
        ...context,
        performance: {
          metric,
          value,
          threshold,
          percentage: ((value / threshold) * 100).toFixed(2)
        },
        type: 'performance'
      };

      return await this.reportError(performanceError, perfContext);
    } catch (err) {
      logger.error('Failed to create performance issue', err);
      return false;
    }
  }

  /**
   * Report script errors with context
   */
  async reportScriptError(scriptName, error, context = {}) {
    const scriptContext = {
      ...context,
      script: scriptName,
      type: 'script_error',
      timestamp: new Date().toISOString()
    };

    return await this.reportError(error, scriptContext);
  }

  /**
   * Check if an issue should be created
   */
  shouldCreateIssue(error, context) {
    // Check if enabled and has required config
    if (!this.config.enabled || !this.config.token) {
      return false;
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      logger.warn('GitHub issue creation rate limited');
      return false;
    }

    // Check severity level
    const severity = context.severity || this.extractSeverity(error);
    if (!this.meetsSeverityThreshold(severity)) {
      return false;
    }

    // Check exclusion patterns
    if (this.isExcluded(error)) {
      return false;
    }

    // Check for duplicates
    if (this.isDuplicate(error, context)) {
      logger.debug('Skipping duplicate issue creation', { error: error.message });
      return false;
    }

    return true;
  }

  /**
   * Format error as GitHub issue
   */
  formatErrorIssue(error, context = {}) {
    const timestamp = new Date().toISOString();
    const severity = context.severity || this.extractSeverity(error);
    const type = context.type || 'error';

    let title = `[${severity.toUpperCase()}] ${error.message}`;
    if (context.script) {
      title = `[${severity.toUpperCase()}] ${context.script}: ${error.message}`;
    }

    // Truncate title if too long
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    let body = `## Error Report\n\n`;
    body += `**Timestamp:** ${timestamp}\n`;
    body += `**Severity:** ${severity}\n`;
    body += `**Type:** ${type}\n\n`;

    if (context.script) {
      body += `**Script:** ${context.script}\n\n`;
    }

    body += `### Error Details\n\n`;
    body += `**Message:** ${error.message}\n\n`;

    if (error.stack) {
      body += `**Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\`\n\n`;
    }

    // Add performance context if available
    if (context.performance) {
      body += `### Performance Details\n\n`;
      body += `**Metric:** ${context.performance.metric}\n`;
      body += `**Value:** ${context.performance.value}\n`;
      body += `**Threshold:** ${context.performance.threshold}\n`;
      body += `**Percentage:** ${context.performance.percentage}%\n\n`;
    }

    // Add system context
    body += `### System Context\n\n`;
    body += `**Node.js Version:** ${process.version}\n`;
    body += `**Platform:** ${process.platform}\n`;
    body += `**Memory Usage:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n`;
    body += `**Uptime:** ${Math.round(process.uptime())}s\n\n`;

    // Add additional context
    if (context.user) {
      body += `**User:** ${context.user}\n`;
    }
    if (context.request) {
      body += `**Request:** ${context.request.method} ${context.request.url}\n`;
    }
    if (context.additionalInfo) {
      body += `### Additional Information\n\n${context.additionalInfo}\n\n`;
    }

    body += `---\n*This issue was automatically generated by AAITI Error Reporting System*`;

    return {
      title,
      body,
      labels: [...this.config.labels, `severity:${severity}`, `type:${type}`],
      assignees: this.config.assignees
    };
  }

  /**
   * Create GitHub issue via API
   */
  async createGitHubIssue(issue) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues`,
        issue,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AAITI-Error-Reporter'
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (err) {
      if (err.response) {
        logger.error('GitHub API error', {
          status: err.response.status,
          message: err.response.data?.message
        });
      } else {
        logger.error('GitHub request failed', err);
      }
      throw err;
    }
  }

  /**
   * Check rate limiting
   */
  checkRateLimit() {
    const now = Date.now();
    
    // Reset hour counter if needed
    if (now - this.lastHourReset > 3600000) {
      this.issueCount = 0;
      this.lastHourReset = now;
    }

    // Check hourly limit
    if (this.issueCount >= this.config.maxIssuesPerHour) {
      return false;
    }

    return true;
  }

  /**
   * Extract severity from error
   */
  extractSeverity(error) {
    if (error.type === 'performance') return 'warning';
    if (error.name === 'TypeError' || error.name === 'ReferenceError') return 'error';
    if (error.message.includes('FATAL') || error.message.includes('CRITICAL')) return 'critical';
    if (error.message.includes('WARNING') || error.message.includes('WARN')) return 'warning';
    return 'error';
  }

  /**
   * Check if error meets severity threshold
   */
  meetsSeverityThreshold(severity) {
    const levels = { info: 1, warning: 2, error: 3, critical: 4 };
    const minLevel = levels[this.config.minSeverity] || 3;
    const errorLevel = levels[severity] || 3;
    
    return errorLevel >= minLevel;
  }

  /**
   * Check if error should be excluded
   */
  isExcluded(error) {
    const message = error.message || '';
    return this.config.excludePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Check for duplicate issues
   */
  isDuplicate(error, context) {
    const key = this.generateIssueKey(error, context);
    const now = Date.now();
    
    if (this.recentIssues.has(key)) {
      const lastCreated = this.recentIssues.get(key);
      if (now - lastCreated < this.config.deduplicationWindow) {
        return true;
      }
    }

    return false;
  }

  /**
   * Record issue creation
   */
  recordIssueCreation(error, issue, context = {}) {
    const key = this.generateIssueKey(error, context);
    this.recentIssues.set(key, Date.now());
    this.issueCount++;

    // Clean up old entries
    this.cleanupRecentIssues();
  }

  /**
   * Generate unique key for deduplication
   */
  generateIssueKey(error, context = {}) {
    const errorKey = error.message + (error.stack ? error.stack.split('\n')[1] : '');
    const contextKey = context.script || context.type || '';
    return Buffer.from(errorKey + contextKey).toString('base64');
  }

  /**
   * Clean up old issue tracking entries
   */
  cleanupRecentIssues() {
    const now = Date.now();
    const cutoff = now - this.config.deduplicationWindow;
    
    for (const [key, timestamp] of this.recentIssues.entries()) {
      if (timestamp < cutoff) {
        this.recentIssues.delete(key);
      }
    }
  }

  /**
   * Get reporter status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      configured: !!this.config.token,
      recentIssues: this.recentIssues.size,
      issueCount: this.issueCount,
      lastHourReset: this.lastHourReset,
      rateLimitOk: this.checkRateLimit()
    };
  }

  /**
   * Test GitHub connection
   */
  async testConnection() {
    if (!this.config.enabled || !this.config.token) {
      throw new Error('GitHub reporter not configured');
    }

    try {
      const response = await axios.get(
        `${this.config.baseUrl}/repos/${this.config.owner}/${this.config.repo}`,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AAITI-Error-Reporter'
          },
          timeout: 5000
        }
      );

      return {
        success: true,
        repo: response.data.full_name,
        permissions: response.data.permissions
      };
    } catch (err) {
      throw new Error(`GitHub connection test failed: ${err.message}`);
    }
  }
}

// Singleton instance
let instance = null;

/**
 * Get GitHubIssueReporter instance
 */
function getGitHubIssueReporter(config) {
  if (!instance) {
    instance = new GitHubIssueReporter(config);
  }
  return instance;
}

module.exports = {
  GitHubIssueReporter,
  getGitHubIssueReporter
};