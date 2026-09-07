/**
 * Ware in einen Rucksack legen - und dabei stapeln.
 *
 * **Warum es diese Datei gibt.** Derselbe Vorgang stand an drei Stellen, und
 * nur eine davon stapelte. `fuehreAnkaufAus` in verkauf.js suchte im Ziel nach
 * einem gleichnamigen Stueck und erhoehte dessen Anzahl; `fuehreKaufAus` in
 * kauf.js und `nehmenAusfuehren` in handel.js legten stur ein neues an. Wer
 * zweimal fuenf Fackeln kaufte, hatte danach zwei Zeilen „Fackel" im
 * Rucksack - und beim dritten Mal drei.
 *
 * Das faellt nicht sofort auf, weil nichts fehlt. Es faellt beim Aufraeumen
 * auf, und dann ist der Rucksack voller Dubletten, die niemand mehr
 * zusammenfuehren mag.
 *
 * **Woran zwei Stuecke als dasselbe gelten: Name und Typ.** Nicht mehr. Ein
 * Vergleich ueber alle Felder waere genauer und in der Praxis nutzlos - schon
 * eine abweichende Beschreibung oder ein gesetztes Merkmal machte aus jedem
 * Kauf wieder eine eigene Zeile, und damit waere die Regel wirkungslos. Die
 * Ware kommt hier ohnehin frisch aus einem Laden oder von einer Person; sie
 * traegt keinen Zustand, den ein Stapeln verschluecken koennte.
 *
 * **Was bewusst nicht gestapelt wird:** Behaelter. dnd5e fuehrt sie ohne
 * Stueckzahl, jeder ist ein eigenes Ding mit eigenem Inhalt. Zwei Rucksaecke
 * zu einem „Rucksack x2" zusammenzulegen verloere, was drin ist.
 */

import { MODULE_ID } from "./const.js";

/** Typen, die dnd5e ohne sinnvolle Stueckzahl fuehrt. */
const NICHT_STAPELBAR = new Set(["container", "backpack"]);

/**
 * Ein Stueck einlagern: auf einen vorhandenen Stapel legen, sonst neu anlegen.
 *
 * @param {Actor} ziel      Wer es bekommt
 * @param {Item}  vorlage   Das Stueck, wie es beim Abgeber liegt
 * @param {number} stueck   Wie viele
 * @returns {Promise<"gestapelt"|"neu">}
 */
export async function einlagern(ziel, vorlage, stueck) {
  const menge = Math.max(1, Math.floor(Number(stueck) || 1));

  if (!NICHT_STAPELBAR.has(vorlage.type)) {
    const vorhanden = ziel.items.find(i => i.name === vorlage.name && i.type === vorlage.type);
    if (vorhanden && Number.isFinite(Number(vorhanden.system?.quantity))) {
      await vorhanden.update({
        "system.quantity": Number(vorhanden.system.quantity ?? 0) + menge
      });
      return "gestapelt";
    }
  }

  const kopie = vorlage.toObject();
  delete kopie._id;
  kopie.system = kopie.system ?? {};
  kopie.system.quantity = menge;
  // Die Ladenmerkmale gehoeren dem Laden, nicht der Ware im Rucksack.
  delete kopie.flags?.[MODULE_ID];
  await ziel.createEmbeddedDocuments("Item", [kopie]);
  return "neu";
}
