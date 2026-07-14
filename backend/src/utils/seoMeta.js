const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', '..', '..', 'frontend');

// Lidos uma vez na subida do processo — os templates só mudam com um
// redeploy (que já reinicia o processo), não precisa reler do disco a
// cada requisição.
const templates = {
  produto: fs.readFileSync(path.join(FRONTEND_DIR, 'produto.html'), 'utf8'),
  loja: fs.readFileSync(path.join(FRONTEND_DIR, 'loja.html'), 'utf8')
};

function escapeAttr(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// O HTML estático já vem com <title> e sem <meta description>/Open Graph
// — essa função troca o título e injeta as tags certas pro produto/loja
// específico antes de mandar a página pro navegador (ou pro rastreador),
// já que o preenchimento via JavaScript não é visto por quem não executa
// JS (rastreadores de redes sociais, e nem sempre o próprio Google).
function injectMeta(template, { title, description, image, url }) {
  // Função como substituto (em vez de string) evita que "$&", "$1" etc. no
  // título/descrição sejam interpretados como padrões especiais do replace.
  let html = template.replace(/<title>.*?<\/title>/s, () => `<title>${escapeAttr(title)}</title>`);

  const tags = [
    `<meta name="description" content="${escapeAttr(description)}">`,
    `<link rel="canonical" href="${escapeAttr(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Pedagiz">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${escapeAttr(url)}">`,
    image ? `<meta property="og:image" content="${escapeAttr(image)}">` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`
  ].filter(Boolean).join('\n');

  return html.replace('</head>', () => `${tags}\n</head>`);
}

module.exports = { templates, injectMeta, escapeAttr };
