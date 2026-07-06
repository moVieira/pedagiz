const db = require('../config/database');

async function findBySlug(slug) {
  const [rows] = await db.query(
    `SELECT cp.*, u.name AS owner_name, u.email AS owner_email,
            (SELECT COUNT(*) FROM products p WHERE p.creator_id = cp.id AND p.active = 1) AS product_count,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.creator_id = cp.id) AS sales_count,
            (SELECT COALESCE(AVG(r.rating), 0)
               FROM reviews r
               JOIN products p ON p.id = r.product_id
              WHERE p.creator_id = cp.id) AS rating
     FROM creator_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.slug = ?`,
    [slug]
  );
  return rows[0];
}

async function findByUserId(userId) {
  const [rows] = await db.query('SELECT * FROM creator_profiles WHERE user_id = ?', [userId]);
  return rows[0];
}

async function findAllFeatured(limit = 3) {
  const [rows] = await db.query(
    `SELECT cp.*,
            (SELECT COUNT(*) FROM products p WHERE p.creator_id = cp.id AND p.active = 1) AS product_count,
            (SELECT COALESCE(AVG(r.rating), 0)
               FROM reviews r
               JOIN products p ON p.id = r.product_id
              WHERE p.creator_id = cp.id) AS rating
     FROM creator_profiles cp
     ORDER BY cp.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

async function create({ userId, storeName, slug, bio, location, categoryLabel }) {
  const [result] = await db.query(
    `INSERT INTO creator_profiles (user_id, store_name, slug, bio, location, category_label)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, storeName, slug, bio, location, categoryLabel]
  );
  return result.insertId;
}

module.exports = { findBySlug, findByUserId, findAllFeatured, create };
