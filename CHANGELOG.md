# Änderungen

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung `<foundry-major>.<YYMM>.<patch>`.

## [Unveröffentlicht]

### Hinzugefügt
- **Schritt 4: Vorzeigen und Spielerfenster.** Die Spielleitung zeigt einen
  Laden allen oder ausgewählten Benutzern; Empfänger öffnen das Spielerfenster
  mit Auslage (ohne Verborgenes), Preisen, Hinweiszeile, Diensten und eigener
  Börse. Kaufknopf ist ein Stub für Schritt 5 — kein Geld bewegt sich.
- Socket-Kanäle `ZEIGEN`, `SCHLIESSEN`, `STAND` (und Stub `KAUFEN`); offener
  Laden bleibt im User-Flag über Client-Reload erhalten; immer nur einer.
- Verwaltungsbogen: wer sieht diesen Laden gerade, Allen zeigen / Auswahl /
  Schließen.
- Konstante `OFFENER_LADEN` in `const.js`; `WARE` war beim Umbau in Schritt 3
  versehentlich mitgelöscht worden und ist wieder da.
- Konzept (`KONZEPT-shops.md`): Marktforschung über die fünf vorhandenen
  Ladenmodule, Entscheidung für ein eigenes Modul, Aufbau eines Ladens,
  Preis- und Rechtemodell, Kaufablauf über den Spielleiter, Schauansicht,
  Marktbuch.
- Preisrechnung (`scripts/preise.js`) und Kasse (`scripts/kasse.js`) als reine
  Funktionen ohne Foundry-Zugriff, mit 35 Tests.
- Gerüst: Manifest, Einstellungen, Willkommensfenster in Deutsch und Englisch.
- **Der Laden als eigenes Dokument**: Akteur-Untertyp `ninjos-shops.laden` mit
  `TypeDataModel` (`laden-model.js`) und eigenem Bogen (`laden-bogen.js`,
  `templates/laden-*.hbs`). Ware hineinziehen, Bestand, Festpreis je Stück,
  Hinweiszeile, Verborgenes, Dienstleistungen.
- `alsMuenzfeld()` in `preise.js`: Kupferbetrag als Zahl und Münzsorte, damit
  niemand für eine Plattenrüstung `150000` eintippen muss. Acht weitere Tests
  dafür, darunter 5000 Werte hin und zurück.

### Hinzugefügt
- **Einstellungsfenster je Laden** (`laden-einstellungen.js`) mit **Ladenbild
  und Tokenbild** zum Auswählen, Preisen, Kaufmodus und Zugriff.
- **Zugriffsverwaltung** (`system.zugriff`): drei Zustände — niemand,
  ausgewählte Spieler, alle. Ausdrücklich **nicht** über Foundrys Rechte, weil
  ein Besitzrecht den Laden im Akteursverzeichnis des Spielers erscheinen ließe.
  `system.zugriff.szenen` ist für die spätere Bindung an die sichtbare Szene
  angelegt und wird noch von nichts gelesen.
- Neue Läden bekommen `ownership: { default: NONE }` ausdrücklich gesetzt —
  damit ist „ein Laden ist für Spieler unsichtbar" zugesichert und nicht
  zufällig wahr.

### Geändert
- **Der Bogen ist gestaltet wie FANG** — helles Papier, serifenlos, das Rot in
  der Fensterleiste statt als Fläche, weiße Karten, dünne graue Ränder, dieselben Werte
  wie `fang.css`. Die Zwischenstufe „Ladenbuch aus Pergament" ist damit
  überholt.
- **Ladenbuch (überholt):** Pergament, Tinte, Messinglinien und eine
  Geldspalte rechts wie in einem Rechnungsbuch. Der Anlass war ein Messwert:
  `#8B0000` als Schriftfarbe auf Foundrys dunklem Fenster hat **1,97 : 1**
  Kontrast — „Vorzeigen" war praktisch unsichtbar. Auf Pergament hat dasselbe
  Rot **7,9 : 1**. Die Hausfarbe war nie das Problem, nur ihr Grund. Umgekehrt
  trägt Gold hier keinen Text mehr (1,7 : 1) und wird zur Linie.
- Spaltenkopf über der Auslage, feste Spaltenbreiten in beiden Fenstern, jede
  zweite Zeile leicht getönt. Schriften: Amiri und Modesto Condensed, beide
  bringt Foundry mit — keine Webschrift von außen.
- Neue Läden bekommen `icons/environment/settlement/market-stall.webp` statt des
  Kapuzenmännchens, dazu ein Token mit `actorLink: true`. Ohne die Verknüpfung
  hätte jedes Token auf der Karte eine eigene Kopie des Inventars — zwei
  Marktstände desselben Ladens mit getrennten Beständen.
- **Keine modernen Symbole mehr.** Der Kaufknopf trug einen Einkaufswagen; das
  ist ein Supermarktwagen von 1937 und in einem Laden mit Fackeln und
  Langschwertern fehl am Platz. Jetzt: eine Hand, die etwas entgegennimmt.
  Dienstleistungen tragen einen Handschlag statt eines Spendenherzens — der
  Unterschied ist damit auch sichtbar: Hand nimmt eine Ware, Handschlag
  besiegelt bloß eine Abmachung. Das Fenstersymbol ist die Waage des Händlers
  statt einer Ladenmarkise.

### Behoben
- **Die Knöpfe der Fensterleiste zeigten leere Kästchen.** Foundry setzt ihre
  Symbolklasse direkt auf den Knopf; unsere Schriftregel für `button` hat damit
  die Symbolschrift überschrieben. Sie gilt jetzt nur noch im `.window-content`
  und nie auf einem Element mit `fa-`-Klasse.
- **Der Bogen scrollte nicht.** `overflow: hidden` bei 767 px Inhalt in 582 px
  Fenster: Bei aufgeklappten Einstellungen war die Auslage unerreichbar.
- **Jedes `PART` braucht ein einziges Wurzelelement** — `laden-kopf.hbs`,
  `laden-vorzeigen.hbs` und `spieler-fenster.hbs` hatten mehrere nebeneinander
  und ließen den Bogen mit „must render a single HTML element" gar nicht erst
  aufgehen.
- **Der Auswahl-Dialog zeigte nichts vor.** Sein Inhalt war ein `<form>` im
  Formular des `DialogV2`; der HTML-Parser verwirft so etwas, der Rückruf fand
  seine Ankreuzfelder nicht und gab eine leere Liste zurück.

### Geändert
- **Ein Laden ist kein Merkmal auf einem NSC mehr.** Die erste Fassung des
  Konzepts hängte ihn als `flags` an einen vorhandenen Akteur; damit hätte ein
  Händler genau einen Laden führen können, ein Marktstand trüge Trefferpunkte,
  und ein `aufschlag: "1,2"` mit Komma wäre widerspruchslos angenommen und still
  falsch gerechnet worden. Die Verknüpfung zu NSC, Token oder Szenen-Note bleibt
  als Zusatzfunktion — als Liste, damit ein Händler zwei Stände führen kann.
  Begründung in KONZEPT-shops.md, Abschnitt 4.
- Entschieden: Die Schauansicht bekommen auch Nicht-Monitore, als Wahl beim
  Vorzeigen. Ein Beamer ist kein Monitorbenutzer und sieht doch genauso aus.
