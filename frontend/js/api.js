// Cliente HTTP simples para a API do Pedagix.
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : '/api';

// Frontend e backend rodam em origens/portas diferentes em dev (ex: Live
// Server em :5500, API em :3000), então caminhos de upload como
// "/uploads/x.png" vindos do banco precisam ser resolvidos contra a origem
// do backend, não a do frontend.
const MEDIA_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : '';

function mediaUrl(path) {
  if (!path) return '';
  return /^https?:\/\//.test(path) ? path : `${MEDIA_BASE_URL}${path}`;
}

const Auth = {
  getToken() { return localStorage.getItem('pg_token'); },
  getUser() {
    const raw = localStorage.getItem('pg_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('pg_token', token);
    localStorage.setItem('pg_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('pg_token');
    localStorage.removeItem('pg_user');
  },
  isLogged() { return !!this.getToken(); }
};

async function apiRequest(path, { method = 'GET', body, isForm = false, auth = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });

  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch { /* resposta sem corpo JSON */ }

  if (!res.ok) {
    throw new Error(data?.error || `Erro ${res.status} ao acessar ${path}`);
  }
  return data;
}

const Api = {
  // Auth
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  me: () => apiRequest('/auth/me', { auth: true }),

  // Catálogo
  listProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (slug) => apiRequest(`/products/${encodeURIComponent(slug)}`),
  createProduct: (formData) => apiRequest('/products', { method: 'POST', body: formData, isForm: true, auth: true }),
  reviewProduct: (productId, payload) => apiRequest(`/products/${productId}/reviews`, { method: 'POST', body: payload, auth: true }),

  listCategories: () => apiRequest('/categories'),

  // Criadores
  featuredCreators: () => apiRequest('/creators/featured'),
  getCreator: (slug) => apiRequest(`/creators/${encodeURIComponent(slug)}`),
  myStore: () => apiRequest('/creators/me', { auth: true }),
  createStore: (payload) => apiRequest('/creators', { method: 'POST', body: payload, auth: true }),
  follow: (creatorId) => apiRequest(`/creators/${creatorId}/follow`, { method: 'POST', auth: true }),
  unfollow: (creatorId) => apiRequest(`/creators/${creatorId}/follow`, { method: 'DELETE', auth: true }),

  // Favoritos
  listFavorites: () => apiRequest('/favorites', { auth: true }),
  addFavorite: (productId) => apiRequest(`/favorites/${productId}`, { method: 'POST', auth: true }),
  removeFavorite: (productId) => apiRequest(`/favorites/${productId}`, { method: 'DELETE', auth: true }),

  // Pedidos / pagamento
  checkout: (payload) => apiRequest('/orders/checkout', { method: 'POST', body: payload, auth: true }),
  getOrder: (id) => apiRequest(`/orders/${id}`, { auth: true }),
  myOrders: () => apiRequest('/orders', { auth: true }),

  // Downloads
  myDownloads: () => apiRequest('/downloads', { auth: true })
};