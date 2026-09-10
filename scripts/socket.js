/**
 * Socket-Empfang fuer Ninjo's DnD Shops & Trade.
 *
 * ZEIGEN / SCHLIESSEN / STAND steuern das Spielerfenster, ANGEBOT legt einem
 * Spieler etwas zum Sonderpreis hin, KAUFEN traegt seine Bitte zur
 * Spielleitung und ANTWORT das Ergebnis zurueck.
 *
 * **Nur die Spielleitung fuehrt aus.** Ein Spieler kann auf einem fremden
 * Akteur nichts anlegen und nichts loeschen; die Regel „kein Spielleiter, kein
 * Handel" gilt ohnehin und wird deshalb nicht zum Sonderfall gemacht, sondern
 * zur Bauweise. Dieselbe Anlage wie der Tausch in den In-Person Tools.
 *
 * **Sind mehrere Spielleitungen da, fuehrt genau eine aus.** Foundrys eigene
 * Antwort darauf ist `activeGM` - die reicht aber nur, solange es zwei
 * verschiedene Spielleitungen sind. Zwei Tabs **derselben** Spielleitung sind
 * beide `activeGM`, und dann laeuft jeder Kauf doppelt. Welche Verbindung
 * ausfuehrt, entscheidet deshalb vorsitz.js; dort steht die Messung dazu.
 */

import { MODULE_ID, SOCKET, LADEN_TYP, OFFENES_ANGEBOT } from "./const.js";
import { aufZeigen, aufSchliessen, aufStand, standSenden } from "./vorzeigen.js";
import { aufAngebot } from "./angebot.js";
import { fuehreKaufAus } from "./kauf.js";
import { fuehreVerkaufAus } from "./verkauf.js";
import { aufAnfrage } from "./anfrage.js";
import { darfIchAusfuehren, aufVorsitz } from "./vorsitz.js";
import { brauchtFreigabe, freigabeAufnehmen } from "./freigabe.js";
import { aufTisch } from "./handelstisch.js";
import { aufTausch } from "./tausch.js";
import { aufAbbruch, abbruchZeigen, erfolgZeigen, istWortbruch } from "./melden.js";
import { aufSchau, schauNachfuehren } from "./schau.js";
import { alsText } from "./preise.js";

/** Eingehende Socket-Nachricht verteilen. */
async function onSocket(daten) {
  if (!daten?.typ) return;

  switch (daten.typ) {
    case SOCKET.ZEIGEN:      return void aufZeigen(daten);
    case SOCKET.SCHLIESSEN:  return void aufSchliessen(daten);
    case SOCKET.STAND:       return void aufStand(daten);
    case SOCKET.ANGEBOT:     return void aufAngebot(daten);
    case SOCKET.ANFRAGE:     return void aufAnfrage(daten);
    case SOCKET.VORSITZ:     return void aufVorsitz(daten);
    case SOCKET.HANDEL:      return void aufTisch(daten);
    case SOCKET.ABBRUCH:     return void aufAbbruch(daten);
    case SOCKET.TAUSCH: {
      // Eine Meldung gilt genau einer Person; alles andere geht an den Tausch.
      if (daten.tat === "meldung") {
        // Entweder ein Sprachschluessel oder ein fertiger Satz - je nachdem,
        // ob die Meldung Werte traegt, die erst beim Ausfuehren feststehen.
        if (daten.an === game.user.id) {
          ui.notifications.warn(daten.text ?? game.i18n.localize(daten.schluessel));
        }
        return;
      }
      return void await aufTausch(daten);
    }
    case SOCKET.SCHAU:       return void aufSchau(daten);

    case SOCKET.KAUFEN: {
      if (!await darfIchAusfuehren(daten.bitteId)) return;
      /*
       * Im Modus „freigabe" wird hier nicht gekauft, sondern gefragt. Ob ein
       * Angebot vorliegt, entscheidet das Merkmal am Benutzer - wer einen
       * Preis zugesagt bekommen hat, braucht kein zweites Ja.
       */
      const laden = await fromUuid(daten.ladenUuid);
      const angebot = game.users.get(daten.kaeuferId)?.getFlag(MODULE_ID, OFFENES_ANGEBOT) ?? null;
      const giltAngebot = angebot?.ladenUuid === daten.ladenUuid && angebot?.itemId === daten.itemId;
      const ergebnis = brauchtFreigabe(laden, giltAngebot ? angebot.preisCp : null)
        ? await freigabeAufnehmen(daten)
        : await fuehreKaufAus(daten);
      game.socket.emit(SOCKET.NAME, {
        typ: SOCKET.ANTWORT, an: [daten.kaeuferId], ergebnis
      });
      // Der eigene Socket kommt nie zurueck.
      if (daten.kaeuferId === game.user.id) aufAntwort({ an: [daten.kaeuferId], ergebnis });
      standSenden(daten.ladenUuid);
      return;
    }

    case SOCKET.VERKAUFEN: {
      if (!await darfIchAusfuehren(daten.bitteId)) return;
      const ergebnis = await fuehreVerkaufAus(daten);
      game.socket.emit(SOCKET.NAME, {
        typ: SOCKET.ANTWORT, an: [daten.verkaeuferId], ergebnis
      });
      if (daten.verkaeuferId === game.user.id) aufAntwort({ an: [daten.verkaeuferId], ergebnis });
      standSenden(daten.ladenUuid);
      return;
    }

    case SOCKET.ANTWORT:     return void aufAntwort(daten);
  }
}

/**
 * Das Ergebnis eines Kaufs beim Kaeufer.
 *
 * Eine Meldung und kein Fenster: Der Kauf ist vorbei, und ein Fenster, das
 * man wegklicken muss, hilft niemandem mehr.
 */
export function aufAntwort({ an, ergebnis }) {
  if (Array.isArray(an) && !an.includes(game.user.id)) return;
  if (!ergebnis) return;

  /*
   * Drei Faelle, nicht zwei. „Liegt beim Haendler" ist kein Fehlschlag - es
   * als Warnung zu zeigen, liesse den Spieler denken, sein Kauf sei
   * gescheitert, und er klickte gleich noch einmal.
   */
  // Ein Tisch raeumt sich nach dem Abschluss ab. Eine Meldung waere dann das
  // Einzige, was den Erfolg bezeugt, und die ist in der Blattansicht unsichtbar.
  if (ergebnis.ok && ergebnis.tisch) erfolgZeigen(foundry.utils.escapeHTML(ergebnis.text ?? ""));
  else if (ergebnis.ok) ui.notifications.info(ergebnis.text);
  /*
   * **Ein gebrochenes Wort bekommt ein Fenster, keine Meldung.** Wer etwas
   * vor sich liegen sah und es beim Abschluss nicht bekommt, muss den Grund
   * lesen koennen - eine Benachrichtigung verschwindet von selbst und ist in
   * der Blattansicht ganz ausgeblendet. Siehe melden.js.
   */
  else if (istWortbruch(ergebnis.grund)) abbruchZeigen(ergebnis.was ?? "");
  else if (ergebnis.grundText) ui.notifications.warn(ergebnis.grundText);
  else {
    /*
     * **Wieviel fehlt, stand immer schon in der Antwort** - `fehltCp` wird an
     * drei Stellen ausgerechnet und mitgeschickt, und keine hat es je
     * angezeigt. „Das Geld reicht nicht" beantwortet die halbe Frage: Der
     * Spieler weiss nicht, ob ihm ein Kupferstueck fehlt oder zehn Gold, also
     * auch nicht, ob es sich lohnt, vorher etwas zu verkaufen.
     */
    const grund = game.i18n.localize(ergebnis.grund ?? "SHOPS.Kauf.Abgebrochen");
    const fehlt = Number(ergebnis.fehltCp);
    ui.notifications.warn(
      Number.isFinite(fehlt) && fehlt > 0
        ? `${grund} ${game.i18n.format("SHOPS.Kauf.EsFehlt", {
            geld: alsText(fehlt, s => game.i18n.localize(`SHOPS.Muenze.${s}`)) })}`
        : grund);
  }

  foundry.applications.instances.get(`${MODULE_ID}-spieler`)?.render(false);
}

/**
 * STAND ausloesen, wenn die Auslage eines Ladens sich aendert.
 * Nur die Spielleitung sendet - Spieler haben ohnehin keine Schreibrechte.
 */
function standBeiAenderung(dokument) {
  if (!game.user.isGM) return;
  const akteur = dokument?.documentName === "Actor" ? dokument : dokument?.parent;
  if (!akteur || akteur.type !== LADEN_TYP) return;
  standSenden(akteur.uuid);
  // Ein Stueck mehr oder weniger kann eine Seite mehr oder weniger bedeuten.
  schauNachfuehren(akteur.uuid);
}

/** Offene Ladenboegen neu zeichnen (Zuschauerliste, Angebote). */
function ladenBoegenAktualisieren() {
  if (!game.user.isGM) return;
  for (const app of foundry.applications.instances.values()) {
    if (app?.document?.type === LADEN_TYP) app.render?.(false);
  }
}

/** Listener und Hooks anmelden. Gehoert in ready. */
export function socketEinrichten() {
  game.socket.on(SOCKET.NAME, onSocket);

  Hooks.on("updateItem", item => standBeiAenderung(item));
  Hooks.on("createItem", item => standBeiAenderung(item));
  Hooks.on("deleteItem", item => standBeiAenderung(item));
  Hooks.on("updateActor", (akteur, aenderungen) => {
    if (akteur.type !== LADEN_TYP) return;
    if (aenderungen.system || aenderungen.name || aenderungen.img) standBeiAenderung(akteur);
  });

  /*
   * Auf Merkmalsaenderungen an Benutzern reagieren: Zuschauerliste und
   * Angebote haengen beide dort. Der eigene Client zeichnet sein
   * Spielerfenster neu, damit ein Angebot auch nach einem Neuladen auftaucht.
   */
  Hooks.on("updateUser", (benutzer, aenderungen) => {
    if (!foundry.utils.hasProperty(aenderungen, `flags.${MODULE_ID}`)) return;
    ladenBoegenAktualisieren();
    if (benutzer.id === game.user.id) {
      foundry.applications.instances.get(`${MODULE_ID}-spieler`)?.render(false);
    }
  });
}
