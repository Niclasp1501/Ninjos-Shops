# Änderungen

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung `<foundry-major>.<YYMM>.<patch>`.

## [Unveröffentlicht]

### Hinzugefügt
- **Tausch zwischen zwei Spielern**, aus Ninjo's In-Person Tools hierher
  gezogen. Er und der Handel mit einer Person sind dieselbe Sache aus zwei
  Richtungen; zwei Tauschfenster in zwei Modulen, die je nach Installation
  anders aussahen, halfen niemandem. Der Knopf drüben öffnet jetzt diesen
  Tisch; ist das Modul nicht da, setzt Shops seinen eigenen über die
  Spielerliste. **Zwischen zwei Spielern wird nichts bewertet** — auf dem
  Tisch liegt, was daliegt.
- **Aussuchen in einer Lage über dem Tisch**, für beide Tische gleich:
  antippen, Menge über Stufenknöpfe (0 / −10 / − / + / +10 / alles), Münzen je
  Sorte. Vorher stand der ganze Vorrat unter der Waage und drängte den Handel
  selbst aus dem Bild; Geld kam über ein Zahlenfeld mit Auswahlmenü.
- **Ein Behälter reist samt Inhalt.** Ware wandert jetzt für beide Tische
  durch dieselbe Stelle: angelegt wird vor dem Wegnehmen, der Inhalt eines
  Beutels wird umgehängt (er hängt an einer Kennung, die sich beim Kopieren
  ändert), und `ownership`, `equipped` und `attuned` bleiben zurück.

### Geändert
- **Der Spieler sieht keine Grundpreise mehr.** Hinter jedem Stück der Person
  stand ein gerechneter Preis — neun Zahlen, die ihm niemand genannt hatte,
  und eine Summe darunter, die aus dem Nichts zu kommen schien. Jetzt gibt es
  eine Zahl: was sie verlangt. Vorgeschlagen wird die Summe ihrer Preise, und
  die Spielleitung kann sie auf alles setzen.
- **Was der Spieler hereingibt, trägt die Spielleitung ein.** Vorher wurde es
  still mit dem halben Grundpreis verrechnet. Jetzt steht ihr Ankaufswert im
  Feld, ihre Spanne daneben als drei Knöpfe und der Grundpreis als Auskunft
  darunter — alles nur für sie.

### Behoben
- **Hingelegtes Geld wanderte nie.** Es zählte in der Waage, verließ die Börse
  aber nicht: Wer 2 GM hinlegte, bekam den Dolch für 2 GM 4 SM um genau diese
  2 GM billiger — jede hingelegte Münze war ein Rabatt auf sich selbst.
  Gemessen an der laufenden Welt: 40 Kupfer für einen Dolch zu 2 GM 4 SM. Es
  greift jetzt niemand mehr in eine Börse; es wandert, was auf dem Tisch liegt,
  und die Münzen bleiben die Münzen, die sie sind.
- **Ein Fenster ohne Gegenstand blieb stehen.** Der Handelstisch der
  Spielleitung fiel beim Abräumen in seinen Leerzustand statt zuzugehen,
  ebenso das Verhandlungsfenster, wenn keine Anfrage mehr vorlag. Letzteres
  hatte eine tiefere Ursache: Die erledigte Anfrage wurde **gemeldet, bevor**
  sie aus der Ablage flog — wer auf die Meldung hin nachsah, bekam einen Stand,
  den es schon nicht mehr gab.
- **Unser Fenster-Klemmen fasste Foundrys eigene Oberfläche an.** Es hängt an
  jedem `renderApplicationV2`, und in Foundry v13+ sind auch Seitenleiste,
  Spielerliste und Verzeichnisreiter ApplicationV2: `max-height: 1139px` stand
  in ihrem Stil, von uns hineingeschrieben, und wird nie zurückgenommen.
  Angefasst wird jetzt nur noch, was wirklich schwebt.
- **Ein Handel ließ sich einseitig abschließen.** Der Spieler konnte etwas auf
  seine Seite legen und sofort bestätigen — die Spielleitung hatte dieser
  Zusammenstellung nie zugestimmt. Ein Tausch ist eine Abrede zwischen zweien;
  jetzt sagen **beide** zu, und **jede Änderung setzt beide Zusagen zurück**.
  Wer nach der Zusage noch etwas dazulegt oder den Preis anfasst, handelt einen
  anderen Tausch aus, und die alte Zusage galt ihm nicht.
- **Fremde Fenster liefen auf dem Tablet aus dem Bild.** Der
  Trefferwürfel-Dialog von dnd5e öffnete größer als der Schirm: kein Rand zum
  Ziehen, kein Kreuz zum Schließen, kein Entkommen. Dasselbe beim Bearbeiten
  der Trefferpunkte. Das sind nicht unsere Fenster — trotzdem sitzt der Spieler
  fest. `fensterpassen.js` klemmt sie jetzt mit, **macht sie aber nie größer**;
  abschaltbar in den Einstellungen.

### Hinzugefügt
- **Der Spieler kann einen Preis nennen.** Bisher konnte nur die Spielleitung
  einen setzen; wer Gold drauflegen wollte, hatte keinen Ort dafür. Ein Feld
  unter der Waage — Zahl und Münzsorte —, und die Spielleitung übernimmt das
  Gebot mit einem Klick.

### Geändert
- **Der Handelstisch verteilt seinen Platz anders.** Die beiden Seiten
  streckten sich über die halbe Fensterhöhe, auch mit drei Zeilen darin,
  während „was du dabeihast" — die Fläche, auf der man tatsächlich etwas
  hinlegt — als zugeklappte Zeile am unteren Rand saß. Jetzt nehmen die Seiten
  ihren Inhalt (höchstens zwei Fünftel), und der Vorrat steht offen und bekommt
  den Rest. Auf einem Tablet mit 768 Pixeln ist das der Unterschied zwischen
  bedienbar und nicht.

### Behoben
- **Auf dem Tablet war nur die halbe Handelsansicht zu sehen.** Gemessen bei
  1058×577: Der Inhalt brauchte 637 Pixel bei 523 verfügbaren, und
  abgeschnitten wurde unten — also genau der Knopf, mit dem man den Handel
  abschließt. Das Fenster selbst blieb im Bild, `fensterpassen.js` hatte seine
  Arbeit getan; das Problem lag darin, dass **jeder Teil eine feste Höhe hatte
  und keiner nachgab.** Jetzt stehen Kopf, Waage, Preisfeld und Fuß fest, und
  die Listen teilen sich, was übrig bleibt. Bei 916×414 geprüft: nichts
  abgeschnitten.
- **Fenster ließen sich auf dem Tablet nicht mit dem Finger verschieben.** Der
  Browser wertet eine Wischgeste über der Titelleiste als Scrollen und bricht
  das Ziehen ab, sobald der Finger sich bewegt — mit der Maus fällt das nie
  auf. `touch-action: none` auf Titelleiste und Anfassern. Steht in
  `fensterpassen.js` und wandert damit in jedes Modul, das die Datei bekommt.
- **Die Spielleitung erfuhr nicht, wenn ein Handel zustande kam.** Das Ergebnis
  ging nur an den Spieler — dabei hat sie den Preis gesetzt und sitzt womöglich
  nicht daneben. Sie sah den Tisch verschwinden und wusste nicht, ob
  abgeschlossen oder abgebrochen wurde.

### Behoben
- **Ein Klick auf „üblich" bot das Hundertfache.** Die drei Vorschlagsknöpfe in
  der Verhandlung tragen ihren Wert in **Kupfer**; das Feld daneben stand in
  **Gold**. Der Knopf schrieb die Zahl roh hinein — aus 50 Kupfer wurden 50
  Gold, und abgeschickt war es mit einem weiteren Klick. Genau die Art Fehler,
  die niemandem auffällt, weil beide Zahlen plausibel aussehen.
- **Preise ließen sich nur in Gold nennen.** Betroffen waren die Verhandlung
  und der Preis am Handelstisch: Wer sechs Silber verlangen wollte, musste
  „0,6" tippen; drei Kupfer gingen gar nicht. Beide Felder haben jetzt Zahl und
  Münzsorte — so wie das Festpreisfeld und die Sonderangebote es längst hatten.
  Am Handelstisch bleibt dabei das Vorzeichen erhalten: negativ heißt, die
  Person gibt heraus.

### Behoben
- **Ein weggeklickter Laden kam nach dem Neuladen von selbst zurück.**
  `close()` räumte nur eine modulinterne Variable weg; das Merkmal am Benutzer
  blieb stehen, und die Wiederherstellung beim Start machte das Fenster wieder
  auf. Man klickte es weg und es kam zurück.

  Die Ursache lag tiefer: **Ein Merkmal beantwortete zwei Fragen** — „wem hat
  die Spielleitung diesen Laden gezeigt" und „habe ich das Fenster gerade
  offen". Das Merkmal bleibt deshalb stehen (sonst verlöre die Spielleitung
  ihre Zuschauerliste und der Zugangsknopf den Weg, ein weggeklicktes Fenster
  zurückzuholen), aber **das Gerät merkt sich, dass hier zugemacht wurde**. Am
  Tablet weggeklickt heißt nicht am Rechner weggeklickt. Zeigt die Spielleitung
  den Laden erneut vor oder holt man ihn selbst zurück, gilt die Notiz wieder
  als erledigt.

### Geändert (Lizenz)
- **Die `LICENSE` benennt jetzt beide mitgelieferten Bilder.** Bisher stand
  dort nur das Font-Awesome-Symbol, gefolgt von dem Satz, alles Weitere werde
  von Foundry zur Laufzeit geliefert und nicht mitverteilt — was für
  `assets/ninjo.png` schlicht falsch war. Foundry hat beim Prüfen der
  Einreichung genau danach gefragt. Das Logo ist eine Auftragsarbeit, mit
  Erlaubnis des Zeichners genutzt, alle Rechte vorbehalten.

### Hinzugefügt (Veröffentlichung)
- **`LICENSE`** — proprietär, nicht quelloffen: Nutzung am eigenen Tisch
  ausdrücklich erlaubt, Weitergabe nicht. Die Richtung ist eine Einbahnstraße —
  von proprietär lässt sich später jederzeit auf MIT umstellen, umgekehrt nie.
  Darin auch die **Namensnennung für Font Awesome**: `assets/laden.svg` enthält
  deren `scale-balanced`-Pfad unter CC BY 4.0, und anders als die übrigen Module,
  die Font Awesome nur über CSS-Klassen nutzen, verteilt dieses ihn mit.
- **Release-Workflow.** Ein `v*`-Tag baut das Zip, legt das GitHub-Release an
  und meldet es Foundry. Er **bricht ab, wenn Tag und `module.json` auseinander
  laufen** — Foundry richtet sich nach der Nummer im Manifest, ein Release mit
  falschem Tag käme bei niemandem an und niemand würde es merken.
- `.gitattributes` — feste Zeilenenden.

### Geändert (Name)
- **Das Modul heißt jetzt „Ninjo's Shops & Trade".** Der Handel mit Leuten ohne
  Laden ist fertig, in beide Richtungen, und ist keine Nebenfunktion — wer ein
  Tauschfenster sucht, überliest „Shops". Die **Kennung bleibt `ninjos-shops`**
  und ändert sich nie: Foundry führt jede Installation darüber, eine andere
  Kennung wäre ein anderes Modul.

### Behoben (Willkommensfenster)
- **Der Starthinweis zeigte auf einen Knopf, den es nicht gibt.** „Im Kopf des
  Bogens *Laden einrichten* wählen" — diese Beschriftung kommt im ganzen Modul
  nicht vor. Der Weg ist die Waage in der Titelleiste des NSC-Bogens. Das war
  der allererste Satz, den ein neuer Nutzer liest.
- Das Fenster nannte den Handel gar nicht. Untertitel und dritter Punkt sagen
  ihn jetzt.

### Hinzugefügt
- **„Ich hätte da auch etwas" tut jetzt etwas.** Der Knopf im Handelsfenster
  zeigte bisher nur die Meldung, der Weg zurück werde gerade gebaut. Er öffnet
  jetzt dasselbe Packfenster wie am Ladentresen: zusammenpacken, die
  Spielleitung nennt einen Preis, beide sagen ja oder nein. Dafür kennt die
  Verhandlung ein **Gegenüber** statt eines Ladens — eine Person hat keine
  Ankaufspolitik, deshalb schlägt das Modul ihr die halbe Grundsumme vor und
  schreibt daneben, dass es ein Vorschlag ist.
- **Der Ladenknopf steht am Bogen jeder Person**, nicht nur bei denen, die
  schon einen Laden führen. Ohne Laden fragt er, ob ein vorhandener verbunden
  oder ein neuer angelegt werden soll. Vorher musste man wissen, dass die
  Verknüpfung über ein Feld im Ladenbogen läuft — also in einem Fenster, das
  es noch gar nicht gab.

### Geändert
- **Nur noch ein Knopf im Akteursverzeichnis.** Zwei volle Zeilen drängten dort
  die Knöpfe anderer Module aus dem Bild — die Fußzeile gehört dem Verzeichnis
  und nicht diesem Modul. Ab Werk steht dort das Marktbuch; „Neuer Laden" bleibt
  wählbar, und beide Wege sind auch ohne den Knopf erreichbar. Der Knopf ist
  außerdem nicht mehr rot, sondern zurückhaltend: Er steht in einem fremden
  Fenster.
- **Der Aufschlag gilt auch im Handelsfenster.** Ein Preis entsteht im Modul an
  neun Stellen; acht rechneten mit dem Aufschlag, diese eine nannte den blanken
  Grundpreis. Wer einer Händlerin mit 20 % Aufschlag Ware aus der Hand
  verkaufen ließ, gab sie zum Einkaufspreis her. Führt die Person genau einen
  Laden, sind die Preisfelder jetzt damit vorbelegt — und im Fenster steht,
  woher die Zahlen kommen.
- **Der Kauf sagt, was zurückkommt.** Wer mit einem Platinstück einen Dolch für
  2 GM kauft, bekommt acht Gold heraus — richtig gerechnet war das immer, nur
  sichtbar nicht. Jetzt steht es in der Meldung.
- **Und wenn es nicht reicht, wieviel fehlt.** „Das Geld reicht nicht" ließ
  offen, ob ein Kupferstück fehlt oder zehn Gold. Die Zahl wurde die ganze Zeit
  mitgeschickt und nie angezeigt.
- **Ein Angebot an mehrere Leute räumt sich selbst auf.** Wer ein einzelnes
  Stück einer ganzen Gruppe hinlegt, hatte bisher das Problem, dass es nach dem
  ersten Zugriff bei allen anderen im Fenster stehen blieb; sie klickten darauf
  und erfuhren erst danach, dass sie zu spät waren. Jetzt entscheidet der
  Bestand: Was weg ist, verschwindet, und was nur teilweise weg ist, steht mit
  der Zahl da, die noch stimmt. Das gilt auch, wenn die Spielleitung dem NSC
  von Hand etwas abnimmt.
- **„An wen" zeigt nur noch, wem sich etwas hinlegen lässt** — angemeldete
  Spieler mit zugeordneter Figur. Ohne Figur bricht das Nehmen ohnehin mit
  „Du führst keine Figur" ab, das Angebot läge also bei jemandem, der es nicht
  annehmen kann; damit fallen auch die Monitor-Benutzer heraus. Vorher standen
  acht Zeilen da, von denen eine gemeint war. Die Sonderangebote filtern seit
  jeher so.
- **Eine Fußleiste im Handelsfenster statt zweier.** „Danke, nein" und „Ich
  hätte da auch etwas" standen in getrennten Kästen untereinander, und der
  Hinweistext daneben wurde auf schmalen Fenstern abgeschnitten.

### Behoben
- **Verborgene Ware trug zwei durchgestrichene Augen.** Eines kam aus der
  Vorlage, eines aus dem Stylesheet. Geblieben ist das aus der Vorlage — es
  trägt auch seinen Kurzhinweis.
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
- **Ein Handel lässt sich ablehnen.** „Danke, nein" gibt zurück, was hingehalten
  wurde, räumt das Fenster weg und sagt der Spielleitung Bescheid. Vorher blieb
  es stehen, bis sie es selbst zurücknahm — und sie erfuhr nie, dass der
  Spieler längst weiter war.
- **Auch im Handel lässt sich ein Stück ansehen.** Klick auf Bild oder Namen
  öffnet es groß mit seiner Beschreibung. Der Preis kommt dabei vom Handel und
  nicht aus einer Ladenrechnung — eine Person hat keinen Aufschlag.
- **Die Knöpfe im Akteursverzeichnis lassen sich abschalten** — beide, nur
  einer, oder keiner. Sie stehen in einem Fenster, das dem Modul nicht gehört;
  wer sein Verzeichnis aufgeräumt haben will, soll das können.
- **Ein dritter Weg zum Marktbuch:** in den Moduleinstellungen. Vorher führten
  nur zwei hin — der Buchknopf im Verzeichnis und das ⋮-Menü eines *geöffneten*
  Ladenbogens. Beide können fehlen, und ein Buch, das man nur findet, wenn man
  ohnehin darin blättert, ist keins.
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
- **Das Handelsfenster sieht aus wie das Ladenfenster**: Bild in 56 Pixeln,
  Preis in Gold, dieselbe Zeile. Es ist dieselbe Handlung — jemand hält etwas
  hin, man sieht es sich an und nimmt es oder nicht.
- **Fenster gehen so weit auf, wie ihr Inhalt braucht** — höchstens bis zum
  Bildrand. Der Ladenbogen wächst auf genau die Höhe, bei der nichts mehr
  scrollt; das Spielerfenster geht bis an die Kante, wenn der Bildschirm nicht
  reicht. Wer die Größe selbst zieht, behält sie.
- **Szenen zieht man jetzt hinein.** Statt einer Liste aus hundert Kästchen
  gibt es ein Feld: eine Szene aus der Seitenleiste hineinziehen, oder über
  „Szene wählen …" aus einer Liste suchen, in die man tippen kann. Gewählte
  Szenen stehen als Chips mit ihrem Kartenbild da — was man angehakt hat, sah
  man vorher nur als Namen.
- **Und es geht auch von der Szene aus:** Im Szenenfenster unter
  „Verschiedenes" steht „Läden auf dieser Karte". Dort zieht man einen Laden
  aus dem Akteursverzeichnis hinein. **Gespeichert wird trotzdem am Laden** —
  zwei Listen, die dasselbe meinen, laufen auseinander.
- **Der Verkäufer steht rechts im Kopf**, als Gesicht mit Namen, und der
  Streifen ist höher geworden. Als kleine Zeile unter dem Ladennamen las er
  sich wie eine Fußnote zum Schild — dabei ist er das Gegenüber im Handel und
  der Name in beiden Büchern.
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
