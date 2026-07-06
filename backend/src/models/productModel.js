const db = require('../config/database');

const BASE_SELECT = `
  SELECT p.id, p.title, p.slug, p.description, p.price, p.file_type, p.cover_image, p.created_at,
         c.name AS category_name, c.slug AS category_slug,
         cp.id AS creator_id, cp.store_name AS creator_name, cp.slug AS creator_slug,
         COALESCE(AVG(r.rating), 0) AS rating,
         COUNT(DISTINCT r.id) AS rating_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  JOIN creator_profiles cp ON cp.id = p.creator_id
  LEFT JOIN reviews r ON r.product_id = p.id
`;

async function findAll({ categoryId, creatorId } = {}) {
  let sql = `${BASE_SELECT} WHERE p.active = 1`;
  const params = [];

  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (creatorId) {
    sql += ' AND p.creator_id = ?';
    params.push(creatorId);
  }

  sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findBySlug(slug) {
  const [rows] = await db.query(
    `${BASE_SELECT} WHERE p.slug = ? AND p.active = 1 GROUP BY p.id`,
    [slug]
  );
  return rows[0];
}

async function findById(id) {
  const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0];
}

async function create({ creatorId, title, slug, description, price, categoryId, fileType, coverImage, filePath }) {
  const [result] = await db.query(
    `INSERT INTO products (creator_id, title, slug, description, price, category_id, file_type, cover_image, file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [creatorId, title, slug, description, price, categoryId, fileType, coverImage, filePath]
  );
  return result.insertId;
}

module.exports = { findAll, findBySlug, findById, create };
