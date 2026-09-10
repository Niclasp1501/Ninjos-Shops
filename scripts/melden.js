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

import { MODULE_ID, SOCKET } from "./const.js";

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

/**
 * Das Fenster bauen, und wenn das nicht geht, wenigstens etwas sagen.
 *
 * **Der Fangarm war zu weit.** Bis zum 10.09.2026 stand hier nur
 * `.catch(() => {})`, damit ein weggeklicktes Fenster keinen Fehler wirft.
 * Damit verschwand aber auch jeder echte Fehler: Kam das Fenster nicht, sah
 * niemand etwas, und in der Konsole stand auch nichts. Jetzt wird
 * unterschieden - Wegklicken ist still, alles andere landet im Log und faellt
 * auf eine Meldung zurueck, damit die Auskunft nicht ganz verloren geht.
 */
function fensterZeigen({ titel, symbol, inhalt, knopf, klasse }) {
  try {
    DialogV2.prompt({
      window: { title: game.i18n.localize(titel), icon: symbol },
      classes: ["ninjos-shops"],
      content: `<p class="shops-abbruch ${klasse ?? ""}">${inhalt}</p>`,
      ok: { label: game.i18n.localize(knopf), icon: "fa-solid fa-check" }
    }).catch(fehler => {
      // Wegklicken und Escape werfen hier ebenfalls. Das ist kein Fehler.
      if (fehler) console.debug(`${MODULE_ID} | Fenster weggeklickt`, fehler);
    });
  } catch (fehler) {
    console.error(`${MODULE_ID} | Fenster liess sich nicht bauen`, fehler);
    ui.notifications.warn(inhalt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  }
}

/** Das Fenster auf diesem Client. */
export function abbruchZeigen(was) {
  fensterZeigen({
    titel: "SHOPS.Tisch.AbbruchTitel",
    symbol: "fa-solid fa-hand",
    knopf: "SHOPS.Tisch.AbbruchVerstanden",
    inhalt: game.i18n.format("SHOPS.Tisch.AbbruchText",
      { was: foundry.utils.escapeHTML(was ?? "") })
  });
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

/**
 * Und der gelungene Fall.
 *
 * **Ein Tisch verschwindet nach dem Abschluss.** Beim Laden bleibt das
 * Fenster stehen und zeigt den neuen Bestand; am Handelstisch und beim Tausch
 * raeumt sich alles ab, und ohne ein Wort dazu bleibt die Frage offen, ob es
 * geklappt hat und was genau gewechselt ist. Deshalb dasselbe Fenster wie beim
 * Abbruch, nur mit dem, was geschehen ist.
 */
export function erfolgZeigen(text) {
  fensterZeigen({
    titel: "SHOPS.Tisch.ErfolgTitel",
    symbol: "fa-solid fa-handshake",
    knopf: "SHOPS.Tisch.ErfolgOk",
    klasse: "shops-gelungen",
    inhalt: text
  });
}

/** Den Beteiligten zeigen, und diesem Client selbst. */
export function erfolgMelden(benutzerIds = [], text) {
  const fremde = benutzerIds.filter(id => id && id !== game.user.id);
  if (fremde.length) {
    game.socket.emit(SOCKET.NAME, { typ: SOCKET.ABBRUCH, art: "erfolg", an: fremde, text });
  }
  erfolgZeigen(text);
}

/**
 * Ein schlichter Hinweis, wenn ein Fenster sonst wortlos verschwaende.
 *
 * **Ein Fenster, das von selbst zugeht, laesst eine Frage zurueck.** Bricht
 * die Gegenseite ab, lehnt sie ab, oder raeumt die Spielleitung den Tisch,
 * dann ist bei allen anderen der Tisch weg und niemand hat gesagt, warum. Am
 * 10.09.2026 als das genannt, was am meisten stoert: „Ich mag es nicht, wenn
 * Fenster sich einfach schliessen und man weiss nicht warum."
 *
 * Wer selbst abgebrochen hat, bekommt keins: Er hat die Frage davor schon
 * beantwortet und weiss Bescheid.
 */
export function hinweisZeigen(titel, text) {
  fensterZeigen({
    titel,
    symbol: "fa-solid fa-circle-info",
    knopf: "SHOPS.Tisch.ErfolgOk",
    inhalt: text
  });
}

export function hinweisMelden(benutzerIds = [], titel, text) {
  const fremde = benutzerIds.filter(id => id && id !== game.user.id);
  if (fremde.length) {
    game.socket.emit(SOCKET.NAME, { typ: SOCKET.ABBRUCH, art: "hinweis", an: fremde, titel, text });
  }
  if (benutzerIds.includes(game.user.id)) hinweisZeigen(titel, text);
}

/** Einstiegspunkt aus socket.js. */
export function aufAbbruch(daten) {
  if (!daten?.an?.includes(game.user.id)) return;
  if (daten.art === "erfolg") return void erfolgZeigen(daten.text);
  if (daten.art === "hinweis") return void hinweisZeigen(daten.titel, daten.text);
  abbruchZeigen(daten.was);
}
