document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLogged()) {
    window.location.href = 'login.html?next=minha-loja.html';
    return;
  }

  const root = document.getElementById('store-panel');
  if (!root) return;

  try {
    const { creator } = await Api.myStore();
    if (creator) {
      renderExistingStore(root, creator);
    } else {
      renderCreateStoreForm(root);
    }
  } catch (err) {
    root.innerHTML = '<p class="empty-state">Não foi possível carregar sua loja agora.</p>';
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

function renderCreateStoreForm(root) {
  root.innerHTML = `
    <h1 class="section-title" style="margin-bottom:6px;">Abra sua loja</h1>
    <p style="color:#9A9085;margin:0 0 24px;">Preencha os dados abaixo para começar a vender seus materiais.</p>
    <p id="store-error" class="form-error"></p>
    <form id="create-store-form" style="max-width:520px;">
      <div class="field"><label for="storeName">Nome da loja</label><input type="text" name="storeName" id="storeName" required></div>
      <div class="field"><label for="bio">Bio</label><textarea name="bio" id="bio" rows="3"></textarea></div>
      <div class="field"><label for="location">Localização</label><input type="text" name="location" id="location" placeholder="Cidade, UF"></div>
      <div class="field"><label for="categoryLabel">Categoria principal</label><input type="text" name="categoryLabel" id="categoryLabel" placeholder="Ex: Alfabetização"></div>
      <button class="btn btn-dark" type="submit">Criar loja</button>
    </form>
  `;

  const form = document.getElementById('create-store-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('store-error');
    errorBox.classList.remove('show');
    const storeName = form.storeName.value.trim();
    try {
      await Api.createStore({
        storeName,
        slug: slugify(storeName),
        bio: form.bio.value.trim(),
        location: form.location.value.trim(),
        categoryLabel: form.categoryLabel.value.trim()
      });
      window.location.reload();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add('show');
    }
  });
}

async function renderExistingStore(root, creator) {
  root.innerHTML = `
    <h1 class="section-title" style="margin-bottom:4px;">${escapeHtml(creator.store_name)}</h1>
    <p style="color:#9A9085;margin:0 0 28px;"><a href="loja.html?slug=${encodeURIComponent(creator.slug)}">Ver loja pública →</a></p>

    <h2 class="section-title" style="font-size:20px;margin-bottom:16px;">Publicar novo material</h2>
    <p id="product-error" class="form-error"></p>
    <p id="product-success" class="form-success"></p>
    <form id="create-product-form" style="max-width:520px;margin-bottom:40px;">
      <div class="field"><label for="title">Título</label><input type="text" name="title" id="title" required></div>
      <div class="field"><label for="description">Descrição</label><textarea name="description" id="description" rows="3"></textarea></div>
      <div class="field"><label for="price">Preço (R$)</label><input type="number" name="price" id="price" min="0" step="0.01" required></div>
      <div class="field"><label for="categoryId">Categoria</label><select name="categoryId" id="categoryId"></select></div>
      <div class="field"><label for="fileType">Tipo de arquivo</label>
        <select name="fileType" id="fileType">
          <option value="PDF">PDF</option>
          <option value="CANVA">Canva</option>
          <option value="PPT">PPT</option>
          <option value="BUNDLE">Bundle</option>
        </select>
      </div>
      <div class="field"><label for="file">Arquivo do material</label><input type="file" name="file" id="file" required></div>
      <div class="field"><label for="cover">Capa (opcional)</label><input type="file" name="cover" id="cover" accept="image/*"></div>
      <button class="btn btn-dark" type="submit">Publicar</button>
    </form>

    <h2 class="section-title" style="font-size:20px;margin-bottom:16px;">Seus materiais</h2>
    <div class="product-grid" id="my-products"></div>
  `;

  try {
    const { categories } = await Api.listCategories();
    const select = document.getElementById('categoryId');
    select.innerHTML = '<option value="">Sem categoria</option>' +
      categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  } catch (err) {
    console.error(err);
  }

  await refreshMyProducts(creator.slug);

  const form = document.getElementById('create-product-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('product-error');
    const successBox = document.getElementById('product-success');
    errorBox.classList.remove('show');
    successBox.classList.remove('show');

    const title = form.title.value.trim();
    const fd = new FormData();
    fd.append('title', title);
    fd.append('slug', `${slugify(title)}-${Date.now().toString(36)}`);
    fd.append('description', form.description.value.trim());
    fd.append('price', form.price.value);
    fd.append('categoryId', form.categoryId.value);
    fd.append('fileType', form.fileType.value);
    fd.append('file', form.file.files[0]);
    if (form.cover.files[0]) fd.append('cover', form.cover.files[0]);

    try {
      await Api.createProduct(fd);
      successBox.textContent = 'Material publicado com sucesso!';
      successBox.classList.add('show');
      form.reset();
      await refreshMyProducts(creator.slug);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add('show');
    }
  });
}

async function refreshMyProducts(slug) {
  const grid = document.getElementById('my-products');
  try {
    const { products } = await Api.getCreator(slug);
    grid.innerHTML = products.length
      ? products.map(renderProductCard).join('')
      : '<p class="empty-state">Você ainda não publicou nenhum material.</p>';
    wireProductActions(grid);
  } catch (err) {
    grid.innerHTML = '<p class="empty-state">Não foi possível carregar seus materiais.</p>';
    console.error(err);
  }
}