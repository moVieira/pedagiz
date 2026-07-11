// Envio via API HTTP do Brevo (porta 443) em vez de SMTP bruto — vários
// provedores de hospedagem (Railway, Render, Fly.io) bloqueiam portas de
// SMTP de saída (25/465/587) por padrão, o que faz nodemailer travar com
// ETIMEDOUT mesmo com as credenciais corretas.
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function parseMailFrom(value) {
  const match = /^(.*)<(.+)>$/.exec(value || '');
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, '') || 'Pedagix', email: match[2].trim() };
  }
  return { name: 'Pedagix', email: value || 'no-reply@pedagiz.com' };
}

async function sendPurchaseEmail({ to, name, orderId, items }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY não configurado — pulando envio do material por e-mail.');
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

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: parseMailFrom(process.env.MAIL_FROM),
      to: [{ email: to, name }],
      subject: `Seu material chegou! Pedido #${orderId} · Pedagix`,
      htmlContent: html
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo API respondeu ${res.status}: ${detail}`);
  }
}

module.exports = { sendPurchaseEmail };
