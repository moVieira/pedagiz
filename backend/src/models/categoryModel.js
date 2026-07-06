const db = require('../config/database');

async function findAll() {
  const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
  return rows;
}

module.exports = { findAll };
