const ServiceBase = require('../shared/serviceBase');
const DatabaseManager = require('../shared/database/manager');
const serviceDiscovery = require('../shared/utils/serviceDiscovery');
const logger = require('../shared/utils/logger');
const authRoutes = require('./routes/auth');

require('dotenv').config();

class AuthService extends ServiceBase {
  constructor() {
    super('auth-service', process.env.PORT || 3001);
    this.db = new DatabaseManager('auth-service');
  }

  async initialize() {
    try {
      // Connect to database
      await this.db.connect();
      
      // Create auth tables
      await this.createTables();
      
      // Register routes
      this.addRoutes('/api/auth', authRoutes(this.db));
      
      // Register service with discovery
      await serviceDiscovery.registerService(
        'auth-service',
        process.env.SERVICE_HOST || 'localhost',
        this.port
      );
      
      logger.info('✅ Auth service initialized successfully', {
        service: 'auth-service'
      });
      
    } catch (error) {
      logger.error('❌ Failed to initialize auth service', {
        service: 'auth-service',
        error: error.message
      });
      throw error;
    }
  }

  async createTables() {
    const userTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const sessionTableSQL = `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address INET,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const permissionTableSQL = `
      CREATE TABLE IF NOT EXISTS user_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(100) NOT NULL,
        resource VARCHAR(100),
        granted_by UUID REFERENCES users(id),
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, permission, resource)
      )
    `;

    const indexSQL = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash)',
      'CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON user_permissions(user_id)'
    ];

    await this.db.createTables([
      userTableSQL,
      sessionTableSQL,
      permissionTableSQL,
      ...indexSQL
    ]);
  }

  async start() {
    await this.initialize();
    return super.start();
  }

  async stop() {
    await this.db.close();
    super.stop();
  }
}

// Start service if run directly
if (require.main === module) {
  const authService = new AuthService();
  
  authService.start().catch(error => {
    logger.error('❌ Failed to start auth service', {
      service: 'auth-service',
      error: error.message
    });
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => authService.stop());
  process.on('SIGINT', () => authService.stop());
}

module.exports = AuthService;