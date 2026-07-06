const db = require('../config/database');

async function create({ productId, userId, rating, comment }) {
  const [result] = await db.query(
    `INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
    [productId, userId, rating, comment]
  );
  return result.insertId;
}

async function findByProduct(productId) {
  const [rows] = await db.query(
    `SELECT r.*, u.name AS user_name
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ?
     ORDER BY r.created_at DESC`,
    [productId]
  );
  return rows;
}

module.exports = { create, findByProduct };
