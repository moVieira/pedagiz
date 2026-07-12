const rateLimit = require('express-rate-limit');
const router = require('express').Router();
const authController = require('../controllers/authController');
const { authRequired } = require('../middlewares/authMiddleware');

// Limita tentativas de login/cadastro por IP pra dificultar força bruta e
// credential stuffing — 20 tentativas a cada 15 minutos é folgado o
// suficiente pra uso legítimo (mesmo com erro de digitação), mas trava um
// ataque automatizado.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', authRequired, authController.me);

module.exports = router;