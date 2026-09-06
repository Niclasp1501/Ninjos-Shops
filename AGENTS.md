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
3. **Am Körper greift `.ninjos-shops …` nicht mehr.** Alle Regeln des Moduls
   sind darunter verschachtelt — das Menü stand als Reihe nackter Knöpfe auf
   der Karte. Es trägt die Modulklasse jetzt selbst, und seine Regeln stehen
   unverschachtelt als `.shops-menue …`.

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
