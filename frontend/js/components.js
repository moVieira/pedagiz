const TINTS = ['bg-a', 'bg-b', 'bg-c', 'bg-d', 'bg-e'];

function tintFor(seed) {
  const s = String(seed || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatRating(value) {
  return Number(value || 0).toFixed(1).replace('.', ',');
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function renderProductCard(p) {
  const tint = tintFor(p.slug || p.title);
  const cover = p.cover_image
    ? `<img src="${escapeHtml(mediaUrl(p.cover_image))}" alt="${escapeHtml(p.title)}">`
    : '';
  return `
    <div class="product-card" data-slug="${escapeHtml(p.slug)}" data-id="${p.id}" data-price="${p.price}" data-title="${escapeHtml(p.title)}" data-creator="${escapeHtml(p.creator_name || '')}">
      <div class="product-cover ${cover ? '' : tint}">
        ${cover}
        <span class="product-type">${escapeHtml(p.file_type)}</span>
        <button class="product-fav" data-fav="${p.id}" title="Favoritar" type="button"><span class="material-symbols-outlined" style="font-size:16px;">favorite</span></button>
      </div>
      <div class="product-body">
        <div class="product-cat">${escapeHtml(p.category_name || '')}</div>
        <div class="product-title">${escapeHtml(p.title)}</div>
        <div class="product-creator">
          <div class="dot-avatar ${tintFor(p.creator_slug)}"></div>
          <span>${escapeHtml(p.creator_name || '')}</span>
          <span class="product-rating"><span class="material-symbols-outlined filled" style="font-size:13px;">star</span> ${formatRating(p.rating)}</span>
        </div>
        <div class="product-foot">
          <span class="product-price">${formatPrice(p.price)}</span>
          <button class="btn btn-light" data-buy="true" type="button">Comprar</button>
        </div>
      </div>
    </div>`;
}

/** Liga cliques em cards/botões de produto renderizados via renderProductCard. */
function wireProductActions(scope) {
  scope.addEventListener('click', (e) => {
    const buyBtn = e.target.closest('[data-buy]');
    if (buyBtn) {
      e.stopPropagation();
      const card = buyBtn.closest('.product-card');
      Cart.add({
        id: Number(card.dataset.id),
        slug: card.dataset.slug,
        title: card.dataset.title,
        creator: card.dataset.creator,
        price: Number(card.dataset.price)
      });
      if (typeof initHeader === 'function') initHeader();
      const original = buyBtn.textContent;
      buyBtn.innerHTML = 'Adicionado <span class="material-symbols-outlined" style="font-size:14px;">check</span>';
      setTimeout(() => { buyBtn.textContent = original; }, 1200);
      return;
    }

    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.stopPropagation();
      if (!Auth.isLogged()) { window.location.href = 'login.html'; return; }
      Api.addFavorite(favBtn.dataset.fav)
        .then(() => { favBtn.querySelector('.material-symbols-outlined')?.classList.add('filled'); })
        .catch((err) => console.error(err));
      return;
    }

    const card = e.target.closest('.product-card');
    if (card) window.location.href = `produto.html?slug=${encodeURIComponent(card.dataset.slug)}`;
  });
}