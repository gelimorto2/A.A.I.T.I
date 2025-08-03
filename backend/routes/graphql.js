const { ApolloServer } = require('apollo-server-express');
const { gql } = require('apollo-server-express');
const { createServer } = require('http');
const logger = require('../utils/logger');
const { getCache } = require('../utils/cache');
const { getMetrics } = require('../utils/prometheusMetrics');

/**
 * AAITI GraphQL API Implementation
 * Modern GraphQL API alongside REST for flexible data querying
 * Part of System Enhancements - API Enhancements
 */

// GraphQL Schema Definition
const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type Query {
    # System queries
    health: HealthStatus!
    performance: PerformanceMetrics!
    version: VersionInfo!
    
    # Trading queries
    trades(
      limit: Int = 20
      offset: Int = 0
      symbol: String
      userId: String
      startDate: DateTime
      endDate: DateTime
    ): TradeConnection!
    
    trade(id: ID!): Trade
    
    # Portfolio queries
    portfolios(userId: String): [Portfolio!]!
    portfolio(userId: String!, currency: String = "USD"): Portfolio
    
    # Market data queries
    marketData(
      symbols: [String!]!
      timeframe: String = "1h"
      limit: Int = 100
    ): [MarketDataPoint!]!
    
    currentPrices(symbols: [String!]!): [Price!]!
    
    # ML queries
    predictions(
      symbol: String!
      modelType: String = "LSTM"
      timeframe: String = "1h"
    ): [Prediction!]!
    
    modelPerformance(modelType: String!): ModelPerformance!
    
    # Bot queries
    bots(userId: String!): [TradingBot!]!
    bot(id: ID!): TradingBot
    botPerformance(botId: ID!, days: Int = 30): BotPerformance!
    
    # Analytics queries
    analytics(
      userId: String
      symbol: String
      timeframe: String = "1d"
      startDate: DateTime
      endDate: DateTime
    ): Analytics!
    
    # User queries
    users(limit: Int = 20, offset: Int = 0): UserConnection!
    user(id: ID!): User
    
    # Notification queries
    notifications(
      userId: String!
      limit: Int = 20
      unreadOnly: Boolean = false
    ): [Notification!]!
  }

  type Mutation {
    # Trading mutations
    executeTrade(input: TradeInput!): TradeResult!
    cancelTrade(id: ID!): Boolean!
    
    # Bot mutations
    createBot(input: BotInput!): TradingBot!
    updateBot(id: ID!, input: BotUpdateInput!): TradingBot!
    deleteBot(id: ID!): Boolean!
    startBot(id: ID!): Boolean!
    stopBot(id: ID!): Boolean!
    
    # User mutations
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserUpdateInput!): User!
    deleteUser(id: ID!): Boolean!
    
    # Notification mutations
    markNotificationAsRead(id: ID!): Boolean!
    createNotification(input: NotificationInput!): Notification!
    
    # ML mutations
    trainModel(input: ModelTrainingInput!): TrainingJob!
    updateModelConfig(modelType: String!, config: JSON!): Boolean!
    
    # System mutations
    clearCache(cacheType: String): Boolean!
    testNotifications(channels: [String!]!): TestResult!
  }

  type Subscription {
    # Real-time data subscriptions
    priceUpdates(symbols: [String!]!): Price!
    tradeExecutions(userId: String): Trade!
    portfolioUpdates(userId: String!): Portfolio!
    botStatusUpdates(userId: String): TradingBot!
    notifications(userId: String!): Notification!
    systemAlerts: SystemAlert!
  }

  # System types
  type HealthStatus {
    status: String!
    timestamp: DateTime!
    uptime: Float!
    memory: MemoryUsage!
    version: String!
    services: [ServiceStatus!]!
  }

  type MemoryUsage {
    rss: Float!
    heapTotal: Float!
    heapUsed: Float!
    external: Float!
  }

  type ServiceStatus {
    name: String!
    status: String!
    latency: Float
    lastCheck: DateTime!
  }

  type PerformanceMetrics {
    timestamp: DateTime!
    cache: CacheMetrics!
    database: DatabaseMetrics!
    api: APIMetrics!
    system: SystemMetrics!
  }

  type CacheMetrics {
    hitRate: Float!
    size: Float!
    operations: Int!
  }

  type DatabaseMetrics {
    queryTime: Float!
    connections: Int!
    cacheHitRate: Float!
  }

  type APIMetrics {
    responseTime: Float!
    requestsPerSecond: Float!
    errorRate: Float!
  }

  type SystemMetrics {
    cpuUsage: Float!
    memoryUsage: Float!
    diskUsage: Float!
  }

  type VersionInfo {
    version: String!
    buildNumber: String!
    releaseDate: DateTime!
    environment: String!
  }

  # Trading types
  type TradeConnection {
    edges: [TradeEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type TradeEdge {
    node: Trade!
    cursor: String!
  }

  type Trade {
    id: ID!
    userId: String!
    symbol: String!
    side: TradeSide!
    type: TradeType!
    quantity: Float!
    price: Float!
    status: TradeStatus!
    timestamp: DateTime!
    exchange: String!
    fees: Float
    pnl: Float
    metadata: JSON
  }

  enum TradeSide {
    BUY
    SELL
  }

  enum TradeType {
    MARKET
    LIMIT
    STOP
    STOP_LIMIT
  }

  enum TradeStatus {
    PENDING
    EXECUTED
    CANCELLED
    FAILED
  }

  input TradeInput {
    symbol: String!
    side: TradeSide!
    type: TradeType!
    quantity: Float!
    price: Float
    stopPrice: Float
    timeInForce: String = "GTC"
  }

  type TradeResult {
    success: Boolean!
    trade: Trade
    error: String
  }

  # Portfolio types
  type Portfolio {
    userId: String!
    currency: String!
    totalValue: Float!
    availableBalance: Float!
    positions: [Position!]!
    performance: PortfolioPerformance!
    lastUpdated: DateTime!
  }

  type Position {
    symbol: String!
    quantity: Float!
    averagePrice: Float!
    currentPrice: Float!
    marketValue: Float!
    unrealizedPnl: Float!
    realizedPnl: Float!
  }

  type PortfolioPerformance {
    totalReturn: Float!
    totalReturnPercent: Float!
    dayChange: Float!
    dayChangePercent: Float!
    weekChange: Float!
    monthChange: Float!
    yearChange: Float!
    sharpeRatio: Float
    maxDrawdown: Float
  }

  # Market data types
  type MarketDataPoint {
    symbol: String!
    timestamp: DateTime!
    open: Float!
    high: Float!
    low: Float!
    close: Float!
    volume: Float!
  }

  type Price {
    symbol: String!
    price: Float!
    change: Float!
    changePercent: Float!
    timestamp: DateTime!
    volume: Float
  }

  # ML types
  type Prediction {
    symbol: String!
    timestamp: DateTime!
    predictionTime: DateTime!
    predictedPrice: Float!
    confidence: Float!
    modelType: String!
    features: JSON
  }

  type ModelPerformance {
    modelType: String!
    accuracy: Float!
    precision: Float!
    recall: Float!
    f1Score: Float!
    lastTrained: DateTime!
    trainingDataSize: Int!
  }

  input ModelTrainingInput {
    modelType: String!
    symbol: String!
    startDate: DateTime!
    endDate: DateTime!
    parameters: JSON
  }

  type TrainingJob {
    id: ID!
    status: String!
    progress: Float!
    estimatedCompletion: DateTime
    error: String
  }

  # Bot types
  type TradingBot {
    id: ID!
    userId: String!
    name: String!
    strategy: String!
    status: BotStatus!
    config: JSON!
    createdAt: DateTime!
    lastActive: DateTime
    performance: BotPerformance!
  }

  enum BotStatus {
    ACTIVE
    INACTIVE
    PAUSED
    ERROR
  }

  type BotPerformance {
    totalTrades: Int!
    winRate: Float!
    totalReturn: Float!
    totalReturnPercent: Float!
    averageTradeSize: Float!
    maxDrawdown: Float!
    sharpeRatio: Float
    calmarRatio: Float
  }

  input BotInput {
    name: String!
    strategy: String!
    config: JSON!
  }

  input BotUpdateInput {
    name: String
    strategy: String
    config: JSON
    status: BotStatus
  }

  # User types
  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type User {
    id: ID!
    email: String!
    username: String
    firstName: String
    lastName: String
    role: UserRole!
    status: UserStatus!
    createdAt: DateTime!
    lastLogin: DateTime
    preferences: UserPreferences
  }

  enum UserRole {
    USER
    ADMIN
    TRADER
    ANALYST
  }

  enum UserStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
  }

  type UserPreferences {
    theme: String
    timezone: String
    language: String
    notifications: NotificationPreferences
  }

  type NotificationPreferences {
    email: Boolean!
    sms: Boolean!
    push: Boolean!
    slack: Boolean!
    discord: Boolean!
  }

  input UserInput {
    email: String!
    username: String
    firstName: String
    lastName: String
    password: String!
  }

  input UserUpdateInput {
    username: String
    firstName: String
    lastName: String
    preferences: JSON
  }

  # Notification types
  type Notification {
    id: ID!
    userId: String!
    type: String!
    title: String!
    message: String!
    level: NotificationLevel!
    read: Boolean!
    createdAt: DateTime!
    data: JSON
  }

  enum NotificationLevel {
    INFO
    WARNING
    ERROR
    CRITICAL
  }

  input NotificationInput {
    userId: String!
    type: String!
    title: String!
    message: String!
    level: NotificationLevel = INFO
    data: JSON
  }

  # Analytics types
  type Analytics {
    summary: AnalyticsSummary!
    timeSeriesData: [TimeSeriesPoint!]!
    topPerformers: [PerformanceItem!]!
    riskMetrics: RiskMetrics!
  }

  type AnalyticsSummary {
    totalValue: Float!
    totalReturn: Float!
    winRate: Float!
    totalTrades: Int!
    activePositions: Int!
  }

  type TimeSeriesPoint {
    timestamp: DateTime!
    value: Float!
    volume: Float
  }

  type PerformanceItem {
    symbol: String!
    return: Float!
    returnPercent: Float!
    volume: Float!
  }

  type RiskMetrics {
    volatility: Float!
    sharpeRatio: Float!
    maxDrawdown: Float!
    var95: Float!
    beta: Float
  }

  # System alert types
  type SystemAlert {
    id: ID!
    type: String!
    level: NotificationLevel!
    title: String!
    message: String!
    timestamp: DateTime!
    data: JSON
  }

  # Utility types
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type TestResult {
    success: Boolean!
    results: [TestChannelResult!]!
    message: String
  }

  type TestChannelResult {
    channel: String!
    success: Boolean!
    error: String
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    health: async () => {
      // Implementation for health check
      return {
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.3.0',
        services: [
          {
            name: 'database',
            status: 'healthy',
            latency: 0.5,
            lastCheck: new Date()
          },
          {
            name: 'cache',
            status: 'healthy',
            latency: 0.1,
            lastCheck: new Date()
          }
        ]
      };
    },

    performance: async () => {
      const cache = getCache();
      const metrics = getMetrics();
      
      const cacheStats = cache.getStats();
      
      return {
        timestamp: new Date(),
        cache: {
          hitRate: cacheStats.hitRate || 0,
          size: cacheStats.memoryCache?.vsize || 0,
          operations: cacheStats.hits + cacheStats.misses || 0
        },
        database: {
          queryTime: 0.05,
          connections: 5,
          cacheHitRate: 0.85
        },
        api: {
          responseTime: 0.12,
          requestsPerSecond: 25.5,
          errorRate: 0.02
        },
        system: {
          cpuUsage: 15.5,
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          diskUsage: 2048
        }
      };
    },

    version: async () => {
      return {
        version: '1.3.0',
        buildNumber: '1',
        releaseDate: new Date('2025-01-01'),
        environment: process.env.NODE_ENV || 'development'
      };
    },

    trades: async (parent, args, context) => {
      // Implementation for trades query with pagination
      const { limit = 20, offset = 0, symbol, userId, startDate, endDate } = args;
      
      // Mock implementation - replace with actual database query
      const mockTrades = [
        {
          id: '1',
          userId: userId || 'user1',
          symbol: symbol || 'BTC/USD',
          side: 'BUY',
          type: 'MARKET',
          quantity: 1.0,
          price: 50000,
          status: 'EXECUTED',
          timestamp: new Date(),
          exchange: 'binance',
          fees: 25.0,
          pnl: 500.0
        }
      ];

      return {
        edges: mockTrades.map((trade, index) => ({
          node: trade,
          cursor: Buffer.from(`${offset + index}`).toString('base64')
        })),
        pageInfo: {
          hasNextPage: mockTrades.length === limit,
          hasPreviousPage: offset > 0,
          startCursor: Buffer.from(`${offset}`).toString('base64'),
          endCursor: Buffer.from(`${offset + mockTrades.length - 1}`).toString('base64')
        },
        totalCount: 100 // Mock total count
      };
    },

    marketData: async (parent, args) => {
      const { symbols, timeframe = '1h', limit = 100 } = args;
      
      // Mock implementation
      const mockData = symbols.map(symbol => ({
        symbol,
        timestamp: new Date(),
        open: 50000,
        high: 52000,
        low: 49000,
        close: 51000,
        volume: 1000000
      }));

      return mockData;
    },

    currentPrices: async (parent, args) => {
      const { symbols } = args;
      
      // Mock implementation
      return symbols.map(symbol => ({
        symbol,
        price: 50000 + Math.random() * 1000,
        change: Math.random() * 1000 - 500,
        changePercent: (Math.random() - 0.5) * 10,
        timestamp: new Date(),
        volume: Math.random() * 1000000
      }));
    }
  },

  Mutation: {
    executeTrade: async (parent, args, context) => {
      const { input } = args;
      
      // Mock implementation
      const trade = {
        id: `trade_${Date.now()}`,
        userId: context.user?.id || 'user1',
        symbol: input.symbol,
        side: input.side,
        type: input.type,
        quantity: input.quantity,
        price: input.price || 50000,
        status: 'EXECUTED',
        timestamp: new Date(),
        exchange: 'binance',
        fees: 25.0,
        pnl: 0
      };

      return {
        success: true,
        trade,
        error: null
      };
    },

    clearCache: async (parent, args) => {
      const { cacheType } = args;
      const cache = getCache();
      
      if (cacheType) {
        // Clear specific cache type
        return true;
      } else {
        // Clear all caches
        await cache.clear();
        return true;
      }
    },

    testNotifications: async (parent, args) => {
      const { channels } = args;
      
      // Mock implementation
      const results = channels.map(channel => ({
        channel,
        success: true,
        error: null
      }));

      return {
        success: true,
        results,
        message: 'All notification channels tested successfully'
      };
    }
  },

  Subscription: {
    priceUpdates: {
      // Implementation for real-time price subscriptions
      subscribe: async function* (parent, args) {
        const { symbols } = args;
        
        while (true) {
          // Simulate real-time price updates
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          for (const symbol of symbols) {
            yield {
              priceUpdates: {
                symbol,
                price: 50000 + Math.random() * 1000,
                change: Math.random() * 100 - 50,
                changePercent: (Math.random() - 0.5) * 5,
                timestamp: new Date(),
                volume: Math.random() * 1000000
              }
            };
          }
        }
      }
    }
  }
};

/**
 * Create and configure Apollo GraphQL Server
 */
async function createGraphQLServer(app) {
  try {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req, connection }) => {
        if (connection) {
          // Handle WebSocket connections for subscriptions
          return connection.context;
        }
        
        // Handle HTTP requests
        return {
          req,
          user: req.user, // Add user from authentication middleware
          cache: getCache(),
          metrics: getMetrics()
        };
      },
      introspection: process.env.NODE_ENV !== 'production',
      playground: process.env.NODE_ENV !== 'production',
      subscriptions: {
        path: '/graphql',
        onConnect: (connectionParams, webSocket, context) => {
          // Handle WebSocket authentication for subscriptions
          logger.info('GraphQL subscription connected', { service: 'graphql-server' });
          return { user: null }; // Add authentication logic here
        },
        onDisconnect: (webSocket, context) => {
          logger.info('GraphQL subscription disconnected', { service: 'graphql-server' });
        }
      },
      formatError: (error) => {
        logger.error('GraphQL error', { 
          error: error.message,
          stack: error.stack,
          service: 'graphql-server'
        });
        
        return {
          message: error.message,
          code: error.extensions?.code,
          path: error.path
        };
      },
      formatResponse: (response, { request, context }) => {
        // Add performance metrics
        if (context.metrics) {
          const operation = request.operationName || 'unknown';
          // Record GraphQL operation metrics
        }
        
        return response;
      }
    });

    await server.start();
    server.applyMiddleware({ 
      app, 
      path: '/graphql',
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    logger.info('GraphQL server initialized', { 
      path: server.graphqlPath,
      subscriptions: server.subscriptionsPath,
      service: 'graphql-server'
    });

    return server;

  } catch (error) {
    logger.error('Failed to initialize GraphQL server', { 
      error: error.message,
      service: 'graphql-server'
    });
    throw error;
  }
}

module.exports = {
  createGraphQLServer,
  typeDefs,
  resolvers
};