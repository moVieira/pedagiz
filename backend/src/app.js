require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const errorHandler = require('./middlewares/errorHandler');
const seoRoutes = require('./routes/seoRoutes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const orderRoutes = require('./routes/orderRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Necessário pra o rate limit (e req.ip) enxergarem o IP real do cliente
// atrás do proxy da hospedagem (Railway/Render/etc.), que repassa via
// X-Forwarded-For.
app.set('trust proxy', 1);

// Redireciona qualquer variação (http, www) pra versão canônica
// (https://pedagiz.com) — evita conteúdo duplicado no Google e mantém uma
// única URL "de verdade" pra cada página. Não mexe em ambiente local (só
// atua quando o host já é algum *.pedagiz.com).
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (!host.endsWith('pedagiz.com')) return next();

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const isWww = host === 'www.pedagiz.com';

  if (!isHttps || isWww) {
    const targetHost = isWww ? 'pedagiz.com' : host;
    return res.redirect(301, `https://${targetHost}${req.originalUrl}`);
  }
  next();
});

// Só libera CORS pras origens conhecidas do próprio site — sem isso,
// qualquer site na internet conseguia chamar a API pelo navegador do
// usuário. Requisições sem Origin (webhook do Mercado Pago, curl, apps
// server-to-server) não são bloqueadas, já que CORS é uma restrição de
// navegador, não de servidor.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.PUBLIC_API_URL,
  'https://pedagiz.com',
  'https://www.pedagiz.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const err = new Error('Não permitido pelo CORS');
    err.status = 403;
    callback(err);
  }
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// Precisa vir antes do express.static: preenche <title>/description/Open
// Graph de cada produto e loja no próprio HTML retornado pelo servidor —
// sem isso, rastreadores que não executam JavaScript (a maioria das
// prévias de link do WhatsApp/Facebook, e nem sempre o Google) só veem o
// título genérico do arquivo estático.
app.use(seoRoutes);

// Em produção o Express também serve o frontend estático (mesma origem, sem
// CORS a configurar). Em dev local o frontend continua rodando à parte via
// Live Server/npx serve, então isso só entra em uso quando implantado.
app.use(express.static(path.join(__dirname, '..', '..', 'frontend'), { extensions: ['html'] }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

module.exports = app;