/**
 * Der Abbruch, den beide Seiten sehen muessen.
 *
 * **Warum ein Fenster und kein Toast.** Wird ein Handel abgebrochen, weil
 * etwas vom Tisch verschwunden ist, ist das keine Randnotiz - es ist der
 * Grund, warum gerade nichts passiert ist, und beide Beteiligten muessen ihn
 * lesen. Foundrys Benachrichtigungen taugen dafuer nicht: Sie verschwinden von
 * selbst, und in der Blattansicht der In-Person Tools sind sie ganz
 * ausgeblendet - auf genau den Geraeten also, an denen am Tisch gespielt wird.
 * Dieselbe Ueberlegung steht in den Regelgrundsaetzen des Workspace unter
 * „Die Rueckmeldung steht dort, wo der Mensch hinschaut".
 *
 * **Es wird nichts unterstellt.** Der Text sagt, was geschehen ist - dass
 * etwas Zugesagtes beim Abschluss nicht mehr dalag und deshalb nichts
 * getauscht wurde - und nennt die Regel. Ob dahinter Absicht steckt oder ein
 * Versehen, entscheidet der Tisch und nicht das Modul.
 */

import { SOCKET } from "./const.js";

const { DialogV2 } = foundry.applications.api;

/**
 * Gruende, bei denen das Fenster kommt statt einer Meldung.
 *
 * Die Trennlinie: **Wurde ein Wort gebrochen, oder ist nur etwas nicht
 * moeglich?** „Das Geld reicht nicht" ist kein Wortbruch - da hat niemand
 * etwas weggenommen, was schon zugesagt war. „Das liegt nicht mehr da" schon:
 * Der andere hat gesehen, was er bekommt, und beim Abschluss war es weg.
 */
const WORTBRUCH = new Set([
  "SHOPS.Handel.NichtMehrDa",        // Handelstisch mit einer Person
  "SHOPS.Kauf.WegVomTisch",          // Ware aus der Auslage verschwunden
  "SHOPS.Kauf.NichtGenugDa",         // weniger im Bestand als gezeigt
  "SHOPS.Verkauf.WegAusDemRucksack", // das Stueck des Spielers ist weg
  "SHOPS.Verkauf.SoVieleNicht"
]);

export function istWortbruch(grund) { return WORTBRUCH.has(grund); }

/** Das Fenster auf diesem Client. */
export function abbruchZeigen(was) {
  DialogV2.prompt({
    window: { title: game.i18n.localize("SHOPS.Tisch.AbbruchTitel"), icon: "fa-solid fa-hand" },
    classes: ["ninjos-shops"],
    content: `<p class="shops-abbruch">${game.i18n.format("SHOPS.Tisch.AbbruchText",
      { was: foundry.utils.escapeHTML(was ?? "") })}</p>`,
    ok: { label: game.i18n.localize("SHOPS.Tisch.AbbruchVerstanden"), icon: "fa-solid fa-check" }
  }).catch(() => {});
}

/**
 * Es allen Beteiligten zeigen - und diesem Client selbst.
 *
 * Der eigene Aufruf muss sein: Eine Socket-Nachricht kommt beim Absender nie
 * an, und die Spielleitung ist die, die den Abbruch feststellt.
 */
export function abbruchMelden(benutzerIds = [], was) {
  const fremde = benutzerIds.filter(id => id && id !== game.user.id);
  if (fremde.length) {
    game.socket.emit(SOCKET.NAME, { typ: SOCKET.ABBRUCH, an: fremde, was });
  }
  abbruchZeigen(was);
}

/** Einstiegspunkt aus socket.js. */
export function aufAbbruch(daten) {
  if (!daten?.an?.includes(game.user.id)) return;
  abbruchZeigen(daten.was);
}
