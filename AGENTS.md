# Agent Notes

**Lies zuerst [KONZEPT-shops.md](KONZEPT-shops.md).** Fast alles an diesem
Modul ist eine Entscheidung, die dort begründet steht. Wer ohne das Konzept
anfängt, baut das vierte Ladenmodul und nicht dieses.

Was das Modul aus Sicht der Spielleitung tut und wie man es bedient, steht in
der [README](README.md) — dort auch die Anleitung.

## Stand am 06.09.2026

Gebaut sind die Schritte 1 bis **5** aus Abschnitt 11 des Konzepts, dazu
etliches, was dort noch nicht stand. **Es fehlt Schritt 6** — die Schauansicht
für den Monitor und die Brücke zu den In-Person Tools.

| Datei | Was darin steht |
|---|---|
| `scripts/preise.js` | Aufschlag, Festpreis, Umrechnung in Kupfer |
| `scripts/kasse.js` | Bezahlen mit Wechselgeld |
| `tools/kasse.test.mjs` | 43 Fälle, laufen ohne Welt |
| `scripts/const.js` | Merkmale, Socket-Kanäle, Kaufmodi |
| `scripts/laden-model.js` | Untertyp `ninjos-shops.laden` und sein `TypeDataModel` |
| `scripts/laden-bogen.js` | Verwaltungsansicht, Vorzeigen, Zeilenmenü |
| `scripts/laden-einstellungen.js` | Aufschlag, Kasse, Verkäufer, Zugriff, Szenen |
| `scripts/spieler-fenster.js` | Auslage, Börse, Kaufen, Verkaufen |
| `scripts/vorzeigen.js` | ZEIGEN / SCHLIESSEN / STAND, Merkmal am Benutzer |
| `scripts/socket.js` | Verteiler; **nur** die gewählte Verbindung führt aus |
| `scripts/vorsitz.js` | welche Verbindung das ist — ein Anspruch je Bitte |
| `scripts/kauf.js` | der Kauf, bei der Spielleitung, Preis neu gerechnet |
| `scripts/verkauf.js` | der direkte Ankauf angehakter Ware |
| `scripts/anfrage.js`, `anfrage-fenster.js` | die Verkaufsanfrage samt Verhandlung |
| `scripts/freigabe.js` | Kaufwünsche, die auf ein Ja warten |
| `scripts/angebot.js` | Sonderpreise an einzelne Spieler |
| `scripts/handel.js`, `handel-fenster.js` | Handel mit einer Person **ohne** Laden |
| `scripts/verknuepfung.js` | vom Händler zu seinem Laden |
| `scripts/ladenbuch.js` | das Buch am einzelnen Laden, gefiltert |
| `scripts/marktbuch.js` | das Buch über alle Läden, mit Gründen |
| `scripts/fensterpassen.js` | kein Fenster größer als der Bildschirm |
| `scripts/zugaenge.js` | Verzeichnis-Knopf, Szenenwerkzeug, In-Person-Knopf |
| `scripts/willkommen.js` | Willkommensfenster |
| `scripts/schau.js`, `monitore.js` | Schauansicht und Monitorbrücke |
| `scripts/szenenfeld.js` | Szenen an einen Laden hängen, per Drag & Drop |

**Alles hier ist an der laufenden Welt „Geheimnisse der Abgründe" geprüft**
(Foundry 14.367, dnd5e 5.3.3), am 06.09.2026 zuletzt mit **zwei Clients** —
Spielleitung im Browser, ein Spieler in einer zweiten, ferngesteuerten
Chrome-Instanz. Was dabei gefunden wurde, steht in den Abschnitten unten;
die beiden schwersten Fälle waren der doppelt ausgeführte Kauf und das
Fenster, das unten aus dem Bild lief.

**Zwei Eigenheiten dieser Welt**, die beim Bauen mehrfach den Ausschlag gaben:
`core.noCanvas` steht auf **an** — es gibt keine Tokens, also auch keine
Token-Knöpfe und keine betrachtete Szene. Und die Spielleitung ist oft
**zweimal** angemeldet, weil ein Tablet danebenliegt.

## Der Tausch ist am 08.09.2026 aus den In-Person Tools hierher gezogen

`scripts/tausch.js` — der Tausch zwischen zwei Spielern, vorher
`scripts/trade.js` in **Ninjos-InPerson-Tools**. Er und der Handelstisch sind
dieselbe Sache aus zwei Richtungen; zwei Tauschfenster in zwei Modulen
nebeneinander waren genau die Uneinheitlichkeit, gegen die der Tisch gebaut
wurde.

**Was dabei besser wurde.** Drüben lag der laufende Tausch in einer `Map` im
Speicher der Spielleitung — wer neu lud, verlor ihn. Hier liegt er als Merkmal
an **beiden** Benutzern und übersteht jedes Neuladen. Ausgeführt wird über
`vorsitz.js` statt über `game.users.activeGM`: Der nennt einen *Benutzer*,
keine *Verbindung*, und bei zwei angemeldeten Spielleitungen legten sonst beide
jedes Stück an.

**Der gefährliche Teil liegt an einer Stelle.** `uebergeben()` in `lager.js`
bewegt Ware und Münzen für **beide** Tische. Es legt an, bevor es wegnimmt;
ein Behälter reist samt Inhalt (der hängt über `system.container` an einer
Kennung, die sich beim Kopieren ändert); `ownership`, `equipped` und `attuned`
bleiben zurück. Wer dort etwas ändert, ändert es für Läden und Spieler
zugleich.

**Die Schnittstelle ist eine Funktion.** `game.modules.get("ninjos-shops").api
.tauschStarten` — mehr ruft drüben nicht herein. Beide Module laufen ohne das
andere: Ist Shops nicht da, sagt der Knopf in den In-Person Tools, wo die
Funktion steckt; sind die In-Person Tools nicht da, setzt Shops seinen eigenen
Knopf über die Spielerliste. Ist **beides** da, gehört der Knopf ihnen — ihrer
steht auch in der Bogenansicht, wo wir nicht hinkommen.

**An der alten Stelle** ist `trade.js` mitsamt Fenster, Bewegung und Buch
gelöscht; `trade-start.js` hält nur noch die Knöpfe und den Hinweis, und die
Figuren-Helfer, die die Bogenansicht braucht, stehen dort jetzt in
`figuren.js`. Von den drei Schaltern blieb einer: ob es den Weg hierher
überhaupt gibt.

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

## Wer bedient: der Verkäufer, nicht die Spielleitung

Ein Laden ist ein **Ort**, kein Mensch. Wer hinter der Theke steht, ist ein
NSC — `system.haendlerUuid`, in den Einstellungen per Ablage
hereingezogen statt aus einer Liste gesucht (in einer Welt mit dreihundert NSC
ist eine Auswahlliste unbenutzbar). Sein Name und Bild stehen im Kopf beider
Fenster und als Gegenüber in den Büchern.

**Die Spielleitung taucht dort nicht auf.** Sie führt den Handel aus, sie führt
ihn nicht. Fehlt die Verknüpfung, tritt das neutrale Wort „Verkäufer" an die
Stelle — ein Laden ohne benannten Händler ist ein gültiger Fall, kein
halbfertiger.

## Ein Menü je Warenzeile — und drei Fallen dabei

Fünf blasse Symbole nebeneinander lesen sich als grauer Schleier, nicht als
fünf Schalter; vier davon braucht man selten. Sie liegen deshalb in einem Menü
hinter „⋯". **Der Zustand bleibt trotzdem sichtbar**: Verborgen,
Dienstleistung und Ankauf stehen als kleine Marken hinter dem Namen — was man
erst nach dem Aufklappen erführe, hat man beim Überfliegen nicht.

Drei Dinge sind dabei schiefgegangen und stehen hier, damit sie es nicht
wieder tun:

1. **Kurze Wörter, nicht die Erklärungen.** Zuerst waren die Tooltip-Schlüssel
   wiederverwendet — im Menü standen drei ganze Sätze untereinander und sahen
   aus wie ein Absatz, nicht wie eine Auswahl. Dafür gibt es jetzt
   `SHOPS.Menue.*`.
2. **Die Liste scrollt.** Ein Menü *in* der Zeile wird an der Unterkante der
   Liste abgeschnitten: bei der vorletzten Zeile sah man zwei von sieben
   Einträgen. Es hängt jetzt am `document.body`, fest positioniert am Knopf,
   und klappt nach oben, wenn unten kein Platz ist.
3. **Der `z-index` gilt plötzlich gegen die Fenster.** Am Körper liegt das
   Menü nicht mehr in seiner Zeile, sondern neben den Anwendungen von Foundry
   — und die stehen bei 100 und darüber, ein Ladenbogen bei 105. Mit den
   geerbten 20 klappte es brav auf und lag **hinter** dem Fenster: Der Klick
   tat scheinbar nichts, und genau so wurde es zweimal gemeldet. Kein Wert
   knapp darüber, denn Foundry zählt beim Anklicken hoch — 10000, aus der Liga
   der Kurzhinweise.
4. **Am Körper greift `.ninjos-shops …` nicht mehr.** Alle Regeln des Moduls
   sind darunter verschachtelt — das Menü stand als Reihe nackter Knöpfe auf
   der Karte. Es trägt die Modulklasse jetzt selbst, und seine Regeln stehen
   unverschachtelt als `.shops-menue …`.

## Die Fensterleiste trägt kein Rot mehr

Sie war die erste der drei Aufgaben von Rot: „das Modul erkennen". Auf
Pergament war sie zu laut — der Grund ist warm und ruhig, und darüber saß ein
satter Balken, der um Aufmerksamkeit bat, die er nicht braucht.

**Kein reines Schwarz.** Das läse sich wie die Leiste irgendeiner Anwendung.
Ein warmes Braunschwarz mit leichtem Verlauf gehört in dieselbe Welt wie das
Papier: der Lederrücken eines Buches, auf dessen Seiten der Laden steht. Die
goldene Haarlinie darunter bleibt — an ihr erkennt man das Modul.

Rot hat damit nur noch zwei Aufgaben: die eine Hauptaktion je Block, und
Warnung samt Sonderfall.

## Wofür Rot da ist — und wofür nicht

Rot stand einmal an jeder Überschrift, in der Schrift jedes zweiten Knopfes, an
jedem Festpreis und jeder Summe. **Wenn alles betont ist, ist nichts betont**,
und das Fenster wirkt unruhig, ohne dass man sagen kann, warum.

Rot hat jetzt drei Aufgaben, und nur die:

1. **die Fensterleiste** — daran erkennt man das Modul
2. **die eine Hauptaktion je Block**, als Fläche gefüllt
3. **Warnung und Sonderfall** — Sonderpreis, gescheitert, zu wenig Geld

Alles Übrige trägt Tinte oder das gedämpfte Braungrau. Überschriften ordnen
über eine dünne Linie statt über Farbe; ein Festpreis bleibt an der gepunkteten
Goldlinie erkennbar, nicht am roten Text. Wer hier eine neue rote Stelle
einführt, prüft vorher, in welche der drei Aufgaben sie fällt.

**Keine Knöpfe ohne Beschriftung.** Zwei Bücher standen kurzzeitig als reine
Symbolknöpfe in der Vorzeigen-Leiste, brachen dort in eine zweite Zeile um und
waren nicht mehr zu lesen. Sie stehen jetzt im **Fenstermenü**
(`window.controls`), wo sie ihren Namen tragen und keinen Platz kosten — und
die Leiste enthält wieder nur das, was ihre Überschrift verspricht.

## Farbe gehört ans Bauteil, nicht in eine Sammelregel

Eine Regel, die `color` für **alle** `button` im Fenster setzte, gewann gegen
die weiße Schrift der gefüllten Knöpfe: gemessen `rgb(26,26,26)` auf
`#8b0000`, also **1,6 : 1**. Die Knöpfe sahen dadurch aus wie ein Rot, das es
im Modul gar nicht gibt — und genau so ist es aufgefallen. Die Sammelregel
setzt jetzt nur noch die Schriftart.

## Zwei Bücher, und sie sind nicht dasselbe

| | **Marktbuch** (`marktbuch.js`) | **Ladenbuch** (`ladenbuch.js`) |
|---|---|---|
| Wo | Welteinstellung, alle Läden | Merkmal am einzelnen Laden |
| Für wen | nur Spielleitung | alle — Spielleitung alles, Spieler nur eigenes |
| Was | alle Läden, **auch fehlgeschlagene** Versuche, zweimal je Vorgang | ein Laden, nur was durchging |
| Wofür | die Buchhaltung: wo sind die 400 Gold geblieben | die Ladentheke: was habe ich hier gehandelt |

**Die Trennung im Ladenbuch ist eine Anzeige, kein Geheimnis.** Die Zeilen
liegen als Merkmal auf dem Laden, und Foundry schickt jeden Weltakteur an jeden
Client — wer die Konsole öffnet, liest auch die Zeilen der anderen. Für den
Tisch reicht das: Es geht darum, dass niemand die Käufe der anderen
*durchblättert*. Soll es dicht sein, müsste die Spielleitung jede Zeile einzeln
über den Socket ausliefern, und das Buch wäre ohne sie leer. Das ist bewusst
anders gelöst als beim Spielraum der Verkaufsanfrage, wo die Zahlen tatsächlich
entfernt werden — dort hätte ein Blick in die Konsole die Verhandlung entwertet.

**Höchstens 200 Zeilen je Laden.** Sie gehen in jede Weltsicherung und an jeden
Client; ohne Grenze wächst ein vielbesuchter Laden unbemerkt weiter, bis jemand
beim Laden der Welt wartet und niemand weiß, warum.

## Handel ohne Laden — und warum nur die Spielleitung ihn auslöst

Nicht jeder, der etwas hergibt, führt ein Geschäft. Für den Fremden am Feuer
einen Laden anzulegen wäre Buchhaltung für eine Szene, die drei Sätze dauert.
`handel.js` und `handel-fenster.js` machen daraus einen Handel mit einer
**Person** — jedem Akteur, ohne Ladentyp, ohne Einstellungen.

Drei Entscheidungen darin:

1. **Die Spielleitung löst aus, immer.** Ein Spieler kann keinen Handel
   beginnen und niemanden ansprechen. Sonst stünde am Tisch die Frage im
   Raum, mit wem man alles handeln darf — und die beantwortet das Gespräch,
   nicht ein Fenster.
2. **Was angehakt ist, sieht der Spieler; sonst nichts.** Der Bogen einer
   Person enthält ihre ganze Ausrüstung, ihre Zauber, ihr Erspartes. Vorgelegt
   wird, was gemeint ist, zum Preis, der gemeint ist.
3. **Die Börse der Person blockiert nie.** Sie wird belastet und
   gutgeschrieben, aber ein Handel scheitert nicht am leeren Beutel eines NSC,
   den die Spielleitung selbst aufgesetzt hat. Wer einen Beutel will, der leer
   werden kann, nimmt einen Laden mit `eigeneKasse`.

Das Angebot liegt als Merkmal **am Benutzer**, nicht in der Socket-Nachricht —
dieselbe Begründung wie bei `angebot.js`: Die Antwort kommt vom Client des
Spielers; stünden die Preise darin, könnte er sich jeden beliebigen schicken.
Und es übersteht ein Neuladen.

### Ein Angebot darf an mehrere gehen — der Bestand entscheidet

Am Tisch hält man ein Schwert in die Runde, nicht einem Einzelnen unter die
Nase. Ein Handel, der nur an eine Person gehen kann, wäre ein Werkzeug für
einen Fall, den es selten gibt. Nur: Das Schwert gibt es einmal.

Deshalb ist **der Bestand die Wahrheit und nicht das Angebot.** Wer zuerst
zugreift, bekommt es. Dass nicht zwei gleichzeitig gewinnen können, sichert
die Wahl in `vorsitz.js` — genau eine Verbindung führt aus, und sie tut es
nacheinander; die zweite Bitte findet den Bestand schon verringert vor.

`handelAbgleichen(person)` zieht danach **alle** offenen Angebote dieser Person
am wirklichen Bestand nach: Was weg ist, verschwindet aus den anderen Fenstern;
was nur teilweise weg ist (drei von fünf Fackeln), steht mit der Zahl da, die
noch stimmt. Ohne das klickten die anderen auf etwas, das es nicht mehr gibt,
und erfuhren erst danach, dass sie zu spät waren.

Ein Haken auf `updateItem`/`deleteItem` macht dasselbe, wenn die Spielleitung
dem NSC von Hand etwas abnimmt. Während ein Zugriff läuft, hält er still
(`laeuft`) — sonst schrieben zwei Stellen dasselbe Merkmal. `createItem` fehlt
mit Absicht: Was einmal aus einem Angebot gefallen ist, kommt nicht von selbst
zurück; das Angebot ist eine Zusage, und die erneuert die Spielleitung, indem
sie es noch einmal hinlegt.

### Der Rückweg ist dieselbe Verhandlung, nicht eine zweite

„Ich hätte da auch etwas" öffnet **das Packfenster aus `anfrage-fenster.js`** —
dasselbe wie am Ladentresen. Dafür musste `anfrage.js` lernen, dass ein
Gegenüber nicht zwingend ein Laden ist: Die Sitzung heißt seither
`gegenueberUuid`/`gegenueberName` und trägt ein `istLaden`.

Der Unterschied liegt an genau **zwei** Stellen:

- **Die Zahlen.** Ein Laden hat `ankauf` (ab Werk 0 — „kauft nichts an"). Eine
  Person hat kein solches Feld, und 0 wäre hier falsch: Die Spielleitung hat
  den Handel gerade selbst eröffnet, will also handeln, bekäme aber drei Nullen
  hingelegt. Für eine Person gilt `PERSON_ANKAUF = 0.5` und Spielraum 0.25 —
  ein **Vorschlag**, kein Preis. Im Verhandlungsfenster steht deshalb
  „ohne Laden — die Zahlen sind nur ein Vorschlag" daneben, sonst liest man sie
  als Politik eines Ladens.
- **Das Ausführen.** `fuehreAnkaufAus` legt die Ware beim Gegenüber ab, gleich
  welcher Art. Nur zahlt ein Laden mit `eigeneKasse` und kann pleitegehen,
  während der Beutel einer Person nie blockiert (siehe Punkt 3 oben). Und nur
  ein Laden führt ein `ladenbuch`; für eine Person schreibt
  `schreibeHandelVerkauf` ins Marktbuch.

Zwei Verhandlungen nebeneinander zu bauen hieße, jede künftige Änderung zweimal
zu machen — und die zweite beim ersten Mal zu vergessen.

## Die Verknüpfung pflegt sich selbst

`VERKNUEPFT` (`flags["ninjos-shops"].laeden`) stand vom ersten Tag an in
`const.js` und wurde von **nichts** gelesen — der Laden kannte seinen Händler,
der Händler seinen Laden nicht.

**Der Knopf am Bogen steht für die Spielleitung immer da**, auch wenn die
Person noch keinen Laden führt — dann führt er zum Verbinden oder Anlegen
(`ohneLaden`). Vorher erschien er nur mit Laden, und damit war er als Anzeige
brauchbar und als Weg unbrauchbar: Wer einem NSC einen Laden geben wollte,
musste wissen, dass das über ein Feld **im Ladenbogen** geht — also im Fenster,
das er noch gar nicht hat. Man legt einen Laden aber an, während man die Person
vor sich hat. Für Spieler bleibt er verborgen, solange kein Laden dranhängt:
Ein Knopf, der nur zu Werkzeugen führt, die sie nicht bedienen dürfen, ist im
Weg.

`Actor.implementation.create` löst `preUpdateActor` **nicht** aus — der Haken
sieht nur Änderungen. Beim Anlegen wird `listeSetzen` deshalb von Hand
gerufen, sonst hätte der neue Laden einen Verkäufer, aber der Verkäufer keinen
Knopf zu seinem Laden.

**Von Hand gepflegt wäre sie falsch.** Zwei Angaben, die dasselbe meinen,
laufen immer auseinander, und dann öffnet ein Token einen Laden, den es nicht
mehr gibt. Die Liste hängt deshalb an `haendlerUuid`: Wer im Ladenfenster
einen Verkäufer setzt, hat die Verknüpfung gesetzt; wer ihn austauscht, hat
sie umgehängt (`preUpdateActor` merkt sich den alten Wert, `updateActor`
schreibt um, `deleteActor` räumt auf). `verknuepfungNachtragen()` holt bei
`ready` nach, was vor dieser Funktion schon eingetragen war.

**Der Token-Knopf allein hätte nicht gereicht.** Das Konzept nennt „ein Klick
auf sein Token", und den gibt es — aber er setzt eine Leinwand voraus. In
dieser Welt steht Foundrys `core.noCanvas` auf **an**, wie auf jedem Tisch,
der ohne Karten spielt: keine Tokens, kein Bedienfeld, kein Knopf. Am
06.09.2026 beim Testen aufgefallen, als `canvas.ready` dauerhaft `false`
blieb. Der Knopf sitzt deshalb auch in der **Titelleiste des Händlerbogens**,
und ein Eintrag steht im Kontextmenü des Akteursverzeichnisses.

**Szenen-Noten sind bewusst draußen.** Das Konzept nennt sie, aber Foundry
gibt einer Note kein Bedienfeld, an das sich ein Knopf hängen ließe — es
bliebe ein Merkmal, das niemand auslösen kann. `laedenVon()` fragt nach dem
Merkmal und nicht nach der Dokumentart, also liest es eine Note mit, sobald
es einmal einen Weg dorthin gibt.

## Ein Nein gehört ins Buch

Eine Ablehnung im Freigabe-Modus war eine Meldung, die verschwand. Drei Wochen
später weiß niemand mehr, dass überhaupt gefragt wurde — „wir haben doch
damals gefragt" ist am Tisch eine echte Frage.

Jetzt schreiben beide Bücher, und zwar verschieden:

- **Marktbuch:** jedes Ja *und* jedes Nein, mit dem Namen dessen, der
  entschieden hat. Bei drei Spielleitungen beantwortet das „wer hat das
  durchgewinkt".
- **Ladenbuch:** nur das Nein, samt Satz. Ein Ja steht dort nicht eigens — die
  Kaufzeile folgt einen Wimpernschlag später und sagt dasselbe.

Eine Freigabe ist **keine Richtung**: Es ist noch nichts geflossen. Sie bekommt
weder den Pfeil der Käufe noch das Rot der Fehlschläge, sondern den goldenen
Streifen. Und das Ja trägt die gedämpfte Marke, nicht die rote — rot bleibt
dem Nein.

## Zwei Fenster, ein Speicher

Die Szenenbindung lässt sich an zwei Stellen bearbeiten: in den
Ladeneinstellungen („Auf welchen Szenen") und im Szenenfenster unter
*Verschiedenes* („Läden auf dieser Karte"). **Gespeichert wird nur an einer**:
`system.zugriff.szenen` am Laden. Das Szenenfenster ist ein zweites Fenster auf
dieselben Daten und legt nichts eigenes an — ein Merkmal an der Szene wäre eine
zweite Liste, die dasselbe meint, und die läuft auseinander (dieselbe
Begründung wie bei `verknuepfung.js`).

Daraus folgt eine Eigenheit: **Der Szenenbogen schickt beim Speichern nur seine
eigenen Felder ab.** Ein `flags.…`-Feld darin würde am Laden nichts ändern.
Jeder Zug und jeder Klick im Szenenfenster schreibt deshalb sofort ans
Ladendokument — nicht beim Absenden.

**Der Reiter ist `.tab[data-tab="misc"]`, und das `.tab` ist wesentlich.** Zwei
Elemente tragen `data-tab="misc"`: der Knopf in der Reiterleiste und die Seite
darunter. Der Knopf kommt im Dokument zuerst — ohne `.tab` landen die Felder in
der Leiste und liegen über allem. (Das steht so auch in den In-Person Tools,
deren Szenenfeld hier Vorbild war.)

**Und in einem fremden Fenster färbt man selbst.** Der Chip erbte die
Schriftfarbe von Foundrys dunklem Szenenbogen und stand hell auf hell.
Dieselbe Falle wie bei den Knöpfen und der Nahansicht.

## Wer und wo sind zwei Fragen

`zugriff.modus` beantwortet, **wer** einen Laden selbst aufmachen darf;
`zugriff.szenen` beantwortet, **wo**. Erst beide zusammen ergeben
„erreichbar" — nachzulesen in `offenbareLaeden()`.

Die Szenenliste ist bewusst **kein dritter Modus**. Als Filter darüber lässt
sich sagen „alle Spieler, aber nur auf dem Marktplatz"; als Modus ginge das
nicht. Und getrennt bleiben die Fragen unterscheidbar: „Warum sieht Roxy den
Laden nicht?" hätte sonst zwei Antworten, und die Einstellung zeigte nur eine.
**Leer heißt überall** — so verhält sich jeder Laden, den es vor dieser
Funktion schon gab.

**Die betrachtete Szene entscheidet, nicht das Token der Figur.** Am Tisch
heißt „auf der Szene sein", dass die Karte offen ist. Ein Token als Bedingung
wäre präziser und trügerischer: Der Laden ginge nicht auf, weil die Figur
keinen Spieler hat, weil ihr Token noch nicht gesetzt ist oder weil der Kampf
auf einer Kopie der Szene läuft. Das ist am Tisch nicht zu erklären.

**`game.scenes.current` allein reicht nicht.** Es ist die *betrachtete* Szene,
und die gibt es nur mit laufender Leinwand. Auf einem Client ohne — Foundrys
eigene Einstellung „Kein Canvas", die auf schwachen Tablets gesetzt wird — ist
sie `null`, während `game.scenes.active` dasteht. Am 06.09.2026 an einem
Client ohne Leinwand gemessen: `current: null`, `active: "GdA Landingpage"`.
Ohne den Rückfall auf `active` wäre ein szenengebundener Laden für genau diese
Leute nie erreichbar, und niemand käme darauf, warum. `LadenModel.hiesigeSzene()`
hält beides an einer Stelle.

Aus demselben Grund hängen **zwei Haken** am Szenenwechsel: `canvasReady`
meldet, dass dieser Client eine andere Karte betrachtet — aber nur mit
Leinwand. Wer ohne arbeitet, erfährt den Wechsel nur daran, dass eine andere
Szene aktiv wird (`updateScene` mit `active: true`).

**Zu macht nur, was der Spieler selbst aufgemacht hat.** Was die Spielleitung
vorzeigt, bleibt stehen — sie hat es aufgemacht, sie macht es zu. Die beiden
Fälle unterscheidet das Merkmal `offenerLaden` am Benutzer: Selbst geöffnete
tragen keins.

## Der Freigabe-Modus, und was er nicht kann

Der Modus stand ein halbes Jahr lang als Text da: im Datenmodell, im
Einstellungsfenster und als Satz im Bestätigungsdialog des Spielers — „Dieser
Laden gibt jeden Kauf erst nach Bestätigung der Spielleitung frei". Passiert
ist nichts; der Kauf lief durch wie im Modus `direkt`. Wer eine Einstellung
anbietet, schuldet ihr auch ein Verhalten.

`scripts/freigabe.js` hält die wartenden Kaufwünsche. Drei Entscheidungen
darin sind bewusst so und nicht anders:

1. **Erst prüfen, dann fragen.** `pruefeKauf` läuft, bevor irgendjemand
   gefragt wird. Ein Kauf, der am Geld oder am Bestand scheitert, scheitert
   sofort — die Spielleitung über einen Kauf entscheiden zu lassen, der
   ohnehin nicht geht, wäre unhöflich gegen beide.
2. **Ein Angebot braucht keine Freigabe.** Wer einen Preis zugesagt hat, hat
   zugestimmt. `angebotCp === 0` zählt dabei als Preis, nicht als „keiner" —
   deshalb wird gegen `null` geprüft und nicht auf Wahrheitswert.
3. **Beim Ja wird nicht die alte Rechnung ausgeführt, sondern neu gerechnet.**
   `freigabeErteilen` reicht die ursprüngliche Bitte an `fuehreKaufAus`
   weiter, und das prüft alles noch einmal mit dem Stand von jetzt. Zwischen
   der Frage und dem Ja kann der Bestand gesunken oder das Geld ausgegeben
   worden sein.

**Der Speicher ist flüchtig**, wie bei den Verhandlungen in `anfrage.js`: Die
Liste liegt im Arbeitsspeicher genau der Verbindung, die den Kauf aufgenommen
hat. Lädt die Spielleitung neu, sind offene Kaufwünsche weg und der Spieler
muss noch einmal klicken. Das ist der Preis dafür, dass nichts davon in der
Welt gespeichert wird — ein Kaufwunsch ist eine Frage im Raum, kein Dokument.

**`render(true)` ist asynchron.** `verhandelnOeffnen` rief direkt danach
`bringToFront()` und griff damit auf ein Fenster zu, das es noch nicht gab:
`Cannot read properties of undefined (reading 'style')`, jedes Mal beim ersten
Aufmachen. Wer ein frisch gezeichnetes Fenster anfasst, wartet vorher auf
`render`.

## `activeGM` ist ein Benutzer, keine Verbindung

Wer bei zwei Spielleitungen genau eine ausführen lassen will, greift zu
`game.users.activeGM` — Foundrys eigene Antwort darauf. Sie reicht nicht.
`activeGM` benennt einen **Benutzer**. Hat dieselbe Spielleitung zwei Tabs
offen — zweiter Bildschirm, vergessenes Fenster, das Handy daneben —, sind
beide Clients `activeGM`, und beide führen aus.

**Gemessen am 06.09.2026** in der Testwelt, zwei angemeldete Clients, ein Klick
auf „Kaufen" für eine Fackel:

| | erwartet | gemessen |
|---|---|---|
| Antworten beim Spieler | 1 | **2** |
| Buchungen im Ladenbuch | 1 | **2**, 16 ms auseinander |
| Fackeln in der Tasche | 1 | **2** |
| bezahlt | 2 KM | **2 KM** |
| Bestand im Laden | −1 | **−1** |

Der ausführende Client bekam die Bitte dabei **einmal** und antwortete
**einmal** — nachgemessen mit einem Zähler um seinen Socket-Listener. Die
zweite Antwort kam von einer zweiten Verbindung derselben Spielleitung.

Bezahlt und abgebucht wurde nur einmal, weil beide Ausführungen denselben
Stand lasen und denselben zurückschrieben — der klassische verlorene
Schreibvorgang. Je nachdem, welcher Schritt gewinnt, bekommt der Spieler die
Ware doppelt und zahlt einfach, oder er zahlt doppelt und bekommt einfach.

**Die Lösung steht in `scripts/vorsitz.js`: ein Anspruch je Bitte.** Wer
ausführen will, ruft seine Kennung in den Raum, wartet 250 ms und führt nur
aus, wenn seine die kleinste aller Meldungen ist. Die Kennung ist je
Verbindung zufällig und bleibt, solange der Tab lebt — dieselbe Verbindung
gewinnt also immer, und es entsteht kein Hin und Her.

Kein Herzschlag mit Client-Liste: Dann müsste man entscheiden, wann eine
Meldung veraltet ist, und in genau diesem Fenster führt entweder niemand aus
oder wieder zwei. Ein Anspruch je Bitte kennt das Problem nicht — es meldet
sich, wer in diesem Moment da ist.

Zwei Dinge gehören dazu:

- **Jede Bitte braucht eine `bitteId`.** Ohne sie nimmt die zweite Bitte die
  Meldungen der ersten für ihre eigenen. Sie entsteht beim Absender.
- **Auch die Spielleitung schickt über den Socket.** Vorher rief sie
  `beiSpielleitung()` direkt auf, wenn sie selbst die Zuständige war. Dann
  liefe die Wahl an ihr vorbei, und die Sitzung läge auf einer anderen
  Verbindung als die Ausführung. Der eigene Socket kommt nie zurück, also
  läuft der Anspruch daneben lokal mit.

**Was offen bleibt:** Die Verhandlung einer Verkaufsanfrage liegt im
Arbeitsspeicher genau der Verbindung, die sie aufgenommen hat. Der zweite Tab
derselben Spielleitung sieht im Verhandlungsfenster nichts. Das ist die
Theke — an ihr steht einer.

## Papier, nicht Weiß

Die erste Palette war sauberes Weiß auf hellem Grau — richtig für eine
Anwendung, falsch für einen Laden in einer Fantasiewelt. Papier ist nie weiß:
Es ist warm, es hat eine Faser, und was darauf steht, ist Tinte und nicht
Schwarz. Die Tokens am Ende von `shops.css` ersetzen deshalb die von oben.

**Die Faser kommt ohne Bild.** Ein `feTurbulence`-Rauschen als Daten-URI wiegt
dreihundert Zeichen; ein Pergamentfoto wären hundert Kilobyte, die auf jedem
Bildschirm anders aussehen. Entscheidend ist, **wo** es liegt: als
`background-image` mit `background-blend-mode: multiply` im Hintergrund, nicht
als Schicht über dem Inhalt. Über dem Inhalt läge das Rauschen auch auf der
Schrift.

**Im Hellen trägt ein Verlauf keine Schrift.** Die Schauansicht lässt sich
zwischen Dunkel und Pergament umstellen, und im hellen Modus war der Ladenname
über dem bunten Kopfbild kaum zu lesen: dunkle Tinte auf einem hellen Schleier
über einem Bild wird matschig. Der Titelblock bekommt dort eine eigene Fläche —
ein Zettel, der auf dem Bild liegt. Im Dunkeln braucht es das nicht, dort steht
Weiß auf einem dunklen Verlauf.

## Die Schauansicht: eine Uhr, viele Schirme

Der Bildschirm an der Wand ist der Grund, aus dem dieses Modul eigenständig
ist. Drei Entscheidungen tragen ihn:

1. **Nichts daran lässt sich bedienen.** Kein Titelbalken, kein Kreuz, kein
   Knopf, `cursor: none`. Der Monitor hat keine Tastatur, und niemand steht am
   Tisch auf, um darauf zu tippen — die Steuerung liegt im Ladenbogen.
2. **Das Blättern treibt die Spielleitung**, nicht der Schirm. Liefe auf jedem
   Gerät eine eigene Uhr, stünden zwei Monitore im selben Raum binnen Minuten
   auf verschiedenen Seiten, und das sieht man sofort. Der
   **Fortschrittsbalken** läuft dagegen örtlich: Er ist eine Animation, kein
   Zustand, und beginnt mit jeder Seite neu.
3. **Von Hand blättern hält an.** Wer weiterschaltet, weil jemand fragt „was
   war das dritte nochmal", will nicht, dass die Anzeige zwei Sekunden später
   von selbst weiterspringt.

**Groß oder klein ist eine Eigenschaft des Bildschirms, nicht des Ladens** —
deshalb ein eigenes Merkmal `schau` neben `offenerLaden`. Es übersteht ein
Neuladen, damit ein Monitor nach einem Absturz von selbst zurückkommt; sonst
müsste die Spielleitung aufstehen. Ein Schirm bekommt **kein** Spielerfenster:
Er hat keine Börse, und ein Kaufknopf, den niemand drücken kann, wäre ein
Versprechen ins Leere.

**Die Schauansicht ist dunkel**, obwohl das Modul sonst hell ist. Ein leuchtend
weißer Schirm im abgedunkelten Wohnzimmer blendet. Das ist der eine Ort im
Modul, an dem die Farben bewusst kippen.

### Die Sanduhr, und die Falle im `clip-path`

Der Fortschrittsbalken war die einzige Stelle, an der die Schauansicht nach
Software aussah statt nach einer Bude auf einem Marktplatz. Eine Sanduhr sagt
dasselbe und liest sich ohne Erklärung.

**Der Beschnitt gehört an eine ruhende Gruppe, nicht an das bewegte Element.**
Zwei Rechtecke stecken in Trichter-Beschnitten und werden über die Standzeit
verschoben. Sitzt der `clip-path` am Rechteck selbst, wandert er mit: Er wird
im Koordinatensystem *seines* Elements aufgelöst, und die Verschiebung steckt
schon darin. Der Sand wurde dann nie beschnitten — er lief unten aus dem Glas
heraus und stand als Trapez unter der Fassung. Am 06.09.2026 gesehen und am
Bild erkannt, nicht am Code.

Verschoben wird, nicht die Höhe animiert: `transform` bewegt der Browser auf
der Grafikkarte, eine animierte `height` rechnet er in jedem Bild neu.

**Der Vortrag überlebt kein Neuladen — also nimmt er sich selbst wieder auf.**
Er liegt im Arbeitsspeicher genau der Verbindung, die ihn gestartet hat. Lädt
die Spielleitung neu, blättert niemand mehr, und die Schirme bleiben auf ihrem
letzten Bild stehen; gemeldet als „ich sehe nur angehalten". Zwei Zeilen lösen
das: Bei `ready` schaut die zuständige Spielleitung nach, ob jemand das
`schau`-Merkmal trägt, und beginnt von vorn — und ein Bildschirm, der
zurückkommt, **fragt** nach dem Stand (`tat: "wo"`), statt darauf zu warten,
dass zufällig ein Takt vorbeikommt.

**Und ein Ausweg für die Spielleitung.** Die Schicht ist mit Absicht
unbedienbar — auf einem Monitor sitzt niemand davor. Wer sie sich aber ansehen
will, hat den ganzen Bildschirm zugedeckt, also auch die Steuerung im
Ladenbogen. Escape schließt sie deshalb, und der Hinweis darauf erscheint nur
bei der Spielleitung.

### Die Brücke fragt, drüben antwortet noch niemand

`monitore.js` fragt die In-Person Tools nach `isMonitorUser` und fällt auf die
eigene Liste zurück, wenn die Antwort fehlt. Am 06.09.2026 nachgesehen: Deren
API gibt `openPanel, isActive, getStats, resetStats, refresh, openTrade,
openTradeLog, sheetView` heraus — die drei Funktionen aus ihrer `state.js`
(`isMonitorUser`, `isSceneDisplay`, `isBattlemapDisplay`) stehen weiter nicht
darin. Das ist eine Zeile in einem Objektliteral **drüben** und die einzige
Änderung, die dieses Modul an einem anderen braucht.

Statt darauf zu warten, liest die Brücke **die beiden Einstellungen direkt**,
in denen die In-Person Tools ihre Schirme halten: `monitorBM` und `monitorSC`,
je eine Benutzerkennung. Wer dort einen Monitor eingetragen hat, trägt ihn hier
nicht noch einmal ein. Die Verbindung bleibt einseitig und optional — fehlen
die Einstellungen, fällt alles auf die eigene Liste zurück.

**Leer heißt „nicht eingerichtet", nicht „keiner".** Stünden die Einstellungen
drüben nur da, ohne dass jemand einen Schirm eingetragen hat, würde die eigene
Liste ausgegraut und niemand wäre Monitor — eine Sackgasse ohne Ausweg. Erst
ein echter Eintrag drüben bekommt hier das Sagen.

Und das Fenster **sagt**, woher die Auskunft kommt. Eine Einstellung, die
dasteht und nichts bewirkt, kostet jemanden eine halbe Stunde Suche nach dem
Grund, warum sein Monitor nicht umschaltet.

## Ein Fenster, das Platz hat, soll ihn auch benutzen

Am 06.09.2026 gefragt: „Warum wird die Breite und Höhe des Fensters, die
verfügbar ist, noch nicht so gut ausgenutzt?" Es waren **drei** Ursachen, und
jede einzelne hätte allein gereicht.

### 1. `flex: 1` am Namen schluckt jeden Pixel

`.shops-name` stand auf `flex: 1`. In einem 780 px breiten Fenster ist das
richtig. In einem 1170 px breiten steht ein sechs Zeichen langes Wort in einer
700 px breiten Spalte, und zwischen Name und Bestand klafft ein Loch — das
Fenster ist groß, benutzt ist es nicht.

**Die Lösung ist keine breitere Zeile, sondern eine zweite Spalte.** Eine
Auslage ist eine Liste von Karten, und Karten legt man nebeneinander, wenn
Platz da ist. Das nutzt die Breite *und* halbiert die Höhe.

### 2. Eine Container-Abfrage kann ihren Container nicht umbauen

`container-type` stand zuerst an der Liste selbst. Im breiten Fenster griff
dann das `display: none` am Spaltenkopf — ein Kind —, aber das `display: grid`
an der Liste nicht: Der Kopf verschwand, und die Karten standen weiter
einspaltig untereinander. **`@container` gilt nur für die Nachkommen des
Containers.** Der Container ist deshalb der Abschnitt `.shops-auslage`.

Und `repeat(2, minmax(0, 1fr))` statt `1fr 1fr`: Sonst bestimmt der breiteste
Warenname die Spur, und die Spalten stehen ungleich — gemessen 565 gegen 594
Pixel.

### 3. `requestAnimationFrame` läuft nicht in einem verdeckten Fenster

Das war die teuerste Stunde. `fensterpassen.js` wartete mit `rAF` auf das
fertige Bild — und ein Browser, dessen Fenster verdeckt oder minimiert ist,
zeichnet nicht und ruft den Rückruf **nie**. Gemessen: Im Render-Haken stand
der Bogen auf 524 statt 780 Pixel, und der Rückruf kam auch nach zweieinhalb
Sekunden nicht. Auf einem zweiten Bildschirm, den gerade niemand ansieht, wäre
jedes Fenster ungeklemmt geblieben.

`setTimeout(…, 0)` läuft auch dann. Warten muss man trotzdem: Im Haken selbst
hängt der Inhalt noch nicht vollständig am Dokument.

**Und: nicht messen, sondern fragen.** Für die Sollbreite gilt
`app.position.width` — die Zahl, die das Fenster meint. Aus der gemessenen
Breite von 524 mal anderthalb wurden genau die 780 der Voreinstellung; es sah
aus, als passiere gar nichts.

### Was die Klemmung dabei falsch machte

Sie schrieb jedem Fenster eine feste Höhe, auch wenn nichts zu klemmen war.
Damit war `height: "auto"` vorbei: Eine neue Anfrage am Tresen machte das
Fenster nicht mehr höher, sondern nur den Inhalt länger. Die Höhe wird jetzt
nur angefasst, wenn sie wirklich über den Rand geht.

## Ein Fenster so hoch machen, wie sein Inhalt es braucht

Klingt nach zwei Zeilen, waren drei Fallen — alle drei am 06.09.2026 gemessen,
keine davon aus dem Code ersichtlich.

**1. Die Breite zuerst.** Sie ändert den Umbruch: Mit 1170 statt 780 Pixeln
steht die Auslage zweispaltig und braucht die halbe Höhe. Wer die Höhe vorher
misst, misst die des schmalen Fensters.

**2. Nicht nur beim ersten Zeichnen.** So war es gebaut, und es ging schief:
Beim ersten Mal steht das Fenster noch im Aufbau, der Fehlbetrag fällt zu klein
aus — gemessen 262 statt 630 —, und danach war „einmal gewachsen" verbraucht.
Gewachsen wird jetzt bei jedem Zeichnen, solange die Maße noch die sind, die
**wir** zuletzt gesetzt haben. Wer selbst zieht, hat das letzte Wort.

**3. Foundrys `max-height` klebt.** Einem Fenster mit `height: "auto"` schreibt
Foundry ein `max-height` in den Stil, berechnet aus der Oberkante zum Zeitpunkt
des ersten Setzens — und rechnet es nie wieder neu. Gemessen: Oberkante 8,
verlangt 984, `max-height` blieb bei **922** (= 1000 minus der ursprünglichen
Oberkante 78). Jedes `setPosition` prallte daran ab, auch nach dem Verschieben
nach oben. Der Deckel wird deshalb selbst auf den Bildrand gesetzt.

Zwei Fälle beim Wachsen, und der Unterschied ist Absicht: Fehlt wenig, kommt
genau das dazu — ein Fenster wegen zwanzig Pixeln auf Bildschirmhöhe zu ziehen
wäre unverschämt. Fehlt viel, geht es gleich bis zum Rand, denn der Zuschlag
allein reicht dann nicht: Teile des Fensters wachsen mit (der Verkaufsbereich
steht auf `max-height: 42%` und nimmt von jedem gewonnenen Pixel einen Teil
zurück).

Gemessen danach: Ladenbogen 720 → **805** auf 1104 Pixel Bildhöhe, nichts
scrollt mehr; Spielerfenster bei 1600×1000 auf **984** von 984 möglichen.

## Kein Fenster größer als der Bildschirm

Auf einem Tablet stand das Spielerfenster oben am Rand und lief unten aus dem
Bild — die untere Hälfte der Auslage, die Verkaufsliste und die Fußleiste waren
nicht mehr erreichbar. Verschieben half nicht: Die Titelleiste war schon oben,
und die untere Kante, an der man es kleiner ziehen könnte, lag außerhalb.

Das ist die übliche Falle bei `height: "auto"` — Foundry misst den Inhalt und
macht das Fenster so hoch, wie es sein will. Auf einem großen Bildschirm fällt
es nie auf.

`scripts/fensterpassen.js` hängt sich an `renderApplicationV2` und deckelt
jedes Fenster mit der Klasse `ninjos-shops` auf den sichtbaren Bereich minus
8 px, klemmt seine Lage vollständig hinein und zieht bei `resize` **und**
`visualViewport.resize` nach — auf Tablets kommt beim Drehen und beim
Aufklappen der Tastatur nur das zweite verlässlich. Was nicht hineinpasst,
scrollt in `.window-content`.

Gemessen nach dem Einbau, Spielerfenster mit elf Waren:

| Bild | Fenster | vollständig im Bild | Inhalt scrollt |
|---|---|---|---|
| 1024 × 700 | 580 × 660 | ja | nein |
| 900 × 480 | 580 × 464 | ja | ja |
| 820 × 420 | 580 × 404 | ja | ja |

Die Regel gilt workspaceweit und steht auch in der `CLAUDE.md` der Wurzel.

## Zwei Clients testen, ohne zweiten Browser

Der Weg Spieler → Spielleitung lässt sich nicht mit einem Fenster prüfen, und
zwei Foundry-Sitzungen in einem Browserprofil gehen nicht: Die Sitzung hängt
am Cookie, die zweite Anmeldung überschreibt die erste.

Was hier funktioniert hat, ohne Playwright zu installieren: eine zweite
Chrome-Instanz mit eigenem `--user-data-dir` und
`--remote-debugging-port`, gesteuert über das Devtools-Protokoll. Node bringt
`WebSocket` mit, mehr braucht es nicht — `Runtime.evaluate` führt beliebiges
JavaScript im Spieler-Client aus, also auch echte Klicks auf die Knöpfe des
Spielerfensters und auf „Ja" im Bestätigungsdialog. Headless mit
`--use-gl=swiftshader`; Foundry meckert über fehlende Hardware-Beschleunigung
und läuft.

Der eingebaute Browser des Editors taugt dafür nicht: Er blockiert
`/scripts/**` (`ERR_BLOCKED_BY_CLIENT`), und ohne `foundry.mjs` bleibt die
Anmeldeseite leer.

## Verkaufen: zwei Wege, und warum es zwei sind

**Angehakte Ware geht sofort durch.** Der Ankaufsfaktor allein reicht als
Bedingung nicht: Ein Kräuterhändler mag Tränke zurückkaufen und trotzdem kein
Langschwert wollen. Deshalb gibt es je Ware in der Auslage den Haken
`flags.ninjos-shops.ankauf` — und nur was der Laden **schon führt** und
angehakt ist, verkauft sich ohne Rückfrage. Die Prüfung sitzt in
`nimmtLadenAn()` und wird server- wie clientseitig gestellt; hinge sie nur an
der Anzeige, verkaufte eine Socket-Nachricht von Hand dem Kräuterhändler das
Langschwert.

**Alles andere läuft über eine Verkaufsanfrage** (`anfrage.js`), gebaut wie der
Tausch in den In-Person Tools: eine Sitzung, die bei der Spielleitung liegt,
beide Seiten zeichnen aus dem Zustand, den sie zurückschickt.

Der Ablauf hat einen Schritt mehr als der Tausch:

```
Spieler packt  →  Spielleitung sieht Werte und nennt Preis
               →  Spieler nimmt an oder lehnt ab  →  Ausführung
```

**Die drei Zahlen sieht nur die Spielleitung, und zwar wirklich.** Üblicher
Ankaufswert, Untergrenze und Obergrenze werden vor dem Verschicken aus der
Sitzung **entfernt**, nicht bloß ausgeblendet — ausgeblendete Zahlen lägen im
Speicher des Spieler-Clients und wären mit einer Zeile in der Konsole zu lesen.

**Das Modul kennt keine Laune und keine Beziehung.** Es rechnet aus
`system.spielraum` (ab Werk 0,25) nur aus, was oben und unten vertretbar wäre,
und legt der Spielleitung beide Zahlen hin. Wer gut mit dem Händler steht,
bekommt die obere; wer ihn verstimmt hat, die untere. Entschieden wird am
Tisch. Alles andere wäre der erste Schritt zu einer Wirtschaftssimulation, und
die ist in Abschnitt 12 des Konzepts ausdrücklich ausgeschlossen.

## Das Ladensymbol: dieselbe Waage, aus der freien Ausgabe

`assets/laden.svg` trägt **denselben** `scale-balanced`-Pfad, den auch die
Fensterleiste und die Knöpfe zeigen. Zwei Wege dorthin sind gescheitert, und
beide sind es wert, dass man sie nicht noch einmal geht:

- **Selbst nachgezeichnet** — fällt neben dnd5es eigenen Akteurssymbolen sofort
  auf, weil die Strichstärken nicht stimmen.
- **Als `<text>` mit dem Schriftzeichen U+F24E** — dnd5e bettet die Datei zwar
  ein (deshalb wirkt `currentColor`), aber die Schriften der Seite greifen darin
  nicht. Im Anlegen-Dialog stand ein leeres Kästchen.

Der Pfad stammt deshalb aus **Font Awesome Free** (CC BY 4.0, Vermerk steht in
der Datei) und nicht aus der Pro-Fassung, die Foundry mitliefert: Deren Glyphen
weiterzugeben, wäre ohne Lizenz. Die Form ist dieselbe.

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


## Oberfläche: die acht Regeln

Sie stehen vollständig in der [CLAUDE.md des Workspace](../../CLAUDE.md),
Abschnitt „Regelgrundsätze für die Oberfläche der Foundry-Module", und gelten
für jedes Modul: Fenster passen ins Bild · die Marke steht in einer Datei · die
Schrift liefert Foundry · kein sichtbarer Text ohne Sprachschlüssel · die
Rückmeldung steht dort, wo der Mensch hinschaut · jeder Knopf hat einen Namen ·
Unwiderrufliches fragt vorher · neue Fenster sind ApplicationV2.

Zwei Dateien werden dafür **kopiert, nicht geteilt** — wie `willkommen.js`:

| Datei | Angepasst wird |
|---|---|
| `styles/ninjo-marke.css` | nichts, sie ist überall identisch |
| `scripts/fensterpassen.js` | nur der `MODUL`-Block ganz oben |

Verbessert man eine davon, gehört sie in alle Module nachgezogen.

### Was hier gilt

**Fensterklasse:** `ninjos-shops`.

**Regel 1 stammt von hier.** `fensterpassen.js` ist in diesem Modul entstanden
und am 07.09.2026 verallgemeinert worden: Die Fensterklassen und die scrollenden
Teile stehen jetzt im `MODUL`-Block, das äußere Element wird für beide
Fensterbauarten geholt, und `alleNachziehen()` durchsucht auch `ui.windows`.
Für dieses Modul ändert sich am Verhalten nichts — aber Änderungen daran gehören
ab jetzt in alle sechs Kopien.

### Die drei Helligkeiten, und warum es drei sind

Das war am 07.09.2026 kurz als „zweite Palette, unklar" notiert. Sie ist nicht
unklar, sie war nur unbenannt:

| | Wo | Warum |
|---|---|---|
| **Pergament** | `:root` in `ninjo-marke.css` | die Marke, wie überall |
| **Gealtertes Pergament** | zweiter `.ninjos-shops`-Block am Ende von `shops.css` | Ein Laden ist eine Holzbude, kein Büro. Wärmer und mit Faser — das Modul nimmt sich hier ausdrücklich das Recht, eine Rolle anders zu füllen. |
| **Dunkel** | `.ninjo-dunkel`, gesetzt von `lichtSetzen()` in `schau.js` | Die Schau steht auf einem Monitor im abgedunkelten Zimmer. Auf OLED verbraucht echtes Schwarz nichts. |

**Alle drei sind derselbe Bogen bei anderem Licht.** Seit dem 07.09.2026 stehen
sie als Rollen, nicht als Zahlen: Die dunkle Fassung kommt aus
`ninjo-marke.css` und ist damit für jedes Ninjo-Modul verfügbar; der
Pergament-Modus der Schau überschreibt dieselben Rollen mit tieferen Werten
(`--ninjo-grund: #e6d9bd`), weil ein Monitor im Weiß des Fensters eine Lampe
wäre. Aus zehn Sonderregeln wurde dadurch ein Token-Block.

**Wer die Schau anfasst, schreibt keine Farbe hinein.** Der Bereich ist frei von
festen Werten; beide Helligkeiten folgen den Rollen. Eine neue Farbe dort heißt,
dass eine Rolle fehlt — dann gehört sie in die Marke, nicht in `shops.css`.

**Offen:** vier `aria`-Attribute auf 14 Vorlagen — bei einem Fenster, das
Spieler am Tablet bedienen, die größte Lücke. Und `title=`-Tooltips gibt es
auf Touch nicht; wo eine Erklärung nötig ist, gehört sie in den sichtbaren Text.
