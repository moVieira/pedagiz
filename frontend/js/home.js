document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('featured-grid');
  const catGrid = document.getElementById('category-grid');
  const creatorGrid = document.getElementById('creator-grid');

  const params = new URLSearchParams(window.location.search);
  const categoria = params.get('categoria');
  const busca = params.get('busca');

  try {
    const [{ products }, { categories }, { creators }] = await Promise.all([
      Api.listProducts(categoria ? { category: categoria } : {}),
      Api.listCategories(),
      Api.featuredCreators()
    ]);

    const visible = busca
      ? products.filter((p) => p.title.toLowerCase().includes(busca.toLowerCase()))
      : products;

    if (grid) {
      grid.innerHTML = visible.slice(0, 8).map(renderProductCard).join('')
        || '<p class="empty-state">Nenhum material encontrado.</p>';
    }

    if (catGrid) {
      const counts = {};
      for (const p of products) {
        if (p.category_slug) counts[p.category_slug] = (counts[p.category_slug] || 0) + 1;
      }
      catGrid.innerHTML = categories.map((c) => `
        <a class="category-card" href="index.html?categoria=${encodeURIComponent(c.slug)}">
          <div class="category-icon ${tintFor(c.slug)}"></div>
          <div class="category-name">${escapeHtml(c.name)}</div>
          <div class="category-count">${counts[c.slug] || 0} materiais</div>
        </a>`).join('');
    }

    if (creatorGrid) {
      creatorGrid.innerHTML = creators.map((c) => `
        <a class="creator-card" href="loja.html?slug=${encodeURIComponent(c.slug)}">
          <div class="creator-top">
            <div class="creator-avatar ${tintFor(c.slug)}"></div>
            <div>
              <div class="creator-name">${escapeHtml(c.store_name)}</div>
              <div class="creator-stats">${c.product_count} materiais · ${formatRating(c.rating)} ★</div>
            </div>
          </div>
          <p class="creator-bio">${escapeHtml(c.bio || '')}</p>
          <span class="btn btn-outline btn-block">Ver loja</span>
        </a>`).join('') || '<p class="empty-state">Nenhuma loja em destaque ainda.</p>';
    }
  } catch (err) {
    console.error(err);
    if (grid) grid.innerHTML = '<p class="empty-state">Não foi possível carregar os materiais agora.</p>';
  }

  if (grid) wireProductActions(grid);
});