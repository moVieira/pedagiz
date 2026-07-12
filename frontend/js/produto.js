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
    document.title = `${product.title} · Pedagiz`;
    const tint = tintFor(product.slug);
    const isFree = Number(product.price) === 0;

    root.innerHTML = `
      <div class="breadcrumb">
        <a href="/">Início</a> &nbsp;›&nbsp;
        <a href="loja?slug=${encodeURIComponent(product.creator_slug)}">${escapeHtml(product.creator_name)}</a> &nbsp;›&nbsp;
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
            <a href="loja?slug=${encodeURIComponent(product.creator_slug)}">${escapeHtml(product.creator_name)}</a>
            <span class="product-rating"><span class="material-symbols-outlined filled" style="font-size:14px;">star</span> ${formatRating(product.rating)} (${product.rating_count})</span>
          </div>
          <p class="product-description">${escapeHtml(product.description || '')}</p>
          ${isFree ? `
          <div class="product-detail-actions" style="flex-direction:column;align-items:stretch;gap:12px;">
            <span class="product-price">Grátis</span>
            <form id="free-claim-form" style="display:flex;gap:10px;flex-wrap:wrap;">
              <input type="email" id="free-claim-email" placeholder="Seu melhor e-mail" required style="flex:1;min-width:200px;border:1px solid var(--border);border-radius:11px;padding:12px 14px;font-size:15px;color:var(--ink);background:var(--surface);">
              <button class="btn btn-dark" type="submit">Baixar grátis</button>
            </form>
            <p id="free-claim-message" style="font-size:13.5px;margin:0;"></p>
          </div>` : `
          <div class="product-detail-actions">
            <span class="product-price">${formatPrice(product.price)}</span>
            <button class="btn btn-dark" id="buy-now" type="button">Comprar agora</button>
          </div>`}
        </div>
      </div>
      <section class="reviews-section">
        <h2 class="section-title">Avaliações</h2>
        <div id="reviews-list">${renderReviews(reviews)}</div>
        ${Auth.isLogged() ? renderReviewForm() : '<p class="empty-state">Faça login para avaliar este material.</p>'}
      </section>
    `;

    const buyBtn = document.getElementById('buy-now');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        Cart.add({
          id: product.id, slug: product.slug, title: product.title,
          creator: product.creator_name, price: Number(product.price),
          cover: product.cover_image || null
        });
        window.location.href = 'carrinho';
      });
    }

    const freeForm = document.getElementById('free-claim-form');
    if (freeForm) {
      freeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('free-claim-email');
        const msg = document.getElementById('free-claim-message');
        const btn = freeForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        msg.textContent = '';
        try {
          const { message } = await Api.claimFreeProduct(product.id, {
            email: emailInput.value.trim(),
            name: Auth.getUser()?.name || ''
          });
          msg.textContent = message || 'Prontinho! Confira seu e-mail.';
          msg.style.color = '#355044';
          emailInput.disabled = true;
          btn.textContent = 'Enviado!';
        } catch (err) {
          msg.textContent = err.message;
          msg.style.color = '#A2392A';
          btn.disabled = false;
          btn.textContent = 'Baixar grátis';
        }
      });
    }

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