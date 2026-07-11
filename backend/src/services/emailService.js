const transporter = require('../config/mailer');

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function sendPurchaseEmail({ to, name, orderId, items }) {
  if (!transporter) {
    console.warn('[email] SMTP_HOST não configurado — pulando envio do material por e-mail.');
    return;
  }

  const apiBase = (process.env.PUBLIC_API_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const rows = items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #EFE7DA;">${escapeHtml(item.title)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #EFE7DA;text-align:right;">
        <a href="${apiBase}/api/downloads/public/${item.downloadToken}" style="background:#2E2A26;color:#FAF6EF;padding:8px 16px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;">Baixar</a>
      </td>
    </tr>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#2E2A26;max-width:520px;margin:0 auto;">
      <h2>Obrigado pela compra, ${escapeHtml(name)}!</h2>
      <p>Seu pedido #${orderId} foi aprovado. Segue o link direto pra baixar cada material — eles também ficam disponíveis a qualquer momento em "Meus materiais" no seu login.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${rows}</table>
      <p style="margin-top:24px;color:#9A9085;font-size:13px;">Guarde este e-mail: o link de download não expira.</p>
    </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'Pedagix <no-reply@pedagiz.com>',
    to,
    subject: `Seu material chegou! Pedido #${orderId} · Pedagix`,
    html
  });
}

module.exports = { sendPurchaseEmail };
