/**
 * Das Preisfeld aus drei Muenzsorten, gelesen und geschrieben.
 *
 * **Warum es diese Datei gibt.** Der Betrag selbst wird in `preise.js`
 * umgerechnet, und die Datei fasst bewusst kein Foundry-Dokument und kein DOM
 * an, damit ihre Tests ohne laufende Welt durchgehen. Das Auslesen der Felder
 * ist aber DOM-Arbeit und stand sonst viermal fast gleich da: am Festpreis im
 * Ladenbogen, an der Verkaufsanfrage, an der Forderung und an der Anrechnung
 * des Handelstisches.
 *
 * **Leer ist nicht null.** Am Festpreis eines Stueckes ist das ein
 * Unterschied, der zaehlt: Kein Festpreis heisst „Aufschlag auf den
 * Grundpreis", eine ausdrueckliche Null heisst „geschenkt". Deshalb sagt
 * `leseMuenzfelder` beides, statt leere Felder stillschweigend als null zu
 * lesen.
 */

import { PREIS_SORTEN, alsMuenzfelder, ausMuenzfeldern } from "./preise.js";

/**
 * Die drei Felder unter `wurzel` lesen.
 *
 * @param {HTMLElement} wurzel
 * @returns {{cp: number, leer: boolean}}
 */
export function leseMuenzfelder(wurzel) {
  const felder = {};
  let leer = true;
  for (const sorte of PREIS_SORTEN) {
    const feld = wurzel?.querySelector(`[data-muenze="${sorte}"]`);
    const roh = String(feld?.value ?? "").trim();
    if (roh !== "") leer = false;
    felder[sorte] = roh;
  }
  return { cp: ausMuenzfeldern(felder), leer };
}

/** Einen Betrag in die drei Felder schreiben. */
export function schreibeMuenzfelder(wurzel, cp) {
  const felder = alsMuenzfelder(cp);
  for (const sorte of PREIS_SORTEN) {
    const feld = wurzel?.querySelector(`[data-muenze="${sorte}"]`);
    if (feld) feld.value = felder[sorte];
  }
}
