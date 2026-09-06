/**
 * Ein Stück aus der Nähe ansehen.
 *
 * **Was fehlte.** Im Spielerfenster stand jede Ware als Zeile da, und ein
 * Klick darauf tat nichts. Wer wissen wollte, was ein „Seil des Kletterns"
 * eigentlich kann, hatte keinen Weg dorthin - die Beschreibung steht am
 * Gegenstand, und der gehört dem Laden.
 *
 * **Warum nicht einfach `item.sheet.render()`.** Der Laden gehört keinem
 * Spieler (das ist zugesichert, siehe AGENTS.md), also darf niemand seinen
 * Gegenstandsbogen öffnen. Und selbst wenn: Ein Bogen mit Eingabefeldern,
 * Aktivitäten und Reitern ist die Ansicht für die Spielleitung, nicht die für
 * jemanden, der im Regal stöbert.
 *
 * Hier steht deshalb genau das, was ein Käufer sehen will: das Bild groß, der
 * Satz des Händlers, der Preis, der Bestand, die Beschreibung - und der Knopf,
 * mit dem er es nimmt, ohne zurückblättern zu müssen.
 */

import { MODULE_ID, WARE, KAUFMODUS } from "./const.js";
import { grundpreisCp, preisCp, alsText } from "./preise.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

export class WareAnsehen extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-ansehen`,
    classes: ["ninjos-shops", "shops-ansehen"],
    position: { width: 520, height: "auto" },
    window: { icon: "fa-solid fa-magnifying-glass", resizable: true },
    actions: { hierKaufen: WareAnsehen.#hierKaufen }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/ware-ansehen.hbs`, scrollable: [".shops-ansehen-text"] }
  };

  #laden;
  #itemId;

  constructor(laden, itemId, options = {}) {
    super(options);
    this.#laden = laden;
    this.#itemId = itemId;
  }

  get title() {
    return this.#laden?.items?.get(this.#itemId)?.name ?? game.i18n.localize("SHOPS.Ansehen.Titel");
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const item = this.#laden?.items?.get(this.#itemId);
    if (!item) return Object.assign(ctx, { name: "?", beschreibung: null });

    const merkmal = item.flags?.[MODULE_ID] ?? {};
    const fest = Number.isFinite(merkmal[WARE.FESTPREIS]) ? merkmal[WARE.FESTPREIS] : null;
    const dienst = merkmal[WARE.DIENST] === true;
    const menge = Number(item.system?.quantity ?? 1);

    /*
     * Die Beschreibung durch Foundrys Aufbereitung: Sie loest @UUID-Verweise
     * und Wuerfelformeln auf. Roh ausgegeben stuenden dort die Klammern.
     */
    const roh = item.system?.description?.value ?? "";
    let beschreibung = null;
    if (roh) {
      try {
        beschreibung = await foundry.applications.ux.TextEditor.implementation
          .enrichHTML(roh, { async: true, relativeTo: item });
      } catch { beschreibung = roh; }
    }

    return Object.assign(ctx, {
      name: item.name,
      img: item.img,
      hinweis: merkmal[WARE.HINWEIS] ?? "",
      dienst,
      menge,
      beschreibung,
      preisText: alsText(preisCp(grundpreisCp(item.system?.price), this.#laden.system, fest), kuerzel),
      // Gesperrt heisst ansehen ja, kaufen nein - genau hier ist der Fall.
      kaufbar: this.#laden.system?.kaufmodus !== KAUFMODUS.GESPERRT
        && (dienst || menge > 0) && !!game.users.activeGM
    });
  }

  /** Von hier aus kaufen - dasselbe wie im Regal, nur ohne Zurueckblaettern. */
  static async #hierKaufen() {
    const { spielerFensterKaufen } = await import("./spieler-fenster.js");
    this.close();
    spielerFensterKaufen(this.#itemId);
  }
}

/** Ein Stueck ansehen. Ein zweites ersetzt das erste. */
export function wareAnsehen(laden, itemId) {
  foundry.applications.instances.get(`${MODULE_ID}-ansehen`)?.close();
  return new WareAnsehen(laden, itemId).render(true);
}
