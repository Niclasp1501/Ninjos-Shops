/**
 * Ein Stueck ansehen - im richtigen Gegenstandsbogen.
 *
 * **Was hier vorher stand und warum es weg ist.** Bis zum 08.09.2026 zeigte
 * diese Datei eine eigene Nahansicht: Bild gross, Preis, Bestand, Beschreibung,
 * Kaufknopf. Die Begruendung dafuer war, ein Bogen mit Eingabefeldern und
 * Reitern sei die Ansicht fuer die Spielleitung und nicht die fuer jemanden,
 * der im Regal stoebert.
 *
 * Das war zur Haelfte richtig und in der Sache falsch. Wer wissen will, ob das
 * Langschwert vielseitig ist, wieviel es wiegt, welchen Schaden es macht und
 * ob er es ueberhaupt fuehren kann, findet nichts davon in einer
 * Beschreibung - das steht in den Feldern. Eine huebschere Ansicht, die die
 * Haelfte weglaesst, ist keine bessere Ansicht.
 *
 * **Warum es trotzdem nicht der Bogen des Ladens ist.** Der Laden gehoert
 * keinem Spieler (das ist zugesichert, siehe AGENTS.md), und deshalb darf
 * niemand seine Gegenstaende oeffnen - Foundry weist das ab, bevor irgendetwas
 * erscheint. Ihm dafuer Rechte am Laden zu geben, ist ausgeschlossen: Er haette
 * ihn danach im Akteursverzeichnis stehen und koennte den Spielleiter-Bogen
 * samt verborgener Ware aufmachen (vorzeigen.js sagt dasselbe zum Vorzeigen).
 *
 * **Also eine fluechtige Kopie.** Aus den Daten des Stuecks entsteht ein
 * Gegenstand, der in keiner Datenbank liegt und niemandem gehoert ausser dem,
 * der ihn gerade erzeugt hat. Sein Bogen ist derselbe wie ueberall sonst - mit
 * allen Feldern, die das System kennt - und wird **nicht bearbeitbar**
 * geoeffnet: Was der Spieler dort aendern koennte, aendert ohnehin nichts, und
 * ein Feld, das sich anfassen laesst und nichts bewirkt, ist ein Versprechen,
 * das niemand einloest.
 *
 * Die Ladenmerkmale (Festpreis, verborgen, Dienstleistung) werden vorher
 * entfernt. Sie gehoeren dem Laden und haetten im Bogen nichts zu suchen.
 */

import { MODULE_ID } from "./const.js";

/**
 * Den Gegenstandsbogen eines Stueckes zeigen, ohne Rechte am Besitzer.
 *
 * @param {Actor} traeger  Wer es haelt - ein Laden oder eine Person
 * @param {string} itemId
 * @returns {?Application}
 */
export function wareAnsehen(traeger, itemId) {
  const item = traeger?.items?.get(itemId);
  if (!item) return null;

  /*
   * Die Spielleitung darf den echten Bogen ohnehin - dann bekommt sie ihn
   * auch, samt Bearbeitung. Eine Kopie waere hier nur eine Attrappe, in der
   * jede Aenderung verpufft.
   */
  if (item.isOwner) {
    item.sheet.render(true);
    return item.sheet;
  }

  const daten = item.toObject();
  delete daten._id;
  delete daten.flags?.[MODULE_ID];

  let kopie;
  try {
    kopie = new Item.implementation(daten, { parent: null });
  } catch (fehler) {
    console.error(`${MODULE_ID} | Gegenstandsbogen konnte nicht geoeffnet werden`, fehler);
    ui.notifications.warn(game.i18n.localize("SHOPS.Ansehen.GehtNicht"));
    return null;
  }

  /*
   * `editable: false` gehoert in den **Aufbau** des Bogens, nicht in den
   * Aufruf von `render`: Ein Bogen merkt sich seine Optionen beim Erzeugen,
   * und `document.sheet` liefert einen, den es womoeglich schon gibt.
   */
  const Bogen = kopie._getSheetClass?.() ?? kopie.sheet?.constructor;
  if (!Bogen) return null;

  let app;
  try {
    // ApplicationV2 nimmt ein Objekt, die alte Application zwei Argumente.
    app = new Bogen({ document: kopie, editable: false });
  } catch {
    app = new Bogen(kopie, { editable: false });
  }
  app.render(true);
  return app;
}
