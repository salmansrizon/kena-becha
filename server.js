const http = require('http');
const fs = require('fs');
const path = require('path');
const { actions } = require('./actions');

const DATA = path.join(__dirname, 'data.json');
const PORT = 3000;
const STATIC = { '/': ['index.html', 'text/html'], '/actions.js': ['actions.js', 'text/javascript'] };

const load = () => JSON.parse(fs.readFileSync(DATA, 'utf8'));
function save(db) {
  // write to temp file then rename, so a crash mid-write never corrupts data.json
  fs.writeFileSync(DATA + '.tmp', JSON.stringify(db, null, 2));
  fs.renameSync(DATA + '.tmp', DATA);
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

const server = http.createServer((req, res) => {
  const file = req.method === 'GET' && STATIC[req.url];
  if (file) return send(res, 200, fs.readFileSync(path.join(__dirname, file[0])), file[1]);
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

server.listen(PORT, 'localhost', () => console.log(`http://localhost:${PORT}`));
