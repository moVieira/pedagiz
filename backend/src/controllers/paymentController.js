const { Order } = require('mercadopago');
const orderModel = require('../models/orderModel');
const mpClient = require('../config/mercadopago');

/**
 * Webhook do Mercado Pago (Orders API). Sempre responde 200 (mesmo em erro
 * interno) para evitar reenvios indefinidos da notificação pelo MP.
 */
async function webhook(req, res) {
  try {
    const type = req.body?.type || req.query.type;
    const mpOrderId = req.body?.data?.id || req.query['data.id'];

    if (type !== 'order' || !mpOrderId) {
      return res.sendStatus(200);
    }

    const order = new Order(mpClient);
    const result = await order.get({ id: mpOrderId });

    const orderId = result.external_reference;
    if (orderId && result.status === 'processed') {
      await orderModel.markAsPaid(orderId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[payments/webhook] erro ao processar notificação:', err);
    res.sendStatus(200);
  }
}

module.exports = { webhook };