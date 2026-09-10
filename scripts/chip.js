/**
 * Der Knopf unten rechts, der ein weggelegtes Fenster zurueckholt.
 *
 * **Zumachen ist nicht beenden.** Wer das Kreuz drueckt, will das Fenster los
 * sein, nicht den Handel. Ohne einen Weg zurueck waere das Kreuz eine Falle:
 * Der Handel laeuft weiter, sichtbar ist er nirgends mehr. Also legt er sich
 * unten rechts ab, wie ein Zettel auf dem Tisch.
 *
 * **Warum das hier steht und nicht zweimal.** Der Handelstisch hatte diesen
 * Knopf seit dem 07.09.2026; beim Tausch zwischen Spielern habe ich ihn am
 * 10.09.2026 vergessen, und Niclas hat ihn vermisst - er hatte ihm am Laden
 * gefallen. Zwei Fassungen desselben Knopfes waeren zwei Stellen, an denen die
 * naechste Verbesserung gemacht werden muss und die zweite vergessen wird.
 *
 * **Sie stapeln.** Es kann mehr als einen geben - ein weggelegter Handel mit
 * einer Person und daneben ein Tausch mit einem Mitspieler. Sie liegen deshalb
 * in einer gemeinsamen Spalte uebereinander, statt sich am selben Fleck zu
 * ueberdecken.
 */

import { MODULE_ID } from "./const.js";

const BEHAELTER = `${MODULE_ID}-chips`;

/** Die Spalte unten rechts - angelegt, sobald der erste Zettel hineinkommt. */
function behaelter() {
  let el = document.getElementById(BEHAELTER);
  if (!el) {
    el = document.createElement("div");
    el.id = BEHAELTER;
    el.className = "ninjos-shops shops-chips";
    document.body.append(el);
  }
  return el;
}

/**
 * Einen Zettel hinlegen - oder seinen Text auffrischen, wenn er schon liegt.
 *
 * @param {object}   was
 * @param {string}   was.id        eindeutig je Fenster
 * @param {string}   was.symbol    Font-Awesome-Klassen
 * @param {string}   was.text      schon uebersetzt, wird escaped
 * @param {Function} was.beiKlick
 */
export function chipHinlegen({ id, symbol, text, beiKlick }) {
  const vorhanden = document.getElementById(id);
  const chip = vorhanden ?? document.createElement("button");
  if (!vorhanden) {
    chip.id = id;
    chip.type = "button";
    chip.className = "shops-tischchip";
    behaelter().append(chip);
  }
  chip.innerHTML = `<i class="${symbol}" aria-hidden="true"></i>
    <span>${foundry.utils.escapeHTML(text)}</span>`;
  chip.onclick = () => beiKlick?.();
  return chip;
}

/** Ihn wieder wegnehmen. Ist der letzte weg, verschwindet auch die Spalte. */
export function chipWegnehmen(id) {
  document.getElementById(id)?.remove();
  const el = document.getElementById(BEHAELTER);
  if (el && !el.childElementCount) el.remove();
}
