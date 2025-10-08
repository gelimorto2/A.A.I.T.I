const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Dependency Security Scanner
 * Scans npm dependencies for known vulnerabilities using npm audit and Snyk-style checks
 */
class DependencyScanner {
  constructor() {
    this.vulnerabilityThreshold = {
      critical: 0,  // No critical vulnerabilities allowed
      high: 2,      // Max 2 high severity vulnerabilities
      moderate: 10, // Max 10 moderate vulnerabilities
      low: 50       // Max 50 low severity vulnerabilities
    };
    
    this.exemptPackages = [
      // Packages that are known to have issues but are accepted
      // Add packages here that have been reviewed and accepted
    ];
    
    this.lastScanResults = null;
    this.lastScanTime = null;
  }

  /**
   * Run npm audit to check for vulnerabilities
   */
  async runNpmAudit() {
    try {
      logger.info('Running npm audit scan...');
      
      const auditCommand = 'npm audit --json';
      const auditOutput = execSync(auditCommand, { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      const auditData = JSON.parse(auditOutput);
      
      return {
        success: true,
        data: auditData,
        vulnerabilities: auditData.vulnerabilities || {},
        metadata: auditData.metadata || {}
      };
      
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      if (error.stdout) {
        try {
          const auditData = JSON.parse(error.stdout);
          return {
            success: true,
            data: auditData,
            vulnerabilities: auditData.vulnerabilities || {},
            metadata: auditData.metadata || {}
          };
        } catch (parseError) {
          logger.error('Failed to parse npm audit output:', parseError);
        }
      }
      
      logger.error('npm audit failed:', error.message);
      return {
        success: false,
        error: error.message,
        vulnerabilities: {},
        metadata: {}
      };
    }
  }

  /**
   * Analyze audit results and categorize vulnerabilities
   */
  analyzeVulnerabilities(auditResults) {
    try {
      const analysis = {
        summary: {
          critical: 0,
          high: 0,
          moderate: 0,
          low: 0,
          info: 0,
          total: 0
        },
        details: [],
        exempted: [],
        actionable: []
      };

      if (!auditResults.success || !auditResults.vulnerabilities) {
        return analysis;
      }

      const vulnerabilities = auditResults.vulnerabilities;
      
      Object.entries(vulnerabilities).forEach(([packageName, vulnData]) => {
        if (!vulnData.via || !Array.isArray(vulnData.via)) {
          return;
        }

        vulnData.via.forEach(via => {
          if (typeof via === 'object' && via.severity) {
            const severity = via.severity.toLowerCase();
            analysis.summary[severity] = (analysis.summary[severity] || 0) + 1;
            analysis.summary.total++;

            const vulnerability = {
              package: packageName,
              severity: via.severity,
              title: via.title,
              cve: via.cve,
              url: via.url,
              range: via.range,
              fixAvailable: vulnData.fixAvailable || false
            };

            // Check if package is exempted
            if (this.exemptPackages.includes(packageName)) {
              analysis.exempted.push(vulnerability);
            } else {
              analysis.details.push(vulnerability);
              
              if (vulnerability.fixAvailable) {
                analysis.actionable.push(vulnerability);
              }
            }
          }
        });
      });

      return analysis;

    } catch (error) {
      logger.error('Vulnerability analysis failed:', error);
      return {
        summary: { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 },
        details: [],
        exempted: [],
        actionable: []
      };
    }
  }

  /**
   * Check if vulnerability levels exceed thresholds
   */
  checkThresholds(analysis) {
    const violations = [];
    
    Object.entries(this.vulnerabilityThreshold).forEach(([severity, threshold]) => {
      const count = analysis.summary[severity] || 0;
      if (count > threshold) {
        violations.push({
          severity,
          count,
          threshold,
          excess: count - threshold
        });
      }
    });

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Get package information from package.json
   */
  getPackageInfo() {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        totalDependencies: Object.keys(packageJson.dependencies || {}).length + 
                          Object.keys(packageJson.devDependencies || {}).length
      };
      
    } catch (error) {
      logger.error('Failed to read package.json:', error);
      return {
        name: 'unknown',
        version: 'unknown',
        dependencies: [],
        devDependencies: [],
        totalDependencies: 0
      };
    }
  }

  /**
   * Generate fix recommendations
   */
  generateFixRecommendations(analysis) {
    const recommendations = [];

    // Automatic fixes
    if (analysis.actionable.length > 0) {
      recommendations.push({
        type: 'automatic',
        command: 'npm audit fix',
        description: `Automatically fix ${analysis.actionable.length} vulnerabilities`,
        impact: 'May update package versions'
      });

      const criticalAndHigh = analysis.actionable.filter(v => 
        ['critical', 'high'].includes(v.severity.toLowerCase())
      );

      if (criticalAndHigh.length > 0) {
        recommendations.push({
          type: 'force',
          command: 'npm audit fix --force',
          description: `Force fix ${criticalAndHigh.length} critical/high vulnerabilities`,
          impact: 'May introduce breaking changes'
        });
      }
    }

    // Manual fixes for unfixable vulnerabilities
    const unfixable = analysis.details.filter(v => !v.fixAvailable);
    if (unfixable.length > 0) {
      recommendations.push({
        type: 'manual',
        description: `${unfixable.length} vulnerabilities require manual review`,
        actions: unfixable.map(v => ({
          package: v.package,
          severity: v.severity,
          suggestion: 'Consider updating to a secure version or finding an alternative package'
        }))
      });
    }

    return recommendations;
  }

  /**
   * Run comprehensive dependency scan
   */
  async runScan() {
    try {
      logger.info('Starting comprehensive dependency security scan...');
      
      const scanStartTime = Date.now();
      const packageInfo = this.getPackageInfo();
      
      // Run npm audit
      const auditResults = await this.runNpmAudit();
      
      // Analyze vulnerabilities
      const analysis = this.analyzeVulnerabilities(auditResults);
      
      // Check thresholds
      const thresholdCheck = this.checkThresholds(analysis);
      
      // Generate recommendations
      const recommendations = this.generateFixRecommendations(analysis);
      
      const scanDuration = Date.now() - scanStartTime;
      
      const results = {
        timestamp: new Date().toISOString(),
        duration: scanDuration,
        package: packageInfo,
        scan: {
          success: auditResults.success,
          tool: 'npm audit',
          version: this.getNpmVersion()
        },
        vulnerabilities: analysis,
        thresholds: {
          configured: this.vulnerabilityThreshold,
          check: thresholdCheck
        },
        recommendations,
        summary: {
          totalPackages: packageInfo.totalDependencies,
          totalVulnerabilities: analysis.summary.total,
          criticalVulnerabilities: analysis.summary.critical,
          highVulnerabilities: analysis.summary.high,
          fixableVulnerabilities: analysis.actionable.length,
          passed: thresholdCheck.passed
        }
      };

      // Cache results
      this.lastScanResults = results;
      this.lastScanTime = Date.now();

      logger.info('Dependency security scan completed', {
        duration: scanDuration,
        totalVulnerabilities: analysis.summary.total,
        critical: analysis.summary.critical,
        high: analysis.summary.high,
        passed: thresholdCheck.passed
      });

      return results;

    } catch (error) {
      logger.error('Dependency scan failed:', error);
      throw error;
    }
  }

  /**
   * Get npm version
   */
  getNpmVersion() {
    try {
      return execSync('npm --version', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Express middleware to enforce dependency security gates
   */
  securityGateMiddleware() {
    return async (req, res, next) => {
      try {
        // Only run scan if it's been more than 1 hour since last scan
        const oneHour = 60 * 60 * 1000;
        if (this.lastScanTime && (Date.now() - this.lastScanTime) < oneHour) {
          if (this.lastScanResults && !this.lastScanResults.summary.passed) {
            return res.status(503).json({
              success: false,
              error: 'Service unavailable due to security vulnerabilities',
              code: 'SECURITY_GATE_FAILED',
              scan: this.lastScanResults.summary
            });
          }
          return next();
        }

        // Run new scan
        const results = await this.runScan();
        
        if (!results.summary.passed) {
          logger.error('Security gate failed - vulnerabilities exceed thresholds', {
            violations: results.thresholds.check.violations
          });

          return res.status(503).json({
            success: false,
            error: 'Service unavailable due to security vulnerabilities',
            code: 'SECURITY_GATE_FAILED',
            scan: results.summary,
            violations: results.thresholds.check.violations
          });
        }

        next();

      } catch (error) {
        logger.error('Security gate middleware error:', error);
        // In case of scan failure, allow request but log error
        next();
      }
    };
  }

  /**
   * Get last scan results
   */
  getLastScanResults() {
    return this.lastScanResults;
  }

  /**
   * Set vulnerability thresholds
   */
  setThresholds(thresholds) {
    this.vulnerabilityThreshold = { ...this.vulnerabilityThreshold, ...thresholds };
    logger.info('Vulnerability thresholds updated', this.vulnerabilityThreshold);
  }

  /**
   * Add package to exemption list
   */
  exemptPackage(packageName, reason) {
    if (!this.exemptPackages.includes(packageName)) {
      this.exemptPackages.push(packageName);
      logger.info(`Package exempted from security scan: ${packageName}`, { reason });
    }
  }

  /**
   * Remove package from exemption list
   */
  removeExemption(packageName) {
    const index = this.exemptPackages.indexOf(packageName);
    if (index > -1) {
      this.exemptPackages.splice(index, 1);
      logger.info(`Package exemption removed: ${packageName}`);
    }
  }

  /**
   * Initialize the dependency scanner
   */
  async initialize() {
    logger.info('Initializing dependency scanner...');
    
    try {
      // Check if npm is available
      execSync('npm --version', { encoding: 'utf8' });
      
      // Check if package.json exists
      const packagePath = path.join(process.cwd(), 'package.json');
      if (!fs.existsSync(packagePath)) {
        throw new Error('package.json not found in current directory');
      }
      
      logger.info('Dependency scanner initialized successfully');
      return true;
      
    } catch (error) {
      logger.warn('Dependency scanner initialization failed', { error: error.message });
      return false;
    }
  }
}

// Create singleton instance
const dependencyScanner = new DependencyScanner();

module.exports = {
  DependencyScanner,
  scanner: dependencyScanner,
  securityGate: () => dependencyScanner.securityGateMiddleware()
};
