const db = require('../config/database');

async function findByProduct(productId) {
  const [rows] = await db.query(
    'SELECT id, product_id, image_path, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
    [productId]
  );
  return rows;
}

async function insertMany(productId, imagePaths) {
  if (!imagePaths.length) return;
  const existing = await findByProduct(productId);
  let order = existing.length;
  const values = imagePaths.map((path) => [productId, path, order++]);
  await db.query('INSERT INTO product_images (product_id, image_path, sort_order) VALUES ?', [values]);
}

async function findById(imageId) {
  const [rows] = await db.query('SELECT * FROM product_images WHERE id = ?', [imageId]);
  return rows[0];
}

async function remove(imageId) {
  await db.query('DELETE FROM product_images WHERE id = ?', [imageId]);
}

module.exports = { findByProduct, insertMany, findById, remove };
