/**
 * Socket-Empfang fuer Ninjo's Shops.
 *
 * ZEIGEN / SCHLIESSEN / STAND steuern das Spielerfenster (Schritt 4).
 * KAUFEN ist hier nur ein Stub - die Ausfuehrung kommt in Schritt 5.
 *
 * Dieselbe Bauweise wie der Tausch: Der Spielleiter haelt die Wahrheit;
 * Spieler sprechen den Spielleiter an, nie einander.
 */

import { MODULE_ID, SOCKET, LADEN_TYP } from "./const.js";
import {
  aufZeigen,
  aufSchliessen,
  aufStand,
  standSenden
} from "./vorzeigen.js";

/**
 * Eingehende Socket-Nachricht verteilen.
 * @param {object} data
 */
function onSocket(data) {
  if (!data?.typ) return;
  switch (data.typ) {
    case SOCKET.ZEIGEN:
      return void aufZeigen(data);
    case SOCKET.SCHLIESSEN:
      return void aufSchliessen(data);
    case SOCKET.STAND:
      return void aufStand(data);
    case SOCKET.KAUFEN:
      // Schritt 5: Kaufanfrage an den Spielleiter. Bis dahin bewusst leer.
      return;
  }
}

/**
 * STAND ausloesen, wenn die Auslage eines Ladens sich aendert.
 * Nur die Spielleitung sendet - Spieler haben ohnehin keine Schreibrechte.
 */
function standBeiAenderung(dokument) {
  if (!game.user.isGM) return;
  const actor = dokument?.documentName === "Actor" ? dokument : dokument?.parent;
  if (!actor || actor.type !== LADEN_TYP) return;
  standSenden(actor.uuid);
}

/** Offene Ladenboegen neu zeichnen (Zuschauerliste). */
function ladenBoegenAktualisieren() {
  if (!game.user.isGM) return;
  const apps = foundry.applications.instances?.values?.() ?? [];
  for (const app of apps) {
    if (app?.document?.type === LADEN_TYP) app.render?.(false);
  }
}

/** Listener und Hooks anmelden. Gehoert in ready. */
export function socketEinrichten() {
  game.socket.on(SOCKET.NAME, onSocket);

  Hooks.on("updateItem", item => standBeiAenderung(item));
  Hooks.on("createItem", item => standBeiAenderung(item));
  Hooks.on("deleteItem", item => standBeiAenderung(item));
  Hooks.on("updateActor", (actor, changes) => {
    if (actor.type !== LADEN_TYP) return;
    if (changes.system || changes.name || changes.img) standBeiAenderung(actor);
  });

  // Zuschauerliste auf dem Bogen aktuell halten, wenn Flags wechseln.
  Hooks.on("updateUser", (_user, changes) => {
    if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) return;
    ladenBoegenAktualisieren();
  });
}