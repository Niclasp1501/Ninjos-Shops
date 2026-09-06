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

/**
 * Was wir zuletzt selbst gesetzt haben - je Fenster.
 *
 * **Damit laesst sich „vom Benutzer gezogen" von „von uns geklemmt"
 * unterscheiden.** Ein Tablet, das gedreht wird, soll seine Fenster wieder
 * gross bekommen; wer dagegen von Hand kleiner zieht, will es kleiner haben
 * und darf nicht beim naechsten Drehen ueberfahren werden. Stimmt die
 * aktuelle Breite mit unserer letzten ueberein, hat niemand sie angefasst -
 * dann duerfen wir sie erneut anfassen. Weicht sie ab, gehoert sie jemand
 * anderem, und wir ruehren sie nur noch an, wenn sie nicht mehr ins Bild
 * passt.
 */
const zuletztGesetzt = new WeakMap();

/** Welche Fenster schon einmal gewachsen sind. Gewachsen wird genau einmal. */
const gewachsen = new WeakSet();

/** Gehoert das Fenster diesem Modul? */
function unseres(app) {
  return app?.element?.classList?.contains("ninjos-shops") === true;
}

/** Was den scrollenden Teilen an Hoehe fehlt - der groesste Fehlbetrag. */
function fehlbetrag(el) {
  let fehlt = 0;
  const teile = [el.querySelector(".window-content"),
                 ...el.querySelectorAll(".shops-ware, .shops-anfrageliste, .shops-buchliste, .shops-ansehen-text")];
  for (const teil of teile) {
    if (teil) fehlt = Math.max(fehlt, teil.scrollHeight - teil.clientHeight);
  }
  return fehlt;
}

/**
 * Ein Fenster ins Bild ruecken - und ihm den Platz geben, den es braucht.
 *
 * Drei Dinge, in dieser Reihenfolge, und die Reihenfolge ist keine Willkuer:
 * die Breite (sie aendert den Umbruch), dann die Lage nach oben (sie gibt den
 * Platz frei), dann die Hoehe.
 */
export function insBildRuecken(app) {
  const el = app?.element;
  if (!el || !el.isConnected) return;

  const bildBreite = window.innerWidth;
  const bildHoehe = window.innerHeight;
  const hoechsteHoehe = bildHoehe - 2 * RAND;
  const masse = el.getBoundingClientRect();

  /*
   * **Gemessen wird nicht, gefragt wird.** Im Render-Haken steht das Fenster
   * noch mitten im Aufbau: Ein Bogen mit 780 Pixel Sollbreite mass dort 524.
   * Aus 524 mal anderthalb wurden genau die 780 der Voreinstellung - es sah
   * aus, als passiere gar nichts. `app.position.width` ist die Zahl, die das
   * Fenster meint, und die steht von Anfang an fest.
   */
  const sollBreite = Number.isFinite(app.position?.width) ? app.position.width : masse.width;

  /*
   * **Unberuehrt heisst: so gross, wie wir es zuletzt gemacht haben.** Nur
   * dann fassen wir es noch einmal an. Wer selbst zieht, hat das letzte Wort.
   */
  const unsere = zuletztGesetzt.get(app);
  const unberuehrt = unsere === undefined
    || (Math.abs(unsere.breite - sollBreite) <= 1 && Math.abs(unsere.hoehe - masse.height) <= 2);

  /* ── Breite ─────────────────────────────────────────────────────── */

  let wunschBreite = sollBreite;
  if (!gewachsen.has(app)) {
    gewachsen.add(app);
    wunschBreite = Math.min(sollBreite * WACHSTUM, bildBreite - 2 * RAND);
  } else if (unberuehrt && unsere?.wunsch) {
    // Zurueck auf die Wunschbreite, soweit das Bild sie jetzt hergibt - so
    // bekommt ein gedrehtes Tablet seine Fenster wieder gross.
    wunschBreite = Math.min(unsere.wunsch * WACHSTUM, bildBreite - 2 * RAND);
  }
  const breite = Math.max(MINDEST.breite, Math.min(wunschBreite, bildBreite - 2 * RAND));

  // Zuerst, denn sie aendert den Umbruch: Mit 1170 statt 780 Pixeln steht die
  // Auslage zweispaltig und braucht die halbe Hoehe.
  if (Math.abs(breite - sollBreite) > 1) app.setPosition({ width: Math.round(breite) });

  /* ── Hoehe ──────────────────────────────────────────────────────── */

  const nach = el.getBoundingClientRect();
  let hoehe = nach.height;

  /*
   * **So hoch, dass man nicht scrollen muss - hoechstens bis zum Bildrand.**
   *
   * Wie viel fehlt, sagen die scrollenden Teile selbst: `scrollHeight` minus
   * `clientHeight`. Fehlt wenig, kommt genau das dazu - ein Fenster wegen
   * zwanzig Pixeln auf Bildschirmhoehe zu ziehen waere unverschaemt. Fehlt
   * viel, geht es gleich bis zum Rand: Der Zuschlag allein reichte dann nicht,
   * weil Teile des Fensters **mitwachsen** (der Verkaufsbereich steht auf
   * `max-height: 42%`).
   *
   * **Nicht nur beim ersten Zeichnen.** Genau das ging schief: Beim ersten Mal
   * steht das Fenster noch im Aufbau, der Fehlbetrag faellt zu klein aus -
   * gemessen 262 statt 630 -, und danach waere „einmal gewachsen" verbraucht.
   * Solange niemand selbst gezogen hat, darf es bei jedem Zeichnen nachwachsen;
   * es aendert sich ohnehin nur, wenn wirklich etwas fehlt.
   */
  if (unberuehrt) {
    const fehlt = fehlbetrag(el);
    if (fehlt > 1) {
      hoehe = fehlt > bildHoehe * 0.15
        ? hoechsteHoehe
        : Math.min(nach.height + fehlt, hoechsteHoehe);
    }
  }
  hoehe = Math.max(MINDEST.hoehe, Math.min(hoehe, hoechsteHoehe));

  /* ── Lage ───────────────────────────────────────────────────────── */

  const links = Math.min(Math.max(RAND, nach.left), Math.max(RAND, bildBreite - breite - RAND));
  const oben = Math.min(Math.max(RAND, nach.top), Math.max(RAND, bildHoehe - hoehe - RAND));

  /*
   * **Erst hinaufschieben, dann wachsen.** Foundry deckelt die Hoehe eines
   * Fensters auf `Bildhoehe - Oberkante` und rechnet dabei mit der Oberkante,
   * die es in diesem Moment hat. Steht es noch mittig, ist der Deckel
   * entsprechend niedrig: Gemessen wurden 984 verlangt und `max-height: 922px`
   * gesetzt - genau 1000 minus der alten Oberkante 78. Zusammen in einem
   * Aufruf half nicht; es braucht zwei, und der erste raeumt den Platz frei.
   */
  if (Math.abs(oben - nach.top) > 1) app.setPosition({ top: Math.round(oben) });
  if (Math.abs(links - nach.left) > 1) app.setPosition({ left: Math.round(links) });

  if (Math.abs(hoehe - nach.height) > 1) {
    /*
     * **Der Deckel muss vorher weg.** Foundry schreibt einem Fenster mit
     * `height: "auto"` ein `max-height` in den Stil - berechnet aus der
     * Oberkante, die es beim ersten Setzen hatte - und rechnet es danach nie
     * wieder neu. Gemessen: Das Fenster stand auf Oberkante 8, verlangt waren
     * 984, und `max-height` blieb bei 922 (= 1000 minus der urspruenglichen
     * Oberkante 78). Jedes `setPosition` prallte daran ab.
     *
     * Wir setzen ihn deshalb selbst auf den Bildrand. Zurueckgenommen wird er
     * nicht: Die Klemmung weiter oben haelt das Fenster ohnehin im Bild, und
     * das ist die verlaesslichere der beiden Grenzen.
     */
    el.style.maxHeight = `${Math.round(hoechsteHoehe)}px`;
    app.setPosition({ height: Math.round(hoehe) });
  }

  zuletztGesetzt.set(app, {
    wunsch: unsere?.wunsch ?? sollBreite,
    breite: Math.round(breite),
    hoehe: Math.round(el.getBoundingClientRect().height)
  });
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
