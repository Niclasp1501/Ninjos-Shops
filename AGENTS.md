# Agent Notes

**Lies zuerst [KONZEPT-shops.md](KONZEPT-shops.md).** Dieses Modul ist
ein Gerüst mit zwei fertigen Rechenkernen; alles andere ist eine Entscheidung,
die dort begründet steht. Wer ohne das Konzept anfängt, baut das vierte
Ladenmodul und nicht dieses.

## Stand am 05.09.2026

Gebaut sind die Schritte 1 bis **4** aus Abschnitt 11 des Konzepts.

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
| Kauf, Marktbuch, Schauansicht | existiert nicht (Schritte 5–6) |

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

`<foundry-major>.<YYMM>.<patch>` wie in den anderen Modulen — `14.2609.2` ist der
Stand nach Schritt 4. Die erste Zahl ist die **Foundry**-Hauptversion, nicht unsere.

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
