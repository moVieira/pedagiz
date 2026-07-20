const path = require('path');
const downloadModel = require('../models/downloadModel');

async function myDownloads(req, res, next) {
  try {
    const downloads = await downloadModel.findByUser(req.user.id);
    res.json({ downloads });
  } catch (err) {
    next(err);
  }
}

// O título do produto não tem extensão (ex: "Calendário da Turma") — sem
// isso no nome sugerido pro download, o navegador/SO não reconhece o
// arquivo como PDF. Usa a extensão de verdade do arquivo salvo no servidor.
function downloadFilename(download) {
  const ext = path.extname(download.file_path);
  return download.title.toLowerCase().endsWith(ext.toLowerCase()) ? download.title : `${download.title}${ext}`;
}

async function getFile(req, res, next) {
  try {
    const download = await downloadModel.findByToken(req.params.token);
    if (!download || download.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Download não encontrado' });
    }

    const filePath = path.join(__dirname, '..', '..', download.file_path);
    res.download(filePath, downloadFilename(download));
  } catch (err) {
    next(err);
  }
}

// Usado pelo link enviado por e-mail após a compra — sem login, o próprio
// token (aleatório e não listado em lugar nenhum) é a credencial de acesso.
async function getPublicFile(req, res, next) {
  try {
    const download = await downloadModel.findByToken(req.params.token);
    if (!download) return res.status(404).json({ error: 'Download não encontrado' });

    const filePath = path.join(__dirname, '..', '..', download.file_path);
    res.download(filePath, downloadFilename(download));
  } catch (err) {
    next(err);
  }
}

module.exports = { myDownloads, getFile, getPublicFile };