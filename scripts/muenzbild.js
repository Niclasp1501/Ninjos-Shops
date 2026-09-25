/**
 * Geld als Münzen, nicht als Buchstaben.
 *
 * **Warum.** „10 GM 5 SM 2 KM" liest man, man sieht es nicht. Am Tisch geht es
 * aber um Münzen: welche man hinlegt, welche zurückkommen, ob es Elektrum ist.
 * Seit dem 25.09.2026 steht deshalb jede Sorte als kleine Marke in ihrem Metall
 * da, Platin hell, Gold warm, Elektrum blassgelb, Silber grau, Kupfer rötlich.
 *
 * **Das Kürzel bleibt auf der Münze.** Die Farbe ist nie das einzige Merkmal:
 * Wer Farben schlecht unterscheidet, liest weiter „GM".
 *
 * **Warum aus dem Text und nicht aus Zahlen.** Beträge entstehen an vielen
 * Stellen als fertiger Satzteil (`alsText`, `preisText`, `muenzText`), und
 * manche stecken in übersetzten Sätzen wie „Es fehlen 5 GM". Diese Datei nimmt
 * den fertigen Text und ersetzt darin jede Zahl, auf die ein Münzkürzel folgt.
 * So muss keine der Stellen umgebaut werden, die den Betrag ausrechnet, und ein
 * Satz bleibt ein Satz.
 */

import { EINGABE_SORTEN } from "./preise.js";

/** Kürzel in der Sprache des Clients, zu ihrer Sorte. Einmal gebaut. */
let tabelle = null;
function kuerzelTabelle() {
  if (tabelle) return tabelle;
  tabelle = new Map();
  for (const sorte of EINGABE_SORTEN) {
    const kurz = game.i18n.localize(`SHOPS.Muenze.${sorte}`);
    if (kurz && !kurz.startsWith("SHOPS.")) tabelle.set(kurz.toLowerCase(), sorte);
  }
  return tabelle;
}

const esc = t => foundry.utils.escapeHTML(String(t ?? ""));

/** Eine einzelne Münzmarke: Zahl und Münze mit Kürzel. */
export function muenzeHtml(anzahl, sorte, kurz) {
  return `<span class="shops-geld" data-sorte="${sorte}">`
    + `<span class="shops-geld-zahl">${esc(anzahl)}</span>`
    + `<span class="shops-geld-muenze">${esc(kurz)}</span></span>`;
}

/**
 * Jeden Betrag in einem Text als Münzen setzen.
 *
 * @param {string} text
 * @param {{schonHtml?: boolean}} [wie]  `true`, wenn der Text bereits als HTML
 *        maskiert ist (etwa der Satz eines Ergebnisfensters). Dann wird er
 *        nicht noch einmal maskiert.
 * @returns {string} HTML
 */
export function muenzenHtml(text, { schonHtml = false } = {}) {
  const roh = String(text ?? "");
  const kuerzel = kuerzelTabelle();
  if (!kuerzel.size) return schonHtml ? roh : esc(roh);

  const muster = new RegExp(
    `(\\d[\\d.,]*)(?:\\s|&nbsp;|\\u00a0)(${[...kuerzel.keys()].map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}])`,
    "giu");

  let raus = "";
  let bis = 0;
  for (const treffer of roh.matchAll(muster)) {
    const davor = roh.slice(bis, treffer.index);
    raus += schonHtml ? davor : esc(davor);
    const sorte = kuerzel.get(treffer[2].toLowerCase());
    raus += muenzeHtml(treffer[1], sorte, treffer[2]);
    bis = treffer.index + treffer[0].length;
  }
  const rest = roh.slice(bis);
  raus += schonHtml ? rest : esc(rest);
  // Trennpunkte zwischen Münzen („2 GM · 5 SM") braucht es nicht mehr, die
  // Marken stehen für sich. Ein Punkt zwischen zwei Marken fällt deshalb weg.
  return raus.replace(/(<\/span><\/span>)\s*(?:·|&middot;)\s*(<span class="shops-geld")/g, "$1 $2");
}

/**
 * Der Helfer für die Vorlagen.
 *
 *   {{shopsGeld preisText}}          ein fertiger Betrag oder Satz
 *   {{shopsGeld wert kuerzel}}       eine Sorte aus der Börse
 */
export function muenzhelferEinrichten() {
  Handlebars.registerHelper("shopsGeld", (...args) => {
    args.pop();   // die Handlebars-Optionen
    if (args.length >= 2) {
      const kurz = String(args[1] ?? "");
      const sorte = kuerzelTabelle().get(kurz.toLowerCase()) ?? "gp";
      return new Handlebars.SafeString(muenzeHtml(args[0], sorte, kurz));
    }
    return new Handlebars.SafeString(muenzenHtml(args[0]));
  });
}
