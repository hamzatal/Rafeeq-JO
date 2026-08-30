#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   A static file server with a single-page fallback.

   The two Expo apps export with `web.output: "single"` (app.json), which means one
   `index.html` and client-side routing. Any server that 404s an unknown path — which
   is every trivial static server — therefore cannot serve `/(app)/wallet`, and the
   screenshot run would capture a 404 page for every screen but the first.

   So: serve the file if it exists, otherwise hand back `index.html` and let the
   router in the bundle decide. About forty lines, no dependency.

   Usage:
     node scripts/serve-static.mjs <root-dir> <port>
   ═══════════════════════════════════════════════════════════════════════════ */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const [rootArg, portArg] = process.argv.slice(2);
if (!rootArg || !portArg) {
  console.error('usage: node scripts/serve-static.mjs <root-dir> <port>');
  process.exit(1);
}

const ROOT = resolve(rootArg);
const PORT = Number(portArg);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

/** Resolve inside ROOT only. A path that escapes it is a traversal attempt. */
function safeJoin(root, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const full = join(root, clean);

  return full.startsWith(root) ? full : null;
}

createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  const candidate = safeJoin(ROOT, urlPath);

  const file =
    candidate && existsSync(candidate) && statSync(candidate).isFile()
      ? candidate
      : join(ROOT, 'index.html');

  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');

    return;
  }

  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`);
});
