/*
 * Konfiguration der Landingpage (nur oeffentliche Werte, hier steht nie ein Schluessel).
 *
 *   formEndpoint   – Funktion, die das Formular entgegennimmt und den Kontakt in Brevo speichert.
 *                    Siehe api/lead.js. Der Brevo-Schluessel liegt nur serverseitig in .env.local
 *                    bzw. in den Umgebungsvariablen des Hostings.
 *   bookedEndpoint – Funktion, die nach einer Calendly-Buchung den Status setzt (api/booked.js).
 *   formFormat     – "json" (application/json).
 *
 * TESTMODUS: Nur auf localhost/127.0.0.1 und nur ohne formEndpoint wird ein erfolgreicher Versand
 * simuliert (sichtbar als "Testmodus" gekennzeichnet). Mit ?fail=1 in der URL laesst sich der
 * Fehlerfall pruefen.
 */
window.VISCA_CONFIG = {
  formEndpoint: "/api/lead",
  bookedEndpoint: "/api/booked",
  formFormat: "json",
  calendlyUrl: "https://calendly.com/jannik-viscamarketing/30min",
  privacyUrl: "https://viscamarketing.com/rechtliches",
  localTestMode: true
};
