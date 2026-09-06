/**
 * Wer ist ein Monitor?
 *
 * **Die Brücke geht in eine Richtung.** Sind die In-Person Tools da und geben
 * sie ihre Monitorerkennung heraus, gewinnt deren Antwort - der Tisch hat sie
 * dort einmal eingestellt, und zwei Listen, die dasselbe meinen, laufen immer
 * auseinander. Sind sie nicht da, hat dieses Modul eine eigene Liste. Es
 * haengt nie von ihnen ab (`recommends`, nie `requires`).
 *
 * **Warum das wichtiger ist, als es klingt.** Steht die eigene Liste da und
 * bewirkt nichts, weil drueben etwas anderes gilt, sucht jemand eine halbe
 * Stunde nach dem Grund, warum sein Monitor nicht umschaltet. Die
 * Einstellungsseite sagt deshalb, woher die Auskunft gerade kommt, und graut
 * die eigene Liste aus, sobald sie nicht mehr gilt.
 *
 * **Die Erkennung schlaegt nur vor.** Wer die Schauansicht bekommt, entscheidet
 * die Spielleitung beim Vorzeigen - ein Beamer oder ein zweites Notebook ist
 * kein Monitorbenutzer und sieht doch genauso aus (Entscheidung 5 im Konzept).
 */

import { MODULE_ID, SETTINGS } from "./const.js";

/**
 * Die API der In-Person Tools, falls sie die Monitorerkennung herausgibt.
 *
 * Fehlt das Modul, ist es abgeschaltet, oder fehlt die Funktion in seiner API,
 * ist die Antwort `null` - und dieses Modul faellt auf seine eigene Liste
 * zurueck, ohne dass irgendwo etwas kaputtgeht.
 */
export function inPersonBruecke() {
  const modul = game.modules.get("ninjos-inperson-tools");
  const api = modul?.active ? modul.api : null;
  return typeof api?.isMonitorUser === "function" ? api : null;
}

/** Woher die Auskunft gerade kommt: `"inperson"` oder `"eigen"`. */
export function monitorQuelle() {
  return inPersonBruecke() ? "inperson" : "eigen";
}

/** Ist dieser Benutzer ein Monitor? */
export function istMonitor(benutzer) {
  if (!benutzer) return false;

  const api = inPersonBruecke();
  if (api) {
    try { return api.isMonitorUser(benutzer) === true; }
    catch (fehler) {
      // Eine fremde API, die wirft, darf hier nichts umwerfen.
      console.warn(`${MODULE_ID} | Monitorerkennung der In-Person Tools schlug fehl`, fehler);
    }
  }

  const eigene = game.settings.get(MODULE_ID, SETTINGS.MONITORE) ?? [];
  return eigene.includes(benutzer.id);
}

/** Alle angemeldeten Monitore. */
export function angemeldeteMonitore() {
  return game.users.filter(u => u.active && istMonitor(u));
}

/* ── Die eigene Liste, mit einem Satz dazu ─────────────────────────── */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Wer ist ein Monitor - die eigene Liste dieses Moduls.
 *
 * **Sie graut aus, sobald die In-Person Tools antworten.** Eine Einstellung,
 * die dasteht und nichts bewirkt, kostet jemanden eine halbe Stunde Suche
 * nach dem Grund, warum sein Monitor nicht umschaltet. Der Satz oben sagt
 * deshalb immer, woher die Auskunft gerade kommt.
 */
export class MonitorListe extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-monitore`,
    classes: ["ninjos-shops", "shops-monitore"],
    position: { width: 460, height: "auto" },
    window: { icon: "fa-solid fa-display", title: "SHOPS.Monitor.Titel" },
    actions: { sichern: MonitorListe.#sichern }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/monitore.hbs` }
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const eigene = game.settings.get(MODULE_ID, SETTINGS.MONITORE) ?? [];
    const fremd = monitorQuelle() === "inperson";

    return Object.assign(ctx, {
      fremd,
      leute: game.users.map(u => ({
        id: u.id, name: u.name, aktiv: u.active, gm: u.isGM,
        an: fremd ? istMonitor(u) : eigene.includes(u.id)
      }))
    });
  }

  static async #sichern() {
    if (monitorQuelle() === "inperson") return;
    const gewaehlt = [...this.element.querySelectorAll("[data-monitor]:checked")].map(k => k.value);
    await game.settings.set(MODULE_ID, SETTINGS.MONITORE, gewaehlt);
    ui.notifications.info(game.i18n.format("SHOPS.Monitor.Gesichert", { anzahl: gewaehlt.length }));
    this.close();
  }
}

/** Den Eintrag in der Einstellungsliste anmelden. Gehoert in `init`. */
export function monitorEinstellungEinrichten() {
  game.settings.registerMenu(MODULE_ID, "monitorliste", {
    name: "SHOPS.Monitor.Name",
    label: "SHOPS.Monitor.Knopf",
    hint: "SHOPS.Monitor.Hinweis",
    icon: "fa-solid fa-display",
    type: MonitorListe,
    restricted: true
  });
}
