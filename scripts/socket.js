/**
 * Socket-Empfang fuer Ninjo's Shops.
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
 * **Sind mehrere Spielleitungen da, fuehrt genau eine aus** - `activeGM` ist
 * Foundrys eigene Antwort darauf und immer bei allen Clients dieselbe. Ohne
 * diese Pruefung liefe ein Kauf bei zwei Spielleitungen zweimal, und der
 * Spieler haette den Dolch doppelt und das Geld einfach weg.
 */

import { MODULE_ID, SOCKET, LADEN_TYP } from "./const.js";
import { aufZeigen, aufSchliessen, aufStand, standSenden } from "./vorzeigen.js";
import { aufAngebot } from "./angebot.js";
import { fuehreKaufAus } from "./kauf.js";
import { fuehreVerkaufAus } from "./verkauf.js";
import { aufAnfrage } from "./anfrage.js";

/** Fuehrt dieser Client aus? */
function istAusfuehrendeSpielleitung() {
  return game.user.isGM && game.users.activeGM?.id === game.user.id;
}

/** Eingehende Socket-Nachricht verteilen. */
async function onSocket(daten) {
  if (!daten?.typ) return;

  switch (daten.typ) {
    case SOCKET.ZEIGEN:      return void aufZeigen(daten);
    case SOCKET.SCHLIESSEN:  return void aufSchliessen(daten);
    case SOCKET.STAND:       return void aufStand(daten);
    case SOCKET.ANGEBOT:     return void aufAngebot(daten);
    case SOCKET.ANFRAGE:     return void aufAnfrage(daten);

    case SOCKET.KAUFEN: {
      if (!istAusfuehrendeSpielleitung()) return;
      const ergebnis = await fuehreKaufAus(daten);
      game.socket.emit(SOCKET.NAME, {
        typ: SOCKET.ANTWORT, an: [daten.kaeuferId], ergebnis
      });
      // Der eigene Socket kommt nie zurueck.
      if (daten.kaeuferId === game.user.id) aufAntwort({ an: [daten.kaeuferId], ergebnis });
      standSenden(daten.ladenUuid);
      return;
    }

    case SOCKET.VERKAUFEN: {
      if (!istAusfuehrendeSpielleitung()) return;
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

  if (ergebnis.ok) ui.notifications.info(ergebnis.text);
  else ui.notifications.warn(game.i18n.localize(ergebnis.grund ?? "SHOPS.Kauf.Abgebrochen"));

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
