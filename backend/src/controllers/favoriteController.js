const favoriteModel = require('../models/favoriteModel');

async function list(req, res, next) {
  try {
    const favorites = await favoriteModel.findByUser(req.user.id);
    res.json({ favorites });
  } catch (err) {
    next(err);
  }
}

async function add(req, res, next) {
  try {
    await favoriteModel.add(req.user.id, req.params.productId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await favoriteModel.remove(req.user.id, req.params.productId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, add, remove };
