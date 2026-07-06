const db = require('../config/database');

async function add(userId, productId) {
  await db.query(
    'INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)',
    [userId, productId]
  );
}

async function remove(userId, productId) {
  await db.query('DELETE FROM favorites WHERE user_id = ? AND product_id = ?', [userId, productId]);
}

async function findByUser(userId) {
  const [rows] = await db.query(
    `SELECT p.id, p.title, p.slug, p.price, p.cover_image
     FROM favorites f
     JOIN products p ON p.id = f.product_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = { add, remove, findByUser };
