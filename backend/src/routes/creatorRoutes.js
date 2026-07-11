const router = require('express').Router();
const creatorController = require('../controllers/creatorController');
const { authRequired, adminRequired } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/featured', creatorController.featured);
router.get('/me', authRequired, creatorController.me);
router.put('/me', authRequired, adminRequired, upload.single('cover'), creatorController.updateMe);
router.get('/:slug', creatorController.getBySlug);
router.post('/', authRequired, adminRequired, creatorController.create);
router.post('/:creatorId/follow', authRequired, creatorController.follow);
router.delete('/:creatorId/follow', authRequired, creatorController.unfollow);

module.exports = router;