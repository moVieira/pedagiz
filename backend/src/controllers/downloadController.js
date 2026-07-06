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

async function getFile(req, res, next) {
  try {
    const download = await downloadModel.findByToken(req.params.token);
    if (!download || download.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Download não encontrado' });
    }

    const filePath = path.join(__dirname, '..', '..', download.file_path);
    res.download(filePath, download.title);
  } catch (err) {
    next(err);
  }
}

module.exports = { myDownloads, getFile };