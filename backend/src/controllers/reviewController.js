const reviewModel = require('../models/reviewModel');

async function create(req, res, next) {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5' });
    }

    const id = await reviewModel.create({
      productId: req.params.productId,
      userId: req.user.id,
      rating,
      comment
    });
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
}

module.exports = { create };
