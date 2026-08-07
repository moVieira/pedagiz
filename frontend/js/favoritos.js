document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLogged()) {
    window.location.href = 'login?next=favoritos';
    return;
  }

  const user = Auth.getUser();
  const nameEl = document.getElementById('account-name');
  const emailEl = document.getElementById('account-email');
  if (nameEl) nameEl.textContent = user?.name || '';
  if (emailEl) emailEl.textContent = user?.email || '';

  const adminLink = document.getElementById('account-admin-link');
  if (adminLink && user?.role === 'admin') adminLink.style.display = '';

  const grid = document.getElementById('favorites-grid');
  const countEl = document.getElementById('favorites-count');
  if (!grid) return;

  function updateCount() {
    const remaining = grid.querySelectorAll('.product-card').length;
    if (countEl) countEl.textContent = `${remaining} ${remaining === 1 ? 'material favoritado' : 'materiais favoritados'}`;
    if (!remaining) grid.innerHTML = '<p class="empty-state">Você ainda não favoritou nenhum material.</p>';
  }

  try {
    const { favorites } = await Api.listFavorites();
    if (countEl) {
      countEl.textContent = `${favorites.length} ${favorites.length === 1 ? 'material favoritado' : 'materiais favoritados'}`;
    }

    grid.innerHTML = favorites.length
      ? favorites.map(renderProductCardSafe).join('')
      : '<p class="empty-state">Você ainda não favoritou nenhum material.</p>';

    grid.querySelectorAll('[data-fav] .material-symbols-outlined').forEach((icon) => icon.classList.add('filled'));
    wireProductActions(grid);

    grid.addEventListener('favorite-toggled', (e) => {
      if (e.detail.favorited) return;
      e.target.closest('.product-card')?.remove();
      updateCount();
    });
  } catch (err) {
    grid.innerHTML = '<p class="empty-state">Não foi possível carregar seus favoritos agora.</p>';
    console.error(err);
  }
});
