const router = require('express').Router();
const favoriteController = require('../controllers/favoriteController');
const { authRequired } = require('../middlewares/authMiddleware');

router.use(authRequired);
router.get('/', favoriteController.list);
router.post('/:productId', favoriteController.add);
router.delete('/:productId', favoriteController.remove);

module.exports = router;