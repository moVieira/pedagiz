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
    `SELECT p.id, p.title, p.slug, p.price, p.file_type, p.cover_image,
            c.name AS category_name,
            cp.store_name AS creator_name, cp.slug AS creator_slug,
            COALESCE(AVG(r.rating), 0) AS rating
     FROM favorites f
     JOIN products p ON p.id = f.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     JOIN creator_profiles cp ON cp.id = p.creator_id
     LEFT JOIN reviews r ON r.product_id = p.id
     WHERE f.user_id = ?
     GROUP BY p.id, f.created_at
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = { add, remove, findByUser };
