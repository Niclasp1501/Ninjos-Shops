# Agent Notes

**Lies zuerst [KONZEPT-shops.md](KONZEPT-shops.md).** Dieses Modul ist
ein Gerüst mit zwei fertigen Rechenkernen; alles andere ist eine Entscheidung,
die dort begründet steht. Wer ohne das Konzept anfängt, baut das vierte
Ladenmodul und nicht dieses.

## Stand am 05.09.2026

Gebaut sind die Schritte 1 bis 3 aus Abschnitt 11 des Konzepts.

| Datei | Zustand |
|---|---|
| `scripts/preise.js` | **fertig**, geprüft |
| `scripts/kasse.js` | **fertig**, geprüft |
| `tools/kasse.test.mjs` | 43 Fälle, laufen |
| `scripts/const.js` | fertig |
| `scripts/laden-model.js` | Untertyp `ninjos-shops.laden` und sein `TypeDataModel` |
| `scripts/laden-bogen.js` | Verwaltungsansicht: Ware, Preise, Verborgenes, Dienste |
| `templates/laden-kopf.hbs`, `laden-ware.hbs` | dazu |
| `styles/shops.css` | Bogen gestaltet; die Schauansicht fehlt darin noch |
| `scripts/main.js` | Einstellungen, Untertyp, Bogen, Willkommensfenster |
| `scripts/willkommen.js` | eingebaut, Texte stehen |
| Vorzeigen, Spielerfenster, Kauf, Marktbuch, Schauansicht | existiert nicht |

**Keine Zeile davon lief je in einer Welt.** Der Bogen ist geschrieben und
sprachlich vollständig, aber nicht geöffnet worden — was hier steht, ist
geprüfter Quelltext, kein geprüftes Verhalten.

Nichts ist bisher in Git; das Repository auf GitHub gibt es noch nicht.

## Vor jeder Änderung an preise.js oder kasse.js

```bash
node tools/kasse.test.mjs
```

Diese beiden Dateien fassen **kein Foundry-Dokument** an und dürfen es nie tun —
genau deshalb lassen sie sich ohne laufende Welt prüfen. Wer dort `game.` oder
`CONFIG.` schreibt, nimmt dem Modul seinen einzigen Test.

## Der Laden ist ein eigener Dokumenttyp

Kein Merkmal auf einem NSC — ein Akteur vom Untertyp `ninjos-shops.laden`,
angemeldet über `documentTypes` im Manifest und `CONFIG.Actor.dataModels` in
`init`. Warum das umentschieden wurde, steht in KONZEPT-shops.md, Abschnitt 4.

Vier Dinge, die daran hängen:

**Beides muss in `init` stehen** — `ladenTypEinrichten()` und
`ladenBogenEinrichten()`. Danach hat Foundry die Dokumentklassen gebaut; ein
später angemeldetes Datenmodell greift nicht mehr, und die Läden der Welt hätten
rohe Felder statt Werten.

**Der Typ heißt im Manifest `laden`, im Code `ninjos-shops.laden`.** Foundry
stellt die Modulkennung selbst davor. `LADEN_TYP` in `const.js` hält die lange
Form.

**Ist das Modul aus, sind die Läden unsichtbar.** Die Daten bleiben in der Welt
und kommen beim Einschalten unverändert zurück. Das gehört in die Anleitung,
sonst hält es jemand für Datenverlust.

**Das Hineinziehen ist geerbt, nicht selbst gebaut.** `ActorSheetV2` bringt in
v14 einen vollständigen Drop-Empfänger mit — `_onDropItem` in
`client/applications/sheets/actor-sheet.mjs` auf dem Server, mit Kompendium-Kopie
und Sortieren. Die erste Fassung hatte daneben einen eigenen `drop`-Listener und
hätte jedes Item **doppelt** angelegt; aufgefallen ist das erst beim Lesen des
Client-Quelltexts, nicht beim Schreiben. Wer den Bogen anfasst, liest dort nach
statt zu raten (Anleitung des Foundry-Servers, „Client-Quellcode als Referenz").

Ob dnd5e ein Item auf einen fremden Untertyp fallen lässt, ist damit **immer noch
nicht in einer laufenden Welt geprüft** — dnd5e 5.3.3 liegt als Bundle vor, ein
Grep nach Typ-Sperren in `_preCreate` fand nichts. Wer als Erster eine Welt
startet, prüft genau das.

## Die Fallen, die schon bekannt sind

**`system.price.valueInGP` ist unbrauchbar.** dnd5e rechnet in
`data/item/templates/physical-item.mjs:251`
`Math.floor(value * defaultCurrency.conversion / conversion)`. Für alles unter
einem Goldstück ergibt das null — eine Kerze zu 1 cp liest sich als geschenkt.
Immer `grundpreisCp()` benutzen.

**Ein Spieler kann auf einem fremden Akteur nichts anlegen oder löschen.** Jeder
Kauf läuft über den Spielleiter, wie der Tausch in den In-Person Tools
(`scripts/trade.js`). Das ist keine Vorsichtsmaßnahme, das ist die einzige Art,
wie es überhaupt geht.

**Erst anlegen, dann abziehen.** Bricht es dazwischen ab, gibt es den Gegenstand
doppelt statt gar nicht. Siehe `trade-mover.js` drüben, dieselbe Begründung.

**Der Preis wird beim Spielleiter neu gerechnet.** Was im Spielerfenster steht,
ist eine Anzeige, kein Vertrag.

## Was das Modul von anderen Modulen braucht

Nichts — und das bleibt so. Die einzige Verbindung ist eine **Brücke in eine
Richtung** zu den In-Person Tools: Sind sie da, liefern sie die Monitorerkennung
für die Schauansicht. Dafür müssen dort `isMonitorUser`, `isSceneDisplay` und
`isBattlemapDisplay` noch in die API (`scripts/main.js:693`) eingetragen werden.
`inPersonBruecke()` in `scripts/main.js` prüft das und fällt sonst auf die eigene
Einstellung zurück. Im Manifest steht `relationships.recommends`, niemals
`requires`.

## Versionierung

`<foundry-major>.<YYMM>.<patch>` wie in den anderen Modulen — `14.2609.1` ist der
Stand nach Schritt 3. Die erste Zahl ist die **Foundry**-Hauptversion, nicht unsere.

## Willkommensfenster

Steht und ist gemäß der Regel in der [CLAUDE.md des Workspace](../../CLAUDE.md)
eingebaut. Solange es keine Forge-Seite gibt, ist `slug: null` und die Karte
zeigt auf `/modules`. **Vor der ersten Veröffentlichung** gehört der Eintrag in
`Webapps/Ninjos-Forge/src/data/modules.js` nachgeholt und der `slug` gesetzt.

## Vor der ersten Veröffentlichung

- **Lizenz wählen** und als `LICENSE` ablegen; der Schlüssel `license` im
  Manifest ist bis dahin bewusst nicht gesetzt, statt eine zu raten. Die
  anderen Ninjo-Module stehen unter MIT.
- Forge-Eintrag anlegen und `slug` in `scripts/willkommen.js` setzen.
- GitHub-Repository anlegen; die URLs im Manifest zeigen bereits auf
  `Niclasp1501/Ninjos-Shops`.
