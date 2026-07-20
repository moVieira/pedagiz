const bcrypt = require('bcrypt');
const crypto = require('crypto');
const productModel = require('../models/productModel');
const productImageModel = require('../models/productImageModel');
const reviewModel = require('../models/reviewModel');
const categoryModel = require('../models/categoryModel');
const creatorModel = require('../models/creatorModel');
const orderModel = require('../models/orderModel');
const userModel = require('../models/userModel');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const [reviews, images] = await Promise.all([
      reviewModel.findByProduct(product.id),
      productImageModel.findByProduct(product.id)
    ]);
    product.images = images;
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
    const images = req.files?.images || [];

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
    if (images.length) {
      await productImageModel.insertMany(id, images.map((img) => `/uploads/${img.filename}`));
    }
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
    const images = req.files?.images || [];
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
    if (images.length) {
      await productImageModel.insertMany(req.params.id, images.map((img) => `/uploads/${img.filename}`));
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await productModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });

    await productModel.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function removeImage(req, res, next) {
  try {
    const image = await productImageModel.findById(req.params.imageId);
    if (!image || String(image.product_id) !== String(req.params.id)) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }
    await productImageModel.remove(req.params.imageId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Entrega de material gratuito: sem checkout/Mercado Pago, só o e-mail.
// Reaproveita todo o fluxo de pedido pago (order + downloads + e-mail) já
// existente, só que com total R$0,00 e liberação imediata.
async function claimFree(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido' });
    }

    const product = await productModel.findById(req.params.id);
    if (!product || !product.active) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    if (Number(product.price) !== 0) {
      return res.status(400).json({ error: 'Este produto não é gratuito' });
    }

    let user = await userModel.findByEmail(email);
    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
      const name = String(req.body.name || '').trim() || email.split('@')[0];
      const userId = await userModel.create({ name, email, passwordHash });
      user = await userModel.findById(userId);
    }

    const orderId = await orderModel.createOrder(
      user.id,
      [{ productId: product.id, creatorId: product.creator_id, price: 0 }],
      'gratis'
    );
    await orderModel.markAsPaid(orderId);

    res.status(201).json({ message: 'Prontinho! Confira seu e-mail — o material já foi enviado.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getBySlug, create, update, remove, removeImage, claimFree };
