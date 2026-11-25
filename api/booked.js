'use strict';
/*
 * POST /api/booked
 * Wird von der Seite aufgerufen, wenn Calendly "event_scheduled" meldet.
 * Setzt STATUS "Termin gebucht" und BOOKED_AT (Datum, Europe/Berlin) beim bestehenden Kontakt.
 */

const { brevo } = require('./_lib/brevo');
const { readBody, guard } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (!guard(req, res)) return;

  const body = readBody(req);
  const email = body && typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : '';
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return res.status(400).json({ ok: false, error: 'invalid_email' });

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }); // YYYY-MM-DD

  // Fehler nur serverseitig protokollieren, die Buchung selbst ist bereits erfolgt.
  try {
    await brevo('PUT', '/contacts/' + encodeURIComponent(email), {
      attributes: { STATUS: 'Termin gebucht', BOOKED_AT: today },
    });
  } catch (err) {
    console.error('[booked] Brevo-Fehler:', err.message, err.detail || '');
  }

  return res.status(200).json({ ok: true });
};
