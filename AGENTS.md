# Agent Notes

**Lies zuerst [KONZEPT-shops.md](KONZEPT-shops.md).** Dieses Modul ist
ein Gerüst mit zwei fertigen Rechenkernen; alles andere ist eine Entscheidung,
die dort begründet steht. Wer ohne das Konzept anfängt, baut das vierte
Ladenmodul und nicht dieses.

## Stand am 05.09.2026

Gebaut sind die Schritte 1 bis **5** aus Abschnitt 11 des Konzepts.

| Datei | Zustand |
|---|---|
| `scripts/preise.js` | **fertig**, geprüft |
| `scripts/kasse.js` | **fertig**, geprüft |
| `tools/kasse.test.mjs` | 43 Fälle, laufen |
| `scripts/const.js` | fertig (`WARE`, `OFFENER_LADEN`, Socket-Konstanten) |
| `scripts/laden-model.js` | Untertyp `ninjos-shops.laden` und sein `TypeDataModel` |
| `scripts/laden-bogen.js` | Verwaltungsansicht + Vorzeigen (wer sieht / zeigen / schließen) |
| `templates/laden-kopf.hbs`, `laden-ware.hbs`, `laden-vorzeigen.hbs` | dazu |
| `scripts/spieler-fenster.js` | Spielerfenster (ApplicationV2) |
| `templates/spieler-fenster.hbs` | Auslage, Börse, Kauf-Stub |
| `scripts/vorzeigen.js` | ZEIGEN / SCHLIESSEN / Flag |
| `scripts/socket.js` | Socket-Listener + STAND bei Inventaränderung |
| `styles/shops.css` | Bogen + Spielerfenster; die Schauansicht fehlt darin noch |
| `scripts/main.js` | Einstellungen, Untertyp, Bogen, Socket, Willkommen |
| `scripts/willkommen.js` | eingebaut, Texte stehen |
| `scripts/kauf.js` | Kauf bei der Spielleitung, mit Vorabprüfung |
| `scripts/angebot.js` | Angebote der Spielleitung zum Sonderpreis |
| `scripts/marktbuch.js` | Journal, zweimal je Kauf beschrieben |
| `scripts/zugaenge.js` | Verzeichnis-Knopf, Szenenwerkzeug, In-Person-Knopf |
| Schauansicht | existiert nicht (Schritt 6) |

**Am 05.09.2026 in der Welt „Geheimnisse der Abgründe" geprüft** (Foundry
14.367, dnd5e 5.3.3): Untertyp erscheint im Anlegen-Dialog als „Laden", Bogen
öffnet, Hineinziehen aus `dnd5e.items` legt genau **einen** Gegenstand an,
Aufschlag und Festpreis rechnen richtig (Dolch 2 gp → 3 GM bei 1,5; Festpreis
5 gp → 500 cp), Hinweiszeile und Verbergen speichern, Vorzeigen öffnet das
Spielerfenster, Verborgenes fehlt dort, Bestandsänderungen kommen live an,
Schließen räumt Flag und Fenster ab, und nach einem Neuladen ist das Fenster
wieder da. Zwei Fehler dabei gefunden und behoben — siehe unten.

**Was dabei noch offen blieb:** der Kauf (Schritt 5) und alles darüber.

Repository: https://github.com/Niclasp1501/Ninjos-Shops

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

## Spieler bekommen alle Akteure — sie sehen sie nur nicht

**Am 06.09.2026 als Spieler nachgemessen**, weil ich es zweimal falsch behauptet
hatte. Angemeldet als *Nadylos* (Rolle 1, keine Spielleitung):

| | |
|---|---|
| Laden in `game.actors` | **ja** |
| Ware im Speicher | **10 Gegenstände** |
| `fromUuid("Actor.…")` | **liefert ihn** |
| `laden.visible` | **false** |

Foundry schickt also **alle** Weltakteure an jeden Client und filtert nur die
Anzeige. Das Spielerfenster kann den Laden deshalb lesen, ohne dass er
irgendwo auftaucht — eine Zustellung über den Socket ist **nicht** nötig.

Wer das anzweifelt, misst nach, statt aus der Seitenleiste zu schließen: Der
Verzeichnisbaum (`_getVisibleTreeContents`) gibt alles unverändert zurück, und
die Filterung steckt woanders. Ich habe daraus zwischenzeitlich den falschen
Schluss gezogen, es werde serverseitig gefiltert.

## Läden sind für Spieler unsichtbar — und das ist zugesichert

**Ein Laden erscheint nie im Akteursverzeichnis eines Spielers.** Am 05.09.2026
in der Welt geprüft: Alle sechs Spieler stehen auf Stufe 0 (NONE),
`testUserPermission(u, "LIMITED")` ist für jeden `false` — und genau danach
filtert das Verzeichnis (`client-document.mjs:240`).

Dass das so bleibt, hängt an zwei Regeln:

1. **`preCreateActor` setzt `ownership: { default: NONE }`.** Ohne diese Zeile
   entscheidet die Voreinstellung der Welt, und ein Laden im Verzeichnis gibt
   den Spielleiterbogen preis — samt verborgener Ware und Ankaufsfaktor.
2. **Zugriff läuft nie über Foundrys Rechte, sondern über `system.zugriff`.**
   Eine eigene Liste mit drei Zuständen (niemand / Auswahl / alle). Ein
   OBSERVER-Recht wäre der bequeme Weg und genau der falsche: Es macht den
   Laden sichtbar. Wer hier je `laden.update({ownership: …})` schreibt, hebt
   die Zusage auf.

Die Daten liegen trotzdem auf jedem Client — Foundry filtert das Verzeichnis
clientseitig, schickt aber alles. Deshalb kann das Spielerfenster den Laden
lesen, ohne dass er irgendwo auftaucht. Das ist kein Trick, das ist der
Normalfall bei Foundry.

`system.zugriff.szenen` steht schon im Modell und wird heute von nichts
gelesen — vorgesehen für die Bindung an die sichtbare Szene. Es steht jetzt
dort, weil ein später ergänztes Feld in bestehenden Welten fehlt.

## Zwei Haken, die zu spät kommen

`getSceneControlButtons` wird **genau einmal** gerufen, wenn Foundry die
Szenenleiste baut — und `ui.controls.render()` ruft ihn **nicht** erneut. Ein
Haken, der erst bei `ready` hängt, kommt für die Leiste nie zum Zug. Deshalb
werden alle Haken in `zugaengeHaken()` bei **`init`** registriert.

Dasselbe in klein beim Akteursverzeichnis: Es ist bei `ready` längst
gezeichnet, also braucht es dort einmal `ui.actors.render()`, sonst erscheint
der Knopf beim ersten Start gar nicht. Beides ist in der ersten Probe genau so
aufgefallen.

## Farben und Aufbau: wie FANG, und warum

Der Bogen ist hell, serifenlos und in Karten aufgebaut — dieselben Werte wie
`fang.css`. Zwei Messungen stehen dahinter:

| | auf Foundrys dunklem Fenster | auf hellem Papier |
|---|---|---|
| `#8B0000` (Hausrot) | **1,97 : 1** | **8,6 : 1** |
| `#D4AF37` (Hausgold) | 9,4 : 1 | 1,7 : 1 |

Lesbar wird Text ab etwa 4,5 : 1. Die erste Fassung setzte das Rot als
Schriftfarbe auf das dunkle Fenster — „Vorzeigen" war dort nicht zu erkennen.
Auf hellem Grund trägt Rot den Text, Gold wird zur Kante. Wer hier eine Farbe
ändert, rechnet nach.

**Rot traegt die Fensterleiste, nicht die Flaeche.** Zwischenstand war ein
durchgehend roter Kopf ueber Bild, Name und Begruessung - gut hundert Pixel
Rot, und das Fenster sah aus, als waere etwas schiefgegangen. FANG macht es
umgekehrt: ein schmaler Streifen plus die Farbe der Knoepfe, der Rest hell.
Hier heisst das: `.window-header` rot mit Goldkante, der Kopf des Bogens hell
mit rotem Namen, und von drei Knoepfen ist nur die Hauptaktion gefuellt - die
beiden anderen tragen nur einen Rand. Drei rote Balken nebeneinander waeren
dieselbe Flaeche wie vorher und sagten ausserdem nicht, welcher gemeint ist.

**Die Einstellungen haben ein eigenes Fenster** (`laden-einstellungen.js`).
Sie standen im Bogen in einem `<details>` und füllten aufgeklappt das halbe
Fenster; die Auslage kam darunter nicht mehr vor. Eingestellt wird ein Laden
einmal, angesehen jede Sitzung.

**Jede Ware ist eine Karte, kein Tabellenzeile**, und Festpreis samt Schaltern
liegen in `.shops-werkzeuge`: sichtbar erst beim Überfahren. Vorher trug jede
Zeile sechs Bedienelemente gleichzeitig und die Ware ging darin unter. Der
Platz bleibt reserviert, damit beim Überfahren nichts springt.

## Spaltenköpfe gehören in die Liste

Ein Kopf **über** der Liste steht daneben: Die Liste hält Platz für ihre
Scrollleiste frei (`scrollbar-gutter: stable`), der Kopf außerhalb weiß davon
nichts — gemessen elf Pixel. Deshalb ist er ein `<li>` **in** der Liste, mit
`position: sticky`, demselben Innenabstand und einem unsichtbaren Rand, damit
der Kasten exakt dem einer Karte entspricht.

Wer eine Spaltenbreite ändert, ändert **beide** Stellen — Kopf und Karte. Und
Abstände nur über `gap` der Liste, nie zusätzlich als `margin` an einer Spalte:
Der Kaufknopf hatte beides und schob damit jede Karte um acht Pixel gegen ihren
Kopf.

## Keine Schriftregel auf `button`

Foundry setzt die Symbolklasse bei den Knöpfen der Fensterleiste **direkt auf
den Knopf**: `button.header-control.fa-solid.fa-xmark`, nicht auf ein
Kind-Element. Eine Regel wie

```css
.ninjos-shops button { font-family: var(--shops-schrift); }
```

überschreibt damit die Symbolschrift, und aus Menü, Bogenwechsel und Schließen
werden **drei leere Kästchen**. Der Fehler wirft nichts, er sieht nur kaputt
aus, und im Bild fällt er erst auf, wenn jemand hinschaut.

Deshalb endet der Geltungsbereich am `.window-content`, und alles mit einer
`fa-`-Klasse ist zusätzlich ausgenommen. Wer hier eine Schrift- oder
Farbregel für `button`, `i` oder `::before` ergänzt, prüft danach die
Fensterleiste.

## Symbole: nichts, was es 1400 nicht gab

Der Kaufknopf trug anfangs `fa-cart-shopping`. Ein Supermarktwagen in einem
Laden mit Fackeln und Langschwertern reißt jeden aus der Szene, und es fällt
sofort auf. Die Regel: Vor jedem neuen `fa-`-Symbol kurz prüfen, ob das Ding im
Spiel existieren könnte.

Was jetzt steht und warum: **Waage** (`fa-scale-balanced`) als Fenstersymbol,
**Hand, die entgegennimmt** (`fa-hand-holding`) für Kaufen, **Handschlag**
(`fa-handshake`) für Dienstleistungen — der Unterschied ist Absicht: Die Hand
nimmt eine Ware, der Handschlag besiegelt bloß eine Abmachung. **Münzen**
(`fa-coins`) für die Börse.

## Zwei Fallen, die erst die Welt gezeigt hat

**Jedes `PART` braucht genau ein Wurzelelement.** `HandlebarsApplicationMixin`
wirft sonst beim Zeichnen „Template part must render a single HTML element" —
und zwar erst beim Öffnen, nicht beim Schreiben. `laden-kopf.hbs` hatte
`<header>` und `<details>` nebeneinander, `spieler-fenster.hbs` sogar vier.
Alle drei liegen jetzt in einem `<div class="shops-teil-…">`.

**Kein `<form>` im Inhalt eines `DialogV2`.** Der Dialog *ist* ein Formular
(`tag: "dialog"` mit eigenem `<form>`), und ein verschachteltes wirft der
HTML-Parser stillschweigend weg. Der Auswahl-Dialog suchte im Rückruf nach
`form.shops-wahl`, fand nichts und gab eine leere Liste zurück: Der Dialog ging
zu, und es geschah nichts. Jetzt ein `<div>`, und der Rückruf sucht direkt am
Dialog.

**Fremde Module sehen den Laden-Akteur.** `Rideable` wirft bei jedem
`createItem` auf einem Laden einen Fehler in die Konsole, weil es bei jedem
Akteur Token auf der Karte erwartet. Das ist dessen Fehler, nicht unserer, und
er stört nichts — aber wer die Konsole liest, sollte wissen, woher er kommt.

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

**`<Foundry-Generation>.<JJMM>.<laufend>`** — die Regel steht seit dem 05.09.2026
in der [CLAUDE.md des Workspace](../../CLAUDE.md) unter „Versionsnummern der
Foundry-Module" und gilt für alle Module. Die erste Zahl ist die
**Foundry**-Hauptversion, nicht unsere; die zweite Jahr und Monat, **nachgeschlagen
und nicht aus dem Gedächtnis**; die dritte läuft im Monat hoch und beginnt jeden
Monat wieder bei 1.

`14.2609.2` ist der derzeitige Stand. Er ist **nirgends veröffentlicht** — siehe
unten.

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
- GitHub-Repository liegt unter `Niclasp1501/Ninjos-Shops`.
- **Tag `v<version>` und ein GitHub-Release**, und zwar zwingend. Das Manifest
  zeigt auf `releases/latest/download/module.json`; ohne Release gibt es kein
  „latest", die Installation über den Katalog schlägt fehl, und spätere Updates
  werden niemandem angeboten. Heute gibt es weder Tag noch Release — richtig so,
  solange nichts ausgeliefert ist, aber mit der ersten Auslieferung fällig.
  Bei der DnD5e-Übersetzung liefen deshalb zwei Fassungen auf dem Server, die es
  öffentlich gar nicht gab.
- **Der Release-Text kommt aus dem Changelog**, nicht aus der nackten Nummer. Die
  `notes`-Adresse im Foundry-Paketkatalog zeigt genau dorthin, und ein leerer
  Text ist eine verschenkte Seite. Fertig dafür ist
  `.github/scripts/release_notes.py` in
  [Ninjos-DnD5e5.5-Uebersetzung](../Ninjos-DnD5e5.5-Uebersetzung/.github/scripts/release_notes.py);
  es lässt sich unverändert übernehmen, im Workflow braucht es nur
  `body_path: release-notes.md` an der Release-Action (dort `release.yml:57`
  und `:63`).

  Hinweis aus der Übersetzungs-Session vom 06.09.2026, dort nachgeprüft.
