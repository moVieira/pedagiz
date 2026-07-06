const router = require('express').Router();
const authController = require('../controllers/authController');
const { authRequired } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authRequired, authController.me);

module.exports = router;