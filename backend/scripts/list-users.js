#!/usr/bin/env node
/** Simple utility to list users for debugging login issues */
const { initializeDatabase } = require('../database/init');
const { db } = require('../database/init');
(async () => {
  try {
    await initializeDatabase();
    db.all('SELECT id, username, email, role, is_active, created_at, last_login FROM users', (err, rows) => {
      if (err) {
        console.error('Error querying users:', err.message);
        process.exit(1);
      }
      if (!rows || rows.length === 0) {
        console.log('No users found');
        process.exit(0);
      }
      console.table(rows.map(r => ({ id: r.id, username: r.username, email: r.email, role: r.role, active: r.is_active, created: r.created_at, last_login: r.last_login })));
      process.exit(0);
    });
  } catch (e) {
    console.error('Initialization failed:', e.message);
    process.exit(1);
  }
})();
