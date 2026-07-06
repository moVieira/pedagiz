function initHeader() {
  const badge = document.getElementById('header-cart-badge');
  if (badge) {
    const count = Cart.count();
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  const loginLink = document.getElementById('header-login-link');
  const avatar = document.getElementById('header-avatar');
  if (Auth.isLogged()) {
    const user = Auth.getUser();
    if (loginLink) loginLink.style.display = 'none';
    if (avatar) {
      avatar.style.display = 'flex';
      const initials = (user?.name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
      avatar.textContent = initials;
      avatar.title = user?.name || '';
      avatar.onclick = () => { window.location.href = 'downloads.html'; };
    }
  } else {
    if (loginLink) {
      loginLink.style.display = '';
      loginLink.onclick = () => { window.location.href = 'login.html'; };
    }
    if (avatar) avatar.style.display = 'none';
  }

  const cartBtn = document.getElementById('header-cart-btn');
  if (cartBtn) cartBtn.onclick = () => { window.location.href = 'carrinho.html'; };

  const searchForm = document.getElementById('header-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('header-search-input');
      const q = input ? input.value.trim() : '';
      window.location.href = `index.html${q ? `?busca=${encodeURIComponent(q)}` : ''}`;
    });
  }
}

document.addEventListener('DOMContentLoaded', initHeader);