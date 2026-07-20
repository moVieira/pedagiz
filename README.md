# Pedagiz

Marketplace de materiais digitais (PDFs e templates editáveis) para professores.
Frontend em HTML/CSS/JS puro, backend em Node.js + Express, banco MySQL e
pagamento via Pix usando o SDK do Mercado Pago.

## Estrutura

```
pedagiz/
├── backend/
│   ├── database/schema.sql        # schema + seed de categorias
│   ├── src/
│   │   ├── config/                # conexão MySQL e cliente Mercado Pago
│   │   ├── controllers/
│   │   ├── middlewares/           # auth (JWT), upload (multer), erros
│   │   ├── models/
│   │   ├── routes/
│   │   └── app.js
│   ├── uploads/                   # arquivos enviados pelos criadores
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── css/styles.css
    ├── js/                        # api.js, cart.js, auth.js, etc.
    ├── assets/img/
    ├── index.html                 # home
    ├── loja.html                  # loja do criador
    ├── produto.html                # detalhe do material + avaliações
    ├── carrinho.html              # carrinho e checkout Pix
    ├── downloads.html             # área do comprador
    ├── login.html
    └── cadastro.html
```

## Rodando localmente

### Backend

```
cd backend
npm install
cp .env.example .env   # preencha DB_*, JWT_SECRET e MP_ACCESS_TOKEN
mysql -u root -p < database/schema.sql
npm run dev             # http://localhost:3000
```

### Frontend

Sirva a pasta `frontend/` com qualquer servidor estático (Live Server, `npx serve`, etc.)
em `http://localhost:5500` (ou ajuste `FRONTEND_URL`/CORS no backend conforme a porta usada).
O `frontend/js/api.js` aponta para `http://localhost:3000/api` em ambiente local.

## Pagamento via Pix

O checkout (`POST /api/orders/checkout`) cria o pedido e gera uma cobrança Pix
no Mercado Pago, retornando o QR Code (`qrCode`/`qrCodeBase64`). A confirmação
chega pelo webhook `POST /api/payments/webhook`, que marca o pedido como pago
e libera os downloads. Configure `MP_ACCESS_TOKEN` e `MP_WEBHOOK_URL` no `.env`
e cadastre a URL do webhook no painel do Mercado Pago (precisa ser uma URL
pública — use um túnel como ngrok em desenvolvimento).