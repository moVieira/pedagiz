const db = require('../config/database');
const crypto = require('crypto');
const userModel = require('./userModel');
const { sendPurchaseEmail } = require('../services/emailService');

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

  const [items] = await db.query(
    `SELECT oi.product_id, p.title
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );

  const emailItems = [];
  for (const item of items) {
    // Acesso é vitalício por produto — se o usuário já comprou esse material
    // antes (outro pedido), reaproveita o token existente em vez de duplicar.
    const [existing] = await db.query(
      'SELECT download_token FROM downloads WHERE user_id = ? AND product_id = ?',
      [order.user_id, item.product_id]
    );

    let token = existing[0]?.download_token;
    if (!token) {
      token = crypto.randomBytes(24).toString('hex');
      await db.query(
        'INSERT INTO downloads (user_id, product_id, download_token) VALUES (?, ?, ?)',
        [order.user_id, item.product_id, token]
      );
    }

    emailItems.push({ title: item.title, downloadToken: token });
  }

  const user = await userModel.findById(order.user_id);
  if (user) {
    // Não deixa uma falha no envio de e-mail derrubar a confirmação do
    // pagamento — o pedido já está pago e os downloads já foram liberados.
    sendPurchaseEmail({ to: user.email, name: user.name, orderId, items: emailItems })
      .catch((err) => console.error('[email] falha ao enviar material por e-mail:', err));
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
