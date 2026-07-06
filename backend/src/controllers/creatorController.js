const creatorModel = require('../models/creatorModel');
const productModel = require('../models/productModel');
const followModel = require('../models/followModel');

async function featured(req, res, next) {
  try {
    const creators = await creatorModel.findAllFeatured(3);
    res.json({ creators });
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const creator = await creatorModel.findBySlug(req.params.slug);
    if (!creator) return res.status(404).json({ error: 'Loja não encontrada' });

    const products = await productModel.findAll({ creatorId: creator.id });
    res.json({ creator, products });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const creator = await creatorModel.findByUserId(req.user.id);
    res.json({ creator: creator || null });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const existing = await creatorModel.findByUserId(req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'Você já tem uma loja' });
    }

    const { storeName, slug, bio, location, categoryLabel } = req.body;
    const id = await creatorModel.create({
      userId: req.user.id, storeName, slug, bio, location, categoryLabel
    });
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
}

async function follow(req, res, next) {
  try {
    await followModel.follow(req.user.id, req.params.creatorId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function unfollow(req, res, next) {
  try {
    await followModel.unfollow(req.user.id, req.params.creatorId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { featured, getBySlug, me, create, follow, unfollow };
