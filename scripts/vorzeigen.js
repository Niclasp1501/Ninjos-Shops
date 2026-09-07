/**
 * Vorzeigen und Schliessen eines Ladens.
 *
 * Der Spielleiter zeigt einen Laden vor - an alle oder an ausgewaehlte
 * Benutzer. Der Empfaenger bekommt das Spielerfenster; ein geoeffneter Laden
 * bleibt offen bis zum Schliessen, auch nach einem Neuladen (KONZEPT-shops.md,
 * Abschnitt 6). Immer nur einer: ein neuer ersetzt den vorherigen.
 *
 * Die Wahrheit, welcher Laden offen ist, liegt im User-Flag OFFENER_LADEN.
 * Der Socket traegt nur die Aufforderung, Fenster zu oeffnen oder zu
 * schliessen; nach einem Reload liest ready das Flag und stellt das Fenster
 * wieder her.
 *
 * **Keine Rechtevergabe.** Foundry schickt alle Weltdokumente an jeden Client;
 * Rechte steuern Sichtbarkeit und Schreiben, nicht die Uebertragung. Ein
 * OBSERVER-Recht beim Vorzeigen (so stand es in der ersten Fassung) haette den
 * Laden ins Akteursverzeichnis des Spielers gestellt und ihm den Spielleiter-
 * Bogen samt Verborgenem geoeffnet - genau das, was das Konzept vermeiden will.
 * Sollte sich in der Welt zeigen, dass ein rechteloser Akteur die Items nicht
 * mitbringt, ist die Antwort nicht OBSERVER, sondern die Spielleitung schickt
 * die aufbereitete Auslage ueber den Socket mit - wie der Tausch.
 */

import { MODULE_ID, SOCKET, OFFENER_LADEN, LADEN_TYP } from "./const.js";
import { istMonitor } from "./monitore.js";
import {
  SCHAU_MERKMAL, schauBeginnen, schauBeenden, schauZuschauer,
  schauZeichnen, schauSchliessen, seitenZahl
} from "./schau.js";
import {
  spielerFensterOeffnen,
  spielerFensterSchliessen,
  spielerFensterAktualisieren,
  wurdeWeggeklickt
} from "./spieler-fenster.js";

/** Debounce fuer STAND - ein Drop mit drei Items soll nicht drei mal senden. */
let standTimer = null;

/** Wer hat gerade diesen Laden vorgezeigt bekommen? */
export function werSieht(ladenUuid) {
  return game.users.filter(u => u.getFlag(MODULE_ID, OFFENER_LADEN) === ladenUuid);
}

/**
 * Aktive Nicht-Spielleiter (und optional die Spielleitung selbst).
 * Monitore bleiben dabei - wer die Schauansicht bekommt, ist Schritt 6.
 */
export function vorzeigbareBenutzer({ inklGm = false } = {}) {
  return game.users.filter(u => u.active && (inklGm || !u.isGM));
}

/** Flag setzen oder loeschen. */
async function flagSetzen(user, ladenUuid) {
  if (ladenUuid) await user.setFlag(MODULE_ID, OFFENER_LADEN, ladenUuid);
  else await user.unsetFlag(MODULE_ID, OFFENER_LADEN);
}

/**
 * Laden an die genannten Benutzer vorzeigen.
 *
 * @param {Actor} laden
 * @param {string[]} userIds
 */
export async function ladenZeigen(laden, userIds, schauIds = []) {
  if (!game.user.isGM) return;
  if (laden?.type !== LADEN_TYP) return;
  const an = [...new Set(userIds)].filter(id => game.users.get(id));
  if (!an.length) return;

  const gross = new Set(schauIds.filter(id => an.includes(id)));

  // Ein neuer Laden ersetzt den vorherigen: Das Flag haelt genau einen.
  for (const id of an) {
    const benutzer = game.users.get(id);
    await flagSetzen(benutzer, laden.uuid);
    /*
     * Gross oder klein ist eine Eigenschaft des *Bildschirms*, nicht des
     * Ladens - deshalb ein eigenes Merkmal neben dem offenen Laden. Es
     * ueberlebt ein Neuladen, damit ein Monitor nach einem Absturz von selbst
     * zurueckkommt und niemand aufstehen muss.
     */
    if (gross.has(id)) await benutzer.setFlag(MODULE_ID, SCHAU_MERKMAL, true);
    else await benutzer.unsetFlag(MODULE_ID, SCHAU_MERKMAL);
  }

  const payload = { typ: SOCKET.ZEIGEN, ladenUuid: laden.uuid, an };
  game.socket.emit(SOCKET.NAME, payload);
  // Socket kommt nie zum Absender zurueck.
  if (an.includes(game.user.id)) await aufZeigen(payload);

  // Wo gross gezeigt wird, blaettert jemand - und das ist die Spielleitung.
  if (gross.size) schauBeginnen(laden);
  else if (!schauZuschauer(laden.uuid).length) schauBeenden();
}

/**
 * Laden schliessen - fuer alle Zuschauer dieses Ladens oder nur fuer `userIds`.
 *
 * @param {string} ladenUuid
 * @param {string[]|"alle"} [userIds="alle"]
 */
export async function ladenSchliessen(ladenUuid, userIds = "alle") {
  if (!game.user.isGM) return;

  const zuschauer = werSieht(ladenUuid);
  const ziele = userIds === "alle"
    ? zuschauer
    : zuschauer.filter(u => userIds.includes(u.id));

  const an = ziele.map(u => u.id);
  for (const u of ziele) {
    await flagSetzen(u, null);
    await u.unsetFlag(MODULE_ID, SCHAU_MERKMAL);
  }
  if (!schauZuschauer(ladenUuid).length) schauBeenden();

  /*
   * Wer den Laden zumacht, macht auch die Kaufwuensche darin zu. Ein Ja auf
   * einen Kauf in einem geschlossenen Laden waere sonst noch moeglich, und
   * der Spieler haette laengst nicht mehr davorgestanden.
   */
  if (userIds === "alle") {
    const { freigabenWegraeumen } = await import("./freigabe.js");
    freigabenWegraeumen(ladenUuid);
  }

  const empfaenger = an.length ? an : (userIds === "alle" ? "alle" : userIds);
  const payload = { typ: SOCKET.SCHLIESSEN, ladenUuid, an: empfaenger };
  game.socket.emit(SOCKET.NAME, payload);
  if (empfaenger === "alle" || (Array.isArray(empfaenger) && empfaenger.includes(game.user.id))) {
    await aufSchliessen(payload);
  }
}

/** STAND an alle Clients: offene Fenster dieses Ladens neu zeichnen. */
export function standSenden(ladenUuid) {
  if (!game.user.isGM) return;
  if (!ladenUuid) return;
  clearTimeout(standTimer);
  standTimer = setTimeout(() => {
    const payload = { typ: SOCKET.STAND, ladenUuid };
    game.socket.emit(SOCKET.NAME, payload);
    aufStand(payload);
  }, 150);
}

/* ── Empfang auf jedem Client ─────────────────────────────────────── */

export async function aufZeigen({ ladenUuid, an }) {
  if (Array.isArray(an) && !an.includes(game.user.id)) return;
  const laden = await fromUuid(ladenUuid);
  if (!laden || laden.type !== LADEN_TYP) return;
  if (game.user.getFlag(MODULE_ID, OFFENER_LADEN) !== ladenUuid) {
    await flagSetzen(game.user, ladenUuid);
  }

  /*
   * Gross oder klein - derselbe Laden, zwei Ansichten. Ein Schirm bekommt
   * kein Spielerfenster: Er hat keine Boerse, und ein Kaufknopf, den niemand
   * druecken kann, waere ein Versprechen ins Leere.
   */
  if (game.user.getFlag(MODULE_ID, SCHAU_MERKMAL)) {
    await schauZeichnen(laden, { seite: 0, seiten: seitenZahl(laden), takt: 0 });
    return;
  }
  spielerFensterOeffnen(laden);
}

export async function aufSchliessen({ ladenUuid, an }) {
  if (an !== "alle" && Array.isArray(an) && !an.includes(game.user.id)) return;
  const meins = game.user.getFlag(MODULE_ID, OFFENER_LADEN);
  if (ladenUuid && meins && meins !== ladenUuid) return;
  if (meins) await flagSetzen(game.user, null);
  spielerFensterSchliessen();
  schauSchliessen();
}

export async function aufStand({ ladenUuid }) {
  if (game.user.getFlag(MODULE_ID, OFFENER_LADEN) !== ladenUuid) return;
  const laden = await fromUuid(ladenUuid);
  if (!laden || laden.type !== LADEN_TYP) return;
  spielerFensterAktualisieren(laden);
}

/**
 * Nach Reload: offenen Laden aus dem Flag wiederherstellen.
 *
 * **Nicht, wenn er hier weggeklickt wurde.** Das Merkmal sagt „die
 * Spielleitung hat mir diesen Laden gezeigt" - es sagt nicht, dass ich das
 * Fenster noch offen haben will. Wer zumacht und neu laedt, bekam den Laden
 * bisher zurueck und musste ihn erneut wegklicken.
 *
 * Das Merkmal bleibt trotzdem stehen: Der Laden ist weiter vorgezeigt, taucht
 * in der Zuschauerliste der Spielleitung auf, und der Zugangsknopf holt ihn
 * zurueck (zugaenge.js). Nur ungefragt kommt er nicht wieder.
 */
export async function offenenLadenWiederherstellen() {
  const uuid = game.user.getFlag(MODULE_ID, OFFENER_LADEN);
  if (!uuid) return;
  const laden = await fromUuid(uuid);
  if (!laden || laden.type !== LADEN_TYP) {
    await flagSetzen(game.user, null);
    return;
  }
  if (wurdeWeggeklickt(uuid)) return;
  spielerFensterOeffnen(laden);
}

/**
 * Dialog: welche aktiven Benutzer sollen den Laden sehen?
 * @returns {Promise<string[]|null>}
 */
export async function benutzerWaehlen(laden) {
  const leute = vorzeigbareBenutzer({ inklGm: true });
  if (!leute.length) {
    ui.notifications.warn(game.i18n.localize("SHOPS.Vorzeigen.NiemandDa"));
    return null;
  }

  const schon = new Set(werSieht(laden.uuid).map(u => u.id));
  const grossSchon = new Set(schauZuschauer(laden.uuid).map(u => u.id));

  /*
   * **Die Monitorerkennung schlaegt vor, sie entscheidet nicht.** Ein Beamer
   * oder ein zweites Notebook ist kein Monitorbenutzer und sieht doch genauso
   * aus; umgekehrt will man einem Monitor gelegentlich das kleine Fenster
   * geben. Der Haken steht deshalb vorbelegt da und laesst sich umlegen.
   */
  const zeilen = leute.map(u => {
    const checked = schon.has(u.id) ? "checked" : "";
    const mark = u.isGM ? ` (${game.i18n.localize("SHOPS.Vorzeigen.Spielleitung")})` : "";
    const monitor = istMonitor(u);
    const grossAn = (grossSchon.has(u.id) || (!schon.size && monitor)) ? "checked" : "";
    return `<div class="shops-wahl-zeile">
      <label class="shops-wahl-wer">
        <input type="checkbox" name="user" value="${u.id}" ${checked}>
        <span>${foundry.utils.escapeHTML(u.name)}${mark}</span>
      </label>
      <label class="shops-wahl-gross" data-tooltip="${game.i18n.localize("SHOPS.Schau.GrossHinweis")}">
        <input type="checkbox" name="gross" value="${u.id}" ${grossAn}>
        <span>${game.i18n.localize("SHOPS.Schau.Gross")}${monitor ? " ⬤" : ""}</span>
      </label>
    </div>`;
  }).join("");

  /*
   * Ein <div>, kein <form>: DialogV2 ist selbst ein Formular, und ein Formular
   * im Formular wirft der HTML-Parser stillschweigend weg. Die erste Fassung
   * suchte danach im Rueckruf, fand nichts und gab eine leere Auswahl zurueck -
   * der Dialog ging zu, und nichts geschah. Aufgefallen beim ersten Klick in
   * der Welt.
   */
  const html = `<div class="shops-wahl"><p>${game.i18n.localize("SHOPS.Vorzeigen.AuswahlHinweis")}</p>${zeilen}</div>`;

  const antwort = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("SHOPS.Vorzeigen.AuswahlTitel") },
    content: html,
    buttons: [
      {
        action: "zeigen",
        label: game.i18n.localize("SHOPS.Vorzeigen.Zeigen"),
        icon: "fa-solid fa-eye",
        default: true,
        callback: (_ereignis, _knopf, dialog) => ({
          an: [...dialog.element.querySelectorAll('.shops-wahl input[name="user"]:checked')].map(i => i.value),
          gross: [...dialog.element.querySelectorAll('.shops-wahl input[name="gross"]:checked')].map(i => i.value)
        })
      },
      {
        action: "abbrechen",
        label: game.i18n.localize("SHOPS.Abbrechen"),
        icon: "fa-solid fa-xmark"
      }
    ],
    rejectClose: false
  });

  if (antwort === "abbrechen" || antwort === null || antwort === undefined) return null;
  return (antwort && typeof antwort === "object" && Array.isArray(antwort.an))
    ? antwort : { an: [], gross: [] };
}