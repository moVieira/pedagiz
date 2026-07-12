const rateLimit = require('express-rate-limit');
const router = require('express').Router();
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { authRequired, adminRequired } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Rota pública (sem login) que cria conta/pedido e dispara e-mail — mesmo
// risco de abuso (spam) que registro/login, por isso o mesmo tipo de limite.
const claimFreeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }
});

router.get('/', productController.list);
router.get('/:slug', productController.getBySlug);
router.post('/:id/claim-free', claimFreeLimiter, productController.claimFree);
router.post(
  '/',
  authRequired,
  adminRequired,
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  productController.create
);
router.put(
  '/:id',
  authRequired,
  adminRequired,
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  productController.update
);
router.delete('/:id', authRequired, adminRequired, productController.remove);
router.post('/:productId/reviews', authRequired, reviewController.create);

module.exports = router;