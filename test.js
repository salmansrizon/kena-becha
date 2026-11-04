const assert = require('assert');
const { actions } = require('./actions');

const db = { products: [{ id: 1, name: 'Rice', price: 450, stock: 3 }], sales: [] };

actions.sell(db, { productId: 1, qty: 2 });
assert.equal(db.products[0].stock, 1);
assert.equal(db.sales[0].total, 900);

assert.throws(() => actions.sell(db, { productId: 1, qty: 5 }), /only 1/);
assert.throws(() => actions.sell(db, { productId: 1, qty: 0 }));
assert.equal(db.products[0].stock, 1);

actions.undo(db, { saleId: 1 });
assert.equal(db.products[0].stock, 3);
assert.equal(db.sales.length, 0);

actions.restock(db, { productId: 1, qty: 7 });
assert.equal(db.products[0].stock, 10);

actions.add(db, { name: 'Tea', price: 220, stock: 5 });
assert.equal(db.products[1].id, 2);

console.log('ok');
