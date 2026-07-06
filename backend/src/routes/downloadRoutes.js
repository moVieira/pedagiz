const router = require('express').Router();
const downloadController = require('../controllers/downloadController');
const { authRequired } = require('../middlewares/authMiddleware');

router.use(authRequired);
router.get('/', downloadController.myDownloads);
router.get('/:token/file', downloadController.getFile);

module.exports = router;