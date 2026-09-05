/**
 * Das Spielerfenster - die Listenansicht aus Abschnitt 8 des Konzepts.
 *
 * Zeigt die Auslage (ohne Verborgenes), Preise als Anzeige, die eigene Boerse
 * und einen Kaufknopf als Platzhalter fuer Schritt 5. Kein Geld bewegt sich
 * hier; der Preis wird spaeter beim Spielleiter neu gerechnet.
 *
 * Pro Client gibt es nur eines: Ein neuer Laden ersetzt den vorherigen
 * (KONZEPT-shops.md, Abschnitt 6 / Entscheidung 3).
 */

import { MODULE_ID, WARE, KAUFMODUS } from "./const.js";
import { grundpreisCp, preisCp, alsText, KUPFERWERT } from "./preise.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Welche Figur handelt an diesem Client?
 *
 * Wie in den In-Person Tools: zugewiesener Charakter, sonst der einzige
 * besessene. Zwei oder mehr ohne Zuweisung sind mehrdeutig.
 */
export function eigeneFigur() {
  if (game.user.character) return game.user.character;
  const eigene = game.actors.filter(a =>
    a.type === "character" && a.testUserPermission(game.user, "OWNER")
  );
  return eigene.length === 1 ? eigene[0] : null;
}

function kuerzel(sorte) {
  return game.i18n.localize(`SHOPS.Muenze.${sorte}`);
}

/** Das eine Fenster dieses Clients. */
let offen = null;

export class SpielerFenster extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "ninjos-shops-spieler",
    classes: ["ninjos-shops", "spieler-fenster"],
    position: { width: 560, height: 660 },
    window: {
      icon: "fa-solid fa-scale-balanced",
      resizable: true,
      contentClasses: ["standard-form"]
    },
    actions: {
      kaufenStub: SpielerFenster.#kaufenStub
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/spieler-fenster.hbs`,
      scrollable: [".shops-spieler-ware"]
    }
  };

  /** @type {Actor} */
  #laden;

  constructor(laden, options = {}) {
    super(options);
    this.#laden = laden;
  }

  get laden() {
    return this.#laden;
  }

  get ladenUuid() {
    return this.#laden?.uuid;
  }

  /** Frischen Akteur setzen (STAND / Reload) und neu zeichnen. */
  ladenSetzen(laden) {
    this.#laden = laden;
  }

  /** @override */
  get title() {
    return this.#laden?.name
      ?? game.i18n.localize("SHOPS.Spieler.Titel");
  }

  /** @override */
  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const laden = this.#laden;
    const system = laden.system;

    const begruessung = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      system.begruessung ?? "", { relativeTo: laden, secrets: false }
    );

    const figur = eigeneFigur();
    const boerse = this.#boerseAufbereiten(figur);

    return Object.assign(ctx, {
      ladenName: laden.name,
      ladenImg: laden.img,
      begruessung,
      ware: this.#wareAufbereiten(system),
      boerse,
      figurName: figur?.name ?? null,
      kaufHinweis: game.i18n.localize("SHOPS.Spieler.KaufKommtNoch"),
      kaufmodus: system.kaufmodus,
      gesperrt: system.kaufmodus === KAUFMODUS.GESPERRT
    });
  }

  /**
   * Sichtbare Auslage fuer Spieler: Verborgenes raus, Dienste gekennzeichnet.
   * Preise nur Anzeige - beim Kauf rechnet der Spielleiter neu.
   */
  #wareAufbereiten(laden) {
    return this.#laden.items.contents
      .filter(item => item.flags?.[MODULE_ID]?.[WARE.VERBORGEN] !== true)
      .map(item => {
        const merkmal = item.flags?.[MODULE_ID] ?? {};
        const grundCp = grundpreisCp(item.system?.price);
        const festCp = Number.isFinite(merkmal[WARE.FESTPREIS]) ? merkmal[WARE.FESTPREIS] : null;
        const dienst = merkmal[WARE.DIENST] === true;
        const menge = item.system?.quantity ?? 1;
        return {
          id: item.id,
          name: item.name,
          img: item.img,
          menge,
          preisText: alsText(preisCp(grundCp, laden, festCp), kuerzel),
          hinweis: merkmal[WARE.HINWEIS] ?? "",
          dienst,
          ausverkauft: !dienst && menge <= 0
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  }

  /** Eigene Boerse als Muenzzeilen, oder null wenn keine Figur. */
  #boerseAufbereiten(figur) {
    if (!figur) return null;
    const currency = figur.system?.currency ?? {};
    return Object.keys(KUPFERWERT).map(sorte => ({
      sorte,
      kuerzel: kuerzel(sorte),
      wert: Number(currency[sorte] ?? 0) || 0
    }));
  }

  /** Schritt 5: hier wird gekauft. Bis dahin nur Hinweis. */
  static #kaufenStub() {
    ui.notifications.info(game.i18n.localize("SHOPS.Spieler.KaufKommtNoch"));
  }

  /** @override */
  async close(options = {}) {
    if (offen === this) offen = null;
    return super.close(options);
  }
}

/**
 * Spielerfenster oeffnen. Ein zweites ersetzt das erste.
 * @param {Actor} laden
 */
export function spielerFensterOeffnen(laden) {
  if (offen) {
    if (offen.ladenUuid === laden.uuid) {
      offen.ladenSetzen(laden);
      offen.render(true);
      return offen;
    }
    offen.close({ force: true });
    offen = null;
  }
  offen = new SpielerFenster(laden);
  offen.render(true);
  return offen;
}

/** Fenster schliessen, falls offen. */
export function spielerFensterSchliessen() {
  if (!offen) return;
  offen.close({ force: true });
  offen = null;
}

/**
 * Offenes Fenster dieses Ladens aktualisieren (STAND).
 * @param {Actor} laden
 */
export function spielerFensterAktualisieren(laden) {
  if (!offen) {
    spielerFensterOeffnen(laden);
    return;
  }
  if (offen.ladenUuid !== laden.uuid) {
    spielerFensterOeffnen(laden);
    return;
  }
  offen.ladenSetzen(laden);
  offen.render(false);
}

export function spielerFensterIstOffen() {
  return !!offen;
}