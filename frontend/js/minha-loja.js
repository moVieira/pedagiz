document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLogged()) {
    window.location.href = 'login?next=minha-loja';
    return;
  }

  const root = document.getElementById('store-panel');
  if (!root) return;

  const user = Auth.getUser();
  if (user?.role !== 'admin') {
    root.innerHTML = '<p class="empty-state">Esta área é restrita ao administrador da Pedagix.</p>';
    return;
  }

  try {
    const { creator } = await Api.myStore();
    renderPanel(root, creator);
  } catch (err) {
    root.innerHTML = '<p class="empty-state">Não foi possível carregar o painel agora.</p>';
    console.error(err);
  }
});

function slugify(text) {
  let stripped = '';
  for (const ch of String(text || '').normalize('NFD')) {
    const code = ch.codePointAt(0);
    if (code >= 0x0300 && code <= 0x036f) continue; // marca diacrítica combinante
    stripped += ch;
  }
  return stripped
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function renderPanel(root, creator) {
  root.innerHTML = `
    <h1 class="section-title" style="margin-bottom:6px;">Publicar materiais</h1>
    <p id="store-link-line" style="color:#9A9085;margin:0 0 28px;">${creator ? `<a href="loja?slug=${encodeURIComponent(creator.slug)}">Ver loja pública →</a>` : 'Publique seu primeiro material abaixo.'}</p>

    ${creator ? `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;margin-bottom:36px;">
      <h2 class="section-title" style="font-size:20px;margin-bottom:16px;">Dados da loja</h2>
      <p id="store-error" class="form-error"></p>
      <p id="store-success" class="form-success"></p>
      <form id="store-form" style="max-width:520px;">
        <div class="field"><label for="storeName">Nome da loja</label><input type="text" name="storeName" id="storeName" value="${escapeHtml(creator.store_name || '')}" required></div>
        <div class="field"><label for="storeSlug">Endereço (slug)</label><input type="text" name="slug" id="storeSlug" value="${escapeHtml(creator.slug || '')}" required></div>
        <div class="field"><label for="storeBio">Bio</label><textarea name="bio" id="storeBio" rows="3">${escapeHtml(creator.bio || '')}</textarea></div>
        <div class="field"><label for="storeLocation">Localização</label><input type="text" name="location" id="storeLocation" value="${escapeHtml(creator.location || '')}"></div>
        <div class="field"><label for="storeCategoryLabel">Categoria/área</label><input type="text" name="categoryLabel" id="storeCategoryLabel" value="${escapeHtml(creator.category_label || '')}"></div>
        <div class="field"><label for="storeCover">Capa da loja (opcional)</label><input type="file" name="cover" id="storeCover" accept="image/*"></div>
        <button class="btn btn-dark" type="submit">Salvar dados da loja</button>
      </form>
    </div>` : ''}

    <p id="product-error" class="form-error"></p>
    <p id="product-success" class="form-success"></p>
    <form id="product-form" style="max-width:520px;margin-bottom:40px;">
      <input type="hidden" name="productId" value="">
      <div class="field"><label for="title">Título</label><input type="text" name="title" id="title" required></div>
      <div class="field"><label for="description">Descrição</label><textarea name="description" id="description" rows="3"></textarea></div>
      <div class="field"><label for="price">Preço (R$)</label><input type="number" name="price" id="price" min="0" step="0.01" required></div>
      <div class="field"><label for="categoryId">Categoria</label><select name="categoryId" id="categoryId"></select></div>
      <div class="field"><label for="fileType">Tipo de arquivo</label>
        <select name="fileType" id="fileType">
          <option value="PDF">PDF</option>
          <option value="PPT">PPT</option>
          <option value="BUNDLE">Bundle</option>
        </select>
      </div>
      <div class="field"><label for="file" id="file-label">Arquivo do material</label><input type="file" name="file" id="file"></div>
      <div class="field"><label for="cover">Capa (opcional)</label><input type="file" name="cover" id="cover" accept="image/*"></div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-dark" type="submit" id="submit-btn">Publicar</button>
        <button class="btn btn-outline" type="button" id="cancel-edit-btn" style="display:none;">Cancelar edição</button>
      </div>
    </form>

    <h2 class="section-title" style="font-size:20px;margin-bottom:16px;">Seus materiais</h2>
    <div class="product-grid" id="my-products"></div>
  `;

  try {
    Api.listCategories().then(({ categories }) => {
      const select = document.getElementById('categoryId');
      select.innerHTML = '<option value="">Sem categoria</option>' +
        categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    });
  } catch (err) {
    console.error(err);
  }

  if (creator) refreshMyProducts(creator.slug);
  else document.getElementById('my-products').innerHTML = '<p class="empty-state">Você ainda não publicou nenhum material.</p>';

  const storeForm = document.getElementById('store-form');
  if (storeForm) {
    storeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = document.getElementById('store-error');
      const successBox = document.getElementById('store-success');
      errorBox.classList.remove('show');
      successBox.classList.remove('show');

      const fd = new FormData();
      fd.append('storeName', storeForm.storeName.value.trim());
      fd.append('slug', storeForm.slug.value.trim());
      fd.append('bio', storeForm.bio.value.trim());
      fd.append('location', storeForm.location.value.trim());
      fd.append('categoryLabel', storeForm.categoryLabel.value.trim());
      if (storeForm.cover.files[0]) fd.append('cover', storeForm.cover.files[0]);

      try {
        const { creator: updated } = await Api.updateStore(fd);
        successBox.textContent = 'Dados da loja atualizados com sucesso!';
        successBox.classList.add('show');
        const linkLine = document.getElementById('store-link-line');
        if (linkLine) linkLine.innerHTML = `<a href="loja?slug=${encodeURIComponent(updated.slug)}">Ver loja pública →</a>`;
        storeForm.cover.value = '';
        if (updated.slug) refreshMyProducts(updated.slug);
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.add('show');
      }
    });
  }

  const form = document.getElementById('product-form');
  const fileInput = document.getElementById('file');
  const fileLabel = document.getElementById('file-label');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');

  function enterEditMode(product) {
    form.productId.value = product.id;
    form.title.value = product.title;
    form.description.value = product.description || '';
    form.price.value = product.price;
    form.categoryId.value = product.category_id || '';
    form.fileType.value = product.file_type;
    fileInput.required = false;
    fileLabel.textContent = 'Arquivo do material (deixe em branco pra manter o atual)';
    submitBtn.textContent = 'Salvar alterações';
    cancelBtn.style.display = '';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  function exitEditMode() {
    form.reset();
    form.productId.value = '';
    fileInput.required = true;
    fileLabel.textContent = 'Arquivo do material';
    submitBtn.textContent = 'Publicar';
    cancelBtn.style.display = 'none';
  }

  fileInput.required = true;
  cancelBtn.addEventListener('click', exitEditMode);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('product-error');
    const successBox = document.getElementById('product-success');
    errorBox.classList.remove('show');
    successBox.classList.remove('show');

    const editingId = form.productId.value;
    const title = form.title.value.trim();
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', form.description.value.trim());
    fd.append('price', form.price.value);
    fd.append('categoryId', form.categoryId.value);
    fd.append('fileType', form.fileType.value);
    if (fileInput.files[0]) fd.append('file', fileInput.files[0]);
    if (form.cover.files[0]) fd.append('cover', form.cover.files[0]);

    try {
      if (editingId) {
        await Api.updateProduct(editingId, fd);
        successBox.textContent = 'Material atualizado com sucesso!';
      } else {
        fd.append('slug', `${slugify(title)}-${Date.now().toString(36)}`);
        await Api.createProduct(fd);
        successBox.textContent = 'Material publicado com sucesso!';
      }
      successBox.classList.add('show');
      exitEditMode();

      const { creator: refreshedCreator } = await Api.myStore();
      if (refreshedCreator) await refreshMyProducts(refreshedCreator.slug);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add('show');
    }
  });

  document.getElementById('my-products').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit]');
    if (!editBtn) return;
    e.stopPropagation();
    e.preventDefault();
    const product = JSON.parse(editBtn.dataset.edit);
    enterEditMode(product);
  });
}

async function refreshMyProducts(slug) {
  const grid = document.getElementById('my-products');
  try {
    const { products } = await Api.getCreator(slug);
    grid.innerHTML = products.length
      ? products.map(renderEditableProductCard).join('')
      : '<p class="empty-state">Você ainda não publicou nenhum material.</p>';
  } catch (err) {
    grid.innerHTML = '<p class="empty-state">Não foi possível carregar seus materiais.</p>';
    console.error(err);
  }
}

function renderEditableProductCard(p) {
  const tint = tintFor(p.slug || p.title);
  const cover = p.cover_image
    ? `<img src="${escapeHtml(mediaUrl(p.cover_image))}" alt="${escapeHtml(p.title)}">`
    : '';
  return `
    <div class="product-card">
      <div class="product-cover ${cover ? '' : tint}">
        ${cover}
        <span class="product-type">${escapeHtml(p.file_type)}</span>
      </div>
      <div class="product-body">
        <div class="product-cat">${escapeHtml(p.category_name || '')}</div>
        <div class="product-title">${escapeHtml(p.title)}</div>
        <div class="product-foot">
          <span class="product-price">${formatPrice(p.price)}</span>
          <button class="btn btn-light" data-edit='${escapeHtml(JSON.stringify(p))}' type="button">Editar</button>
        </div>
      </div>
    </div>`;
}
