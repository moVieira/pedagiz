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

    const gallery = [product.cover_image, ...(product.images || []).map((img) => img.image_path)]
      .filter(Boolean)
      .filter((src, idx, arr) => arr.indexOf(src) === idx);

    root.innerHTML = `
      <div class="breadcrumb">
        <a href="/">Início</a> &nbsp;›&nbsp;
        <a href="loja?slug=${encodeURIComponent(product.creator_slug)}">${escapeHtml(product.creator_name)}</a> &nbsp;›&nbsp;
        <span>${escapeHtml(product.title)}</span>
      </div>
      <div class="product-detail">
        <div class="product-gallery">
          <div class="product-detail-cover ${gallery.length ? 'has-image' : tint}" id="gallery-main">
            ${gallery.length ? `<img id="gallery-main-img" src="${escapeHtml(mediaUrl(gallery[0]))}" alt="${escapeHtml(product.title)}">` : ''}
            <span class="product-type">${escapeHtml(product.file_type)}</span>
            ${gallery.length ? `<button class="gallery-zoom-btn" id="gallery-zoom-btn" type="button" title="Ampliar"><span class="material-symbols-outlined" style="font-size:19px;">zoom_in</span></button>` : ''}
          </div>
          ${gallery.length > 1 ? `
          <div class="product-thumbs" id="gallery-thumbs">
            ${gallery.map((src, i) => `
              <button class="product-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}" type="button">
                <img src="${escapeHtml(mediaUrl(src))}" alt="${escapeHtml(product.title)} ${i + 1}">
              </button>`).join('')}
          </div>` : ''}
        </div>
        <div class="product-detail-info">
          <div class="product-cat">${escapeHtml(product.category_name || '')}</div>
          <h1>${escapeHtml(product.title)}</h1>
          <div class="product-creator">
            <div class="dot-avatar"><span class="material-symbols-outlined">auto_awesome</span></div>
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

    if (gallery.length) setupGallery(gallery, product.title);

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

function setupGallery(gallery, title) {
  let current = 0;
  const mainImg = document.getElementById('gallery-main-img');
  const mainBox = document.getElementById('gallery-main');
  const thumbs = document.querySelectorAll('.product-thumb');

  function show(idx) {
    current = (idx + gallery.length) % gallery.length;
    mainImg.src = mediaUrl(gallery[current]);
    thumbs.forEach((t) => t.classList.toggle('active', Number(t.dataset.idx) === current));
  }

  thumbs.forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.idx))));
  mainBox.addEventListener('click', () => openLightbox(gallery, current, title));
  const zoomBtn = document.getElementById('gallery-zoom-btn');
  if (zoomBtn) {
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(gallery, current, title);
    });
  }

  window.__gallerySetIndex = show;
}

function openLightbox(gallery, startIdx, title) {
  let idx = startIdx;
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <button class="lightbox-close" type="button" title="Fechar"><span class="material-symbols-outlined">close</span></button>
    ${gallery.length > 1 ? `
    <button class="lightbox-prev" type="button" title="Anterior"><span class="material-symbols-outlined">chevron_left</span></button>
    <button class="lightbox-next" type="button" title="Próxima"><span class="material-symbols-outlined">chevron_right</span></button>` : ''}
    <img src="${escapeHtml(mediaUrl(gallery[idx]))}" alt="${escapeHtml(title)}">
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const img = overlay.querySelector('img');

  function close() {
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeyDown);
    if (window.__gallerySetIndex) window.__gallerySetIndex(idx);
  }

  function update(newIdx) {
    idx = (newIdx + gallery.length) % gallery.length;
    img.src = mediaUrl(gallery[idx]);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') update(idx - 1);
    if (e.key === 'ArrowRight') update(idx + 1);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.lightbox-close').addEventListener('click', close);
  const prevBtn = overlay.querySelector('.lightbox-prev');
  const nextBtn = overlay.querySelector('.lightbox-next');
  if (prevBtn) prevBtn.addEventListener('click', () => update(idx - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => update(idx + 1));
  document.addEventListener('keydown', onKeyDown);
}

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