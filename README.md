# Rechnungstool • HP67 (PWA)

Zero‑Install Web‑App zum Schreiben von Rechnungen. Läuft offline, speichert lokal, Live‑Vorschau, PDF via Druckdialog.

## Features
- Eigene Firmendaten speichern (IBAN/BIC, Logo, §19-Kleinunternehmer)
- Kundendaten speichern und auswählen
- Editierbare Rechnungsnummer, Datum, Fälligkeit, Währung
- Positionen mit Menge, Einheit, Preis, optionaler MwSt je Position
- Automatische Summen, MwSt. optional; §19-Hinweis
- Live‑Vorschau im A4‑Layout
- PDF: Button **PDF herunterladen** öffnet Druckdialog → **Als PDF speichern**
- JSON‑Export/Import der kompletten App‑Daten
- PWA: offline nutzbar, „zum Home‑Bildschirm“

## Verwendung
1. Öffne `index.html` lokal im Browser **oder** lade den Ordner in ein GitHub‑Repo hoch.
2. GitHub Pages aktivieren: Repository → Settings → Pages → „Deploy from branch“ → Branch `main` → `/root`. URL öffnen.
3. Auf iOS/iPadOS: Safari → Teilen → „Zum Home‑Bildschirm“. App startet dann eigenständig.
4. PDF: **PDF herunterladen** klicken → im Systemdialog **Als PDF sichern** wählen.

## Dateistruktur
```
/
├─ index.html
├─ style.css
├─ app.js
├─ manifest.json
├─ service-worker.js
└─ icons/
   ├─ icon-192.png
   └─ icon-512.png
```

## Hinweise
- Keine externen CDNs. Alles lokal gebündelt.
- PDF wird über den Browser‑Druckdialog erzeugt. Das ist robust und überall verfügbar.
- Daten werden im Browser `localStorage` gesichert. Kein Server.

## Lizenz
MIT
