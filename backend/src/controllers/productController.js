const productModel = require('../models/productModel');
const reviewModel = require('../models/reviewModel');
const categoryModel = require('../models/categoryModel');
const creatorModel = require('../models/creatorModel');

async function list(req, res, next) {
  try {
    let categoryId = null;
    if (req.query.category) {
      const categories = await categoryModel.findAll();
      categoryId = categories.find((c) => c.slug === req.query.category)?.id || null;
    }
    const products = await productModel.findAll({ categoryId });
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const product = await productModel.findBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    const reviews = await reviewModel.findByProduct(product.id);
    res.json({ product, reviews });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const creator = await creatorModel.ensureForUser(req.user.id, req.user.name);

    const file = req.files?.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'O arquivo do produto é obrigatório' });
    }
    const cover = req.files?.cover?.[0];

    const { title, slug, description, price, categoryId, fileType } = req.body;
    const id = await productModel.create({
      creatorId: creator.id,
      title,
      slug,
      description,
      price,
      categoryId: categoryId || null,
      fileType: fileType || 'PDF',
      coverImage: cover ? `/uploads/${cover.filename}` : null,
      filePath: `uploads/${file.filename}`
    });
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await productModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });

    const file = req.files?.file?.[0];
    const cover = req.files?.cover?.[0];
    const { title, description, price, categoryId, fileType } = req.body;

    await productModel.update(req.params.id, {
      title: title ?? existing.title,
      description: description ?? existing.description,
      price: price ?? existing.price,
      categoryId: categoryId || null,
      fileType: fileType || existing.file_type,
      coverImage: cover ? `/uploads/${cover.filename}` : existing.cover_image,
      filePath: file ? `uploads/${file.filename}` : existing.file_path
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getBySlug, create, update };
