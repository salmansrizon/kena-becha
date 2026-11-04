// Shared by server.js (Node) and index.html (browser demo mode).
// Each action mutates db or throws. Callers only save when no throw.
const posInt = (n) => Number.isInteger(n) && n > 0;
const nextId = (list) => Math.max(0, ...list.map((x) => x.id)) + 1;
function findProduct(db, id) {
  const p = db.products.find((p) => p.id === id);
  if (!p) throw new Error('product not found');
  return p;
}

const actions = {
  sell(db, { productId, qty }) {
    if (!posInt(qty)) throw new Error('qty must be a whole number above 0');
    const p = findProduct(db, productId);
    if (qty > p.stock) throw new Error(`only ${p.stock} ${p.name} in stock`);
    p.stock -= qty;
    db.sales.push({ id: nextId(db.sales), productId, qty, total: p.price * qty, date: new Date().toISOString() });
  },
  undo(db, { saleId }) {
    const i = db.sales.findIndex((s) => s.id === saleId);
    if (i < 0) throw new Error('sale not found');
    const s = db.sales[i];
    findProduct(db, s.productId).stock += s.qty;
    db.sales.splice(i, 1);
  },
  restock(db, { productId, qty }) {
    if (!posInt(qty)) throw new Error('qty must be a whole number above 0');
    findProduct(db, productId).stock += qty;
  },
  add(db, { name, price, stock }) {
    name = String(name ?? '').trim();
    if (!name) throw new Error('name required');
    if (!Number.isFinite(price) || price < 0) throw new Error('price must be 0 or more');
    if (!Number.isInteger(stock) || stock < 0) throw new Error('stock must be a whole number, 0 or more');
    db.products.push({ id: nextId(db.products), name, price, stock });
  },
};

if (typeof module === 'object') module.exports = { actions };
