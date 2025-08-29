#!/usr/bin/env node
/**
 * Destructive reset: removes all users, audit logs, credentials & encryption key.
 * Next registered user will become admin (auto-promotion logic in /routes/auth.js).
 */
const fs = require('fs');
const path = require('path');

let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.error('Cannot load sqlite3. Ensure backend production dependencies are installed.');
  process.exit(1);
}

const candidateDbPaths = [
  process.env.DB_PATH,
  'backend/database/aaiti.sqlite',
  'backend/database/trading.db',
  '/app/backend/database/aaiti.sqlite',
  '/app/backend/database/trading.db',
  '/app/data/aaiti.sqlite'
].filter(Boolean);

let acted = false;
for (const p of candidateDbPaths) {
  if (fs.existsSync(p)) {
    try {
      const db = new sqlite3.Database(p);
      db.serialize(() => {
        db.run('DELETE FROM users', (err) => { if (err) console.warn('users table wipe issue (may not exist):', err.message); });
        db.run('DELETE FROM audit_logs', (err) => { if (err) console.warn('audit_logs wipe issue (may not exist):', err.message); });
      });
      db.close();
      console.log('Wiped users & audit_logs in', p);
      acted = true;
    } catch (e) {
      console.error('Failed operating on', p, e.message);
    }
  }
}

// Remove credentials & key
const credFile = path.join(__dirname,'..','config','credentials.enc');
const keyFile = path.join(__dirname,'..','config','encryption.key');
try { if (fs.existsSync(credFile)) { fs.unlinkSync(credFile); console.log('Removed credentials.enc'); } } catch(e){ console.error('Failed removing credentials.enc', e.message); }
try { if (fs.existsSync(keyFile)) { fs.unlinkSync(keyFile); console.log('Removed encryption.key'); } } catch(e){ console.error('Failed removing encryption.key', e.message); }

if (!acted) {
  console.error('No database file found; nothing wiped. Checked paths:', candidateDbPaths.join(', '));
  process.exit(2);
}

console.log('Reset complete. Next registered user will become admin.');
