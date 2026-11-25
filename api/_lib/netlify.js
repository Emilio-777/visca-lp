'use strict';
/*
 * Adapter: macht aus einer Vercel-Funktion (req, res) eine Netlify-Funktion (event, context).
 * Netlify-Wrapper: netlify/functions/lead.js und booked.js. Bei Vercel und server.js nicht noetig.
 */
module.exports = function toNetlify(handler) {
  return async (event) => {
    let body = null;
    try { body = event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : null; } catch (_) { /* bleibt null */ }

    const req = { method: event.httpMethod, headers: event.headers || {}, body, socket: {} };
    const out = { statusCode: 200, headers: {}, body: '' };
    const res = {
      setHeader(k, v) { out.headers[k] = v; },
      status(c) { out.statusCode = c; return res; },
      json(o) { out.headers['Content-Type'] = 'application/json; charset=utf-8'; out.body = JSON.stringify(o); return res; },
    };
    await handler(req, res);
    return out;
  };
};
