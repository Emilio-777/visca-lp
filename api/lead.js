'use strict';
/*
 * POST /api/lead
 * Nimmt das Formular entgegen, prueft es, speichert den Kontakt in Brevo und sagt der Seite,
 * ob der Lead qualifiziert ist (Kalender) oder nicht (Danke-Text).
 *
 * Format: Vercel-Funktion (module.exports = (req, res) => ...). Laeuft auch ueber server.js und,
 * mit dem Adapter in api/_lib/netlify.js, bei Netlify.
 */

const { brevo, listId } = require('./_lib/brevo');
const { readBody, guard } = require('./_lib/http');

// ================= Qualifizierungsregel (hier anpassen) =================
// Nicht qualifiziert, wenn das monatliche Budget ODER das geplante Budget "Unter 5.000 €" ist.
// Der Kontakt wird trotzdem in Brevo gespeichert.
function isQualified(budget, plannedBudget) {
  return budget !== 'Unter 5.000 €' && plannedBudget !== 'Unter 5.000 €';
}
// ========================================================================

// Namen der Namensfelder im Brevo-Konto. Dieses Konto nutzt die deutschen Standardfelder VORNAME / NACHNAME.
// Bei einem Konto mit englischen Standardfeldern hier 'FIRSTNAME' / 'LASTNAME' eintragen.
const ATTR_FIRST = 'VORNAME';
const ATTR_LAST = 'NACHNAME';

const BUDGETS = [
  'Noch keins',
  'Unter 5.000 €',
  '5.000 bis unter 10.000 €',
  '10.000 bis unter 25.000 €',
  '25.000 bis unter 50.000 €',
  '50.000 bis unter 100.000 €',
  '100.000 € oder mehr',
];
const PLANNED = BUDGETS.filter((b) => b !== 'Noch keins');

function str(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

function normalizeShop(v) {
  v = v.replace(/\s+/g, '');
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v.replace(/^\/+/, '');
  return v;
}

function validate(body) {
  const errors = {};
  const name = str(body.name, 120);
  const email = str(body.email, 200).toLowerCase();
  const budget = str(body.budget, 60);
  const planned = str(body.plannedBudget, 60);
  const shop = normalizeShop(str(body.shopUrl, 300));

  if (name.length < 2) errors.name = 'invalid';
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) errors.email = 'invalid';

  let shopUrl = '';
  try {
    const u = new URL(shop);
    if (/^([a-z0-9äöüß]([a-z0-9äöüß-]{0,61}[a-z0-9äöüß])?\.)+[a-z]{2,24}$/i.test(u.hostname)) shopUrl = u.toString();
  } catch (_) { /* ungueltig */ }
  if (!shopUrl) errors.shopUrl = 'invalid';

  if (!BUDGETS.includes(budget)) errors.budget = 'invalid';
  if (budget === 'Noch keins') {
    if (!PLANNED.includes(planned)) errors.plannedBudget = 'invalid';
  }
  const plannedBudget = budget === 'Noch keins' ? planned : '';

  return { errors, value: { name, email, budget, plannedBudget, shopUrl } };
}

function splitName(name) {
  const i = name.indexOf(' ');
  return i === -1 ? { first: name, last: '' } : { first: name.slice(0, i).trim(), last: name.slice(i + 1).trim() };
}

module.exports = async function handler(req, res) {
  if (!guard(req, res)) return;

  const body = readBody(req);
  if (!body) return res.status(400).json({ ok: false, error: 'invalid_body' });

  // Honeypot: Bots bekommen eine unauffaellige Antwort, es wird nichts gespeichert.
  if (str(body.company, 200)) return res.status(200).json({ ok: true, qualified: false });

  const { errors, value } = validate(body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, error: 'validation', fields: errors });

  const qualified = isQualified(value.budget, value.plannedBudget);
  const { first, last } = splitName(value.name);

  const attributes = {
    [ATTR_FIRST]: first,
    SHOP_URL: value.shopUrl,
    BUDGET: value.budget,
    QUALIFIED: qualified,
    STATUS: 'Lead',
  };
  if (last) attributes[ATTR_LAST] = last;
  if (value.plannedBudget) attributes.BUDGET_GEPLANT = value.plannedBudget;

  // Schlaegt Brevo fehl, darf der Nutzer trotzdem weiter (Buchung). Der Fehler wird nur serverseitig protokolliert.
  try {
    await brevo('POST', '/contacts', { email: value.email, attributes, listIds: [listId()], updateEnabled: true });
  } catch (err) {
    console.error('[lead] Brevo-Fehler:', err.message, err.detail || '');
  }

  return res.status(200).json({ ok: true, qualified });
};

module.exports.isQualified = isQualified;
