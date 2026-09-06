/**
 * Kein Fenster darf groesser sein als der Bildschirm.
 *
 * **Der Fall, der das ausgeloest hat.** Auf einem Tablet stand das
 * Spielerfenster oben am Rand und lief unten aus dem Bild heraus: Die untere
 * Haelfte der Auslage, die Verkaufsliste und die Fussleiste waren nicht mehr
 * erreichbar. Verschieben half nicht - die Titelleiste war schon oben, und
 * weiter nach oben geht nicht. Die einzige Rettung waere gewesen, das Fenster
 * an seiner unteren Kante kleiner zu ziehen, und die lag ausserhalb des
 * Bildes.
 *
 * Das ist keine Eigenheit dieses Moduls, sondern die uebliche Falle bei
 * `height: "auto"`: Foundry misst den Inhalt und macht das Fenster so hoch,
 * wie es sein will. Auf einem grossen Bildschirm faellt das nie auf.
 *
 * **Die Regel.** Ein Fenster ist hoechstens so gross wie das Bild minus einem
 * Rand, und es liegt immer vollstaendig darin. Was nicht hineinpasst, wird
 * gescrollt - dafuer hat `.window-content` `overflow-y: auto`. Ein Fenster,
 * an dessen Inhalt man nicht mehr herankommt, gibt es damit nicht mehr.
 *
 * Geprueft wird nach jedem Zeichnen und wenn sich das Bild aendert: Drehen
 * eines Tablets, aufklappende Bildschirmtastatur, geteilter Bildschirm.
 */

/** Abstand zum Bildrand. Genug, um die Kante zum Ziehen zu treffen. */
const RAND = 8;

/** Kleiner darf ein Fenster nicht werden, sonst ist es keins mehr. */
const MINDEST = { breite: 280, hoehe: 200 };

/**
 * Um wie viel ein Fenster beim ersten Aufmachen wachsen darf.
 *
 * **Warum ueberhaupt.** Die Fenster tragen feste Breiten - 780 fuer den
 * Ladenbogen, 660 fuer den Tresen, 520 fuer das Spielerfenster. Das sind
 * Zahlen fuer einen Laptop. Auf einem 2333 Pixel breiten Schirm nutzte der
 * Ladenbogen die Haelfte davon und liess den Rest schwarz.
 *
 * **Warum ein Faktor und kein Anteil am Bildschirm.** „Sechzig Prozent der
 * Breite" macht aus dem Spielerfenster auf einem grossen Schirm eine
 * Landebahn, auf der eine Liste von zehn Zeilen verloren steht. Jedes Fenster
 * hat eine Breite, die zu seinem Inhalt passt; sie um die Haelfte zu dehnen
 * bleibt in diesem Verhaeltnis - und beim Ladenbogen reicht es genau, damit
 * die Auslage zweispaltig wird (siehe die Container-Abfrage in shops.css).
 */
const WACHSTUM = 1.5;

/** Welche Fenster schon einmal gewachsen sind. Gewachsen wird genau einmal. */
const gewachsen = new WeakSet();

/** Gehoert das Fenster diesem Modul? */
function unseres(app) {
  return app?.element?.classList?.contains("ninjos-shops") === true;
}

/**
 * Ein Fenster ins Bild ruecken - und, wenn noetig, kleiner machen.
 *
 * Erst die Groesse, dann die Lage: Ein zu hohes Fenster laesst sich nicht
 * durch Verschieben retten, und ein verschobenes waere nach dem Verkleinern
 * wieder falsch platziert.
 */
export function insBildRuecken(app) {
  const el = app?.element;
  if (!el || !el.isConnected) return;

  const bildBreite = window.innerWidth;
  const bildHoehe = window.innerHeight;
  const masse = el.getBoundingClientRect();

  /*
   * Beim allerersten Aufmachen darf ein Fenster wachsen. Danach nie wieder:
   * Wer es von Hand kleiner zieht, will es kleiner haben, und ein Fenster,
   * das sich beim naechsten Zeichnen wieder aufblaeht, ist eine Zumutung.
   */
  /*
   * **Gemessen wird nicht, gefragt wird.** Im Render-Haken steht das Fenster
   * noch mitten im Aufbau: Ein Bogen mit 780 Pixel Sollbreite mass dort 524.
   * Aus 524 mal anderthalb wurden genau die 780 der Voreinstellung - es sah
   * aus, als passiere gar nichts. `app.position.width` ist die Zahl, die das
   * Fenster meint, und die steht von Anfang an fest.
   */
  const sollBreite = Number.isFinite(app.position?.width) ? app.position.width : masse.width;

  let wunschBreite = sollBreite;
  if (!gewachsen.has(app)) {
    gewachsen.add(app);
    wunschBreite = Math.min(sollBreite * WACHSTUM, bildBreite - 2 * RAND);
  }

  const breite = Math.max(MINDEST.breite, Math.min(wunschBreite, bildBreite - 2 * RAND));

  /*
   * **Die Hoehe wird nur angefasst, wenn sie muss.** Viele Fenster stehen auf
   * `height: "auto"`; schreibt man ihnen eine Zahl hinein, ist das vorbei -
   * eine neue Anfrage am Tresen macht das Fenster dann nicht mehr hoeher,
   * sondern nur den Inhalt laenger. Gedeckelt wird also erst, wenn es
   * wirklich zu hoch ist.
   */
  const hoechsteHoehe = bildHoehe - 2 * RAND;
  const zuHoch = masse.height > hoechsteHoehe + 1;
  const hoehe = zuHoch ? Math.max(MINDEST.hoehe, hoechsteHoehe) : masse.height;

  const links = Math.min(Math.max(RAND, masse.left), Math.max(RAND, bildBreite - breite - RAND));
  const oben = Math.min(Math.max(RAND, masse.top), Math.max(RAND, bildHoehe - hoehe - RAND));

  // Nur anfassen, was sich wirklich aendert - jedes setPosition zeichnet neu.
  const lage = {};
  if (Math.abs(breite - sollBreite) > 1) lage.width = Math.round(breite);
  if (zuHoch) lage.height = Math.round(hoehe);
  if (Math.abs(links - masse.left) > 1) lage.left = Math.round(links);
  if (Math.abs(oben - masse.top) > 1) lage.top = Math.round(oben);
  if (!Object.keys(lage).length) return;

  app.setPosition(lage);
}

/** Alle offenen Fenster dieses Moduls nachziehen. */
function alleNachziehen() {
  for (const app of foundry.applications.instances.values()) {
    if (unseres(app)) insBildRuecken(app);
  }
}

/**
 * Anmelden. Gehoert in `ready`.
 *
 * Das Zeichnen misst der Browser erst im naechsten Bild - vorher stehen im
 * `getBoundingClientRect` noch die Masse von davor. Deshalb ein
 * `requestAnimationFrame` und nicht der direkte Aufruf.
 */
export function fensterPassenEinrichten() {
  Hooks.on("renderApplicationV2", app => {
    if (!unseres(app)) return;
    /*
     * **Kein `requestAnimationFrame`.** Der naheliegende Weg, auf das fertige
     * Bild zu warten, ist hier der falsche: Ein Browser, dessen Fenster
     * verdeckt oder minimiert ist, zeichnet nicht - und ruft die Funktion
     * dann nie auf. Gemessen am 06.09.2026: Im Haken stand das Fenster auf
     * 524 statt 780, und der Rueckruf kam auch nach zweieinhalb Sekunden
     * nicht. Auf einem zweiten Bildschirm, den gerade niemand ansieht, waere
     * jedes Fenster ungeklemmt geblieben.
     *
     * `setTimeout` laeuft auch dann. Warten muss man trotzdem: Im Haken
     * selbst haengt der Inhalt noch nicht vollstaendig am Dokument.
     */
    setTimeout(() => insBildRuecken(app), 0);
  });

  let takt = null;
  window.addEventListener("resize", () => {
    clearTimeout(takt);
    takt = setTimeout(alleNachziehen, 120);
  });

  /*
   * Auf Tablets aendert sich die Hoehe beim Drehen und beim Aufklappen der
   * Tastatur, ohne dass "resize" verlaesslich kommt. `visualViewport` meldet
   * beides.
   */
  window.visualViewport?.addEventListener("resize", () => {
    clearTimeout(takt);
    takt = setTimeout(alleNachziehen, 120);
  });
}
