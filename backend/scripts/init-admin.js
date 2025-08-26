#!/usr/bin/env node
/**
 * Initialize or update admin credentials and encrypted config.
 * - Ensures encrypted credentials.enc contains provided settings
 * - Ensures an admin user exists (creates or updates password)
 */
const { initializeDatabase } = require('../database/init');
const { loadCredentials, storeCredentials, getCredentials, updateCredentials } = require('../utils/credentials');
const bcrypt = require('bcryptjs');
const { db } = require('../database/init');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');

// Simple arg parser supporting --key=value or --key value forms
const rawArgs = process.argv.slice(2);
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
  const token = rawArgs[i];
  if (token.startsWith('--')) {
    const eqIdx = token.indexOf('=');
    if (eqIdx !== -1) {
      const k = token.substring(2, eqIdx);
      const v = token.substring(eqIdx + 1);
      args[k] = v;
    } else {
      const k = token.substring(2);
      const next = rawArgs[i + 1];
      if (next && !next.startsWith('--')) {
        args[k] = next;
        i++;
      } else {
        args[k] = true; // boolean flag
      }
    }
  }
}

const username = args.username || 'admin';
const email = args.email || 'admin@example.com';
const password = typeof args.password === 'string' ? args.password : 'ChangeMe123!';
const port = parseInt(args.port || '5000', 10);
// Support flags: --rotate-jwt or --rotateJwt
const rotateJwt = Boolean(args['rotate-jwt'] || args.rotateJwt || args.rotatejwt);

(async () => {
  try {
    await initializeDatabase();

    // Credentials
    let creds = loadCredentials() || {};
    if (!creds.security) creds.security = {};
    if (!creds.system) creds.system = {};

    if (rotateJwt || !creds.security.jwtSecret) {
      creds.security.jwtSecret = crypto.randomBytes(64).toString('hex');
    }
    creds.system.port = port;

    // Persist credentials
    storeCredentials(creds);

    // Ensure admin user in DB
    const passwordHash = await bcrypt.hash(password, 12);

    await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], (err, row) => {
        if (err) return reject(err);
        if (row) {
          // Update existing user
            db.run('UPDATE users SET username = ?, email = ?, password_hash = ?, role = ? WHERE id = ?', [
              username,
              email,
              passwordHash,
              'admin',
              row.id
            ], (err2) => err2 ? reject(err2) : resolve());
        } else {
          const id = uuid();
          db.run('INSERT INTO users (id, username, email, password_hash, role) VALUES (?,?,?,?,?)', [
            id,
            username,
            email,
            passwordHash,
            'admin'
          ], (err2) => err2 ? reject(err2) : resolve());
        }
      });
    });

    console.log(`✅ Admin setup complete for user '${username}' (${email}) on port ${port}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Admin setup failed:', e.message);
    process.exit(1);
  }
})();
