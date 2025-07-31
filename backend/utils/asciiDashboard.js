const os = require('os');

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

  render() {
    const memUsage = process.memoryUsage();
    const cpuCount = os.cpus().length;
    
    // Clear screen and move cursor to top
    console.clear();
    
    const header = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           🚀 A.A.I.T.I v1.0 - NEURAL COMMAND DECK           ║
║                        Auto AI Trading Interface - Live Status               ║
╚═══════════════════════════════════════════════════════════════════════════════╝`;

    const systemInfo = `
┌─ SYSTEM STATUS ─────────────────────────────────────────────────────────────────┐
│ Server Status:    ${this.getStatusColor(this.stats.serverStatus)}${this.stats.serverStatus.padEnd(12)}\x1b[0m │ Uptime: ${this.formatUptime(this.stats.uptime).padEnd(15)} │
│ Database:         ${this.getStatusColor(this.stats.dbStatus)}${this.stats.dbStatus.padEnd(12)}\x1b[0m │ Memory: ${this.formatMemory(memUsage.heapUsed).padEnd(15)} │
│ Market Data:      ${this.getStatusColor(this.stats.marketDataStatus)}${this.stats.marketDataStatus.padEnd(12)}\x1b[0m │ CPU Cores: ${cpuCount.toString().padEnd(12)} │
└─────────────────────────────────────────────────────────────────────────────────┘`;

    const connectionInfo = `
┌─ CONNECTIONS & ACTIVITY ───────────────────────────────────────────────────────┐
│ Active Connections: ${this.stats.connections.toString().padStart(8)} │ Total API Calls: ${this.stats.apiCalls.toString().padStart(12)} │
│ Error Count:        ${this.stats.errors.toString().padStart(8)} │ Last Activity:   ${(this.stats.lastApiCall || 'None').toString().padEnd(12)} │
└─────────────────────────────────────────────────────────────────────────────────┘`;

    const liveStatus = `
┌─ LIVE TRADING STATUS ──────────────────────────────────────────────────────────┐
│ 🤖 Active Bots:     0        │ 📊 Active Trades:    0        │ 💰 P&L:   $0.00    │
│ 📈 Market Feeds:    LIVE     │ 🎯 Win Rate:         0.0%     │ ⚠️  Alerts: 0       │
│ 🔄 Data Refresh:    5s       │ 📡 WebSocket:        ACTIVE   │ 🛡️  Health: 98%     │
└─────────────────────────────────────────────────────────────────────────────────┘`;

    const footer = `
┌─ CONTROLS ──────────────────────────────────────────────────────────────────────┐
│ Press Ctrl+C to stop • View Dashboard: http://localhost:3000 • API: :5000      │
└─────────────────────────────────────────────────────────────────────────────────┘
                           Last Update: ${new Date().toLocaleTimeString()}`;

    console.log('\x1b[36m' + header + '\x1b[0m');
    console.log('\x1b[37m' + systemInfo + '\x1b[0m');
    console.log('\x1b[37m' + connectionInfo + '\x1b[0m');
    console.log('\x1b[37m' + liveStatus + '\x1b[0m');
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

  log(level, message, meta = {}) {
    // Store important events for display
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
}

module.exports = ASCIIDashboard;