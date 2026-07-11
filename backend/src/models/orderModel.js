const db = require('../config/database');
const crypto = require('crypto');

async function createOrder(userId, items, paymentMethod = 'pix') {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const total = items.reduce((sum, item) => sum + Number(item.price), 0);

    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total, status, payment_method) VALUES (?, ?, ?, ?)',
      [userId, total, 'pendente', paymentMethod]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, creator_id, price) VALUES (?, ?, ?, ?)',
        [orderId, item.productId, item.creatorId, item.price]
      );
    }

    await connection.commit();
    return orderId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function setPixCharge(orderId, { mpPaymentId, qrCode, qrCodeBase64 }) {
  await db.query(
    'UPDATE orders SET mp_payment_id = ?, pix_qr_code = ?, pix_qr_code_base64 = ? WHERE id = ?',
    [mpPaymentId, qrCode, qrCodeBase64, orderId]
  );
}

async function findById(orderId) {
  const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return rows[0];
}

async function markAsPaid(orderId) {
  const order = await findById(orderId);
  if (!order) return null;
  if (order.status === 'pago') return order;

  await db.query('UPDATE orders SET status = ? WHERE id = ?', ['pago', orderId]);

  const [items] = await db.query('SELECT product_id FROM order_items WHERE order_id = ?', [orderId]);
  for (const item of items) {
    const token = crypto.randomBytes(24).toString('hex');
    await db.query(
      'INSERT INTO downloads (user_id, product_id, download_token) VALUES (?, ?, ?)',
      [order.user_id, item.product_id, token]
    );
  }

  return order;
}

async function findByUser(userId) {
  const [rows] = await db.query(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function findItemsByOrder(orderId) {
  const [rows] = await db.query(
    `SELECT oi.product_id, oi.price, p.title, p.slug, p.cover_image
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  return rows;
}

async function cancelOrder(orderId) {
  await db.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelado', orderId]);
}

module.exports = { createOrder, setPixCharge, findById, markAsPaid, findByUser, findItemsByOrder, cancelOrder };
