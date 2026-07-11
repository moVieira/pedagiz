const ORDER_STATUS_LABELS = { pendente: 'Aguardando pagamento', pago: 'Pago', cancelado: 'Cancelado' };
const ORDER_METHOD_LABELS = { pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito', boleto: 'Boleto' };

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLogged()) {
    window.location.href = 'login?next=pedidos';
    return;
  }

  const user = Auth.getUser();
  const nameEl = document.getElementById('account-name');
  const emailEl = document.getElementById('account-email');
  if (nameEl) nameEl.textContent = user?.name || '';
  if (emailEl) emailEl.textContent = user?.email || '';

  const adminLink = document.getElementById('account-admin-link');
  if (adminLink && user?.role === 'admin') adminLink.style.display = '';

  const list = document.getElementById('orders-list');
  const countEl = document.getElementById('orders-count');
  if (!list) return;

  try {
    const { orders } = await Api.myOrders();
    if (countEl) {
      countEl.textContent = `${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'}`;
    }

    list.innerHTML = orders.length ? orders.map((o) => {
      const firstItem = o.items[0];
      const cover = firstItem?.cover_image;
      return `
      <div class="download-row">
        <div class="download-thumb ${cover ? '' : tintFor(String(o.id))}">${cover ? `<img src="${escapeHtml(mediaUrl(cover))}" alt="${escapeHtml(firstItem.title)}">` : ''}</div>
        <div class="download-info">
          <div class="title">Pedido #${o.id} · ${escapeHtml(ORDER_METHOD_LABELS[o.payment_method] || o.payment_method)}</div>
          <div class="meta">${o.items.map((i) => escapeHtml(i.title)).join(', ') || 'Sem itens'} · ${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
          <div class="download-tags"><span>${escapeHtml(ORDER_STATUS_LABELS[o.status] || o.status)}</span></div>
        </div>
        <div class="download-actions">
          <span class="product-price">${formatPrice(o.total)}</span>
        </div>
      </div>`;
    }).join('') : '<p class="empty-state">Você ainda não fez nenhum pedido.</p>';
  } catch (err) {
    list.innerHTML = '<p class="empty-state">Não foi possível carregar seus pedidos agora.</p>';
    console.error(err);
  }
});
