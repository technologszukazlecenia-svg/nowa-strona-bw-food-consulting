import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  let path = decodeURIComponent(url.pathname);
  if (path === '/') path = '/index.html';
  const clean = normalize(path).replace(/^([.][.][/\\])+/, '');
  let file = join(root, clean);
  if (!existsSync(file) && !extname(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file) || !statSync(file).isFile() || !file.startsWith(root)) file = join(root, '404.html');
  response.statusCode = file.endsWith('/404.html') ? 404 : 200;
  response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview: http://127.0.0.1:${port}`);
});
