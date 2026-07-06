// Carrinho local (o pedido só existe no backend após o checkout).
const Cart = {
  KEY: 'pg_cart',
  getItems() {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : [];
  },
  saveItems(items) { localStorage.setItem(this.KEY, JSON.stringify(items)); },
  add(item) {
    const items = this.getItems();
    if (items.some((i) => i.id === item.id)) return;
    items.push(item);
    this.saveItems(items);
  },
  remove(id) { this.saveItems(this.getItems().filter((i) => i.id !== id)); },
  clear() { localStorage.removeItem(this.KEY); },
  count() { return this.getItems().length; },
  total() { return this.getItems().reduce((sum, i) => sum + Number(i.price || 0), 0); }
};