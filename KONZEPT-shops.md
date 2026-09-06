# Konzept: Ninjo's Shops — Läden am Tisch

Stand 05.09.2026, zweite Fassung. Grundlage: die fünf tatsächlich vorhandenen
Ladenmodule im Foundry-Katalog, der Quelltext von `dnd5e/module/config.mjs` und
`data/item/templates/physical-item.mjs` (gelesen, nicht vermutet), und der
bereits gebaute Tausch in **Ninjos-InPerson-Tools**.

> Dies ist ein Konzept, kein Bericht über Gebautes. Gebaut sind bisher nur die
> beiden Rechenkerne `preise.js` und `kasse.js`; alles Sichtbare steht hier als
> Entscheidungsgrundlage und noch nicht im Code.
>
> **Was sich in der zweiten Fassung geändert hat:** Ein Laden ist kein Merkmal
> auf einem NSC mehr, sondern ein eigenes Dokument — Abschnitt 4, mit der
> Begründung, warum die erste Fassung an drei Stellen zu kurz griff.

---

## 1. Was es schon gibt

| Modul | Stand | Was es kann | Warum es nicht reicht |
|---|---|---|---|
| **Archive of Shops** | v14.359, aktiv | NSC-Händler mit Geldbeutel und lebender Auslage; Zufallsinventar aus Kompendien nach Seltenheit/Stufe/Art; wahlweise statische Journal-Listen; SocketLib | Alles auf Zufallserzeugung ausgelegt. Keine Monitoranzeige, kein „nur für diesen Spieler öffnen". |
| **yugen-merchant** | v14.360, 3 Monate alt | Kauf- und Verkaufsreiter, Preisfaktoren nach Seltenheit, Traglastwarnung, unendliche Geldmittel | Spieler öffnen selbst über Rechtsklick auf den Token. Genau das soll hier ab Werk *nicht* gehen. |
| **Shop** | v14, 2 Monate alt | Systemunabhängig, mehrere Läden mit Namen/Bild/Beschreibung, eigene Währungen, Zahlungsprüfung | Systemunabhängigkeit kostet die dnd5e-Genauigkeit, die hier gerade gebraucht wird. |
| **Quickstart Shops** | aktiv | Fertige, kuratierte Ladeninventare zum Hineinfallenlassen | Inhalt, kein Werkzeug. |
| **Merchant Sheet NPC** | **v10, 3 Jahre 8 Monate alt** | Kauf-/Verkaufs-/Stapelfaktor, Gegenstände einzeln verstecken, „Dienstleister"-Modus ohne Warenübergabe, CSV-Import | Tot. Läuft auf v13/v14 nicht mehr. |
| **Loot Sheet NPC 5E** | ältere Fassung, Fork-Landschaft | Der Urahn: NSC-Bogen als Beutekiste oder Händler | Wird als Grundlage überall zitiert, ist aber selbst nicht mehr gepflegt. |

**Der Befund:** Es gibt Lebendiges, aber nichts, das den eigentlichen Anlass
trifft. Alle fünf sind für den Online-Tisch gebaut — der Spieler klickt den
Händler an und kauft. Hier ist die Reihenfolge umgekehrt: **der Spielleiter
zeigt einen Laden vor**, auf den Monitor oder auf einzelne Geräte, und die
Spieler bekommen ihn nur zu sehen, wenn er das will.

Diese eine Umkehrung rechtfertigt ein eigenes Modul. Alles andere — Preise,
Bestand, Wechselgeld — ist bei den fünf oben besser gelöst als bei einem
Neuanfang, und dort wird abgeschaut statt neu erfunden.

---

## 2. Typische Funktionen: was wir nehmen, was wir lassen

Die Frage war ausdrücklich, was Ladenmodule sonst so können. Die vollständige
Liste aus allen fünf, sortiert nach der Antwort:

### Nehmen wir

| Funktion | Woher | Warum |
|---|---|---|
| Der Laden ist ein Akteur mit echtem Inventar | alle | Gegenstände hineinziehen, Menge, Bild, Beschreibung — alles schon da. Hier ein eigener Untertyp statt eines NSC, siehe Abschnitt 4. |
| Aufschlag als Faktor auf den Grundpreis | Merchant Sheet | Die eine Einstellung, die jeder Laden braucht |
| Festpreis je Gegenstand | Shop | Für alles, was der Grundpreis nicht trifft |
| Bestand, der zur Neige geht | Archive of Shops | Ein Laden mit unendlich vielen Plattenrüstungen ist kein Laden |
| Gegenstände einzeln verstecken | Merchant Sheet | Die Ware unter der Theke |
| Höchstmenge je Kauf | Merchant Sheet (Stapelfaktor) | Verhindert das leergekaufte Dorf |
| Dienstleistung ohne Warenübergabe | Merchant Sheet | Herberge, Heiler, Fährmann. Kostet Geld, gibt keinen Gegenstand. |

### Lassen wir weg

| Funktion | Woher | Warum nicht |
|---|---|---|
| Zufallsinventar aus Kompendien | Archive of Shops, Quickstart | Der Laden wird vorbereitet, nicht gewürfelt. Wer würfeln will, nimmt Archive of Shops daneben. |
| Preisfaktoren nach Seltenheit | yugen | Ein zweites Preissystem neben Aufschlag und Festpreis. Zwei sind genug. |
| Traglastwarnung | yugen | Hübsch, aber es ist nicht Aufgabe des Ladens, die Rucksäcke zu verwalten. |
| CSV-Import | Merchant Sheet | Für eine Auslage von zwanzig Zeilen ein Werkzeug zu viel. |
| Fremde Währungssysteme | Shop | dnd5e hat fünf Münzsorten. Mehr braucht dieser Tisch nicht. |
| Feilschen mit Überzeugen-Wurf | diverse Makros | Das gehört ans Gespräch, nicht in ein Fenster. |
| Geldbeutel des Händlers, der leer werden kann | Archive of Shops | Erst dann sinnvoll, wenn Spieler *verkaufen* dürfen — siehe offene Frage 3. |

### Was keines der fünf hat, und hier den Ausschlag gibt

- **Der Laden wird vorgezeigt, nicht aufgesucht.** An alle, an einzelne Spieler,
  oder auf den Monitor.
- **Eine Schauansicht für den Bildschirm an der Wand** — groß, aus zwei Metern
  lesbar, mit selbsttätigem Umblättern.
- **Ein Marktbuch**, das jeden Kauf mitschreibt.

---

## 3. Eigenes Modul oder in die In-Person Tools?

**Empfehlung: eigenes Modul, mit einer optionalen Brücke.**

Dafür spricht dreierlei. Ein Laden ist am Online-Tisch genauso nützlich wie im
Wohnzimmer — die Bindung an das Beisammensein hat nur die *Anzeige*, nicht der
Handel. Die In-Person Tools tragen laut ihrem eigenen
[KONZEPT-werkzeugkasten.md](../Ninjos-InPerson-Tools/KONZEPT-werkzeugkasten.md)
bereits drei Werkzeuge und leiden erklärtermaßen daran, dass ihre
Einstellungsliste nach „den Einstellungen des Moduls" aussieht; ein viertes mit
eigener Seite macht das schlimmer. Und ein Ladenmodul lässt sich im
Foundry-Katalog jemandem anbieten, der von digitalen Spieltischen nichts wissen
will.

Die Brücke ist schmal und geht **in eine Richtung**: Sind die In-Person Tools
aktiv, fragt das Modul sie, welche Benutzer Monitore sind. Sind sie es
nicht, hat das Modul dafür eine eigene Einstellung. Er hängt nie von ihnen
ab — `relationships.recommends`, niemals `requires`.

> **Dafür fehlt drüben noch etwas.** Die API der In-Person Tools
> (`scripts/main.js:693`) gibt heute `openPanel, isActive, getStats, resetStats,
> refresh, openTrade, openTradeLog` heraus — die Monitorerkennung aus
> `state.js` (`isMonitorUser`, `isSceneDisplay`, `isBattlemapDisplay`) steht
> nicht darin. Diese drei müssen dort ergänzt werden. Das ist eine Zeile in
> einem Objektliteral und die einzige Änderung, die das Modul an einem
> anderen Modul braucht.

Später alles in die In-Person Tools zu ziehen bleibt möglich; umgekehrt wäre es
mühsamer. Wer klein anfängt, kann zusammenlegen — wer groß anfängt, muss
auseinanderoperieren.

---

## 4. Was ein Laden ist

**Ein Laden ist ein eigenes Dokument** — ein Akteur vom Untertyp
`ninjos-shops.laden`, den dieses Modul selbst anlegt. Er steht als eigener
Eintrag im Akteursverzeichnis, hat einen eigenen Bogen, eigene Rechte, liegt in
Ordnern und lässt sich in ein Kompendium schieben. Er hat aber keine
Trefferpunkte, keine Rüstungsklasse und keine Attribute, weil ein Regal die
nicht braucht.

Foundry erlaubt das seit v11: Jedes Dokument mit einem `system`-Feld kann von
einem Modul um Untertypen erweitert werden. Im Manifest steht

```json
"documentTypes": { "Actor": { "laden": {} } }
```

und Foundry macht daraus den Typ `ninjos-shops.laden`, mit der Modulkennung
davor, damit zwei Module sich nicht in die Quere kommen. Dazu ein
`TypeDataModel`, in `init` unter `CONFIG.Actor.dataModels` eingetragen, und ein
eigener Bogen über `DocumentSheetConfig.registerSheet`.

```js
// system eines Ladens - typisiert und geprueft, nicht als Flag
{
  aufschlag: 1.2,          // Faktor auf den Grundpreis
  ankauf: 0,               // was der Haendler beim Ankauf zahlt, 0 = kauft nicht
  eigeneKasse: false,      // true: zahlt aus kasse und kann pleite gehen
  kasse: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
  hoechstmenge: 0,         // 0 = ohne Begrenzung
  kaufmodus: "freigabe",   // "gesperrt" | "freigabe" | "direkt"
  begruessung: ""          // ein bis zwei Saetze, die oben im Fenster stehen
}
```

### Warum nicht ein Merkmal auf einem NSC

Die erste Fassung dieses Konzepts hat den Laden als `flags` auf einem
vorhandenen NSC beschrieben, und ein Marktstand am Hafen war dort ein Akteur
namens „Marktstand am Hafen" ohne Werte. Das war naheliegend und an drei Stellen
falsch:

**Ein NSC hätte genau einen Laden.** Derselbe Händler kann nicht zwei Stände
führen, und ein Marktplatz keine drei Buden. Beides ist am Tisch keine
Ausnahme, sondern der Normalfall.

**Der Ort-Laden schleppt Ballast.** Ein dnd5e-NSC bringt Trefferpunkte,
Rüstungsklasse, Attribute und Fertigkeiten mit — an einem Bücherregal ist das
alles sinnlos, steht aber im Bogen und lässt sich versehentlich in einen Kampf
ziehen.

**Flags sind untypisiert.** Ein `aufschlag: "1,2"` mit Komma statt Punkt fällt
nirgends auf; es rechnet nur still falsch, und zwar zugunsten des Kunden. Ein
`TypeDataModel` weist so etwas beim Schreiben ab.

Was für die alte Fassung sprach — Items, Ordner, Rechte, Token gratis — bleibt
erhalten: Ein Akteur ist ein Akteur, auch mit fremdem Untertyp. Nur die Werte
darin sind unsere.

### Die Verknüpfung: eine Zusatzfunktion, keine Grundlage

Ein Laden gehört niemandem. Wer will, kann ihn an eine Person, ein Token oder
eine Szenen-Note hängen:

```js
// auf dem NSC, dem Token oder der Note
flags["ninjos-shops"].laeden = ["Actor.abc123", "Actor.def456"]
```

Damit sagt ein Händlerbogen „ich führe diesen Laden", und ein Klick auf sein
Token öffnet ihn. Aber ein Laden ohne jede Verknüpfung ist genauso gültig —
die Spielleitung zeigt ihn aus dem Verzeichnis heraus vor. Und weil es eine
Liste ist, führt ein Händler zwei Läden und ein Laden hängt an drei Orten,
ohne dass daran etwas gebaut werden müsste.

### Die Ware

Die Ware sind **echte Gegenstände im Inventar des Ladens**. Diese Entscheidung
trägt unabhängig davon, wo der Laden wohnt, und sie ist die zweite, an der alles
hängt: Damit kommen ohne eigenen Aufwand mit — Hineinziehen aus Kompendien,
Menge, Bild, die Gegenstandsbeschreibung, das Stapeln, die Sortierung — und der
Bestand geht zur Neige, weil er wirklich weniger wird.

Je Gegenstand ein kleines Merkmal:

```js
item.flags["ninjos-shops"] = {
  festpreis: null,   // in Kupfer. Gesetzt schlaegt es den Aufschlag.
  hinweis: "",       // ein Satz des Haendlers, kein Regeltext
  verborgen: false,  // liegt unter der Theke
  dienst: false      // Dienstleistung: kostet Geld, wechselt nicht den Besitzer
}
```

Hier bleibt es bei Flags, und das ist kein Widerspruch zu oben: Die Gegenstände
gehören dnd5e, nicht uns. Ein Untertyp für sie hieße, jeden Trank und jedes
Schwert umzubauen, bevor es in die Auslage darf.

**`eigeneKasse` ist der Unterschied zwischen einem Requisit und einem Ort.** Ist
sie aus, hat der Laden unbegrenzt Geld — das ist der Normalfall und macht keine
Arbeit. Ist sie an, zahlt er den Ankauf aus seiner eigenen `kasse` und kann leer
werden: Der Dorfschmied kauft dein drittes Langschwert nicht mehr, weil er das
Geld nicht hat. Das ist am Tisch eine gute Szene und in der Vorbereitung eine
Zahl, die gepflegt werden will — deshalb je Laden und nicht weltweit.

Für den Ankauf braucht es dabei **keine neue Rechnung**: `bezahle()` in
`kasse.js` funktioniert in beide Richtungen. Der Laden mit eigener Kasse ist
schlicht derjenige, der zahlt.

**Warum kein Journal.** Ein Journal kann keine Gegenstände halten. Es müsste
UUID-Listen führen, und jede Menge, jeder Bestand, jedes Bild wäre selbst
gebaut. Der Tausch in den In-Person Tools hat aus gutem Grund das Gegenteil
gewählt: Dort ist das *Logbuch* ein Journal, weil es gelesen werden soll — die
Ware ist es nie.

### Die zwei Haken, die dazugehören

**Ist das Modul aus, sind die Läden unsichtbar.** Foundry versteckt Dokumente,
deren Untertyp niemand mehr anmeldet; die Daten bleiben in der Welt und kommen
beim Einschalten unverändert zurück. Für ein Modul, ohne das ein Laden ohnehin
nichts tut, ist das verkraftbar — es gehört aber in die Anleitung, sonst hält
es jemand für Datenverlust.

**Foundry sichert nicht zu, dass ein System mit fremden Untertypen umgeht.**
Die eigene Dokumentation empfiehlt bei Akteuren und Gegenständen ausdrücklich,
sich auf ein System festzulegen — das tun wir ohnehin, dnd5e steht im Manifest.
Zu prüfen bleibt genau eine Sache, und zwar in einer laufenden Welt statt auf
dem Papier: ob dnd5e ein Item auf einen Akteur vom Typ `ninjos-shops.laden`
hineinziehen lässt. Geht das nicht, legt der Ladenbogen das Item selbst an,
statt sich auf das Verzeichnis zu verlassen.
## 5. Preise, und die Falle darin

Ein Gegenstand in dnd5e trägt `system.price = { value, denomination }`, wobei
`denomination` eine der fünf Münzsorten ist. Die Umrechnung steht in
`CONFIG.DND5E.currencies`, jeweils als **„wie viele davon sind ein Goldstück"**:

```
pp 0.1     gp 1     ep 2     sp 10     cp 100
```

> **Die Falle: `system.price.valueInGP` ist für einen Laden unbrauchbar.**
> `physical-item.mjs:251` rechnet
> `Math.floor(value * defaultCurrency.conversion / conversion)`. Für eine Kerze
> zu 1 cp ergibt das `Math.floor(0.01)` — **null**. Alles unter einem Goldstück
> liest sich damit als geschenkt. Ein Laden, der dieses Feld benutzt, verschenkt
> die halbe Auslage.

**Also: intern wird in Kupfer gerechnet, ganzzahlig, immer.** Ein Preis ist eine
ganze Zahl Kupfermünzen; Gold ist nur eine Anzeigeform. Das ist dieselbe
Entscheidung, die jede Kasse der Welt trifft, und sie erspart Rundungsfehler,
die man erst bemerkt, wenn jemand 0,30000000000000004 Gold zu wenig hat.

```
grundpreis_cp = price.value * (100 / currencies[price.denomination].conversion)
preis_cp      = festpreis_cp ?? Math.ceil(grundpreis_cp * aufschlag)
```

Aufgerundet, nicht ab: Ein Händler mit 20 % Aufschlag rundet zu seinen Gunsten,
und ein Preis von null durch Abrunden wäre schlimmer als ein Kupferstück zu
viel.

### Das Wechselgeld

Der schwierigste Teil und der, an dem die vorhandenen Module am ehesten
schwächeln. Ein Spieler mit einem Platinstück soll einen Dolch für 2 Gold kaufen
können.

Der Ablauf, in dieser Reihenfolge:

1. Vermögen in Kupfer zusammenzählen (alle fünf Sorten).
2. Reicht es nicht: abbrechen, bevor irgendetwas angefasst wird.
3. Von der kleinsten Sorte aufwärts zahlen, solange es passt.
4. Reicht das Kleingeld nicht, die nächstgrößere Münze aufbrechen und den Rest
   als Wechselgeld zurückgeben.

Das gehört in **eine einzige, reine Funktion** ohne Foundry-Zugriff:
`bezahle(bestand, betragCp) → { neuerBestand } | null`. Rein heißt: sie liest
nichts, schreibt nichts und lässt sich ohne laufende Welt prüfen. Sie bekommt
als einzige Stelle dieses Moduls eine eigene Testdatei — hier verschwindet sonst
irgendwann jemandes Geld.

**Elektrum ist ein Sonderfall.** Viele Tische benutzen es nicht. Es wird
angenommen, wenn es da ist, aber nie als Wechselgeld herausgegeben.

---

## 6. Wer darf was — drei Schalter, keiner mehr

Ausdrücklicher Wunsch, und die Vorgaben sind streng:

| Schalter | Werte | Ab Werk |
|---|---|---|
| **Spieler dürfen Läden selbst öffnen** | ja / nein | **nein** |
| **Kaufmodus** (je Laden) | gesperrt / freigabe / direkt | **freigabe** |
| **Höchstmenge je Kauf** (je Laden) | Zahl, 0 = frei | 0 |

*Gesperrt* heißt: ansehen ja, kaufen nein — der Spielleiter macht das am Tisch.
*Freigabe*: der Spieler tippt „Kaufen", der Spielleiter bekommt eine Anfrage und
bestätigt. *Direkt*: der Kauf geht durch, sobald das Geld reicht.

Der erste Schalter ist welt-, nicht gerätweit, und steht bewusst in der
Hauptliste: Er ist die eine Einstellung, deren Antwort man kennen muss, bevor
man das Modul einschaltet.

**Ein geöffneter Laden bleibt offen, bis er geschlossen wird.** Wer ihn vorgezeigt
bekommen hat, behält ihn, auch nach einem Seitenneuladen — sonst ist nach jedem
Verbindungsabbruch der halbe Tisch draußen. Der Spielleiter schließt für alle
oder einzeln.

**Und es ist immer nur einer.** Zeigt der Spielleiter einem Spieler einen zweiten
Laden, ersetzt er den ersten. Das ist keine Einschränkung, sondern die Antwort
auf eine Frage, die sonst überall auftaucht: Welches der beiden Fenster bekommt
die Bestandsänderung, welches den Kauf, welches die Schauansicht. Ein Zustand
statt zwei.

---

## 7. Der Kauf: der Spielleiter hält die Wahrheit

Wörtlich dieselbe Bauweise wie der Tausch (`Ninjos-InPerson-Tools/scripts/trade.js`),
und aus denselben Gründen:

> Ein Spieler **kann** auf einem fremden Akteur keine Gegenstände anlegen oder
> löschen. Die Regel „kein Spielleiter, kein Handel" gilt ohnehin — sie wird
> nicht zum Sonderfall gemacht, sondern zur Bauweise.

```
Spieler tippt „Kaufen"
   → Socket an den Spielleiter
      → prüft: Laden noch aktiv? Bestand noch da? Preis unverändert? Geld reicht?
      → bei „freigabe": fragt den Spielleiter
      → schreibt ins Marktbuch, was gemeint war
      → Geld umbuchen, Gegenstand anlegen, Bestand mindern
      → schreibt ins Marktbuch, was geschehen ist
   → Antwort an alle offenen Fenster dieses Ladens
```

**Erst anlegen, dann abziehen** — genau wie `trade-mover.js:„Create before
deleting"`. Bricht es dazwischen ab, gibt es den Gegenstand doppelt statt gar
nicht. Ein doppelter Gegenstand ist eine Lästigkeit, ein verschwundener ein
verlorener Abend.

**Der Preis wird beim Spielleiter neu gerechnet, nie vom Spieler übernommen.**
Was im Spielerfenster steht, ist eine Anzeige, kein Vertrag.

Ist kein Spielleiter angemeldet, ist der Kaufknopf aus und sagt auch warum.

---

## 8. Die Anzeige auf dem Monitor

Der Teil, den keines der fünf Module hat.

Drei Ansichten desselben Ladens:

| Ansicht | Für wen | Was sie zeigt |
|---|---|---|
| **Verwaltung** | Spielleiter | Auslage bearbeiten, Preise, Verborgenes, Wer sieht ihn gerade |
| **Fenster** | Spieler | Liste mit Bild, Name, Preis, Hinweiszeile, Bestand; die eigene Börse; Kaufknopf je nach Modus |
| **Schau** | Monitor | Groß. Vier bis sechs Karten je Seite, selbsttätiges Umblättern. Keine Bedienung. |

Die Schauansicht ist eine Vollbildschicht ohne Fensterrahmen, aus zwei bis drei
Metern lesbar: Bild groß, Name in Versalien, Preis in Gold als Zahl. Kein
Regeltext — dafür ist die Hinweiszeile da, und die schreibt der Spielleiter.

**Zum Umblättern:** Takt einstellbar, ab Werk um die zehn Sekunden, mit einer
Fortschrittslinie am unteren Rand, damit niemand rät, wie lange eine Seite noch
steht. Der Spielleiter kann anhalten und Seiten von Hand weiterschalten — wenn
jemand fragt „was war das dritte nochmal", darf die Anzeige nicht weiterlaufen.
Diese Steuerung liegt beim Spielleiter, nie auf dem Monitor selbst: Der Monitor
hat keine Tastatur, und niemand steht auf, um darauf zu tippen.

**Wer die Schauansicht bekommt, ist eine Wahl beim Vorzeigen** und nicht an die
Monitorerkennung gebunden (Entscheidung 5 in Abschnitt 10). Ein Beamer oder ein
zweites Notebook ist kein Monitorbenutzer und sieht doch genauso aus; die
Erkennung schlägt nur den Vorschlag vor, den Ausschlag gibt die Spielleitung.

**Welcher Benutzer ein Monitor ist**, beantwortet die eigene Einstellung dieses
Moduls. Sind die In-Person Tools da, tritt deren Antwort an ihre Stelle: Die
eigene Liste steht dann ausgegraut da, mit einem Satz, woher die Auskunft jetzt
kommt. Das ist wichtiger, als es klingt — eine Einstellung, die dasteht und
nichts bewirkt, kostet jemanden eine halbe Stunde Suche nach dem Grund, warum
sein Monitor nicht umschaltet. Die Brücke selbst steht in Abschnitt 3.

---

## 9. Die zwei Bücher

Je Kauf eine Zeile: wann, wer, welcher Laden, was, wie viel, welcher Preis,
und — bei Freigabe — wer bestätigt hat. Geschrieben wird **zweimal**: vor dem
ersten Zugriff, was gemeint war, und danach, was geschehen ist. So steht auch
das da, was *nicht* geklappt hat, samt Grund.

Es sind zwei Bücher, und sie sind nicht dasselbe:

- **Das Ladenbuch** liegt als Merkmal am einzelnen Laden und zeigt, was in
  diesem Laden geschehen ist. Die Spielleitung sieht alles, ein Spieler nur
  seine eigenen Zeilen. Es ist das Buch, das am Tisch aufgeschlagen wird.
- **Das Marktbuch** liegt in einer Welteinstellung und sammelt alle Läden.
  Es ist das Buch für die Frage „wo sind die 400 Gold geblieben", mit Filter
  je Laden und den Gründen für alles, was scheiterte.

### Kein Journal — und warum diese Fassung die erste ersetzt

Die erste Fassung dieses Abschnitts verlangte ein **Journal**, mit derselben
Begründung wie beim Tauschlogbuch der In-Person Tools: lesbar, durchsuchbar,
ausdruckbar, in der Weltsicherung.

**Am 06.09.2026 hat Ninjo das verworfen**, nachdem er es gebaut gesehen hatte,
und er hat recht behalten. Ein Journal aus lauter Textschnipseln liest sich
wie ein Protokoll und nicht wie ein Buch: nicht filterbar, nicht sortierbar,
jede Zeile ein Absatz. Die Frage „wo sind die 400 Gold geblieben" beantwortet
man mit einer Spalte, die man sortieren kann, nicht mit vierzig Absätzen
Fließtext. Als Daten mit einem eigenen Fenster ist beides möglich, und
ausdrucken kann man das Fenster auch.

Der Preis dieser Entscheidung ist ehrlich zu nennen: Die Einträge stehen in
der Einstellungsdatenbank statt in einem Dokument, und wer das Modul
deinstalliert, verliert sie. Dafür sind sie gedeckelt (500 Zeilen im
Marktbuch, 200 je Laden) und wachsen einer Welt nicht über den Kopf.

**Wer das hier liest und den Journal-Weg wieder einbauen will: nicht tun.**
Es ist keine offene Frage mehr.

---

## 10. Entschieden

Fünf Fragen sind von Ninjo beantwortet und stehen fest. Eine bleibt offen und
trägt weiterhin einen Vorschlag.

### Entschieden am 05.09.2026

1. **Der Name ist `Ninjo's Shops`**, Kennung `ninjos-shops`, Ordner
   `Ninjos-Shops`. Die Mehrzahl ist gemeint: Es sind viele kleine Läden, kein
   ein großer Marktplatz.
2. **Spieler dürfen verkaufen — je Laden eingestellt, ab Werk aus.** Und der
   Laden bekommt *wahlweise* eine eigene Kasse (`eigeneKasse`, Abschnitt 4):
   unbegrenztes Geld als Normalfall, ein Geldbeutel, der leer werden kann, wo
   es die Szene hergibt. Beides je Laden, nicht weltweit — welche der beiden
   Bauarten passt, entscheidet sich am einzelnen Händler.
3. **Ein Laden je Spieler.** Ein neuer ersetzt den vorherigen. Zwei offene
   Läden sind am Tisch nie gemeint und verdoppelten jeden Zustand: Welches
   Fenster bekommt die Bestandsänderung, welches den Kauf.
4. **Ein Laden ist ein eigenes Dokument**, kein Merkmal auf einem NSC — ein
   Akteur vom Untertyp `ninjos-shops.laden`. Die Verknüpfung zu einer Person,
   einem Token oder einer Szenen-Note ist eine Zusatzfunktion, keine
   Grundlage. Begründung und die zwei Haken dazu stehen in Abschnitt 4. Diese
   Entscheidung ersetzt die erste Fassung dieses Konzepts.
5. **Die Schauansicht bekommen auch Nicht-Monitore**, als Wahl beim Vorzeigen.
   Ein Beamer oder ein zweites Notebook ist kein Monitorbenutzer, sieht aber
   genauso aus, und wer die große Ansicht ausdrücklich verlangt, soll sie
   bekommen.

### Entschieden am 06.09.2026

6. **Das Marktbuch ist kein Journal**, sondern Daten mit eigenem Fenster.
   Begründung in Abschnitt 9; diese Entscheidung ersetzt die erste Fassung
   dieses Abschnitts.
7. **Ein Laden kann an Szenen hängen** (`zugriff.szenen`): Wer keine dieser
   Karten vor sich hat, kommt nicht an den Laden. Es ist ein Filter über dem
   Zugriffsmodus und kein dritter Modus — so lässt sich „alle Spieler, aber
   nur auf dem Marktplatz" sagen. Leer heißt überall. Entschieden hat die
   **betrachtete Karte**, nicht das Token der Figur: Ein Token wäre präziser
   und trügerischer, siehe AGENTS.md.
8. **Der Freigabe-Modus fragt wirklich.** Die Bitte legt sich bei der
   Spielleitung ab und wartet auf ein Ja; was am Geld oder am Bestand
   scheitert, scheitert sofort, ohne jemanden zu fragen. Ein Kauf zu einem
   zugesagten Angebotspreis braucht kein zweites Ja.

### Noch offen

6. **Braucht es Ladenöffnungszeiten oder Nachschub über Nacht?** Vorschlag:
   **nein.** Das ist der erste Schritt zu einer Wirtschaftssimulation, und die
   ist ausdrücklich nicht gewollt. Wieder auffüllen heißt: Gegenstände
   hineinziehen. Die Frage eilt nicht — sie betrifft nichts vor Schritt 6.

---

## 11. Was zuerst gebaut wird

In dieser Reihenfolge, jeder Schritt für sich benutzbar:

1. **`preise.js`** — Umrechnung in Kupfer, Aufschlag, Festpreis. Reine
   Funktionen, keine Foundry-Zugriffe.
2. **`kasse.js`** — Bezahlen mit Wechselgeld. Reine Funktionen. **Mit Tests.**
   Diese beiden Dateien zuerst, weil alles andere auf ihnen steht und sie sich
   ohne laufende Welt prüfen lassen.
3. **Der Ladentyp und sein Bogen** — den Untertyp anmelden, das `TypeDataModel`
   dazu, einen Laden anlegen, Ware hineinziehen, Preise setzen. Dazu die
   Verknüpfung an NSC, Token und Szenen-Note. Ab hier ist das Modul für die
   Spielleitung allein schon nützlich.
4. **Das Spielerfenster** und das Vorzeigen an einzelne oder alle.
5. **Der Kauf** über den Spielleiter, samt Marktbuch.
6. **Die Schauansicht** und die Brücke zu den In-Person Tools.

Das Willkommensfenster gehört ab Schritt 3 dazu und ist bereits eingebaut
(`scripts/willkommen.js`) — siehe die Regel in der
[CLAUDE.md des Workspace](../../CLAUDE.md). Solange es keine Forge-Seite gibt,
zeigt die Karte darin auf `/modules`; der Eintrag in
`Webapps/Ninjos-Forge/src/data/modules.js` gehört vor der ersten
Veröffentlichung nachgeholt.

---

## 12. Was hier bewusst nicht steht

Keine Wirtschaft, keine Angebot-und-Nachfrage-Kurven, kein Ruf beim Händler,
kein Feilschen, keine Karawanen. Der Auftrag war: **schlank.** Jede dieser
Funktionen ist für sich reizvoll und zusammen sind sie ein zweites Modul, das
niemand zu Ende baut.
