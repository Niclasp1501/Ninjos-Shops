# Änderungen

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung `<foundry-major>.<YYMM>.<patch>`.

## [14.2609.2] - 2026-09-05

### Hinzugefügt
- **Schritt 4: Vorzeigen und Spielerfenster.** Die Spielleitung zeigt einen
  Laden allen oder ausgewählten Benutzern; Empfänger öffnen das Spielerfenster
  mit Auslage (ohne Verborgenes), Preisen, Hinweiszeile, Diensten und eigener
  Börse. Kaufknopf ist ein Stub für Schritt 5 — kein Geld bewegt sich.
- Socket-Kanäle `ZEIGEN`, `SCHLIESSEN`, `STAND` (und Stub `KAUFEN`); offener
  Laden bleibt im User-Flag über Client-Reload erhalten; immer nur einer.
- Verwaltungsbogen: wer sieht diesen Laden gerade, Allen zeigen / Auswahl /
  Schließen.
- Fehlende Konstanten `WARE` und `OFFENER_LADEN` in `const.js`.

### Geändert
- `AGENTS.md`: Stand Schritt 4; GitHub-Repository existiert.
- Version `14.2609.1` → `14.2609.2`.

## [Unveröffentlicht]

### Hinzugefügt
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
