const router = require('express').Router();
const orderController = require('../controllers/orderController');
const { authRequired } = require('../middlewares/authMiddleware');

router.use(authRequired);
router.post('/checkout', orderController.checkout);
router.get('/', orderController.myOrders);
router.get('/:id', orderController.getOrder);

module.exports = router;