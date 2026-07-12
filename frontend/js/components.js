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

// Título do produto não tem extensão (ex: "Calendário da Turma") — sem
// isso no nome do arquivo baixado, o navegador/SO não reconhece que é PDF.
function downloadFilename(title, ext) {
  const safeTitle = title || 'material';
  const safeExt = ext || '';
  return safeTitle.toLowerCase().endsWith(safeExt.toLowerCase()) ? safeTitle : `${safeTitle}${safeExt}`;
}

function renderProductCard(p) {
  const tint = tintFor(p.slug || p.title);
  const cover = p.cover_image
    ? `<img src="${escapeHtml(mediaUrl(p.cover_image))}" alt="${escapeHtml(p.title)}">`
    : '';
  return `
    <div class="product-card" data-slug="${escapeHtml(p.slug)}" data-id="${p.id}" data-price="${p.price}" data-title="${escapeHtml(p.title)}" data-creator="${escapeHtml(p.creator_name || '')}" data-cover="${escapeHtml(p.cover_image || '')}">
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
          <div class="product-actions">
            <button class="icon-btn" data-add-cart="true" title="Adicionar ao carrinho" type="button"><span class="material-symbols-outlined" style="font-size:20px;">add_shopping_cart</span></button>
            <button class="btn btn-light" data-buy="true" type="button">Comprar</button>
          </div>
        </div>
      </div>
    </div>`;
}

/** Baixa o arquivo de um item já comprado (usado em downloads e no pós-checkout). */
async function downloadFile(btn) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Baixando...';
  try {
    const res = await fetch(`${API_BASE_URL}/downloads/${btn.dataset.download}/file`, {
      headers: { Authorization: `Bearer ${Auth.getToken()}` }
    });
    if (!res.ok) throw new Error('Não foi possível baixar o arquivo.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = btn.dataset.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
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
        price: Number(card.dataset.price),
        cover: card.dataset.cover || null
      });
      if (typeof initHeader === 'function') initHeader();
      window.location.href = 'carrinho';
      return;
    }

    const addCartBtn = e.target.closest('[data-add-cart]');
    if (addCartBtn) {
      e.stopPropagation();
      const card = addCartBtn.closest('.product-card');
      Cart.add({
        id: Number(card.dataset.id),
        slug: card.dataset.slug,
        title: card.dataset.title,
        creator: card.dataset.creator,
        price: Number(card.dataset.price),
        cover: card.dataset.cover || null
      });
      if (typeof initHeader === 'function') initHeader();
      const original = addCartBtn.innerHTML;
      addCartBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">check</span>';
      setTimeout(() => { addCartBtn.innerHTML = original; }, 1200);
      return;
    }

    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.stopPropagation();
      if (!Auth.isLogged()) { window.location.href = 'login'; return; }
      const icon = favBtn.querySelector('.material-symbols-outlined');
      const wasFavorited = icon?.classList.contains('filled');
      const request = wasFavorited ? Api.removeFavorite(favBtn.dataset.fav) : Api.addFavorite(favBtn.dataset.fav);
      request
        .then(() => {
          icon?.classList.toggle('filled', !wasFavorited);
          favBtn.dispatchEvent(new CustomEvent('favorite-toggled', {
            bubbles: true,
            detail: { productId: favBtn.dataset.fav, favorited: !wasFavorited }
          }));
        })
        .catch((err) => console.error(err));
      return;
    }

    const card = e.target.closest('.product-card');
    if (card) window.location.href = `produto?slug=${encodeURIComponent(card.dataset.slug)}`;
  });
}