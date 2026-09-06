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
