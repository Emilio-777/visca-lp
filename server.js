'use strict';
/*
 * Kleiner Server fuer die Landingpage: liefert die Seite aus und stellt dieselben Funktionen
 * wie bei Vercel unter /api/lead und /api/booked bereit.
 *
 * Start:  node server.js          (Port per Umgebungsvariable PORT, Standard 5173)
 * Umgebungsvariablen: BREVO_API_KEY, BREVO_LIST_ID (lokal aus .env.local, sonst aus dem Hosting)
 *
 * Ausgeliefert werden nur die Seitendateien und der Ordner assets/. Dateien mit fuehrendem Punkt
 * (.env.local, .git, ...) sowie Server- und Funktionscode werden nie ausgeliefert.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// --- Umgebung aus .env.local / .env laden (ohne Abhaengigkeit, bestehende Werte bleiben) ---
for (const file of ['.env.local', '.env']) {
  try {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!m || line.trim().startsWith('#')) continue;
      let v = m[2];
      if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined && v !== '') process.env[m[1]] = v;
    }
  } catch (_) { /* Datei nicht vorhanden */ }
}

const routes = {
  '/api/lead': require('./api/lead'),
  '/api/booked': require('./api/booked'),
};

const PAGE_FILES = new Set(['/index.html', '/styles.css', '/app.js', '/config.js']);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function isServable(urlPath) {
  if (urlPath.split('/').some((seg) => seg.startsWith('.'))) return false;
  if (PAGE_FILES.has(urlPath)) return true;
  return urlPath.startsWith('/assets/') && Object.prototype.hasOwnProperty.call(MIME, path.extname(urlPath).toLowerCase());
}

function serveStatic(req, res, urlPath) {
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT + path.sep) || !isServable(urlPath)) return notFound(res);
  fs.readFile(file, (err, data) => {
    if (err) return notFound(res);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': urlPath.startsWith('/assets/') ? 'public, max-age=86400' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404');
}

function readJson(req, limit = 20000) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { req.destroy(); resolve(null); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (_) { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

function wrap(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (_) { return notFound(res); }

  const handler = routes[urlPath];
  if (handler) {
    wrap(res);
    if (req.method === 'POST') req.body = await readJson(req);
    try { await handler(req, res); } catch (err) {
      console.error('[server] Fehler in', urlPath, err && err.message);
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'server_error' });
    }
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res, urlPath);
});

const PORT = Number(process.env.PORT) || 5173;
server.listen(PORT, () => {
  console.log('Landingpage laeuft auf http://localhost:' + PORT + '/');
  console.log('Brevo: ' + (process.env.BREVO_API_KEY ? 'Schluessel gesetzt' : 'KEIN Schluessel gesetzt (BREVO_API_KEY)'));
});
