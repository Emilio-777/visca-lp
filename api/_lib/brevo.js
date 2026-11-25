'use strict';
/*
 * Kleiner Brevo-Client. Der Schluessel kommt ausschliesslich aus der Umgebung (BREVO_API_KEY),
 * wird nie geloggt und nie an den Browser gegeben.
 */

const BASE = 'https://api.brevo.com/v3';

function listId() {
  const n = Number(process.env.BREVO_LIST_ID || 3);
  return Number.isInteger(n) && n > 0 ? n : 3;
}

async function brevo(method, path, body) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY ist nicht gesetzt');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { /* Antwort ohne JSON */ }
    if (!res.ok) {
      const err = new Error('Brevo ' + method + ' ' + res.status + (data && data.code ? ' (' + data.code + ')' : ''));
      err.status = res.status;
      err.detail = data && data.message ? String(data.message).slice(0, 300) : '';
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { brevo, listId };
