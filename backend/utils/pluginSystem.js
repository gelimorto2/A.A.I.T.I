const fs = require('fs').promises;
const path = require('path');
const vm = require('vm');
const logger = require('./logger');
const { getCache } = require('./cache');

/**
 * Plugin Architecture for Custom Trading Indicators
 * Allows users to create and deploy custom indicators safely
 */
class PluginSystem {
  constructor() {
    this.plugins = new Map();
    this.pluginDirectory = path.join(__dirname, '../plugins');
    this.cache = getCache();
    this.sandboxConfig = {
      timeout: 5000, // 5 second timeout for plugin execution
      memory: 50 * 1024 * 1024, // 50MB memory limit
    };
    
    // Available APIs for plugins
    this.pluginAPI = {
      math: require('mathjs'),
      statistics: require('simple-statistics'),
      logger: {
        info: (msg) => logger.info(`[Plugin] ${msg}`),
        warn: (msg) => logger.warn(`[Plugin] ${msg}`),
        error: (msg) => logger.error(`[Plugin] ${msg}`)
      },
      utils: {
        sma: this.calculateSMA.bind(this),
        ema: this.calculateEMA.bind(this),
        rsi: this.calculateRSI.bind(this),
        bb: this.calculateBollingerBands.bind(this)
      }
    };

    this.initializePluginSystem();
    logger.info('Plugin System initialized with sandbox security');
  }

  /**
   * Initialize plugin system and create directory if needed
   */
  async initializePluginSystem() {
    try {
      await fs.mkdir(this.pluginDirectory, { recursive: true });
      await this.loadAllPlugins();
    } catch (error) {
      logger.error('Failed to initialize plugin system:', error);
    }
  }

  /**
   * Register a new custom indicator plugin
   */
  async registerPlugin(pluginConfig) {
    const {
      id,
      name,
      description,
      version = '1.0.0',
      author,
      code,
      parameters = {},
      category = 'custom'
    } = pluginConfig;

    // Validate plugin
    const validation = await this.validatePlugin(code);
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
    }

    const plugin = {
      id,
      name,
      description,
      version,
      author,
      code,
      parameters,
      category,
      enabled: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      executionCount: 0,
      averageExecutionTime: 0
    };

    // Save plugin to file system
    const pluginPath = path.join(this.pluginDirectory, `${id}.json`);
    await fs.writeFile(pluginPath, JSON.stringify(plugin, null, 2));

    // Compile and store in memory
    const compiledPlugin = await this.compilePlugin(plugin);
    this.plugins.set(id, compiledPlugin);

    logger.info('Plugin registered successfully', {
      pluginId: id,
      name,
      author,
      category
    });

    return plugin;
  }

  /**
   * Execute a plugin with given data
   */
  async executePlugin(pluginId, data, parameters = {}) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!plugin.enabled) {
      throw new Error(`Plugin ${pluginId} is disabled`);
    }

    const startTime = Date.now();

    try {
      // Create sandbox context
      const sandbox = {
        data,
        parameters: { ...plugin.parameters, ...parameters },
        api: this.pluginAPI,
        result: null,
        console: {
          log: (msg) => logger.info(`[Plugin ${pluginId}] ${msg}`),
          warn: (msg) => logger.warn(`[Plugin ${pluginId}] ${msg}`),
          error: (msg) => logger.error(`[Plugin ${pluginId}] ${msg}`)
        }
      };

      // Execute plugin in sandbox
      const context = vm.createContext(sandbox);
      vm.runInContext(plugin.compiledCode, context, {
        timeout: this.sandboxConfig.timeout,
        displayErrors: true
      });

      const executionTime = Date.now() - startTime;

      // Update plugin statistics
      plugin.executionCount++;
      plugin.averageExecutionTime = 
        (plugin.averageExecutionTime * (plugin.executionCount - 1) + executionTime) / plugin.executionCount;

      logger.info('Plugin executed successfully', {
        pluginId,
        executionTime,
        resultType: typeof sandbox.result
      });

      return {
        success: true,
        result: sandbox.result,
        executionTime,
        pluginId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Plugin execution failed', {
        pluginId,
        error: error.message,
        executionTime: Date.now() - startTime
      });

      throw new Error(`Plugin execution failed: ${error.message}`);
    }
  }

  /**
   * Validate plugin code for security and correctness
   */
  async validatePlugin(code) {
    const errors = [];
    const warnings = [];

    // Check for forbidden patterns
    const forbiddenPatterns = [
      /require\s*\(/g,
      /import\s+/g,
      /eval\s*\(/g,
      /Function\s*\(/g,
      /process\./g,
      /global\./g,
      /fs\./g,
      /child_process/g,
      /net\./g,
      /http\./g,
      /https\./g
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        errors.push(`Forbidden pattern detected: ${pattern.source}`);
      }
    }

    // Check for required function structure
    if (!code.includes('result =')) {
      errors.push('Plugin must set a result variable');
    }

    // Test compilation
    try {
      new vm.Script(code);
    } catch (error) {
      errors.push(`Syntax error: ${error.message}`);
    }

    // Performance checks
    if (code.length > 50000) {
      warnings.push('Plugin code is very large and may impact performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Compile plugin code for execution
   */
  async compilePlugin(plugin) {
    const compiledCode = new vm.Script(plugin.code);
    
    return {
      ...plugin,
      compiledCode,
      compiled: true,
      compiledAt: new Date().toISOString()
    };
  }

  /**
   * Load all plugins from directory
   */
  async loadAllPlugins() {
    try {
      const files = await fs.readdir(this.pluginDirectory);
      const pluginFiles = files.filter(file => file.endsWith('.json'));

      for (const file of pluginFiles) {
        try {
          const pluginPath = path.join(this.pluginDirectory, file);
          const pluginData = await fs.readFile(pluginPath, 'utf8');
          const plugin = JSON.parse(pluginData);
          
          const compiledPlugin = await this.compilePlugin(plugin);
          this.plugins.set(plugin.id, compiledPlugin);
          
          logger.info('Plugin loaded', { pluginId: plugin.id, name: plugin.name });
        } catch (error) {
          logger.error(`Failed to load plugin ${file}:`, error);
        }
      }

      logger.info(`Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      logger.error('Failed to load plugins directory:', error);
    }
  }

  /**
   * Get all available plugins
   */
  listPlugins() {
    return Array.from(this.plugins.values()).map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      author: plugin.author,
      category: plugin.category,
      enabled: plugin.enabled,
      executionCount: plugin.executionCount,
      averageExecutionTime: plugin.averageExecutionTime,
      createdAt: plugin.createdAt,
      lastUpdated: plugin.lastUpdated
    }));
  }

  /**
   * Get plugin by ID with full details
   */
  getPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return null;
    }

    return {
      ...plugin,
      compiledCode: undefined // Don't expose compiled code
    };
  }

  /**
   * Enable/disable plugin
   */
  togglePlugin(pluginId, enabled) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.enabled = enabled;
    plugin.lastUpdated = new Date().toISOString();

    logger.info('Plugin toggled', { pluginId, enabled });
    return plugin;
  }

  /**
   * Remove plugin
   */
  async removePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Remove from memory
    this.plugins.delete(pluginId);

    // Remove from file system
    try {
      const pluginPath = path.join(this.pluginDirectory, `${pluginId}.json`);
      await fs.unlink(pluginPath);
    } catch (error) {
      logger.warn('Failed to delete plugin file:', error);
    }

    logger.info('Plugin removed', { pluginId });
    return true;
  }

  /**
   * Get plugin execution statistics
   */
  getPluginStats() {
    const stats = {
      totalPlugins: this.plugins.size,
      enabledPlugins: 0,
      totalExecutions: 0,
      averageExecutionTime: 0,
      categories: {},
      topPlugins: []
    };

    const pluginArray = Array.from(this.plugins.values());
    
    for (const plugin of pluginArray) {
      if (plugin.enabled) stats.enabledPlugins++;
      stats.totalExecutions += plugin.executionCount;
      
      if (!stats.categories[plugin.category]) {
        stats.categories[plugin.category] = 0;
      }
      stats.categories[plugin.category]++;
    }

    // Calculate overall average execution time
    if (stats.totalExecutions > 0) {
      const totalTime = pluginArray.reduce((sum, plugin) => 
        sum + (plugin.averageExecutionTime * plugin.executionCount), 0);
      stats.averageExecutionTime = totalTime / stats.totalExecutions;
    }

    // Get top plugins by execution count
    stats.topPlugins = pluginArray
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 5)
      .map(plugin => ({
        id: plugin.id,
        name: plugin.name,
        executionCount: plugin.executionCount,
        averageExecutionTime: plugin.averageExecutionTime
      }));

    return stats;
  }

  // Helper functions for common indicators (available to plugins)
  
  calculateSMA(data, period) {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  calculateEMA(data, period) {
    if (data.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema = (data[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateRSI(data, period = 14) {
    if (data.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = data[i] - data[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    
    return 100 - (100 / (1 + rs));
  }

  calculateBollingerBands(data, period = 20, stdDev = 2) {
    if (data.length < period) return null;
    
    const sma = this.calculateSMA(data, period);
    const slice = data.slice(-period);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    return {
      upper: sma + (std * stdDev),
      middle: sma,
      lower: sma - (std * stdDev)
    };
  }
}

module.exports = new PluginSystem();