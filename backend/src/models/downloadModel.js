const db = require('../config/database');

async function findByUser(userId) {
  // Um mesmo produto pode ter mais de um registro de download (compras
  // antigas, antes do acesso vitalício por produto virar regra) — aqui só
  // o mais recente de cada produto é exibido, sem apagar o histórico.
  const [rows] = await db.query(
    `SELECT d.id, d.download_token, d.created_at,
            p.id AS product_id, p.title, p.file_type, p.cover_image,
            cp.store_name AS creator_name
     FROM downloads d
     JOIN products p ON p.id = d.product_id
     JOIN creator_profiles cp ON cp.id = p.creator_id
     WHERE d.user_id = ?
       AND d.id = (SELECT MAX(d2.id) FROM downloads d2 WHERE d2.user_id = d.user_id AND d2.product_id = d.product_id)
     ORDER BY d.created_at DESC`,
    [userId]
  );
  return rows;
}

async function findByToken(token) {
  const [rows] = await db.query(
    `SELECT d.*, p.file_path, p.title
     FROM downloads d
     JOIN products p ON p.id = d.product_id
     WHERE d.download_token = ?`,
    [token]
  );
  return rows[0];
}

module.exports = { findByUser, findByToken };
