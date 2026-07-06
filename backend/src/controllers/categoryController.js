const categoryModel = require('../models/categoryModel');

async function list(req, res, next) {
  try {
    const categories = await categoryModel.findAll();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
