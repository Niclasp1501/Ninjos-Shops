# Änderungen

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung `<foundry-major>.<YYMM>.<patch>`.

## [Unveröffentlicht]

### Behoben
- **Das ⋯-Menü an der Warenzeile ging nicht auf** — genauer: Es ging auf und
  lag hinter dem Fenster. Seit es am Dokument hängt (damit es die scrollende
  Liste nicht abschneidet), gilt sein `z-index` nicht mehr gegen die Zeile,
  sondern gegen Foundrys Fenster — und die liegen bei 105, das Menü lag bei 20.
  Der Klick tat scheinbar nichts.
- **Die Schauansicht blieb nach einem Neuladen stehen.** Der Vortrag läuft im
  Arbeitsspeicher genau der Verbindung, die ihn gestartet hat — lud die
  Spielleitung neu, blätterte niemand mehr, und auf dem Schirm stand
  „angehalten", bis jemand von Hand eingriff. Die Spielleitung nimmt ihn jetzt
  beim Start wieder auf, und ein Bildschirm, der zurückkommt, fragt nach, wo
  der Vortrag gerade steht, statt auf den nächsten Takt zu warten.
- **Preise werden in Gold genannt, nicht in Platin.** Wer „12 GM" eintippte,
  bei dem las der Spieler „1 PM 2 GM", und ein Heiltrank kostete „7 PM 5 GM"
  statt 75 Gold. Im Beutel bleibt Platin liegen, wo es liegt, und Wechselgeld
  wird weiter damit herausgegeben — nur *genannt* wird ein Preis in Gold,
  Silber und Kupfer.
- **Null ist kein Preis.** Ein Vorschlag über nichts nahm dem Spieler sein
  Stück und gab ihm nichts dafür. Der direkte Ankauf wies das längst ab; die
  Verhandlung tut es jetzt auch.
- **Fenster wachsen wieder mit**, wenn der Bildschirm größer wird — aber nur
  die, die seither niemand selbst gezogen hat. Wer von Hand kleiner zieht,
  wird beim nächsten Drehen nicht überfahren.
- **Breite Fenster nutzten ihre Breite nicht.** Der Name schluckte jeden
  zusätzlichen Pixel, und zwischen ihm und dem Bestand klaffte ein Loch. Ist
  die Auslage breit genug, steht sie jetzt **zweispaltig** — das nutzt die
  Breite und halbiert die Höhe. Ab sehr breit dreispaltig.
- **Fenster öffnen sich größer.** Beim ersten Aufmachen darf ein Fenster
  anderthalbmal so breit werden wie seine Voreinstellung, solange der
  Bildschirm es hergibt. Später nie wieder: Wer von Hand kleiner zieht, will
  es kleiner haben.
- **Die Klemmung fror `height: auto` ein.** Sie schrieb jedem Fenster eine
  feste Höhe, auch wenn gar nichts zu klemmen war — eine neue Anfrage machte
  das Fenster danach nicht mehr höher. Jetzt wird die Höhe nur angefasst, wenn
  sie wirklich über den Rand geht.
- **Das Verhandlungsfenster kam hinter dem Ladenbogen hoch.** Stand es schon
  offen, blieb es liegen, wo es lag — die Anfrage wurde nicht bemerkt, und der
  Spieler wartete auf eine Antwort, die niemand gesehen hatte. Es klappt jetzt
  aus, kommt nach vorn und meldet sich mit Namen und Anzahl.
- **Ein Stück ohne Preis zeigte dreimal „0 KM"** und sah aus wie ein Fehler.
  Jetzt steht dort ein Satz: An diesem Stück hängt kein Preis.
- **Namen wurden abgeschnitten, obwohl daneben Platz frei war.** Sie brechen
  jetzt um; das Fenster ist breiter, und Werte, Felder und Knöpfe rücken
  untereinander, wenn es eng wird, statt sich zu quetschen. Fehlt einem Stück
  das Bild, steht dort ein Symbol statt eines leeren weißen Kastens.
- **Ein Kauf lief doppelt, wenn dieselbe Spielleitung zwei Tabs offen hatte.**
  `game.users.activeGM` benennt einen Benutzer, keine Verbindung — beide Tabs
  hielten sich für zuständig. Gemessen: zwei Buchungen 16 ms auseinander, zwei
  Fackeln in der Tasche, einmal bezahlt. Welche Verbindung ausführt, entscheidet
  jetzt ein Anspruch je Bitte (`scripts/vorsitz.js`).
- **Auf einem Tablet lief das Spielerfenster unten aus dem Bild** und war dort
  nicht mehr erreichbar — Verschieben half nicht, weil die Titelleiste schon
  oben stand. Fenster werden jetzt auf den sichtbaren Bereich gedeckelt und
  beim Drehen oder Aufklappen der Tastatur nachgezogen.

### Hinzugefügt
- **Ware aus der Nähe ansehen.** Ein Klick auf Bild oder Namen im
  Spielerfenster öffnet das Stück groß, mit seiner ganzen Beschreibung und
  einem Kaufknopf. Vorher gab es dorthin keinen Weg: Die Beschreibung steht am
  Gegenstand, und der gehört dem Laden — ein Spieler kann seinen Bogen nicht
  öffnen.
- **Die Schauansicht** — der Laden auf dem Bildschirm an der Wand. Vollbild
  ohne Fensterrahmen, sechs Karten je Seite, Name in Versalien, Preis in Gold,
  ein Fortschrittsbalken am unteren Rand. Nichts daran lässt sich anklicken:
  Der Monitor hat keine Tastatur. Geblättert wird alle zehn Sekunden
  (einstellbar); **gesteuert wird im Ladenbogen** — anhalten, vor, zurück. Von
  Hand blättern hält an, damit die Anzeige nicht weiterspringt, während jemand
  fragt.
- **Wer groß sieht, entscheidest du beim Vorzeigen.** In der Auswahlliste
  steht neben jedem Namen ein Schalter „groß", vorbelegt für erkannte
  Monitore. „Allen zeigen" gibt Monitoren die Schauansicht und allen anderen
  ihr Fenster.
- **Die Brücke liest die In-Person Tools jetzt wirklich.** Deren API gibt die
  Monitorerkennung bis heute nicht heraus; die beiden Einstellungen, in denen
  sie ihre Schirme hält, sind aber lesbar. Wer dort einen Monitor eingetragen
  hat, muss ihn hier nicht noch einmal eintragen. Sind sie leer, gilt die
  eigene Liste — leer heißt „nicht eingerichtet", nicht „keiner".
- **Eine Liste, welche Benutzer Monitore sind** (Moduleinstellungen →
  Monitore). Laufen Ninjo's In-Person Tools und geben sie ihre Erkennung
  heraus, gilt deren Antwort; die eigene Liste graut dann aus und sagt, woher
  die Auskunft kommt.
- **Handel mit einer Person, die keinen Laden hat.** Ein Knopf in der
  Titelleiste jedes Personenbogens: Du hakst an, welche Stücke vorgelegt
  werden, setzt Menge und Preis, wählst die Empfänger — und nur das sieht der
  Spieler, nichts anderes von diesem Bogen. Er nimmt Stück für Stück; das Geld
  wandert in die Börse der Person, falls sie eine hat. **Ausgelöst wird das
  immer von der Spielleitung**, ein Spieler kann niemanden ansprechen. Der Weg
  zurück — der Spieler bietet seinerseits etwas an — ist vorbereitet
  („Sie nimmt auch etwas an") und wird als Nächstes gebaut.
- **Ein Klick auf den Händler öffnet seinen Laden.** Das Merkmal dafür stand
  seit dem ersten Tag im Modul und wurde von nichts gelesen. Es pflegt sich
  jetzt selbst aus dem Verkäufer-Feld: Wer dort jemanden einträgt, hat die
  Verknüpfung gesetzt; wer ihn austauscht, hat sie umgehängt. Der Weg dorthin
  führt über die Titelleiste des Händlerbogens, das Kontextmenü im
  Akteursverzeichnis und — wo es eine Leinwand gibt — das Bedienfeld seines
  Tokens. Ein Händler mit zwei Ständen wird gefragt, welcher gemeint ist.
- **Freigaben stehen in den Büchern.** Das Marktbuch schreibt jedes Ja und
  jedes Nein samt Namen dessen, der entschieden hat; im Ladenbuch — dem Buch,
  das der Spieler aufschlägt — steht das Nein mit dem Satz dazu. Vorher war
  eine Ablehnung eine Meldung, die verschwand.
- **Ein Laden kann an Szenen hängen.** „Auf welchen Szenen" in den
  Ladeneinstellungen: Wer keine dieser Karten vor sich hat, kommt nicht an den
  Laden. Keine Auswahl heißt weiterhin überall. Es ist ein Filter über dem
  Zugriffsmodus, kein dritter Modus — „alle Spieler, aber nur auf dem
  Marktplatz". Wechselt die Szene, schließt sich ein selbst geöffneter Laden;
  was die Spielleitung vorzeigt, bleibt stehen.
- **Der Kaufmodus „Freigabe" tut jetzt etwas.** Er stand im Datenmodell, in den
  Einstellungen und als Satz im Bestätigungsdialog — der Kauf lief trotzdem
  durch wie bei „Direkt". Jetzt legt sich die Bitte bei der Spielleitung ab,
  und der Spieler bekommt sie erst nach einem Ja. Was am Geld, am Bestand oder
  an der Höchstmenge scheitert, scheitert sofort, ohne jemanden zu fragen; ein
  Kauf zu einem zugesagten Angebotspreis braucht kein zweites Ja.
- **Kaufwünsche und Verkaufsanfragen stehen im selben Fenster** — „Anfragen am
  Tresen". Zwei Fenster für dieselbe Frage („ein Spieler fragt etwas") wären
  eins zu viel.
- **Verkäufer je Laden**: ein NSC, per Ablage in die Einstellungen gezogen. Er
  steht im Kopf beider Fenster und als Gegenüber in den Büchern — die
  Spielleitung erscheint dort nicht mehr, sie führt den Handel nur aus. Ohne
  Verknüpfung steht neutral „Verkäufer" da.

### Geändert
- **Die Fensterleiste ist nicht mehr rot**, sondern ein warmes Braunschwarz
  mit leichtem Verlauf — der Lederrücken eines Buches, auf dessen Seiten der
  Laden steht. Reines Schwarz wäre die Leiste irgendeiner Anwendung; die
  goldene Haarlinie darunter bleibt, an ihr erkennt man das Modul. Rot behält
  damit endgültig nur seine drei Aufgaben: die eine Hauptaktion, die Warnung
  und den Sonderfall.
- **Papier statt Weiß.** Die Fenster stehen jetzt auf Pergament: wärmerer
  Grund, Ränder wie gezogene Linien, Schrift in Tinte statt in Schwarz — und
  eine feine Faser im Hintergrund. Die kommt ohne Bild aus, als Rauschen im
  Hintergrund und nicht als Schicht über dem Inhalt, damit die Schrift glatt
  bleibt.
- **Die Schauansicht lässt sich hell oder dunkel stellen**
  (Moduleinstellungen → „Schauansicht: Helligkeit"). Dunkel blendet im
  abgedunkelten Zimmer nicht, Pergament liest sich auf einem Fernseher bei
  Tageslicht besser. Welcher Raum es ist, weiß nur der Tisch.
- **Das Spielerfenster hat einen Auftritt bekommen.** Das Warenbild ist von 34
  auf 56 Pixel gewachsen — dasselbe Bild ist in der Schauansicht der
  Hauptdarsteller. Preise tragen jetzt das Gold der Schauansicht, der
  Kaufknopf steht ruhig da und füllt sich erst, wenn man ihn meint (vier
  gefüllte rote Blöcke untereinander waren viermal dasselbe Signal), und die
  Börse zeigt nur die Münzen, die man wirklich hat.
- **Der Verkäufer steht mit seinem Tokenbild im Kopf der Schauansicht** — rund,
  mit goldenem Rand. Das Tokenbild und nicht das Bogenbild: Der Bogen trägt
  oft ein Brustbild im Hochformat, das Token ist der Kopf, wie er am Tisch
  daliegt.
- **Die Seitenzahl ist deutlich größer.** Aus zwei Metern ist sie die einzige
  Angabe, die sagt, ob man schon alles gesehen hat.
- **Der Hinweis „Escape schließt diese Ansicht" ist weg.** Die Taste bleibt —
  sie steht jetzt in der Anleitung statt auf dem Bildschirm. Die Schauansicht
  hängt an einer Wand und soll aussehen wie ein Regal, nicht wie ein Programm
  mit Bedienhinweisen.
- **Eine Sanduhr statt des Fortschrittsbalkens** in der Schauansicht. Der
  Balken war die einzige Stelle, an der die Anzeige nach Software aussah statt
  nach einer Bude auf einem Marktplatz. Der Sand rieselt über die Standzeit
  der Seite; steht die Anzeige, wird er blass und der Faden verschwindet.
- **Escape schließt die Schauansicht** — aber nur für die Spielleitung. Auf
  einem Monitor gibt es den Hinweis nicht, dort sitzt niemand. Wer sie sich
  ansieht, saß sonst in der Falle: Die Schicht deckt den ganzen Bildschirm,
  also auch den Ladenbogen mit seiner Steuerung.
- **Die Einstellungen stehen jetzt auch im Titelleisten-Menü**, neben den
  beiden Büchern. Der Regler im Kopfbild bleibt — aber er sitzt am rechten
  Rand des Banners, und dort ist er auf einem schmalen Schirm, unter einem
  Finger oder neben einem zweiten Fenster am schwersten zu treffen.
- **Ein Menü je Warenzeile** statt fünf blasser Symbole. Verborgen,
  Dienstleistung und Ankauf bleiben als kleine Marken hinter dem Namen sichtbar
  — nur die Handlungen sind ins Menü gewandert.
- **„Besucher" steht jetzt über der Namensliste.** Vorher stand dort ein Name
  ohne Überschrift, und niemand wusste, was er bedeutet.
- Das Verkäufer-Feld lag mit seiner Beschriftung auf dem Hinweistext darüber.
- **Rot-Diät.** Überschriften, zweitrangige Knöpfe und Preise tragen kein Rot
  mehr — es blieb für die Fensterleiste, die eine Hauptaktion je Block und für
  Warnungen. Überschriften ordnen jetzt über eine dünne Linie.
- **Die Bücher stehen im Fenstermenü** statt als beschriftungslose Symbolknöpfe
  in der Vorzeigen-Leiste, wo sie umbrachen und unlesbar waren.
- **Das Marktbuch ist kein Journal mehr.** Es las sich wie ein Protokoll: nicht
  filterbar, nicht sortierbar, jede Zeile ein Textschnipsel. Jetzt liegen die
  Einträge als Daten in einer Welteinstellung und bekommen ein eigenes Fenster
  mit Filter nach Laden, sichtbarem Grund bei gescheiterten Versuchen und einem
  Knopf zum Leeren.
- Die Knopfleiste im Bogen ist **nach Aufgabe gruppiert**: links vorzeigen und
  schließen, rechts abgesetzt die beiden Bücher als Symbolknöpfe.
- Das Kopfbild ist von 132 auf 104 px geschrumpft — die Auslage wuchs damit von
  275 auf 368 px. Sie ist das, wofür man das Fenster öffnet.
- **Ladenbuch je Laden**, für alle zu öffnen: Die Spielleitung sieht jeden
  Vorgang in diesem Laden, ein Spieler nur seine eigenen. Mit Richtung, Datum,
  Summe und einer Zeile darunter, was insgesamt geflossen ist. Nicht zu
  verwechseln mit dem Marktbuch — das bleibt das Journal der Spielleitung über
  alle Läden und schreibt auch fehlgeschlagene Versuche mit.
- **Verkaufen an den Laden**, in zwei Wegen. Angehakte Ware (`flags…ankauf` je
  Stück in der Auslage) geht sofort durch, zum Ankaufsfaktor des Ladens. Alles
  andere läuft über eine **Verkaufsanfrage**: Der Spieler packt zusammen, die
  Spielleitung sieht üblichen Wert samt Unter- und Obergrenze — die drei Zahlen
  werden vor dem Verschicken aus der Sitzung entfernt, nicht nur ausgeblendet —
  nennt einen Preis, und der Spieler nimmt an oder lehnt ab.
- `system.spielraum` je Laden (ab Werk 0,25): wie weit der Preis bei einer
  Anfrage nach oben und unten reicht. Das Modul rechnet nur; entschieden wird
  am Tisch.
- **`eigeneKasse` begrenzt jetzt tatsächlich etwas.** Beim Kauf füllte sie sich
  nur; beim Ankauf muss sie reichen, sonst lehnt der Laden ab.
- **Schritt 5: der Kauf.** Der Spieler tippt, die Spielleitung prüft alles noch
  einmal von vorn und führt aus — Preis wird dort neu gerechnet, nie vom
  Spieler übernommen. Bezahlt wird mit Wechselgeld aus `kasse.js`, deren 43
  Tests damit erstmals im Spiel ankommen. Erst anlegen, dann abziehen: Bricht es
  dazwischen ab, gibt es den Gegenstand doppelt statt gar nicht.
- **Angebote der Spielleitung**: eine Ware jemandem zum Sonderpreis hinlegen,
  mit Menge, Preis und einem Satz dazu. Der Preis steht auf dem Benutzer, nicht
  in der Socket-Nachricht — sonst könnte ein Spieler sich seinen eigenen Preis
  schicken.
- **Marktbuch** als Journal, nur für die Spielleitung, eine Seite je Spieltag.
  Geschrieben wird zweimal je Kauf: was gemeint war und was geschehen ist. Ein
  Buch, das nur gelungene Käufe kennt, schweigt genau dann, wenn man es braucht.
- **Rückfrage vor dem Kauf** mit Menge, Preis und dem, was danach in der Börse
  bleibt. Kein `confirm()`.
- **Kopfbild**: Das Bild des Ladens ist jetzt das Ladeninnere und läuft als
  breiter Streifen über beide Fenster, mit Regler für den Ausschnitt und
  Vorschau im selben Seitenverhältnis. Das Tokenbild bleibt daneben bestehen.
- **Wege zu den Läden**: Knopf im Akteursverzeichnis (neuer Laden, Marktbuch),
  Werkzeug in der Szenenleiste und ein Knopf in der Leiste der In-Person Tools —
  letzterer ohne jede Änderung an jenem Modul, allein über dessen Zeichnen-Haken.
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
- **Der Einstellungsknopf war auf dunklen Kopfbildern nicht zu finden** — ein
  dunkler, halbdurchsichtiger Kasten mit blassem Rand, und dabei der einzige Weg
  zu den Einstellungen. Jetzt gold gefüllt mit dem Rot des Hauses.
- **Im Akteursverzeichnis stand das Kopfbild.** Ein breites Ladeninneres auf ein
  Quadrat von 32 Pixeln gequetscht ist ein Farbfleck; dort steht jetzt das
  Tokenbild. Getauscht wird nur die Anzeige — `img` bleibt das Kopfbild.
- **Das Kopfbild ließ sich nicht wählen.** Die Vorschau war ein `<div>` mit
  Hintergrundbild, und Foundrys Aktion `editImage` wirft bei allem, was kein
  `<img>` ist — der Klick tat also schlicht nichts. Jetzt ein Bildelement, der
  Ausschnitt kommt über `object-position`.
- **Ein leeres Bildfeld verwarf das ganze Formular.** `FormDataExtended` sammelt
  jedes `img[data-edit]` mit ein; ohne Quelle löst der Browser sie zur
  Seitenadresse auf, und Foundry wies die Änderung mit „does not have a valid
  file extension" ab — samt Aufschlag, Kaufmodus und Zugriff.
- **Der Ladentyp trug dnd5es Kapuzenmännchen.** dnd5e zeichnet die Typen im
  Anlegen-Dialog aus `CONFIG.DND5E.defaultArtwork.Actor`, nicht aus
  `CONFIG.Actor.typeIcons`. Dazu dieselbe Waage als SVG
  (`assets/laden.svg`), die auch die Fensterleiste trägt — der Pfad aus Font
  Awesome Free unter CC BY 4.0, weil Foundrys mitgelieferte Pro-Fassung nicht
  weitergegeben werden darf.
- **Die Spieleransicht hatte keine Spaltenköpfe.** Welche Zahl der Bestand ist
  und welche der Preis, musste man raten. Beide Ansichten tragen den Kopf jetzt
  **innerhalb** der Liste — dort gilt für Kopf und Karten dieselbe
  Innenabstand- und Scrollleisten-Rechnung, und er bleibt beim Scrollen stehen.
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
