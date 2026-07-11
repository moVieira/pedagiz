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

async function update(id, { storeName, slug, bio, location, categoryLabel, coverImage }) {
  await db.query(
    `UPDATE creator_profiles
        SET store_name = ?, slug = ?, bio = ?, location = ?, category_label = ?, cover_image = ?
      WHERE id = ?`,
    [storeName, slug, bio, location, categoryLabel, coverImage, id]
  );
}

/** Retorna o perfil de criador do usuário, criando um com valores padrão se ainda não existir. */
async function ensureForUser(userId, defaultName) {
  const existing = await findByUserId(userId);
  if (existing) return existing;

  const storeName = defaultName || 'Pedagix';
  let stripped = '';
  for (const ch of storeName.normalize('NFD')) {
    const code = ch.codePointAt(0);
    if (code >= 0x0300 && code <= 0x036f) continue;
    stripped += ch;
  }
  const slug = stripped
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'pedagix';

  const id = await create({ userId, storeName, slug, bio: '', location: '', categoryLabel: '' });
  return findByUserId(userId) || { id, user_id: userId, store_name: storeName, slug };
}

module.exports = { findBySlug, findByUserId, findAllFeatured, create, update, ensureForUser };
