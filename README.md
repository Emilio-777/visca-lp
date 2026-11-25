# VISCA - Landingpage Influencer-Playbook

Landingpage fuer das Influencer-Playbook von VISCA Marketing. Besucher fordern das Playbook ueber ein
Formular an, werden in Brevo als Kontakt gespeichert und buchen danach ueber Calendly einen
Brand-Check (15 Minuten). Die Seite ist zuerst fuer Mobilgeraete gestaltet.

## Ablauf
1. Das Formular (Name, Shop-URL, Business-E-Mail, Influencer-Budget pro Monat) sendet an `POST /api/lead`.
2. `api/lead.js` prueft die Eingaben und speichert den Kontakt in Brevo (Liste aus `BREVO_LIST_ID`).
   - Budget oder geplantes Budget "Unter 5.000 EUR": Kontakt wird gespeichert, die Seite zeigt einen Danke-Text.
     Die Regel steht in der Funktion `isQualified` oben in `api/lead.js`.
   - Sonst zeigt die Seite den eingebetteten Calendly-Kalender (Name und E-Mail vorbefuellt).
3. Meldet Calendly eine Buchung (`calendly.event_scheduled`), ruft die Seite `POST /api/booked` auf.
   Das setzt im Brevo-Kontakt `STATUS = "Termin gebucht"` und `BOOKED_AT`.
4. Schlaegt Brevo fehl, kann der Nutzer trotzdem buchen. Der Fehler wird nur serverseitig protokolliert.

## Starten
Voraussetzung: Node.js 18 oder neuer (keine weiteren Abhaengigkeiten).

```
node server.js
```
Danach ist die Seite unter http://localhost:5173 erreichbar (Port ueber `PORT` aenderbar).
Lokal werden die Umgebungsvariablen aus `.env.local` gelesen (Vorlage: `.env.example`).

## Umgebungsvariablen (nur Namen)
- `BREVO_API_KEY` - API-Schluessel des Brevo-Kontos (nur serverseitig, nie im Browser oder im Repository)
- `BREVO_LIST_ID` - ID der Brevo-Liste, in die die Leads kommen (Standard 3)

In Brevo muessen die Kontaktattribute `VORNAME`, `NACHNAME` (bzw. `FIRSTNAME`/`LASTNAME`, siehe Konstanten
in `api/lead.js`), `SHOP_URL`, `BUDGET`, `BUDGET_GEPLANT`, `QUALIFIED` (Boolean), `STATUS` und
`BOOKED_AT` (Datum) existieren.

## Aufbau
| Datei / Ordner | Inhalt |
|---|---|
| `index.html`, `styles.css`, `app.js` | Seite, Gestaltung, Formular- und Buchungslogik |
| `config.js` | oeffentliche Einstellungen (Endpunkte, Calendly-Link), keine Schluessel |
| `api/lead.js`, `api/booked.js` | Funktionen im Vercel-Format (`module.exports = (req, res)`) |
| `api/_lib/` | Brevo-Client, Hilfsfunktionen, Netlify-Adapter |
| `server.js` | Kleiner Server: liefert die Seite aus und stellt `/api/lead` und `/api/booked` bereit |
| `netlify.toml`, `netlify/functions/` | Netlify-Anbindung der Funktionen (nicht getestet) |
| `assets/` | Bilder, Logos, Playbook-Auszuege, Video-Vorschaubilder |

## Sicherheit
- `server.js` liefert nur die Seitendateien und `assets/` aus. Dateien mit fuehrendem Punkt
  (z. B. `.env.local`) sowie Server- und Funktionscode werden nie ausgeliefert.
- Eingaben werden serverseitig geprueft (Pflichtfelder, URL, E-Mail, erlaubte Budgetstufen, Honeypot-Feld).
- Es gibt eine einfache Begrenzung der Anfragen pro IP.

## Hosting
Noch offen. Vercel: Ordner hochladen und die zwei Umgebungsvariablen setzen. Mit Node-Hosting:
`node server.js`. Die Dateien `.env.local` und `.claude/` gehoeren nicht auf den Server.