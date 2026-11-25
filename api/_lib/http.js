'use strict';
/* Gemeinsame Hilfen fuer die Funktionen: Body lesen, Methode pruefen, einfache Rate-Begrenzung. */

function readBody(req) {
  const b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  if (typeof b === 'string' || Buffer.isBuffer(b)) {
    try { return JSON.parse(String(b)); } catch (_) { return null; }
  }
  return null;
}

const hits = new Map();
// Best-effort-Begrenzung pro IP (in Serverless-Umgebungen pro Instanz). Der echte Schutz ist die Validierung.
function limited(req, max = 20, windowMs = 60000) {
  const fwd = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
  const ip = fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

function guard(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return false;
  }
  if (limited(req)) {
    res.status(429).json({ ok: false, error: 'rate_limited' });
    return false;
  }
  return true;
}

module.exports = { readBody, guard };
