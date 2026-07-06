const router = require('express').Router();
const paymentController = require('../controllers/paymentController');

// Endpoint de notificação (webhook) do Mercado Pago.
router.post('/webhook', paymentController.webhook);

module.exports = router;