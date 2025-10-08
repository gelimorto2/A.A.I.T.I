/**
 * Base Repository Class
 * Provides common database operations for all repositories
 */

const knex = require('knex');
const knexConfig = require('../knexfile');

// Initialize knex with appropriate config
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];
const db = knex(config);

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = db;
  }

  /**
   * Find all records
   */
  async findAll(conditions = {}, options = {}) {
    let query = this.db(this.tableName);
    
    if (Object.keys(conditions).length > 0) {
      query = query.where(conditions);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.offset(options.offset);
    }
    
    if (options.orderBy) {
      query = query.orderBy(options.orderBy.column, options.orderBy.direction || 'asc');
    }
    
    return await query;
  }

  /**
   * Find single record by ID
   */
  async findById(id) {
    return await this.db(this.tableName).where({ id }).first();
  }

  /**
   * Find single record by conditions
   */
  async findOne(conditions) {
    return await this.db(this.tableName).where(conditions).first();
  }

  /**
   * Create new record
   */
  async create(data) {
    // Generate UUID for id if not provided
    if (!data.id) {
      data.id = this.generateUUID();
    }
    
    const [result] = await this.db(this.tableName).insert(data).returning('*');
    return result || data; // SQLite doesn't support returning, so return the data
  }

  /**
   * Update record by ID
   */
  async update(id, data) {
    data.updated_at = new Date();
    
    const updated = await this.db(this.tableName)
      .where({ id })
      .update(data);
    
    if (updated) {
      return await this.findById(id);
    }
    
    return null;
  }

  /**
   * Delete record by ID
   */
  async delete(id) {
    return await this.db(this.tableName).where({ id }).del();
  }

  /**
   * Count records
   */
  async count(conditions = {}) {
    const result = await this.db(this.tableName)
      .where(conditions)
      .count('* as count')
      .first();
    
    return parseInt(result.count);
  }

  /**
   * Check if record exists
   */
  async exists(conditions) {
    const count = await this.count(conditions);
    return count > 0;
  }

  /**
   * Generate UUID (simple implementation for SQLite compatibility)
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Begin transaction
   */
  async beginTransaction() {
    return await this.db.transaction();
  }

  /**
   * Execute query within transaction
   */
  async withTransaction(callback) {
    return await this.db.transaction(callback);
  }

  /**
   * Raw query execution
   */
  async raw(query, bindings = []) {
    return await this.db.raw(query, bindings);
  }

  /**
   * Get database client for complex queries
   */
  getClient() {
    return this.db;
  }
}

module.exports = BaseRepository;