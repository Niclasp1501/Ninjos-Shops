# Ninjo's Shops

Läden, die die Spielleitung **vorzeigt**, statt sie suchen zu lassen. Ein Laden
ist ein eigenes Dokument mit echten Gegenständen im Inventar; wer ihn zu sehen
bekommt, entscheidet die Spielleitung — an alle, an einzelne Spieler, oder an
niemanden, weil er an eine Szene gebunden ist.

Für Foundry VTT v14 und dnd5e. Die vollständige Begründung, warum es so gebaut
ist und nicht anders, steht in **[KONZEPT-shops.md](KONZEPT-shops.md)**. Wer
hier mitarbeitet, liest zusätzlich [AGENTS.md](AGENTS.md).

**Läden sind für Spieler unsichtbar.** Sie stehen im Akteursverzeichnis der
Spielleitung und in keinem anderen — auch dann nicht, wenn ein Spieler den
Laden gerade offen hat. Das ist zugesichert und nachgemessen.

---

## Was das Modul kann

### Der Laden

Ein eigener Akteurs-Untertyp (`ninjos-shops.laden`), kein Merkmal auf einem
NSC. Er hält Gegenstände wie jeder andere Akteur, liegt in Ordnern und hat
keine Trefferpunkte, weil ein Regal keine braucht.

| | |
|---|---|
| **Aufschlag** | Faktor auf den Grundpreis, für den ganzen Laden |
| **Festpreis** | je Stück, für alles, was der Grundpreis nicht trifft |
| **Bestand** | geht zur Neige; bei null verschwindet das Stück aus der Auslage |
| **Höchstmenge** | je Kauf, gegen das leergekaufte Dorf |
| **Verborgen** | die Ware unter der Theke — der Spieler sieht sie nicht |
| **Dienstleistung** | kostet Geld, gibt keinen Gegenstand, geht nie zur Neige |
| **Hinweiszeile** | ein Satz des Händlers unter dem Namen |
| **Eigene Kasse** | wahlweise ein Geldbeutel, der leer werden kann |
| **Verkäufer** | ein NSC hinter der Theke; er steht in den Büchern, nicht die Spielleitung |

### Vorzeigen und Zugang

Die Spielleitung zeigt einen Laden an alle oder an einzelne. **Ein Laden je
Spieler**: Ein neuer ersetzt den vorherigen. Ein vorgezeigter Laden übersteht
ein Neuladen.

Ob Spieler Läden **selbst** aufmachen dürfen, entscheiden drei Dinge
zusammen — der weltweite Schalter, die Liste am einzelnen Laden (*wer*) und
seine Szenenbindung (*wo*). Keine Szene ausgewählt heißt überall; sonst kommt
nur an den Laden, wer eine dieser Karten vor sich hat.

### Kaufen

Drei Kaufmodi je Laden:

- **Gesperrt** — ansehen ja, kaufen nein. Die Spielleitung bedient am Tisch.
- **Freigabe** — der Spieler tippt „Kaufen", die Bitte legt sich bei der
  Spielleitung ab und wartet auf ein Ja. Was am Geld oder am Bestand
  scheitert, scheitert sofort, ohne jemanden zu fragen.
- **Direkt** — geht durch, sobald das Geld reicht.

Bezahlt wird mit Wechselgeld: Ein Platinstück kauft einen Dolch. Ausgeführt
wird **immer bei der Spielleitung**, und der Preis wird dort neu gerechnet —
was im Spielerfenster steht, ist eine Anzeige, kein Vertrag.

### Verkaufen — zwei Wege

- **Direkt**, für Ware, die im Laden schon steht und einen Haken hat: Der
  Spieler klickt, bekommt den Ankaufswert, fertig.
- **Als Verkaufsanfrage**, für alles andere: Der Spieler packt zusammen, die
  Spielleitung sieht einen Spielraum — Untergrenze, üblicher Wert, Obergrenze —
  und nennt einen Preis. Der Spieler nimmt an oder nicht. **Die drei Zahlen
  sieht nur die Spielleitung**; sie werden dem Spieler gar nicht erst
  geschickt.

### Angebote

Die Spielleitung legt jemandem etwas zum Sonderpreis hin. Der Preis liegt am
Benutzer und nicht in der Nachricht — sonst könnte ein Spieler sich seinen
eigenen schicken.

### Handel mit einer Person ohne Laden

Für den Fremden am Feuer, den Bauern mit zwei Fackeln. Ein Knopf in der
Titelleiste **jedes** Personenbogens: anhaken, was vorgelegt wird, Menge und
Preis setzen, Empfänger wählen. Der Spieler sieht genau das — und nichts
anderes von diesem Bogen. Ausgelöst wird das immer von der Spielleitung.

### Die Schauansicht

Der Laden auf dem Bildschirm an der Wand: Vollbild ohne Fensterrahmen, sechs
Karten je Seite, Name in Versalien, Preis in Gold, ein Fortschrittsbalken am
unteren Rand. Nichts daran lässt sich anklicken — gesteuert wird im
Ladenbogen: anhalten, vor, zurück. Wer sie bekommt, entscheiden Sie beim
Vorzeigen; erkannte Monitore sind vorbelegt.

### Die zwei Bücher

- **Das Ladenbuch** liegt am einzelnen Laden. Die Spielleitung sieht alles,
  ein Spieler nur seine eigenen Zeilen.
- **Das Marktbuch** sammelt alle Läden, mit Filter und den Gründen für alles,
  was scheiterte — samt jedem Ja und Nein im Freigabe-Modus und dem Namen
  dessen, der entschieden hat.

### Verknüpfung

Wer im Laden einen Verkäufer einträgt, hat ihn verknüpft: Sein Bogen bekommt
einen Knopf „Laden öffnen", ebenso das Kontextmenü im Akteursverzeichnis und —
wo es eine Leinwand gibt — das Bedienfeld seines Tokens. Ein Händler darf zwei
Stände führen; dann wird gefragt, welcher gemeint ist.

---

## Anleitung: was Sie wie tun

### Einen Laden anlegen

1. Im Akteursverzeichnis **Akteur erstellen**, als Typ **Laden** wählen.
2. Gegenstände aus einem Kompendium oder einem anderen Bogen **hineinziehen**.
3. Im Ladenbogen unten rechts **im Kopfbild** auf das Reglersymbol
   (**⚙ Schieberegler**) — dort stehen Aufschlag, Ankauf, Kaufmodus,
   Höchstmenge, eigene Kasse, Verkäufer, Zugriff, Szenen und das Kopfbild.

Der Laden trägt ab Werk das Marktstand-Bild als Token und ein Kopfbild, das
oben im Fenster als breiter Streifen läuft. Welcher Ausschnitt zu sehen ist,
stellt der Regler **Ausschnitt** ein — ein Innenraum ist selten in der Mitte
am interessantesten.

### Preise setzen

- **Aufschlag** gilt für den ganzen Laden: `1,5` heißt fünfzig Prozent auf den
  Grundpreis.
- **Festpreis** setzen Sie je Zeile über das **⋯**-Menü rechts. Er sticht den
  Aufschlag. Eine gepunktete Linie unter dem Preis zeigt, dass einer gesetzt
  ist.
- **Ankauf** ist der Faktor, zu dem der Laden zurückkauft. `0` heißt: kauft
  nichts an.

### Ware einrichten

Das **⋯**-Menü an jeder Zeile:

| Eintrag | Was er tut |
|---|---|
| Unter der Theke | Der Spieler sieht das Stück nicht |
| Dienstleistung | Kostet Geld, wechselt nicht den Besitzer |
| Kauft er zurück | Erlaubt den direkten Verkauf dieses Stücks |
| Jemandem anbieten | Sonderpreis an einzelne Spieler |
| Gegenstand öffnen | Der Bogen des Stücks |
| Aus der Auslage nehmen | Löschen |

Verborgen, Dienstleistung und Ankauf stehen als kleine Marken hinter dem
Namen — Sie sehen den Zustand, ohne aufklappen zu müssen.

### Einen Laden vorzeigen

Im Ladenbogen die Leiste unter dem Kopfbild: **Allen zeigen**, **Auswählen …**,
**Allen schließen**. Darunter steht unter „Besucher", wer ihn gerade offen hat;
über das Kreuz daneben schließen Sie ihn einem Einzelnen.

Wollen Sie, dass Spieler von sich aus hingehen: In den Moduleinstellungen den
Schalter **„Spieler dürfen Läden selbst öffnen"** anhaken, und im Ladenfenster
unter **Zugriff** festlegen, wer und — darunter — auf welchen Szenen. Ohne
Szenenauswahl ist der Laden von jeder Karte aus erreichbar.

### Einen Kauf freigeben

Steht der Laden auf **Freigabe**, öffnet sich bei Ihnen das Fenster
**„Anfragen am Tresen"**, sobald jemand kaufen will — es kommt nach vorn und
meldet sich. Dort: **Freigeben** oder **Nicht heute**. Daneben ein Feld für
einen Satz; der geht als Begründung an den Spieler und steht in beiden
Büchern.

Im selben Fenster stehen darunter die **Verkaufsanfragen**. Die drei Werte im
goldenen Kasten sieht nur Sie: Untergrenze, üblicher Wert, Obergrenze. Ein
Klick darauf schreibt die Zahl ins Preisfeld — Sie müssen nichts abtippen.
Dann **Preis nennen** oder **Abweisen**.

### Mit jemandem handeln, der keinen Laden hat

1. Den Bogen der Person öffnen.
2. Oben in der Titelleiste auf das **Händedruck-Symbol**.
3. Empfänger anhaken, dann die Stücke, die vorgelegt werden sollen — mit Menge
   und Preis in Gold.
4. **Hinlegen**.

Der Spieler bekommt ein Fenster mit dem Gesicht der Person, Ihrem Satz und
einem Knopf je Stück. Das Geld wandert in die Börse der Person, falls sie
eine hat; leer werden kann sie nicht — dafür ist ein Laden mit eigener Kasse
da.

### Den Laden auf den Bildschirm bringen

1. **Auswählen …**, und beim Bildschirm den Schalter **groß** anhaken.
   Erkannte Monitore tragen dort schon einen Punkt.
2. Der Schirm zeigt sofort die erste Seite und blättert alle zehn Sekunden
   weiter.
3. Im Ladenbogen erscheint darunter eine Leiste: **◀**, **Anhalten**, **▶**
   und die Seitenzahl. Von Hand blättern hält an.

Zeigen Sie die Schauansicht sich selbst, deckt sie Ihren ganzen Bildschirm —
auch den Ladenbogen mit dieser Leiste. **Escape schließt sie**; auf einem
Monitor tut die Taste nichts, dort sitzt niemand.

Welche Benutzer als Monitore gelten, steht in den Moduleinstellungen unter
**Monitore**. Laufen Ninjo's In-Person Tools und geben sie ihre Erkennung
heraus, gilt deren Antwort — die eigene Liste graut dann aus und sagt es.

### Die Bücher lesen

Im Ladenbogen über das **⋮**-Menü der Titelleiste: **Ladenbuch** und
**Marktbuch**. Im Spielerfenster steht dort ebenfalls **Ladenbuch** — der
Spieler sieht darin nur seine eigenen Zeilen.

---

## Für Entwickler

```bash
node tools/kasse.test.mjs          # 43 Tests, ohne laufende Welt
pwsh tools/deploy-shops.ps1 -Target testv14
pwsh tools/deploy-shops.ps1 -Target prod
```

Die Bauweise in einem Satz: **Der Spielleiter hält die Wahrheit.** Ein Spieler
kann auf einem fremden Akteur nichts anlegen und nichts löschen, also schickt
er eine Bitte, und die Spielleitung prüft sie von vorn und führt sie aus.
Welche *Verbindung* das tut, entscheidet `scripts/vorsitz.js` — `activeGM`
benennt einen Benutzer, und zwei Tabs derselben Spielleitung führten sonst
jeden Kauf doppelt aus.

---

## 🇬🇧 English

Shops the gamemaster **shows** rather than the players find. A shop is a
document sub-type of its own (`ninjos-shops.laden`) holding real items, and it
is **invisible to players** in the actor directory — that is guaranteed and
measured.

Markup and fixed prices, stock that runs out, hidden goods, services, a maximum
per purchase, an optional till that can run dry. Three purchase modes: locked,
approval, direct. Selling works two ways — directly for flagged goods, or as a
request where the GM sees a private price range and names a price. Shops can be
bound to scenes, linked to the merchant who runs them, and there is a trade
window for people who have no shop at all. Two ledgers: one per shop, filtered
to whoever opens it, and one across all shops for the GM.

Buying and selling always execute on the GM's client; which *connection* does
so is decided by an election, because `activeGM` names a user and two tabs of
the same GM would otherwise run every purchase twice.

The full design rationale is in `KONZEPT-shops.md` (German).
