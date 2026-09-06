/**
 * Das Buch eines einzelnen Ladens - wer hier was gekauft und verkauft hat.
 *
 * Nicht zu verwechseln mit dem **Marktbuch** (`marktbuch.js`): Das ist ein
 * Journal, gehoert der Spielleitung allein, sammelt alle Laeden und schreibt
 * auch fehlgeschlagene Versuche mit. Es ist die Buchhaltung.
 *
 * Dies hier ist die Ladentheke: an *einem* Laden, nur gelungene Vorgaenge, und
 * **jeder sieht es** - die Spielleitung alles, ein Spieler nur seine eigenen
 * Geschaefte mit diesem Laden.
 *
 * **Wo es liegt und was das kostet.** Die Eintraege stehen als Merkmal auf dem
 * Laden. Das ist der einzige Ort, an dem sie ohne angemeldete Spielleitung
 * lesbar sind und einen Neuladen ueberstehen - Foundry schickt jeden
 * Weltakteur an jeden Client (nachgemessen, siehe AGENTS.md).
 *
 * Der Preis dafuer ist ehrlich zu benennen: **Die Trennung ist eine Anzeige,
 * kein Geheimnis.** Wer die Konsole oeffnet, liest auch die Zeilen der
 * anderen. Fuer den Tisch reicht das - es geht darum, dass niemand die Kaeufe
 * der anderen *durchblaettert*, nicht darum, sie zu verschluesseln. Soll es
 * dicht sein, muesste die Spielleitung jede Zeile einzeln ueber den Socket
 * ausliefern, und das Buch waere ohne sie leer.
 */

import { MODULE_ID } from "./const.js";
import { alsText } from "./preise.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Das Merkmal, unter dem die Zeilen liegen. */
export const BUCH = "buch";

/**
 * Wie viele Zeilen ein Laden behaelt.
 *
 * Die Eintraege liegen im Akteur und gehen damit in jede Weltsicherung und an
 * jeden Client. Zweihundert Zeilen sind ein paar Kilobyte und decken Monate;
 * ohne Grenze waechst ein vielbesuchter Laden unbemerkt weiter, bis jemand
 * beim Laden der Welt wartet und niemand weiss, warum.
 */
const HOECHSTZAHL = 200;

/**
 * Eine Zeile anhaengen. **Nur bei der Spielleitung** - Spieler duerfen auf
 * einem fremden Akteur nichts schreiben, und alle Vorgaenge laufen ohnehin
 * dort durch.
 */
export async function buchen(laden, eintrag) {
  if (!game.user.isGM || !laden) return;

  const bisher = laden.getFlag(MODULE_ID, BUCH) ?? [];
  const neu = [...bisher, {
    zeit: Date.now(),
    // Wer bedient hat. Nicht die Spielleitung - die fuehrt den Handel aus,
    // sie fuehrt ihn nicht.
    haendlerName: laden.system?.haendlerName ?? null,
    ...eintrag
  }].slice(-HOECHSTZAHL);

  await laden.setFlag(MODULE_ID, BUCH, neu);
}

/**
 * Die Zeilen, die dieser Benutzer sehen darf.
 *
 * Die Spielleitung alles, alle anderen nur ihre eigenen. Neueste zuerst -
 * wer das Buch aufschlaegt, sucht meistens das Letzte.
 */
export function zeilenFuer(laden, benutzer = game.user) {
  const alle = laden?.getFlag(MODULE_ID, BUCH) ?? [];
  const meine = benutzer.isGM ? alle : alle.filter(z => z.userId === benutzer.id);

  return [...meine].reverse().map(z => ({
    ...z,
    summeText: alsText(z.summeCp ?? 0, kuerzel),
    zeitText: new Date(z.zeit).toLocaleString(game.i18n.lang, {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    }),
    gekauft: z.art === "kauf",
    verkauft: z.art !== "kauf",
    wasText: (z.was ?? []).map(w => (w.menge > 1 ? `${w.menge}× ${w.name}` : w.name)).join(", ")
  }));
}

/* ── Das Fenster ───────────────────────────────────────────────────── */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LadenBuch extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["ninjos-shops", "shops-ladenbuch"],
    position: { width: 520, height: 560 },
    window: { icon: "fa-solid fa-scroll", resizable: true }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/ladenbuch.hbs`, scrollable: [".shops-buchliste"] }
  };

  #laden;

  constructor(laden, options = {}) {
    super(options);
    this.#laden = laden;
  }

  get title() {
    return game.i18n.format("SHOPS.Buch.Titel", { laden: this.#laden?.name ?? "" });
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const zeilen = zeilenFuer(this.#laden);
    return Object.assign(ctx, {
      ladenName: this.#laden?.name,
      zeilen,
      istGM: game.user.isGM,
      // Die Summe unten sagt, was hier insgesamt geflossen ist - fuer die
      // Spielleitung ueber alle, fuer den Spieler ueber seine eigenen.
      ausgegebenText: alsText(zeilen.filter(z => z.gekauft).reduce((s, z) => s + (z.summeCp ?? 0), 0), kuerzel),
      eingenommenText: alsText(zeilen.filter(z => z.verkauft).reduce((s, z) => s + (z.summeCp ?? 0), 0), kuerzel)
    });
  }
}

/** Das Buch eines Ladens aufschlagen - eines je Laden. */
export function ladenbuchOeffnen(laden) {
  if (!laden) return null;
  const kennung = `${MODULE_ID}-buch-${laden.id}`;
  const offen = foundry.applications.instances.get(kennung);
  if (offen) return offen.bringToFront?.() ?? offen.render(true);
  return new LadenBuch(laden, { id: kennung }).render(true);
}

/**
 * Offene Buchfenster neu zeichnen.
 *
 * Ohne das stuende nach einem Kauf die alte Liste da, und wer das Buch
 * waehrend des Handelns offen haelt - also genau die Spielleitung - saehe
 * seinen eigenen Vorgang nicht.
 */
export function buchFensterEinrichten() {
  Hooks.on("updateActor", (akteur, aenderungen) => {
    if (!foundry.utils.hasProperty(aenderungen, `flags.${MODULE_ID}.${BUCH}`)) return;
    foundry.applications.instances.get(`${MODULE_ID}-buch-${akteur.id}`)?.render(false);
  });
}
