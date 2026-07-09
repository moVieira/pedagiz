const router = require('express').Router();
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { authRequired, adminRequired } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/', productController.list);
router.get('/:slug', productController.getBySlug);
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
router.post('/:productId/reviews', authRequired, reviewController.create);

module.exports = router;