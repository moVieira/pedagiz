const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads'));
  },
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${unique}${path.extname(file.originalname)}`);
  }
});

// Sem isso, dava pra enviar qualquer tipo de arquivo (inclusive .html/.svg,
// que o navegador pode executar como script se alguém abrir o link direto
// em /uploads). Só administradores chegam nesse upload, mas não custa
// restringir aos tipos que a loja realmente usa.
const ALLOWED_COVER_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const ALLOWED_MATERIAL_EXT = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.zip'];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = file.fieldname === 'cover' ? ALLOWED_COVER_EXT : ALLOWED_MATERIAL_EXT;
  if (!allowed.includes(ext)) {
    const err = new Error(`Tipo de arquivo não permitido: ${ext || '(sem extensão)'}`);
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter
});

module.exports = upload;
