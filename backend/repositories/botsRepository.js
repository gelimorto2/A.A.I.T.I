const BaseRepository = require('./baseRepository');
const databaseConfig = require('../config/database');

class BotsRepository extends BaseRepository {
  constructor() {
    super('bots');
  }

  async findOwnedByUser(botId, userId) {
    if (databaseConfig.type === 'postgresql') {
      const { rows } = await databaseConfig.query('SELECT id FROM bots WHERE id = $1 AND user_id = $2', [botId, userId]);
      return rows[0] || null;
    } else {
      const { rows } = await databaseConfig.query('SELECT id FROM bots WHERE id = ? AND user_id = ?', [botId, userId]);
      return rows[0] || null;
    }
  }
}

module.exports = new BotsRepository();
