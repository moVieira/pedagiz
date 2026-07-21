const router = require('express').Router();
const { templates, injectMeta, escapeAttr } = require('../utils/seoMeta');
const productModel = require('../models/productModel');
const creatorModel = require('../models/creatorModel');

const SITE_URL = (process.env.PUBLIC_API_URL || 'https://pedagiz.com').replace(/\/$/, '');
const DEFAULT_IMAGE = `${SITE_URL}/assets/img/pedagiz-hires.png`;
// Dimensões reais do arquivo assets/img/pedagiz-hires.png — só podemos
// declarar og:image:width/height com segurança pra essa imagem fixa;
// capas de produto/loja são enviadas pelos criadores em qualquer tamanho
// e não temos as dimensões guardadas, então ficam sem esses metadados.
const DEFAULT_IMAGE_WIDTH = 2646;
const DEFAULT_IMAGE_HEIGHT = 936;

function absoluteImage(relativePath) {
  if (!relativePath) return DEFAULT_IMAGE;
  return /^https?:\/\//.test(relativePath) ? relativePath : `${SITE_URL}${relativePath}`;
}

router.get('/produto', async (req, res, next) => {
  try {
    const slug = req.query.slug;
    if (!slug) return res.type('html').send(templates.produto);

    const product = await productModel.findBySlug(slug);
    if (!product) return res.type('html').send(templates.produto);

    const description = (product.description || `Baixe "${product.title}" na Pedagiz — materiais digitais para professores.`)
      .replace(/\s+/g, ' ').trim().slice(0, 160);
    const url = `${SITE_URL}/produto?slug=${encodeURIComponent(slug)}`;
    const image = absoluteImage(product.cover_image);

    const productJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description,
      image: [image],
      sku: `PDZ-${product.id}`,
      brand: { '@type': 'Brand', name: product.creator_name },
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'BRL',
        price: Number(product.price).toFixed(2),
        availability: 'https://schema.org/InStock'
      }
    };
    if (Number(product.rating_count) > 0) {
      productJsonLd.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(product.rating).toFixed(1),
        reviewCount: Number(product.rating_count)
      };
    }

    const html = injectMeta(templates.produto, {
      title: `${product.title} · Pedagiz`,
      description,
      image,
      imageWidth: product.cover_image ? null : DEFAULT_IMAGE_WIDTH,
      imageHeight: product.cover_image ? null : DEFAULT_IMAGE_HEIGHT,
      url,
      jsonLd: productJsonLd
    });
    res.type('html').send(html);
  } catch (err) {
    next(err);
  }
});

router.get('/loja', async (req, res, next) => {
  try {
    const slug = req.query.slug;
    if (!slug) return res.type('html').send(templates.loja);

    const creator = await creatorModel.findBySlug(slug);
    if (!creator) return res.type('html').send(templates.loja);

    const description = (creator.bio || `Confira os materiais de ${creator.store_name} na Pedagiz.`)
      .replace(/\s+/g, ' ').trim().slice(0, 160);

    const html = injectMeta(templates.loja, {
      title: `${creator.store_name} · Pedagiz`,
      description,
      image: absoluteImage(creator.cover_image),
      imageWidth: creator.cover_image ? null : DEFAULT_IMAGE_WIDTH,
      imageHeight: creator.cover_image ? null : DEFAULT_IMAGE_HEIGHT,
      url: `${SITE_URL}/loja?slug=${encodeURIComponent(slug)}`
    });
    res.type('html').send(html);
  } catch (err) {
    next(err);
  }
});

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const products = await productModel.findAll({});
    const creatorSlugs = [...new Set(products.map((p) => p.creator_slug).filter(Boolean))];

    const urls = [
      { loc: `${SITE_URL}/`, priority: '1.0' },
      ...creatorSlugs.map((slug) => ({ loc: `${SITE_URL}/loja?slug=${encodeURIComponent(slug)}`, priority: '0.7' })),
      ...products.map((p) => ({
        loc: `${SITE_URL}/produto?slug=${encodeURIComponent(p.slug)}`,
        priority: '0.8',
        lastmod: p.created_at
      }))
    ];

    const body = urls.map((u) => `  <url>
    <loc>${escapeAttr(u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`).join('\n');

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
