const os = require('os');
const fs = require('fs');
const path = require('path');

class ASCIIDashboard {
  constructor() {
    this.stats = {
      serverStatus: 'INITIALIZING',
      uptime: 0,
      connections: 0,
      apiCalls: 0,
      dbStatus: 'DISCONNECTED',
      marketDataStatus: 'OFFLINE',
      lastApiCall: null,
      memory: 0,
      cpu: 0,
      errors: 0
    };
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
    this.logs = [];
    this.maxLogs = 10; // Keep last 10 log entries
    this.versionInfo = this.loadVersionInfo();
  }

  loadVersionInfo() {
    try {
      const versionPath = path.join(__dirname, '../../version.json');
      if (fs.existsSync(versionPath)) {
        return JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load version info:', error.message);
    }
    return {
      version: '1.1.0',
      name: 'AAITI',
      description: 'Auto AI Trading Interface',
      buildNumber: '1',
      environment: 'production'
    };
  }

  updateStats(updates) {
    this.stats = { ...this.stats, ...updates };
    this.stats.uptime = Date.now() - this.startTime;
    this.lastUpdate = Date.now();
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  formatMemory(bytes) {
    const MB = bytes / 1024 / 1024;
    return `${Math.round(MB)}MB`;
  }

  getStatusColor(status) {
    const colors = {
      'ONLINE': '\x1b[32m',     // Green
      'CONNECTED': '\x1b[32m',  // Green
      'ACTIVE': '\x1b[32m',     // Green
      'OFFLINE': '\x1b[31m',    // Red
      'DISCONNECTED': '\x1b[31m', // Red
      'ERROR': '\x1b[31m',      // Red
      'INITIALIZING': '\x1b[33m', // Yellow
      'IDLE': '\x1b[33m'        // Yellow
    };
    return colors[status] || '\x1b[37m'; // Default white
  }

  getTerminalSize() {
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    };
  }

  createBorder(width, char = '═') {
    return char.repeat(width - 2);
  }

  centerText(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text + ' '.repeat(width - text.length - padding);
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  render() {
    const memUsage = process.memoryUsage();
    const cpuCount = os.cpus().length;
    const terminal = this.getTerminalSize();
    const width = Math.max(80, terminal.width);
    const border = this.createBorder(width);
    
    // Clear screen and move cursor to top
    console.clear();
    
    const header = `
╔${border}╗
║${this.centerText(`🚀 ${this.versionInfo.name} v${this.versionInfo.version} - NEURAL COMMAND DECK`, width)}║
║${this.centerText(`${this.versionInfo.description} - Build #${this.versionInfo.buildNumber}`, width)}║
║${this.centerText(`Production Environment - Node.js ${process.version}`, width)}║
╚${border}╝`;

    const systemBorder = this.createBorder(width, '─');
    const systemInfo = `
┌─ SYSTEM STATUS ${systemBorder.substring(16)}┐
│ Server Status:    ${this.getStatusColor(this.stats.serverStatus)}${this.stats.serverStatus.padEnd(12)}\x1b[0m │ Uptime: ${this.formatUptime(this.stats.uptime).padEnd(15)} │
│ Database:         ${this.getStatusColor(this.stats.dbStatus)}${this.stats.dbStatus.padEnd(12)}\x1b[0m │ Memory: ${this.formatMemory(memUsage.heapUsed).padEnd(15)} │
│ Market Data:      ${this.getStatusColor(this.stats.marketDataStatus)}${this.stats.marketDataStatus.padEnd(12)}\x1b[0m │ CPU Cores: ${cpuCount.toString().padEnd(12)} │
└${systemBorder}┘`;

    const deploymentBorder = this.createBorder(width, '─');
    const deploymentInfo = `
┌─ DEPLOYMENT INFO ${deploymentBorder.substring(18)}┐
│ Version:          v${this.versionInfo.version.padEnd(10)} │ Build: #${this.versionInfo.buildNumber.padEnd(15)} │ Environment: ${this.versionInfo.environment.toUpperCase().padEnd(8)} │
│ Node.js:          ${process.version.padEnd(10)} │ Platform: ${process.platform.padEnd(13)} │ Architecture: ${process.arch.padEnd(7)} │
│ PID:              ${process.pid.toString().padEnd(10)} │ Working Dir: ${process.cwd().split('/').pop().padEnd(11)} │ Heap Size: ${this.formatMemory(memUsage.heapTotal).padEnd(7)} │
└${deploymentBorder}┘`;

    const connectionBorder = this.createBorder(width, '─');
    const connectionInfo = `
┌─ CONNECTIONS & ACTIVITY ${connectionBorder.substring(27)}┐
│ Active Connections: ${this.stats.connections.toString().padStart(8)} │ Total API Calls: ${this.stats.apiCalls.toString().padStart(12)} │
│ Error Count:        ${this.stats.errors.toString().padStart(8)} │ Last Activity:   ${(this.stats.lastApiCall || 'None').toString().padEnd(12)} │
└${connectionBorder}┘`;

    const tradingBorder = this.createBorder(width, '─');
    const liveStatus = `
┌─ LIVE TRADING STATUS ${tradingBorder.substring(22)}┐
│ 🤖 Active Bots:     0        │ 📊 Active Trades:    0        │ 💰 P&L:   $0.00    │
│ 📈 Market Feeds:    LIVE     │ 🎯 Win Rate:         0.0%     │ ⚠️  Alerts: 0       │
│ 🔄 Data Refresh:    5s       │ 📡 WebSocket:        ACTIVE   │ 🛡️  Health: 98%     │
└${tradingBorder}┘`;

    // Logs section - takes remaining space
    const logsBorder = this.createBorder(width, '─');
    let logsSection = `
┌─ RECENT LOGS ${logsBorder.substring(14)}┐`;
    
    const availableLogLines = Math.max(3, Math.min(this.maxLogs, terminal.height - 20));
    const recentLogs = this.logs.slice(-availableLogLines);
    
    if (recentLogs.length === 0) {
      logsSection += `\n│${this.centerText('No recent logs', width)}│`;
    } else {
      recentLogs.forEach(log => {
        const logText = this.truncateText(`${log.time} [${log.level.toUpperCase()}] ${log.message}`, width - 4);
        const colorCode = log.level === 'error' ? '\x1b[31m' : log.level === 'warn' ? '\x1b[33m' : '\x1b[37m';
        logsSection += `\n│ ${colorCode}${logText.padEnd(width - 4)}\x1b[0m │`;
      });
    }
    
    // Fill remaining space if needed
    const currentLogLines = recentLogs.length || 1;
    for (let i = currentLogLines; i < availableLogLines; i++) {
      logsSection += `\n│${' '.repeat(width - 2)}│`;
    }
    
    logsSection += `\n└${logsBorder}┘`;

    const controlsBorder = this.createBorder(width, '─');
    const footer = `
┌─ CONTROLS ${controlsBorder.substring(11)}┐
│ Press Ctrl+C to stop • Dashboard: http://localhost:3000 • API: :5000 • v${this.versionInfo.version}    │
└${controlsBorder}┘
${this.centerText(`Last Update: ${new Date().toLocaleTimeString()} • Production Environment`, width)}`;

    console.log('\x1b[36m' + header + '\x1b[0m');
    console.log('\x1b[37m' + systemInfo + '\x1b[0m');
    console.log('\x1b[90m' + deploymentInfo + '\x1b[0m');
    console.log('\x1b[37m' + connectionInfo + '\x1b[0m');
    console.log('\x1b[37m' + liveStatus + '\x1b[0m');
    console.log('\x1b[37m' + logsSection + '\x1b[0m');
    console.log('\x1b[90m' + footer + '\x1b[0m');
  }

  start() {
    // Initial render
    this.render();
    
    // Update every 5 seconds
    this.interval = setInterval(() => {
      this.render();
    }, 5000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  addLog(level, message, meta = {}) {
    // Add log to internal storage
    const logEntry = {
      time: new Date().toLocaleTimeString(),
      level: level,
      message: message,
      meta: meta
    };
    
    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Update stats
    if (level === 'error') {
      this.stats.errors++;
    }
    
    if (message.includes('API') || message.includes('request')) {
      this.stats.apiCalls++;
      this.stats.lastApiCall = new Date().toLocaleTimeString();
    }
    
    // Update display after logging
    setTimeout(() => this.render(), 100);
  }

  log(level, message, meta = {}) {
    this.addLog(level, message, meta);
  }
}

module.exports = ASCIIDashboard;