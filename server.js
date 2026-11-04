const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const PORT = 3000;

const load = () => JSON.parse(fs.readFileSync(DATA, 'utf8'));
function save(db) {
  // write to temp file then rename, so a crash mid-write never corrupts data.json
  fs.writeFileSync(DATA + '.tmp', JSON.stringify(db, null, 2));
  fs.renameSync(DATA + '.tmp', DATA);
}

const posInt = (n) => Number.isInteger(n) && n > 0;
const nextId = (list) => Math.max(0, ...list.map((x) => x.id)) + 1;
function findProduct(db, id) {
  const p = db.products.find((p) => p.id === id);
  if (!p) throw new Error('product not found');
  return p;
}

// Each action mutates db or throws. Server only saves when no throw.
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

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') return send(res, 200, fs.readFileSync(path.join(__dirname, 'index.html')), 'text/html');
  if (req.method === 'GET' && req.url === '/api/data') return send(res, 200, load());

  const action = req.method === 'POST' && req.url.startsWith('/api/') && actions[req.url.slice(5)];
  if (!action) return send(res, 404, { error: 'not found' });

  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    try {
      const db = load();
      action(db, JSON.parse(body || '{}'));
      save(db);
      send(res, 200, db);
    } catch (e) {
      send(res, 400, { error: e.message });
    }
  });
});

if (require.main === module) {
  server.listen(PORT, 'localhost', () => console.log(`http://localhost:${PORT}`));
}

module.exports = { actions };
