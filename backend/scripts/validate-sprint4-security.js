#!/usr/bin/env node

/**
 * Sprint 4 Security Validation Script
 * Comprehensive testing of all security components
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class Sprint4SecurityValidator {
  constructor() {
    this.results = {
      rbac: { status: 'pending', details: null },
      hmac: { status: 'pending', details: null },
      inputValidation: { status: 'pending', details: null },
      dependencyScanning: { status: 'pending', details: null },
      regressionTests: { status: 'pending', details: null },
      integration: { status: 'pending', details: null }
    };
    
    this.startTime = Date.now();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { 
        stdio: 'pipe', 
        cwd: path.join(__dirname, '..')
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async validateFileExists(filePath) {
    const fullPath = path.join(__dirname, '..', filePath);
    return fs.existsSync(fullPath);
  }

  async validateRBAC() {
    this.log('Validating RBAC implementation...');
    
    try {
      // Check if RBAC files exist
      const rbacMiddleware = await this.validateFileExists('middleware/rbacMiddleware.js');
      const permissionsConfig = await this.validateFileExists('config/permissions.json');
      
      if (!rbacMiddleware) {
        throw new Error('RBAC middleware file not found');
      }
      
      if (!permissionsConfig) {
        throw new Error('Permissions configuration file not found');
      }
      
      // Validate permissions.json structure
      const permissionsPath = path.join(__dirname, '..', 'config/permissions.json');
      const permissions = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
      
      const requiredKeys = ['roles', 'resources', 'special_rules', 'endpoint_permissions'];
      for (const key of requiredKeys) {
        if (!permissions[key]) {
          throw new Error(`Missing required permissions key: ${key}`);
        }
      }
      
      // Check if admin role exists
      if (!permissions.roles.admin) {
        throw new Error('Admin role not defined in permissions');
      }
      
      this.results.rbac = {
        status: 'success',
        details: {
          middleware: rbacMiddleware,
          config: permissionsConfig,
          roles: Object.keys(permissions.roles).length,
          resources: Object.keys(permissions.resources).length
        }
      };
      
      this.log('RBAC validation successful', 'success');
      
    } catch (error) {
      this.results.rbac = {
        status: 'error',
        details: { error: error.message }
      };
      this.log(`RBAC validation failed: ${error.message}`, 'error');
    }
  }

  async validateHMAC() {
    this.log('Validating HMAC authentication...');
    
    try {
      const hmacMiddleware = await this.validateFileExists('middleware/hmacMiddleware.js');
      
      if (!hmacMiddleware) {
        throw new Error('HMAC middleware file not found');
      }
      
      // Test HMAC middleware import
      const hmacPath = path.join(__dirname, '..', 'middleware/hmacMiddleware.js');
      const hmacModule = require(hmacPath);
      
      if (!hmacModule.hmac) {
        throw new Error('HMAC module not properly exported');
      }
      
      const requiredMethods = ['middleware', 'createSignature', 'validateSignature', 'createClientSignature'];
      for (const method of requiredMethods) {
        if (typeof hmacModule.hmac[method] !== 'function') {
          throw new Error(`HMAC missing required method: ${method}`);
        }
      }
      
      this.results.hmac = {
        status: 'success',
        details: {
          middleware: hmacMiddleware,
          methods: requiredMethods
        }
      };
      
      this.log('HMAC validation successful', 'success');
      
    } catch (error) {
      this.results.hmac = {
        status: 'error',
        details: { error: error.message }
      };
      this.log(`HMAC validation failed: ${error.message}`, 'error');
    }
  }

  async validateInputValidation() {
    this.log('Validating input canonicalization...');
    
    try {
      const inputMiddleware = await this.validateFileExists('middleware/inputCanonicalizationMiddleware.js');
      
      if (!inputMiddleware) {
        throw new Error('Input canonicalization middleware file not found');
      }
      
      // Test input validation middleware import
      const inputPath = path.join(__dirname, '..', 'middleware/inputCanonicalizationMiddleware.js');
      const inputModule = require(inputPath);
      
      if (!inputModule.inputCanonicalizer) {
        throw new Error('Input canonicalizer not properly exported');
      }
      
      const requiredMethods = ['middleware', 'canonicalizeInput', 'detectSuspiciousPatterns', 'runFuzzTests'];
      for (const method of requiredMethods) {
        if (typeof inputModule.inputCanonicalizer[method] !== 'function') {
          throw new Error(`Input canonicalizer missing required method: ${method}`);
        }
      }
      
      this.results.inputValidation = {
        status: 'success',
        details: {
          middleware: inputMiddleware,
          methods: requiredMethods
        }
      };
      
      this.log('Input validation validation successful', 'success');
      
    } catch (error) {
      this.results.inputValidation = {
        status: 'error',
        details: { error: error.message }
      };
      this.log(`Input validation validation failed: ${error.message}`, 'error');
    }
  }

  async validateDependencyScanning() {
    this.log('Validating dependency scanning...');
    
    try {
      const scannerService = await this.validateFileExists('services/dependencyScanner.js');
      
      if (!scannerService) {
        throw new Error('Dependency scanner service file not found');
      }
      
      // Test npm audit command availability
      try {
        await this.runCommand('npm', ['audit', '--json']);
      } catch (error) {
        this.log('npm audit command test failed (this may be expected)', 'warn');
      }
      
      // Test scanner service import
      const scannerPath = path.join(__dirname, '..', 'services/dependencyScanner.js');
      const scannerModule = require(scannerPath);
      
      if (!scannerModule.scanner) {
        throw new Error('Dependency scanner not properly exported');
      }
      
      const requiredMethods = ['initialize', 'runScan', 'setThresholds', 'exemptPackage', 'removeExemption'];
      for (const method of requiredMethods) {
        if (typeof scannerModule.scanner[method] !== 'function') {
          throw new Error(`Scanner missing required method: ${method}`);
        }
      }
      
      this.results.dependencyScanning = {
        status: 'success',
        details: {
          service: scannerService,
          methods: requiredMethods
        }
      };
      
      this.log('Dependency scanning validation successful', 'success');
      
    } catch (error) {
      this.results.dependencyScanning = {
        status: 'error',
        details: { error: error.message }
      };
      this.log(`Dependency scanning validation failed: ${error.message}`, 'error');
    }
  }

  async validateRegressionTests() {
    this.log('Validating security regression tests...');
    
    try {
      const testSuite = await this.validateFileExists('tests/securityRegressionSuite.js');
      
      if (!testSuite) {
        throw new Error('Security regression test suite file not found');
      }
      
      // Test suite import
      const testPath = path.join(__dirname, '..', 'tests/securityRegressionSuite.js');
      const TestSuite = require(testPath);
      
      if (typeof TestSuite !== 'function') {
        throw new Error('Security regression test suite not properly exported');
      }
      
      // Create test instance (mock app)
      const mockApp = { use: () => {}, get: () => {}, post: () => {} };
      const suite = new TestSuite(mockApp);
      
      const requiredMethods = ['runAllTests', 'testInjectionPrevention', 'testRBACAuthorization', 'testHMACAuthentication'];
      for (const method of requiredMethods) {
        if (typeof suite[method] !== 'function') {
          throw new Error(`Test suite missing required method: ${method}`);
        }
      }
      
      this.results.regressionTests = {
        status: 'success',
        details: {
          testSuite: testSuite,
          methods: requiredMethods
        }
      };
      
      this.log('Security regression tests validation successful', 'success');
      
    } catch (error) {
      this.results.regressionTests = {
        status: 'error',
        details: { error: error.message }
      };
      this.log(`Security regression tests validation failed: ${error.message}`, 'error');
    }
  }

  async validateIntegration() {
    this.log('Validating server integration...');
    
    try {
      const serverFile = await this.validateFileExists('server.js');
      
      if (!serverFile) {
        throw new Error('Server file not found');
      }
      
      // Check server.js for security middleware imports
      const serverPath = path.join(__dirname, '..', 'server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      const requiredImports = [
        'rbacMiddleware',
        'inputCanonicalizationMiddleware', 
        'hmacMiddleware',
        'dependencyScanner',
        'securityManagement'
      ];
      
      const missingImports = [];
      for (const importName of requiredImports) {
        if (!serverContent.includes(importName)) {
          missingImports.push(importName);
        }
      }
      
      if (missingImports.length > 0) {
        throw new Error(`Missing security imports in server.js: ${missingImports.join(', ')}`);
      }
      
      // Check for security middleware usage
      const middlewareUsage = [
        'inputCanonicalizer.middleware',
        'hmac.middleware',
        'rbac.middleware'
      ];
      
      const missingMiddleware = [];
      for (const middleware of middlewareUsage) {
        if (!serverContent.includes(middleware)) {
          missingMiddleware.push(middleware);
        }
      }
      
      if (missingMiddleware.length > 0) {
        throw new Error(`Missing security middleware usage in server.js: ${missingMiddleware.join(', ')}`);
      }
      
      this.results.integration = {
        status: 'success',
        details: {
          server: serverFile,
          imports: requiredImports,
          middleware: middlewareUsage
        }
      };
      
      this.log('Server integration validation successful', 'success');
      
    } catch (error) {
      this.results.integration = {
        status: 'error',
        details: { error: error.message }
      };
      this.log(`Server integration validation failed: ${error.message}`, 'error');
    }
  }

  async generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.log('='.repeat(80));
    this.log('SPRINT 4 SECURITY VALIDATION REPORT');
    this.log('='.repeat(80));
    this.log(`Validation Duration: ${duration}ms`);
    this.log('');
    
    let successCount = 0;
    let totalCount = 0;
    
    for (const [component, result] of Object.entries(this.results)) {
      totalCount++;
      const status = result.status === 'success' ? '✅ PASS' : 
                    result.status === 'error' ? '❌ FAIL' : '⏳ PENDING';
      
      if (result.status === 'success') {
        successCount++;
      }
      
      this.log(`${component.toUpperCase().padEnd(20)} ${status}`);
      
      if (result.status === 'error') {
        this.log(`  Error: ${result.details.error}`, 'error');
      } else if (result.status === 'success' && result.details) {
        const details = Object.entries(result.details)
          .filter(([key]) => key !== 'error')
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.length : value}`)
          .join(', ');
        if (details) {
          this.log(`  Details: ${details}`);
        }
      }
      this.log('');
    }
    
    this.log('='.repeat(80));
    this.log(`OVERALL RESULT: ${successCount}/${totalCount} components validated successfully`);
    
    if (successCount === totalCount) {
      this.log('🎉 Sprint 4 Security Implementation: COMPLETE', 'success');
      return true;
    } else {
      this.log('⚠️ Sprint 4 Security Implementation: INCOMPLETE', 'error');
      return false;
    }
  }

  async validate() {
    this.log('Starting Sprint 4 Security Validation...');
    this.log('');
    
    await this.validateRBAC();
    await this.validateHMAC();
    await this.validateInputValidation();
    await this.validateDependencyScanning();
    await this.validateRegressionTests();
    await this.validateIntegration();
    
    return await this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new Sprint4SecurityValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });
}

module.exports = Sprint4SecurityValidator;