const router = require('express').Router();
const creatorController = require('../controllers/creatorController');
const { authRequired } = require('../middlewares/authMiddleware');

router.get('/featured', creatorController.featured);
router.get('/me', authRequired, creatorController.me);
router.get('/:slug', creatorController.getBySlug);
router.post('/', authRequired, creatorController.create);
router.post('/:creatorId/follow', authRequired, creatorController.follow);
router.delete('/:creatorId/follow', authRequired, creatorController.unfollow);

module.exports = router;