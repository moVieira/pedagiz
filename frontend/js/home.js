document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('featured-grid');

  const params = new URLSearchParams(window.location.search);
  const categoria = params.get('categoria');
  const busca = params.get('busca');

  try {
    const { products } = await Api.listProducts(categoria ? { category: categoria } : {});

    const visible = busca
      ? products.filter((p) => p.title.toLowerCase().includes(busca.toLowerCase()))
      : products;

    if (grid) {
      grid.innerHTML = visible.slice(0, 8).map(renderProductCard).join('')
        || '<p class="empty-state">Nenhum material encontrado.</p>';
    }
  } catch (err) {
    console.error(err);
    if (grid) grid.innerHTML = '<p class="empty-state">Não foi possível carregar os materiais agora.</p>';
  }

  if (grid) wireProductActions(grid);
});