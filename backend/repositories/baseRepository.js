const databaseConfig = require('../config/database');

class BaseRepository {
  constructor(tableName) {
    this.table = tableName;
  }

  async findById(id) {
    if (databaseConfig.type === 'postgresql') {
      const { rows } = await databaseConfig.query(`SELECT * FROM ${this.table} WHERE id = $1`, [id]);
      return rows[0] || null;
    } else {
      const { rows } = await databaseConfig.query(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
      return rows[0] || null;
    }
  }

  async list(limit = 100, offset = 0) {
    if (databaseConfig.type === 'postgresql') {
      const { rows } = await databaseConfig.query(`SELECT * FROM ${this.table} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      return rows;
    } else {
      const { rows } = await databaseConfig.query(`SELECT * FROM ${this.table} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
      return rows;
    }
  }
}

module.exports = BaseRepository;
