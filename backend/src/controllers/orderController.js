const crypto = require('crypto');
const { Order } = require('mercadopago');
const orderModel = require('../models/orderModel');
const productModel = require('../models/productModel');
const userModel = require('../models/userModel');
const mpClient = require('../config/mercadopago');

const PAYMENT_METHODS = ['pix', 'credito', 'debito', 'boleto'];

// Motivos de recusa mais comuns do Mercado Pago traduzidos. Qualquer código
// não mapeado cai na mensagem genérica da API mesmo.
const REJECTION_MESSAGES = {
  rejected_by_issuer: 'Pagamento recusado pelo banco emissor do cartão. Tente outro cartão ou outro método de pagamento.',
  cc_rejected_insufficient_amount: 'Cartão sem saldo/limite suficiente.',
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
  cc_rejected_bad_filled_date: 'Data de validade do cartão inválida.',
  cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
  cc_rejected_bad_filled_other: 'Dados do cartão inválidos.',
  cc_rejected_call_for_authorize: 'O banco exige que você autorize esse pagamento antes de tentar de novo.',
  cc_rejected_card_disabled: 'Cartão desabilitado. Entre em contato com o banco emissor.',
  cc_rejected_duplicated_payment: 'Já existe um pagamento igual a esse recente. Aguarde antes de tentar de novo.',
  cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente outro método de pagamento.',
  cc_rejected_max_attempts: 'Número máximo de tentativas atingido. Tente outro cartão.',
  cc_rejected_other_reason: 'Pagamento recusado pelo cartão. Tente outro cartão ou outro método de pagamento.'
};

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || 'Cliente';
  const last = parts.slice(1).join(' ') || first;
  return { first, last };
}

function validationError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function buildPaymentMethod(paymentMethod, card) {
  if (paymentMethod === 'pix') {
    return { id: 'pix', type: 'bank_transfer' };
  }
  if (paymentMethod === 'credito' || paymentMethod === 'debito') {
    if (!card?.token || !card?.paymentMethodId) {
      throw validationError('Dados do cartão incompletos');
    }
    return {
      id: card.paymentMethodId,
      type: paymentMethod === 'credito' ? 'credit_card' : 'debit_card',
      token: card.token,
      installments: Number(card.installments) || 1
      // issuer_id não é aceito pela Orders API (schema fechado) — mesmo
      // vindo preenchido pelo Card Payment Brick, não deve ser repassado.
    };
  }
  // boleto
  return { id: 'boleto', type: 'ticket' };
}

function buildPayer(paymentMethod, user, first, last, payerInput) {
  const payer = { email: user.email, first_name: first, last_name: last };

  if (paymentMethod === 'credito' || paymentMethod === 'debito' || paymentMethod === 'boleto') {
    if (!payerInput?.cpf) {
      throw validationError('CPF é obrigatório para este método de pagamento');
    }
    payer.identification = { type: 'CPF', number: String(payerInput.cpf).replace(/\D/g, '') };
  }

  if (paymentMethod === 'boleto') {
    const addr = payerInput?.address;
    if (!addr?.zipCode || !addr?.streetName || !addr?.streetNumber || !addr?.neighborhood || !addr?.city || !addr?.state) {
      throw validationError('Endereço completo é obrigatório para pagamento por boleto');
    }
    payer.address = {
      zip_code: addr.zipCode,
      street_name: addr.streetName,
      street_number: addr.streetNumber,
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state
    };
  }

  return payer;
}

async function checkout(req, res, next) {
  try {
    const { items, paymentMethod = 'pix', card, payer: payerInput } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Método de pagamento inválido' });
    }

    const resolvedItems = [];
    for (const item of items) {
      const product = await productModel.findById(item.productId);
      if (!product || !product.active) {
        return res.status(404).json({ error: `Produto ${item.productId} não encontrado` });
      }
      resolvedItems.push({ productId: product.id, creatorId: product.creator_id, price: product.price });
    }

    const orderId = await orderModel.createOrder(req.user.id, resolvedItems, paymentMethod);
    const total = resolvedItems.reduce((sum, item) => sum + Number(item.price), 0);
    const amount = total.toFixed(2);
    const user = await userModel.findById(req.user.id);
    const { first, last } = splitName(user.name);

    // API de Orders (v1/orders) — a API clássica de Payments não suporta
    // simular Pix em modo sandbox, só em produção.
    const order = new Order(mpClient);
    let result;
    try {
      const paymentMethodBody = buildPaymentMethod(paymentMethod, card);
      const payerBody = buildPayer(paymentMethod, user, first, last, payerInput);
      result = await order.create({
        body: {
          type: 'online',
          total_amount: amount,
          external_reference: String(orderId),
          processing_mode: 'automatic',
          transactions: {
            payments: [{ amount, payment_method: paymentMethodBody }]
          },
          payer: payerBody
        },
        requestOptions: { idempotencyKey: crypto.randomUUID() }
      });
    } catch (mpErr) {
      await orderModel.cancelOrder(orderId);
      if (mpErr.status === 400) throw mpErr; // erro de validação nossa, já formatado

      // O SDK do Mercado Pago não preenche err.message — o detalhe real
      // fica em err.errors[0].message, e pra recusa de pagamento o motivo
      // específico vem em err.errors[0].details[0] (ex: "PAY123: rejected_by_issuer").
      console.error('[checkout] erro do Mercado Pago:', JSON.stringify(mpErr.errors || mpErr, null, 2));
      const apiError = mpErr.errors?.[0];
      const rejectionReason = apiError?.details?.[0]?.split(': ').pop();
      const normalized = new Error(
        REJECTION_MESSAGES[rejectionReason] || apiError?.message || 'Não foi possível processar o pagamento no Mercado Pago'
      );
      normalized.status = apiError ? 400 : 502;
      throw normalized;
    }

    const paymentInfo = result.transactions?.payments?.[0]?.payment_method || {};
    await orderModel.setPixCharge(orderId, {
      mpPaymentId: result.id,
      qrCode: paymentInfo.qr_code || null,
      qrCodeBase64: paymentInfo.qr_code_base64 || null
    });

    // Cartão aprova de forma síncrona na criação do pedido — não dá pra
    // esperar o webhook pra liberar o download nesse caso.
    if (result.status === 'processed') {
      await orderModel.markAsPaid(orderId);
    }

    res.status(201).json({
      orderId,
      status: result.status,
      statusDetail: result.status_detail,
      method: paymentMethod,
      pix: paymentMethod === 'pix' ? {
        qrCode: paymentInfo.qr_code,
        qrCodeBase64: paymentInfo.qr_code_base64,
        ticketUrl: paymentInfo.ticket_url
      } : undefined,
      boleto: paymentMethod === 'boleto' ? {
        ticketUrl: paymentInfo.ticket_url,
        barcodeContent: paymentInfo.barcode_content,
        digitableLine: paymentInfo.digitable_line
      } : undefined
    });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order || order.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

async function myOrders(req, res, next) {
  try {
    const orders = await orderModel.findByUser(req.user.id);
    const withItems = await Promise.all(
      orders.map(async (order) => ({ ...order, items: await orderModel.findItemsByOrder(order.id) }))
    );
    res.json({ orders: withItems });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkout, getOrder, myOrders };