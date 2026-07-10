document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const root = document.getElementById('product-root');
  if (!root) return;
  if (!slug) {
    root.innerHTML = '<p class="empty-state">Produto não encontrado.</p>';
    return;
  }

  try {
    const { product, reviews } = await Api.getProduct(slug);
    document.title = `${product.title} · Pedagix`;
    const tint = tintFor(product.slug);

    root.innerHTML = `
      <div class="breadcrumb">
        <a href="/">Início</a> &nbsp;›&nbsp;
        <a href="loja.html?slug=${encodeURIComponent(product.creator_slug)}">${escapeHtml(product.creator_name)}</a> &nbsp;›&nbsp;
        <span>${escapeHtml(product.title)}</span>
      </div>
      <div class="product-detail">
        <div class="product-detail-cover ${product.cover_image ? '' : tint}">
          ${product.cover_image ? `<img src="${escapeHtml(mediaUrl(product.cover_image))}" alt="${escapeHtml(product.title)}">` : ''}
          <span class="product-type">${escapeHtml(product.file_type)}</span>
        </div>
        <div class="product-detail-info">
          <div class="product-cat">${escapeHtml(product.category_name || '')}</div>
          <h1>${escapeHtml(product.title)}</h1>
          <div class="product-creator">
            <div class="dot-avatar ${tintFor(product.creator_slug)}"></div>
            <a href="loja.html?slug=${encodeURIComponent(product.creator_slug)}">${escapeHtml(product.creator_name)}</a>
            <span class="product-rating"><span class="material-symbols-outlined filled" style="font-size:14px;">star</span> ${formatRating(product.rating)} (${product.rating_count})</span>
          </div>
          <p class="product-description">${escapeHtml(product.description || '')}</p>
          <div class="product-detail-actions">
            <span class="product-price">${formatPrice(product.price)}</span>
            <button class="btn btn-dark" id="buy-now" type="button">Comprar agora</button>
          </div>
        </div>
      </div>
      <section class="reviews-section">
        <h2 class="section-title">Avaliações</h2>
        <div id="reviews-list">${renderReviews(reviews)}</div>
        ${Auth.isLogged() ? renderReviewForm() : '<p class="empty-state">Faça login para avaliar este material.</p>'}
      </section>
    `;

    document.getElementById('buy-now').addEventListener('click', () => {
      Cart.add({
        id: product.id, slug: product.slug, title: product.title,
        creator: product.creator_name, price: Number(product.price),
        cover: product.cover_image || null
      });
      window.location.href = 'carrinho.html';
    });

    const form = document.getElementById('review-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await Api.reviewProduct(product.id, {
            rating: Number(form.rating.value),
            comment: form.comment.value.trim()
          });
          window.location.reload();
        } catch (err) {
          alert(err.message);
        }
      });
    }
  } catch (err) {
    root.innerHTML = '<p class="empty-state">Produto não encontrado.</p>';
    console.error(err);
  }
});

function renderReviews(reviews) {
  if (!reviews.length) return '<p class="empty-state">Ainda não há avaliações para este material.</p>';
  return reviews.map((r) => `
    <div class="review-item">
      <div class="review-head"><strong>${escapeHtml(r.user_name)}</strong><span><span class="material-symbols-outlined filled" style="font-size:14px;">star</span> ${formatRating(r.rating)}</span></div>
      <p>${escapeHtml(r.comment || '')}</p>
    </div>`).join('');
}

function renderReviewForm() {
  return `
    <form id="review-form" class="review-form">
      <div class="field">
        <label for="rating">Sua nota</label>
        <select name="rating" id="rating" required>
          <option value="5">5 - Excelente</option>
          <option value="4">4 - Muito bom</option>
          <option value="3">3 - Bom</option>
          <option value="2">2 - Regular</option>
          <option value="1">1 - Ruim</option>
        </select>
      </div>
      <div class="field">
        <label for="comment">Comentário</label>
        <textarea name="comment" id="comment" rows="3"></textarea>
      </div>
      <button class="btn btn-dark" type="submit">Enviar avaliação</button>
    </form>`;
}