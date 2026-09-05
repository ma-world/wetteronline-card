# WetterOnline Card

*[English version](README.md) · Deutsch*

Eine Lovelace-Karte für Home Assistant, die aktuelles Wetter und Stundenvorhersage
von [wetteronline.de](https://www.wetteronline.de) anzeigt — ohne Werbung,
ohne Cookie-Banner und ohne iframe.

Die Karte holt ihre Daten direkt im Browser und braucht daher **keine Integration,
keine Entität und keinen REST-Sensor** in Home Assistant.

## Was die Karte zeigt

- Aktuelle Temperatur, Ort, Region und Zeitstempel
- Sonnenauf- und -untergang
- Aktuelle Windgeschwindigkeit
- Stundenvorhersage mit Wettersymbol, Temperatur und Regenwahrscheinlichkeit
- Tages-Zusammenfassung als Textbanner
  (z. B. *„Heute scheint zeitweise die Sonne, aber später weht ein böig auffrischender Wind."*)

Hintergrund und Symbole passen sich an Bewölkung und Tageszeit an — nachts wird
aus der Sonne ein Mond.

## Installation

### HACS (empfohlen)

1. In HACS auf **⋮ → Benutzerdefinierte Repositories**
2. Repository `ma-world/wetteronline-card` hinzufügen, Kategorie **Dashboard**
3. **WetterOnline Card** herunterladen
4. Browser hart neu laden (`Strg`/`Cmd` + `Shift` + `R`)

### Manuell

1. `wetteronline-card.js` nach `config/www/` kopieren
2. In Home Assistant unter **Einstellungen → Dashboards → ⋮ → Ressourcen**
   eine neue Ressource anlegen:
   - URL: `/local/wetteronline-card.js`
   - Typ: **JavaScript-Modul**
3. Browser hart neu laden

## Konfiguration

```yaml
type: custom:wetteronline-card
api_key: "DEIN_KEY"
location_id: a6571
latitude: 50.08125
longitude: 8.51625
grid_latitude: "50.10"
grid_longitude: "8.48"
name: Sindlingen
region: Frankfurt am Main · Hessen
hours: 7
update_interval: 600
```

`api_key` und `location_id` musst du selbst ermitteln — wie das geht, steht im
nächsten Abschnitt. Ohne `api_key` antwortet die API mit `403`.

| Option            | Typ     | Standard | Beschreibung |
|-------------------|---------|----------|--------------|
| `api_key`         | string  | —        | **Pflicht.** Client-Schlüssel für die WetterOnline-API (siehe unten) |
| `location_id`     | string  | —        | **Pflicht.** Ortskennung von WetterOnline (siehe unten) |
| `latitude`        | number  | —        | Breitengrad des Ortes |
| `longitude`       | number  | —        | Längengrad des Ortes |
| `grid_latitude`   | string  | `latitude`  | Breitengrad des Vorhersagerasters |
| `grid_longitude`  | string  | `longitude` | Längengrad des Vorhersagerasters |
| `altitude`        | number  | `100`    | Höhe über NN in Metern |
| `name`            | string  | —        | Ortsname in der Überschrift („Wetter …") |
| `region`          | string  | —        | Text oben links, z. B. Bundesland |
| `hours`           | number  | `7`      | Anzahl der Stunden im Vorhersagestreifen |
| `show_sun`        | boolean | `true`   | Sonnenauf-/untergang anzeigen |
| `show_text`       | boolean | `true`   | Tages-Textbanner anzeigen |
| `update_interval` | number  | `600`    | Sekunden zwischen zwei API-Abrufen, Minimum 60 |

### Hinweis zum Aktualisierungsintervall

Die Daten werden einmal beim Öffnen der Ansicht geholt und danach im Takt von
`update_interval`. Verlässt du die Ansicht, stoppen die Timer; beim Zurückwechseln
wird sofort neu geladen. Die Uhrzeit im Kartenkopf aktualisiert sich alle 30
Sekunden, das kostet keinen zusätzlichen Abruf.

Werte unter 60 Sekunden werden auf 60 angehoben. Das Abrufen passiert in **jedem**
Browser, der das Dashboard offen hat — ein sehr kurzes Intervall vervielfacht sich
also über alle Geräte.

## Zugangsdaten ermitteln

Dieses Repository enthält **bewusst keinen API-Key**. Du liest ihn dir selbst aus
der WetterOnline-Website aus — zusammen mit den Koordinaten deines Ortes liefert
das folgende Snippet dir den kompletten, fertigen YAML-Block.

1. Öffne [wetteronline.de](https://www.wetteronline.de), suche deinen Ort und
   öffne dessen Wetterseite (URL sieht aus wie
   `wetteronline.de/wetter/frankfurt-am-main/sindlingen`)
2. Bestätige den Cookie-Dialog — sonst lädt die Seite nicht vollständig
3. Öffne die Entwicklerkonsole (`F12`, Reiter **Konsole**)
4. Füge dieses Snippet ein und drücke Enter:

```js
(() => {
  const el = document.getElementById('ng-state');
  if (!el) return console.error('Kein ng-state gefunden – bist du auf einer Ortsseite?');
  const st = JSON.parse(el.textContent);
  const key = Object.keys(st).find(k => k.includes('shortcast'));
  if (!key) return console.error('Kein shortcast-Eintrag gefunden.');
  const p = new URL(key).searchParams;
  console.log(
`type: custom:wetteronline-card
api_key: "${p.get('c')}"
location_id: ${p.get('location_id')}
latitude: ${p.get('latitude')}
longitude: ${p.get('longitude')}
grid_latitude: "${p.get('grid_latitude')}"
grid_longitude: "${p.get('grid_longitude')}"
name: DEIN_ORT
region: DEINE_REGION
hours: 7
update_interval: 600`);
})();
```

5. Kopiere die ausgegebenen Zeilen in deine Kartenkonfiguration und passe `name`
   und `region` an.

### Manuelle Alternative

Falls das Snippet nichts findet — WetterOnline ändert gelegentlich den Seitenaufbau:

- **API-Key:** Entwicklertools öffnen, Reiter **Netzwerk**, Seite neu laden und
  nach einer Anfrage an `api-web.wo-cloud.com` suchen. In deren URL steht der
  Parameter `c=…` — genau dieser Wert ist der `api_key`. Er ist für alle Orte
  identisch und ändert sich nur selten.
- **location_id:** Seitenquelltext anzeigen (`Strg`/`Cmd` + `U`) und nach
  `forecastKey` suchen. Der Wert dahinter — z. B. `"forecastKey":"a6571"` — ist
  die `location_id`. Die Rasterkoordinaten stehen in der Nähe unter `nowcastKey`.

Wenn die Karte plötzlich nicht mehr lädt, ist meistens der `api_key` erneuert
worden — dann einfach die Schritte oben wiederholen.

## Wichtiger Hinweis

Diese Karte nutzt **inoffizielle, undokumentierte Endpunkte** von WetterOnline —
dieselben, die deren eigene Website im Browser aufruft. Deshalb liegt hier auch
kein Schlüssel bei: Jede Nutzerin und jeder Nutzer ermittelt ihn selbst für die
eigene, private Verwendung.

Daraus folgt:

- Die Endpunkte und der Schlüssel können sich **jederzeit ohne Ankündigung ändern**,
  dann funktioniert die Karte nicht mehr, bis die Konfiguration angepasst wird.
- Es gibt **keine Zusicherung** von WetterOnline, dass diese Nutzung erlaubt ist.
  Dies ist ein privates Hobbyprojekt ohne jede Verbindung zur WetterOnline GmbH.
- Nutzung auf eigenes Risiko. Halte das `update_interval` großzügig und erzeuge
  keine unnötige Last.

Wer eine offiziell unterstützte Lösung braucht, ist mit einer der eingebauten
Wetter-Integrationen von Home Assistant (Met.no, DWD, OpenWeatherMap …) und der
nativen `weather-forecast`-Karte besser bedient.

*WetterOnline ist eine Marke der WetterOnline GmbH. Dieses Projekt steht in keiner
Verbindung zu ihr und wird von ihr weder unterstützt noch geprüft.*

## Lizenz

MIT — siehe [LICENSE](LICENSE).
