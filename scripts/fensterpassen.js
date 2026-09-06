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

  const breite = Math.max(MINDEST.breite, Math.min(masse.width, bildBreite - 2 * RAND));
  const hoehe = Math.max(MINDEST.hoehe, Math.min(masse.height, bildHoehe - 2 * RAND));

  const links = Math.min(Math.max(RAND, masse.left), Math.max(RAND, bildBreite - breite - RAND));
  const oben = Math.min(Math.max(RAND, masse.top), Math.max(RAND, bildHoehe - hoehe - RAND));

  // Nur anfassen, was sich wirklich aendert - jedes setPosition zeichnet neu.
  const anders = Math.abs(breite - masse.width) > 1 || Math.abs(hoehe - masse.height) > 1
    || Math.abs(links - masse.left) > 1 || Math.abs(oben - masse.top) > 1;
  if (!anders) return;

  app.setPosition({ left: links, top: oben, width: breite, height: hoehe });
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
    requestAnimationFrame(() => insBildRuecken(app));
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
