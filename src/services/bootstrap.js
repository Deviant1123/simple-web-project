const bcrypt = require('bcrypt');
const { getPool } = require('./db');

async function ensureFirstRunAdmin() {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', ['ADMIN']);
  if (rows.length === 0) {
    await pool.query(
      'INSERT INTO users (username, password_hash, is_admin, is_locked, enforce_policy) VALUES (?, ?, 1, 0, 0)',
      ['ADMIN', '']
    );
  } else {
    // Ensure ADMIN is not subject to policy and not locked
    await pool.query('UPDATE users SET is_locked = 0, enforce_policy = 0 WHERE username = ?', ['ADMIN']);
  }
}

module.exports = { ensureFirstRunAdmin };


