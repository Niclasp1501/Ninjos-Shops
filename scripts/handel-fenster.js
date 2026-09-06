/**
 * Die zwei Fenster des Handels mit einer Person.
 *
 * **Vorbereiten** bei der Spielleitung: Wer bekommt was, zu welchem Preis.
 * **Ausgelegt** beim Spieler: Was ihm hingelegt wurde, und ein Knopf je Stueck.
 *
 * Warum die Spielleitung *auswaehlt* statt den ganzen Bogen zu schicken, steht
 * in handel.js: Der Bogen einer Person enthaelt ihre ganze Ausruestung. Ein
 * Handel legt die Stuecke vor, die gemeint sind.
 */

import { MODULE_ID } from "./const.js";
import { grundpreisCp, alsText, KUPFERWERT } from "./preise.js";
import {
  handelSenden, eigenerHandel, postenNehmen, handelAblehnen, OFFENER_HANDEL
} from "./handel.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/* ── Vorbereiten: das Fenster der Spielleitung ─────────────────────── */

export class HandelVorbereiten extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-handel-vorbereiten`,
    classes: ["ninjos-shops", "shops-handel-vorbereiten"],
    position: { width: 640, height: "auto" },
    window: { icon: "fa-solid fa-handshake", resizable: true },
    actions: {
      senden: HandelVorbereiten.#senden,
      allesWaehlen: HandelVorbereiten.#allesWaehlen
    }
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/handel-vorbereiten.hbs`,
      scrollable: [".shops-handel-waren"]
    }
  };

  #person;

  constructor(person, options = {}) {
    super(options);
    this.#person = person;
  }

  get title() {
    return game.i18n.format("SHOPS.Handel.VorbereitenTitel", { person: this.#person?.name ?? "" });
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);

    /*
     * Nur, was ueberhaupt handelbar ist. Zauber, Klassenmerkmale und
     * Ruestungsmerkmale eines NSC stehen in derselben Sammlung wie sein
     * Rucksack - sie hier anzubieten waere sinnlos und macht die Liste
     * unlesbar.
     */
    const handelbar = new Set(["weapon", "equipment", "consumable", "tool",
                               "loot", "container", "backpack"]);

    return Object.assign(ctx, {
      personName: this.#person.name,
      personBild: this.#person.prototypeToken?.texture?.src || this.#person.img,

      /*
       * Nur, wer etwas nehmen koennte.
       *
       * **Ohne Figur geht es nicht.** `postenNehmen` bricht mit „Du fuehrst
       * keine Figur" ab - das Angebot laege bei jemandem, der es gar nicht
       * annehmen kann. Damit fallen auch die Bildschirme an der Wand heraus:
       * Ein Monitor ist ein Zuschauer, kein Empfaenger.
       *
       * **Und nur, wer da ist**, wie schon bei den Sonderangeboten
       * (`angebot.js`, das seit jeher `u.active` filtert). Ein Handel ist ein
       * Gespraech; wer nicht am Tisch sitzt, fuehrt keines. Vorher standen
       * acht Zeilen da, von denen eine gemeint war.
       */
      spieler: game.users
        .filter(u => !u.isGM && u.active && u.character)
        .map(u => ({ id: u.id, name: u.name, figur: u.character.name })),
      waren: this.#person.items
        .filter(i => handelbar.has(i.type))
        .map(i => ({
          id: i.id, name: i.name, img: i.img,
          menge: Number(i.system?.quantity ?? 1),
          // In Gold, weil man so spricht. Umgerechnet wird beim Absenden.
          preisGp: (grundpreisCp(i.system?.price) / KUPFERWERT.gp) || 0
        }))
        .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
    });
  }

  /** Alle Kaestchen einer Spalte auf einmal. */
  static #allesWaehlen(ereignis, ziel) {
    const an = ziel.dataset.wert === "an";
    for (const k of this.element.querySelectorAll('[data-feld="ware"]')) k.checked = an;
  }

  static async #senden() {
    const an = [...this.element.querySelectorAll('[data-feld="spieler"]:checked')].map(k => k.value);
    if (!an.length) return ui.notifications.warn(game.i18n.localize("SHOPS.Handel.NiemandGewaehlt"));

    const posten = [...this.element.querySelectorAll('[data-feld="ware"]:checked')].map(k => {
      const zeile = k.closest("[data-item-id]");
      const gp = Number(zeile.querySelector("[data-preis]")?.value) || 0;
      return {
        itemId: zeile.dataset.itemId,
        menge: Number(zeile.querySelector("[data-menge]")?.value) || 1,
        preisCp: Math.round(gp * KUPFERWERT.gp)
      };
    });

    const nimmtAn = this.element.querySelector("[data-feld='nimmtAn']")?.checked ?? false;
    const satz = this.element.querySelector("[data-feld='satz']")?.value ?? "";

    await handelSenden(this.#person, { an, posten, nimmtAn, satz });
    this.close();
  }
}

/* ── Ausgelegt: das Fenster des Spielers ───────────────────────────── */

export class HandelFenster extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-handel`,
    classes: ["ninjos-shops", "shops-handel"],
    position: { width: 520, height: "auto" },
    window: { icon: "fa-solid fa-handshake", resizable: true },
    actions: {
      nehmen: HandelFenster.#nehmen,
      ansehen: HandelFenster.#ansehen,
      ablehnen: HandelFenster.#ablehnen,
      anbieten: HandelFenster.#anbieten
    }
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/handel-fenster.hbs`,
      scrollable: [".shops-handel-liste"]
    }
  };

  get title() {
    return game.i18n.format("SHOPS.Handel.FensterTitel", {
      person: eigenerHandel()?.personName ?? ""
    });
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const handel = eigenerHandel();
    const figur = game.user.character;

    return Object.assign(ctx, {
      handel,
      figurName: figur?.name ?? null,
      boerse: figur ? alsText(
        Object.entries(figur.system?.currency ?? {})
          .reduce((s, [sorte, zahl]) => s + (KUPFERWERT[sorte] ?? 0) * (Number(zahl) || 0), 0),
        kuerzel) : null
    });
  }

  static #nehmen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    if (itemId) postenNehmen(itemId);
  }

  /**
   * Das Stueck aus der Naehe ansehen.
   *
   * Derselbe Weg wie im Laden - nur haelt es hier eine Person, und der Preis
   * steht fest statt sich aus einem Aufschlag zu ergeben.
   */
  static async #ansehen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    const handel = eigenerHandel();
    const posten = handel?.posten?.find(p => p.itemId === itemId);
    if (!posten) return;

    const person = await fromUuid(handel.personUuid);
    if (!person) return;

    const { wareAnsehen } = await import("./ware-ansehen.js");
    wareAnsehen(person, itemId, {
      preisCp: posten.preisCp * posten.menge,
      kaufen: id => postenNehmen(id)
    });
  }

  /** Danke, nein. */
  static async #ablehnen() {
    const handel = eigenerHandel();
    const sicher = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("SHOPS.Handel.AblehnenTitel") },
      classes: ["ninjos-shops"],
      content: `<p class="shops-kaufdialog">${game.i18n.format("SHOPS.Handel.AblehnenFrage", {
        person: foundry.utils.escapeHTML(handel?.personName ?? "")
      })}</p>`,
      yes: { label: game.i18n.localize("SHOPS.Handel.AblehnenJa"), icon: "fa-solid fa-hand" },
      no: { label: game.i18n.localize("SHOPS.Abbrechen") },
      defaultYes: false
    });
    if (sicher) handelAblehnen();
  }

  /**
   * „Ich haette da auch etwas" - der Weg zurueck.
   *
   * **Dasselbe Fenster wie am Ladentresen.** Der Spieler packt zusammen, die
   * Spielleitung nennt einen Preis, beide sagen ja oder nein. Ein zweites
   * Fenster daneben zu bauen, das dasselbe tut, hiesse jede kuenftige
   * Aenderung zweimal zu machen - und die zweite beim ersten Mal zu vergessen.
   * Was `anfrage.js` dafuer kennen musste, war nur, dass ein Gegenueber nicht
   * zwingend ein Laden ist.
   */
  static async #anbieten() {
    const handel = eigenerHandel();
    const figur = game.user.character;
    if (!figur) return ui.notifications.warn(game.i18n.localize("SHOPS.Kauf.KeineFigur"));
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("SHOPS.Kauf.KeinSpielleiter"));

    const person = handel?.personUuid ? await fromUuid(handel.personUuid) : null;
    if (!person) return;

    const { packenOeffnen } = await import("./anfrage-fenster.js");
    packenOeffnen(person, figur);
  }
}

/* ── Auf- und zumachen ─────────────────────────────────────────────── */

let offen = null;

/** Beim Spieler zeigen, was hingelegt wurde - oder wegraeumen, wenn nichts. */
export function handelFensterZeigen() {
  const handel = eigenerHandel();
  if (!handel) {
    offen?.close();
    offen = null;
    return null;
  }
  offen ??= new HandelFenster();
  offen.render(true);
  return offen;
}

/** Bei der Spielleitung: fuer diese Person einen Handel zusammenstellen. */
export function handelVorbereiten(person) {
  if (!person) return null;
  const fenster = new HandelVorbereiten(person, { id: `${MODULE_ID}-handel-${person.id}` });
  fenster.render(true);
  return fenster;
}

/**
 * Haken anmelden. Gehoert in `ready`.
 *
 * Ein Handel liegt als Merkmal am Benutzer und ueberlebt damit ein Neuladen -
 * das Fenster muss danach von selbst wiederkommen, sonst waere er da und
 * unsichtbar.
 */
export function handelFensterEinrichten() {
  /*
   * Der Weg hinein, fuer die Spielleitung: ein Knopf in der Titelleiste
   * **jedes** Personenbogens. Nicht nur bei Haendlern - der ganze Sinn der
   * Sache ist, dass die Person keinen Laden hat.
   */
  if (game.user.isGM) Hooks.on("renderApplicationV2", (app, element) => {
    const dokument = app?.document;
    if (dokument?.documentName !== "Actor") return;
    if (dokument.type?.startsWith(MODULE_ID)) return;   // Der Laden hat seinen eigenen Weg.

    const wurzel = element instanceof HTMLElement ? element : element?.[0];
    const kopf = wurzel?.querySelector(".window-header");
    if (!kopf || kopf.querySelector(`.${MODULE_ID}-handelknopf`)) return;

    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.className = `header-control icon fa-solid fa-handshake ${MODULE_ID}-handelknopf`;
    knopf.dataset.tooltip = game.i18n.localize("SHOPS.Handel.Starten");
    knopf.setAttribute("aria-label", game.i18n.localize("SHOPS.Handel.Starten"));
    knopf.addEventListener("click", ereignis => {
      ereignis.preventDefault();
      ereignis.stopPropagation();
      handelVorbereiten(dokument);
    });

    const schliessen = kopf.querySelector('[data-action="close"]');
    if (schliessen) schliessen.before(knopf);
    else kopf.append(knopf);
  });

  Hooks.on("updateUser", (benutzer, aenderungen) => {
    if (benutzer.id !== game.user.id) return;
    if (!foundry.utils.hasProperty(aenderungen, `flags.${MODULE_ID}.${OFFENER_HANDEL}`)) return;
    handelFensterZeigen();
  });

  if (eigenerHandel()) handelFensterZeigen();
}
