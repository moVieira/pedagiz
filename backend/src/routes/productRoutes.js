const router = require('express').Router();
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { authRequired } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/', productController.list);
router.get('/:slug', productController.getBySlug);
router.post(
  '/',
  authRequired,
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  productController.create
);
router.post('/:productId/reviews', authRequired, reviewController.create);

module.exports = router;