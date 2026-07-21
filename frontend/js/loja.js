document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const root = document.getElementById('store-root');
  if (!root) return;
  if (!slug) {
    root.innerHTML = '<p class="empty-state">Loja não encontrada.</p>';
    return;
  }

  try {
    const { creator, products } = await Api.getCreator(slug);
    document.title = `${creator.store_name} · Pedagiz`;
    const tint = tintFor(creator.slug);

    root.innerHTML = `
      <div class="breadcrumb"><a href="/">Início</a> &nbsp;›&nbsp; <span>${escapeHtml(creator.store_name)}</span></div>
      <div class="store-cover ${creator.cover_image ? '' : tint}">${creator.cover_image ? `<img src="${escapeHtml(mediaUrl(creator.cover_image))}" alt="Capa da loja ${escapeHtml(creator.store_name)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">` : ''}</div>
      <div class="store-profile">
        <div class="store-id">
          <div class="store-logo">${creator.slug === 'Pedagiz'
            ? `<img src="assets/img/pedagiz-transparent.png" alt="${escapeHtml(creator.store_name)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`
            : escapeHtml((creator.store_name || '?')[0])}</div>
          <div>
            <div class="store-name-row">
              <h1>${escapeHtml(creator.store_name)}</h1>
              ${creator.verified ? '<span class="verified-badge"><span class="material-symbols-outlined" style="font-size:13px;">verified</span> Verificado</span>' : ''}
            </div>
            <div class="store-meta">${escapeHtml(creator.category_label || '')}${creator.location ? ' · ' + escapeHtml(creator.location) : ''}</div>
          </div>
        </div>
        <div class="store-actions">
          <button class="btn btn-dark" id="follow-btn" type="button"><span class="material-symbols-outlined" style="font-size:16px;">add</span> Seguir</button>
        </div>
      </div>
      <div class="store-bio-row">
        <p class="store-bio">${escapeHtml(creator.bio || '')}</p>
        <div class="store-stats">
          <div><div class="stat-n">${creator.product_count}</div><div class="stat-l">materiais</div></div>
          <div><div class="stat-n">${creator.sales_count}</div><div class="stat-l">vendas</div></div>
          <div><div class="stat-n">${formatRating(creator.rating)} <span class="material-symbols-outlined filled" style="font-size:19px;">star</span></div><div class="stat-l">avaliação</div></div>
        </div>
      </div>
      <div class="product-grid" id="store-products" style="margin-top:28px;">
        ${products.map(renderProductCard).join('') || '<p class="empty-state">Nenhum material publicado ainda.</p>'}
      </div>
    `;

    const followBtn = document.getElementById('follow-btn');
    followBtn.addEventListener('click', async () => {
      if (!Auth.isLogged()) { window.location.href = 'login'; return; }
      try {
        await Api.follow(creator.id);
        followBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">check</span> Seguindo';
      } catch (err) {
        console.error(err);
      }
    });

    wireProductActions(document.getElementById('store-products'));
  } catch (err) {
    root.innerHTML = '<p class="empty-state">Loja não encontrada.</p>';
    console.error(err);
  }
});