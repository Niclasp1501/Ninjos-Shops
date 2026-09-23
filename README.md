# Ninjo's DnD Shops & Trade

Shops the GM shows instead of lists the players search, plus trading without a shop: with any
NPC and between two players. For Foundry VTT and dnd5e.

*(Scroll down for the German version / Weiter unten auf Deutsch)*

---

## 🇬🇧 English

In a lot of games, shopping is either a long list the GM reads out, or a compendium the players
dig through themselves, turning up things that have no business being sold in this village.
With Shops & Trade you show your players a real shop instead: with goods, prices and a merchant
behind the counter, and only when you want to.

A shop is its own document in Foundry, holding real items in its inventory. You fill it once by
dragging items in, set the prices, and then show it to your players, all together or just some
of them. The shop stays invisible in your players' actor directory, even while they have it open.

Because good games involve more trading than just shops, **trading without a shop** is part of it
too: with the farmer by the roadside, and between two players.

### Your shop, your prices

Set up each shop the way it fits your world. A **markup** makes everything in the pricey harbour
district more expensive in one go, while a **fixed price** sets exactly what a single item costs.
**Stock** can run out, and a **maximum per purchase** stops your party from buying the whole
village empty. Goods under the counter stay hidden from everyone but you until you offer them to
someone.

Not everything a merchant sells is an item. A night's lodging, some healing or a horse for the day
go in as a **service**. With a **till** of its own, a merchant can eventually run out of money if
your players sell too much. And if you like, an NPC stands behind the counter, whose sheet then
gets a button to open their shop.

### Show it when you want

You decide who gets to see a shop. Show it to everyone, show it only to the player who is
wandering the bazaar alone, or open it up for particular scenes so players can drop in there on
their own. A shown shop stays open through a reload.

When you all play in one room, the shop can go up on the big screen as well. The **display view**
shows the goods large as cards with prices in gold and turns the pages by itself, while you pause
or go back from the shop sheet.

### Buying and selling

You decide per shop how your players buy. While it is locked they can look at the goods, and you
sell them yourself as usual. With **approval**, a player taps "Buy" and you confirm, or decline
with a line of explanation. With **direct buying** everything goes through as soon as the money
is there. Payment comes from the character's coins, and the module works out the change by
itself. Because every purchase is checked and carried out on your side, nobody can cheat from
their own computer.

Your players can sell in two ways. Whatever the shop already carries, they sell directly at the
buy-back price. For everything else they send a request, and you see a floor, a usual value and a
ceiling before you name a price. Only you ever see those numbers.

Every purchase and sale is written into the **shop ledger**. The **market ledger** shows all
shops together, including the purchases you declined and why.

### Trading without a shop

Not everyone your party trades with runs a shop. For the stranger at the campfire or the farmer
with two torches, open a **trade table** from any character sheet. Both sides put down what they
are willing to part with and name their own price for it. Anyone who overpays in coins gets change
back, and nothing changes hands until both have agreed. If someone changes something afterwards,
both have to agree again.

**Two players** trade with each other the same way. One picks the other, they say yes, and the
same table lies in front of both. Nobody works out what an item is worth here; all that counts is
what the two of them agree on. Everything can be tapped, quantities have step buttons and coins
are added per denomination, so trading works comfortably on a tablet too.

### Installation

The module is in the official Foundry package catalogue. In Foundry, open the **Add-on Modules**
tab, click **Install Module** and search for *Ninjo's DnD Shops & Trade*. Then enable it in your
world's module settings.

You can also use this manifest URL:
`https://github.com/Niclasp1501/Ninjos-Shops/releases/latest/download/module.json`

You need Foundry VTT v13 or v14 and the `dnd5e` system from version 5.0. With **Ninjo's In-Person
Tools** installed, the module recognises your displays by itself and trading gets a button in the
tablet sheet view. In-Person Tools are not required for any of this, though.

#### Step by step

#### Creating a shop

In the actor directory, use **Create Actor** and choose **Shop** as the type. Then drag items into
it from a compendium or another sheet. Everything else is set through the slider icon in the
shop's header image: markup, buy-back, purchase mode, maximum per purchase, own till, shopkeeper,
player access, scenes and the header image itself.

Every new shop comes with a market stall picture as its token and a header image that runs along
the top of the window as a wide strip. The **Framing** slider picks which part of the picture
shows, because the middle of an interior is rarely the most interesting part.

#### Setting prices

The **markup** applies to the whole shop: `1.5` means fifty per cent on top of the base price. A
**fixed price** for a single item is set from the **⋯** menu at the right of its row. It takes
precedence over the markup, and a dotted line under the price tells you one is set. **Buy-back**
is the factor at which the shop buys goods back. At `0` the shop buys nothing.

#### Arranging the goods

Every row has a **⋯** menu with these entries:

| Entry | What it does |
| --- | --- |
| Under the counter | Players do not see the item |
| A service | Costs money but does not change hands |
| Takes it back | Allows selling this item directly |
| Offer to someone | A special price for individual players |
| Open the item | Opens the item's sheet |
| Take off the shelves | Removes the item from the shop |

Small tags behind the name show whether something is hidden, a service or bought back, without
opening the menu.

#### Showing a shop

Below the header image sits a bar with **Show to all**, **Choose …** and **Close for all**. Under
"Visitors" you see who has the shop open right now, and the cross next to a name closes it for
that one player.

If your players should be able to look into a shop on their own, tick **Players may open shops
themselves** in the module settings. In the shop you then decide under **Player access** who may
open it and on which scenes. Without a scene selected, the shop can be reached from any map.

#### Approving a purchase

When a shop is set to approval, the **Requests at the counter** window opens on your side as soon
as someone wants to buy. Decide there with **Let it go** or **Not today**. The field next to it
takes a line of explanation that reaches the player and is kept in both ledgers.

Below, the same window lists **Sell requests**. The gold box shows three values that only you
see: the floor, the usual value and the ceiling. Clicking one puts it into the price field. Then
make your offer with **Name a price**, or decline with **Turn down**.

#### Trading with someone who has no shop

Open that character's sheet and click the handshake icon in the title bar. Choose the player to
trade with. Use **Pick items** and **Add coin** to put down what the character is giving, and name
your price for each item with **Name a price**. The player does the same on their side. Once both
agree, the trade happens. If the numbers do not add up or a price is missing, a window asks first
and tells you by how much.

If you have closed the table, the same button on the sheet brings it back. Your players have a
button of their own for this at the bottom right.

#### Letting two players trade

Your players tap **Trade** above the player list, or find the button in the sheet view bar on a
tablet. Then they choose who to trade with; that person has to be logged in and have a character.
Once they say yes, both put down what should change hands with **Pick items** and **Add coin**,
and finish with **Close the deal**. If either changes anything afterwards, both have to agree
again.

A GM has to be logged in, because the trade is carried out through them. They do not have to
watch it, though.

#### Putting the shop on the big screen

Click **Choose …** and tick the **large** switch next to the screen. Recognised displays already
carry a dot there. The screen shows the first page straight away and turns the page every ten
seconds. A bar appears in the shop sheet to go forward, back or hold, and paging by hand holds the
display view.

If you show the display view to yourself, it fills your whole screen, and Escape closes it again.
Which users count as displays is set in the module settings under **Displays**. With Ninjo's
In-Person Tools running, the module uses their detection instead.

#### Reading the ledgers

The **market ledger** opens from the book button at the bottom of the actor directory, from the
**⋮** menu of an open shop, and from the module settings. The last way is always there, even if you
have switched the directory bar off.

A shop's **shop ledger** is in its **⋮** menu. Your players see a shop ledger there as well, but
only with their own entries.

### For developers

```bash
node tools/kasse.test.mjs          # till and prices, no running world needed
node tools/lager.test.mjs          # stock and stacking
node tools/sprache.test.mjs        # language files: same keys, no dashes
pwsh tools/deploy-shops.ps1 -Target testv14
pwsh tools/deploy-shops.ps1 -Target prod
```

The GM's client holds the truth. A player cannot create or delete anything on an actor they do
not own, so they send a request, and the GM's client checks it from scratch and carries it out.
Which connection does that is decided in `scripts/vorsitz.js`, because `activeGM` names a user,
and two tabs of the same GM would otherwise run every purchase twice. The full design rationale
is in `KONZEPT-shops.md` (German), and anyone working on the module also reads `AGENTS.md`.

---

## 🇩🇪 Deutsch

Einkaufen ist in vielen Runden entweder eine lange Liste, die der Spielleiter vorliest, oder ein
Kompendium, in dem die Spieler selbst herumsuchen und dabei Dinge finden, die es in diesem Dorf
gar nicht geben dürfte. Mit Shops & Trade zeigst du deinen Spielern einen richtigen Laden: mit
Ware, Preisen und einem Händler dahinter, und nur dann, wenn du es willst.

Ein Laden ist dabei ein eigenes Dokument in Foundry mit echten Gegenständen im Inventar. Du
füllst ihn einmal, indem du Gegenstände hineinziehst, stellst Preise ein und zeigst ihn dann
deinen Spielern, allen zusammen oder nur einzelnen. Für die Spieler bleibt der Laden im
Akteursverzeichnis unsichtbar, auch wenn sie ihn gerade geöffnet haben.

Weil in guten Runden nicht nur in Läden gehandelt wird, gehört auch der **Handel ohne Laden**
dazu: mit dem Bauern am Wegrand und zwischen zwei Spielern.

### Dein Laden, deine Preise

Einen Laden richtest du so ein, wie er in deine Welt passt. Ein **Aufschlag** macht die Ware im
teuren Hafenviertel für den ganzen Laden auf einmal teurer, ein **Festpreis** legt für einzelne
Stücke genau fest, was sie kosten. Der **Bestand** kann zur Neige gehen, und eine **Höchstmenge**
je Kauf verhindert, dass deine Gruppe das ganze Dorf leerkauft. Unter der Theke liegt Ware, die
nur du siehst, bis du sie jemandem anbietest.

Nicht alles, was ein Händler verkauft, ist ein Gegenstand. Eine Übernachtung, eine Heilung oder
ein Pferd für einen Tag trägst du als **Dienstleistung** ein. Mit einer eigenen **Kasse** kann dem
Händler irgendwann das Geld ausgehen, wenn ihm deine Spieler zu viel verkaufen. Und hinter der
Theke steht auf Wunsch ein NSC, dessen Bogen dann einen Knopf zum Öffnen seines Ladens bekommt.

### Vorzeigen, wann du willst

Du bestimmst, wer einen Laden zu sehen bekommt. Zeig ihn allen, zeig ihn nur dem Spieler, der
gerade allein durch den Basar schlendert, oder gib ihn für bestimmte Szenen frei, damit die
Spieler dort selbst hineinschauen können. Ein gezeigter Laden bleibt auch nach einem Neuladen
offen.

Spielt ihr zusammen in einem Raum, kommt der Laden auch auf den großen Bildschirm. Die
**Schauansicht** zeigt die Ware groß als Karten mit Preisen in Gold und blättert von selbst weiter,
während du im Ladenbogen anhalten oder zurückblättern kannst.

### Kaufen und Verkaufen

Wie deine Spieler einkaufen, legst du für jeden Laden fest. Ist er gesperrt, können sie sich die
Ware ansehen, und du verkaufst wie gewohnt selbst. Mit **Freigabe** tippt ein Spieler auf
„Kaufen", und du bestätigst oder lehnst mit einem Satz Begründung ab. Beim **direkten Kauf** geht
alles sofort durch, sobald das Geld reicht. Bezahlt wird mit den Münzen der Figur, und das
Wechselgeld rechnet das Modul selbst aus. Weil jeder Kauf bei dir geprüft und ausgeführt wird,
kann niemand an seinem Rechner schummeln.

Verkaufen können deine Spieler auf zwei Wegen. Was der Laden ohnehin führt, verkaufen sie direkt
zum Ankaufspreis. Für alles andere schicken sie eine Anfrage, und du siehst dazu eine Untergrenze,
einen üblichen Wert und eine Obergrenze, bevor du einen Preis nennst. Diese Zahlen bekommt nur
du zu sehen.

Jeder Kauf und Verkauf landet im **Ladenbuch** des Ladens. Im **Marktbuch** siehst du alle Läden
zusammen, auch mit den Käufen, die du abgelehnt hast, und warum.

### Handeln ohne Laden

Nicht jeder, mit dem deine Gruppe handelt, führt einen Laden. Für den Fremden am Lagerfeuer oder
den Bauern mit zwei Fackeln öffnest du aus jedem Personenbogen einen **Handelstisch**. Beide
Seiten legen hin, was sie hergeben wollen, und nennen selbst ihren Preis dafür. Wer mit Münzen
zu viel bezahlt, bekommt Wechselgeld heraus, und getauscht wird erst, wenn beide zugesagt haben.
Ändert jemand danach noch etwas, müssen beide erneut zusagen.

Genauso tauschen **zwei Spieler** untereinander. Einer wählt den anderen aus, der sagt ja, und
dann liegt vor beiden derselbe Tisch. Hier rechnet niemand nach, was ein Stück wert ist, es zählt
nur, worauf sich die beiden einigen. Alles lässt sich antippen, die Menge mit Knöpfen einstellen
und Münzen je Sorte hinzufügen, deshalb klappt der Tausch auch bequem auf dem Tablet.

### Installation

Das Modul steht im offiziellen Foundry-Paketkatalog. Öffne in Foundry den Reiter
**Add-on-Module**, klicke auf **Modul installieren** und suche nach *Ninjo's DnD Shops & Trade*.
Danach aktivierst du es in den Moduleinstellungen deiner Welt.

Du kannst auch diese Manifest-Adresse verwenden:
`https://github.com/Niclasp1501/Ninjos-Shops/releases/latest/download/module.json`

Du brauchst Foundry VTT v13 oder v14 und das System `dnd5e` ab Version 5.0. Mit
**Ninjo's In-Person Tools** erkennt das Modul eure Monitore von selbst, und der Tausch bekommt
einen Knopf in der Blattansicht der Tablets. Nötig sind die In-Person Tools dafür aber nicht.

#### Schritt für Schritt

#### Einen Laden anlegen

Leg im Akteursverzeichnis über **Akteur erstellen** einen neuen Akteur an und wähle als Typ
**Laden**. Dann ziehst du Gegenstände aus einem Kompendium oder einem anderen Bogen hinein. Alles
Weitere stellst du über das Reglersymbol im Kopfbild des Ladens ein: Aufschlag, Ankauf,
Kaufmodus, Höchstmenge, eigene Kasse, Verkäufer, Zugriff, Szenen und das Kopfbild selbst.

Jeder neue Laden trägt ab Werk ein Marktstand-Bild als Token und ein Kopfbild, das oben im
Fenster als breiter Streifen läuft. Mit dem Regler **Ausschnitt** wählst du, welcher Teil des
Bildes zu sehen ist, denn bei einem Innenraum ist die Mitte selten das Interessanteste.

#### Preise festlegen

Der **Aufschlag** gilt für den ganzen Laden: `1,5` bedeutet fünfzig Prozent auf den Grundpreis.
Einen **Festpreis** für einzelne Stücke setzt du über das **⋯**-Menü rechts in der Zeile. Er
geht dem Aufschlag vor, und eine gepunktete Linie unter dem Preis zeigt dir, dass einer gesetzt
ist. Der **Ankauf** ist der Faktor, zu dem der Laden Ware zurückkauft. Steht er auf `0`, kauft der
Laden nichts an.

#### Die Ware einrichten

Jede Zeile hat ein **⋯**-Menü mit diesen Einträgen:

| Eintrag | Was er bewirkt |
| --- | --- |
| Unter der Theke | Die Spieler sehen das Stück nicht |
| Dienstleistung | Kostet Geld, wechselt aber nicht den Besitzer |
| Kauft er zurück | Erlaubt den direkten Verkauf dieses Stücks |
| Jemandem anbieten | Ein Sonderpreis für einzelne Spieler |
| Gegenstand öffnen | Öffnet den Bogen des Stücks |
| Aus der Auslage nehmen | Entfernt das Stück aus dem Laden |

Ob etwas verborgen ist, eine Dienstleistung ist oder zurückgekauft wird, siehst du an kleinen
Marken hinter dem Namen, ohne das Menü aufklappen zu müssen.

#### Einen Laden zeigen

Unter dem Kopfbild liegt eine Leiste mit **Allen zeigen**, **Auswählen …** und **Allen
schließen**. Darunter siehst du bei „Besucher", wer den Laden gerade offen hat, und kannst ihn
über das Kreuz neben einem Namen für diesen einen Spieler schließen.

Sollen deine Spieler auch von sich aus in einen Laden schauen können, hakst du in den
Moduleinstellungen **Spieler dürfen Läden selbst öffnen** an. Im Laden selbst legst du dann unter
**Zugriff** fest, wer ihn öffnen darf und auf welchen Szenen. Wählst du keine Szene aus, ist der
Laden von jeder Karte aus erreichbar.

#### Einen Kauf freigeben

Steht ein Laden auf Freigabe, öffnet sich bei dir das Fenster **Anfragen am Tresen**, sobald
jemand etwas kaufen möchte. Dort entscheidest du mit **Freigeben** oder **Nicht heute**. In das
Feld daneben kannst du einen Satz schreiben, der als Begründung beim Spieler ankommt und in beiden
Büchern festgehalten wird.

Im selben Fenster stehen darunter die **Verkaufsanfragen**. Im goldenen Kasten siehst nur du drei
Werte: die Untergrenze, den üblichen Wert und die Obergrenze. Ein Klick auf einen davon trägt ihn
ins Preisfeld ein. Dann nennst du mit **Preis nennen** dein Angebot oder lehnst mit **Abweisen**
ab.

#### Mit jemandem handeln, der keinen Laden hat

Öffne den Bogen der Person und klicke oben in der Titelleiste auf das Symbol mit dem Händedruck.
Wähle den Spieler aus, mit dem gehandelt wird. Über **Sachen aussuchen** und **Münzen dazulegen**
legst du hin, was die Person hergibt, und nennst bei jedem Stück mit **Preis nennen** deinen
Preis. Der Spieler macht auf seiner Seite dasselbe. Sagen beide zu, wird getauscht. Geht die
Rechnung nicht auf oder fehlt ein Preis, fragt ein Fenster vorher nach und sagt dir, um wie viel
es geht.

Hast du den Tisch geschlossen, holt ihn derselbe Knopf am Bogen zurück. Deine Spieler finden dafür
unten rechts einen eigenen Knopf.

#### Zwei Spieler tauschen lassen

Deine Spieler tippen über der Spielerliste auf **Tauschen**, auf dem Tablet findet sich der Knopf
in der Leiste der Blattansicht. Dann wählen sie die Person aus, mit der sie tauschen wollen. Die
muss angemeldet sein und eine Figur haben. Sagt sie ja, legen beide über **Sachen aussuchen** und
**Münzen dazulegen** hin, was mitgehen soll, und schließen mit **Handel abschließen** ab. Ändert
einer danach noch etwas, müssen beide erneut zusagen.

Ein Spielleiter muss dabei angemeldet sein, weil der Tausch über ihn ausgeführt wird. Mitansehen
muss er ihn aber nicht.

#### Den Laden auf den großen Bildschirm bringen

Klicke auf **Auswählen …** und hake beim Bildschirm den Schalter **groß** an. Erkannte Monitore
tragen dort schon einen Punkt. Der Bildschirm zeigt sofort die erste Seite und blättert alle zehn
Sekunden weiter. Im Ladenbogen erscheint dazu eine Leiste zum Vor- und Zurückblättern und zum
Anhalten, und sobald du von Hand blätterst, hält die Schauansicht an.

Zeigst du die Schauansicht dir selbst, füllt sie deinen ganzen Bildschirm. Mit Escape schließt du
sie wieder. Welche Benutzer als Monitore gelten, legst du in den Moduleinstellungen unter
**Monitore** fest. Laufen Ninjo's In-Person Tools, übernimmt das Modul deren Erkennung.

#### Die Bücher lesen

Das **Marktbuch** erreichst du über den Buchknopf unten im Akteursverzeichnis, über das
**⋮**-Menü eines geöffneten Ladens und über die Moduleinstellungen. Der letzte Weg ist immer da,
auch wenn du die Leiste im Verzeichnis abgeschaltet hast.

Das **Ladenbuch** eines Ladens findest du in dessen **⋮**-Menü. Auch deine Spieler sehen dort ein
Ladenbuch, allerdings nur mit ihren eigenen Einträgen.

### Für Entwickler

```bash
node tools/kasse.test.mjs          # Kasse und Preise, ohne laufende Welt
node tools/lager.test.mjs          # Bestand und Stapeln
node tools/sprache.test.mjs        # Sprachdateien: gleiche Schlüssel, keine Gedankenstriche
pwsh tools/deploy-shops.ps1 -Target testv14
pwsh tools/deploy-shops.ps1 -Target prod
```

Die Wahrheit liegt beim Spielleiter. Ein Spieler kann auf einem fremden Akteur nichts anlegen und
nichts löschen, also schickt er eine Bitte, und der Rechner des Spielleiters prüft sie von vorn
und führt sie aus. Welche Verbindung das übernimmt, entscheidet `scripts/vorsitz.js`, denn
`activeGM` benennt einen Benutzer, und zwei Tabs desselben Spielleiters würden sonst jeden Kauf
doppelt ausführen. Warum das Modul so gebaut ist, steht ausführlich in `KONZEPT-shops.md`, und wer
daran mitarbeitet, liest zusätzlich `AGENTS.md`.

---

## License / Lizenz

Shops & Trade is free to install and use, including for paid games, but it is **not open source**. All rights are reserved except those granted in [LICENSE](LICENSE): you may use it, modify it for your own table and write your own separate module that works with it, but not redistribute, rebundle or sell it. The Ninjo logo (`assets/ninjo.png`) is not covered by any licence.

Shops & Trade ist kostenlos und darf auch für bezahlte Runden benutzt werden, ist aber **nicht Open Source**. Alle Rechte sind vorbehalten, außer denen in der [LICENSE](LICENSE): Nutzen, für den eigenen Tisch anpassen und ein eigenes, getrenntes Modul dazu schreiben ja, weitergeben, in andere Pakete packen oder verkaufen nein. Das Ninjo-Logo (`assets/ninjo.png`) fällt unter keine Lizenz.
