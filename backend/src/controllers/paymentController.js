const crypto = require('crypto');
const { Order } = require('mercadopago');
const orderModel = require('../models/orderModel');
const mpClient = require('../config/mercadopago');

/**
 * Valida a notificação usando o esquema oficial do Mercado Pago: o header
 * x-signature traz "ts=...,v1=<hmac>" e o hash é calculado sobre
 * "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (data.id em minúsculo,
 * sempre lido da query string, não do body). Sem MP_WEBHOOK_SECRET configurado
 * (webhook ainda não cadastrado no painel) a validação é pulada, só com aviso.
 */
function isValidSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[payments/webhook] MP_WEBHOOK_SECRET não configurado — pulando validação de assinatura.');
    return true;
  }

  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  const dataId = req.query['data.id'];
  if (!xSignature || !dataId) return false;

  let ts;
  let hash;
  xSignature.split(',').forEach((part) => {
    const [key, value] = part.split('=').map((s) => s?.trim());
    if (key === 'ts') ts = value;
    if (key === 'v1') hash = value;
  });
  if (!ts || !hash) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return expected === hash;
}

/**
 * Webhook do Mercado Pago (Orders API). Sempre responde 200 (mesmo em erro
 * interno) para evitar reenvios indefinidos da notificação pelo MP.
 */
async function webhook(req, res) {
  try {
    if (!isValidSignature(req)) {
      console.warn('[payments/webhook] assinatura inválida, notificação ignorada.');
      return res.sendStatus(401);
    }

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