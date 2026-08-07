document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('featured-grid');
  const heroArt = document.getElementById('hero-art');
  const heading = document.getElementById('featured-heading');
  const subheading = document.getElementById('featured-subheading');
  const seeAllLink = document.getElementById('see-all-link');

  const params = new URLSearchParams(window.location.search);
  const categoria = params.get('categoria');
  const busca = params.get('busca');
  const verTodos = params.get('ver') === 'todos';
  // A vitrine "Em destaque" é só uma prévia (por isso o corte de 8) — mas
  // categoria, busca e "ver tudo" são navegações explícitas do usuário
  // pedindo a lista inteira, então nelas o corte não deve valer.
  const showAll = Boolean(categoria || busca || verTodos);

  try {
    const { products } = await Api.listProducts(categoria ? { category: categoria } : {});

    const visible = busca
      ? products.filter((p) => p.title.toLowerCase().includes(busca.toLowerCase()))
      : products;

    if (grid) {
      const list = showAll ? visible : visible.slice(0, 8);
      grid.innerHTML = list.map(renderProductCard).join('')
        || '<p class="empty-state">Nenhum material encontrado.</p>';
    }

    if (heading && subheading && seeAllLink) {
      if (busca) {
        heading.textContent = `Resultados para "${busca}"`;
        subheading.textContent = `${visible.length} material(is) encontrado(s)`;
        seeAllLink.style.display = 'none';
      } else if (categoria) {
        heading.textContent = visible[0]?.category_name || 'Categoria';
        subheading.textContent = `${visible.length} material(is) nessa categoria`;
        seeAllLink.style.display = 'none';
      } else if (verTodos) {
        heading.textContent = 'Todos os materiais';
        subheading.textContent = `${visible.length} material(is) disponíveis`;
        seeAllLink.style.display = 'none';
      }
    }

    if (heroArt) renderHeroArt(heroArt, products);
  } catch (err) {
    console.error(err);
    if (grid) grid.innerHTML = '<p class="empty-state">Não foi possível carregar os materiais agora.</p>';
  }

  if (grid) wireProductActions(grid);
});

const HERO_ART_TYPE_LABEL = { PDF: 'atividade', PPT: 'slides', BUNDLE: 'kit' };

// Substitui os 3 cartões decorativos de placeholder pelos produtos reais
// mais bem avaliados (priorizando quem tem capa, senão não há o que
// mostrar) — mantém as posições/rotações das classes art-1/2/3 do CSS.
function renderHeroArt(container, products) {
  const ranked = [...products].sort((a, b) =>
    (Number(b.rating) - Number(a.rating)) || (Number(b.rating_count) - Number(a.rating_count)));
  const withCover = ranked.filter((p) => p.cover_image);
  const withoutCover = ranked.filter((p) => !p.cover_image);
  const featured = [...withCover, ...withoutCover].slice(0, 3);
  if (!featured.length) return;

  container.innerHTML = featured.map((p, i) => {
    const caption = (p.category_name || HERO_ART_TYPE_LABEL[p.file_type] || p.creator_name || '').toLowerCase();
    const cover = p.cover_image
      ? `<img src="${escapeHtml(mediaUrl(p.cover_image))}" alt="${escapeHtml(p.title)}">`
      : '';
    return `
      <a class="art-card art-${i + 1} ${cover ? 'has-image' : tintFor(p.slug || p.title)}" href="produto?slug=${encodeURIComponent(p.slug)}" title="${escapeHtml(p.title)}">
        ${cover}
        <span>${escapeHtml(caption)}</span>
      </a>`;
  }).join('');
}