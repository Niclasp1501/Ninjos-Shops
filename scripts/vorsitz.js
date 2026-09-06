/**
 * Wer fuehrt aus, wenn dieselbe Spielleitung zweimal angemeldet ist?
 *
 * **Der Fehler, der das hier ausgeloest hat.** Bis hierher stand ueberall
 * `game.user.isGM && game.users.activeGM?.id === game.user.id`. Das ist
 * Foundrys eigene Antwort auf „mehrere Spielleitungen" - aber `activeGM`
 * benennt einen **Benutzer**, keine **Verbindung**. Hat dieselbe Spielleitung
 * zwei Tabs offen (ein zweiter Bildschirm, ein vergessenes Fenster, das Handy
 * daneben), sind beide Clients `activeGM`, und beide fuehren aus.
 *
 * Gemessen am 06.09.2026 in der Testwelt: Ein Kauf einer Fackel, ein Klick.
 * Der eine Client bekam die Bitte genau einmal und antwortete einmal - beim
 * Spieler kamen **zwei** Antworten an, im Ladenbuch standen **zwei** Buchungen
 * 16 ms auseinander, und in der Tasche lagen **zwei** Fackeln. Bezahlt war
 * einmal: Beide Ausfuehrungen lasen denselben Geldstand und schrieben
 * denselben zurueck. Ein Spieler bekommt die Ware also doppelt und zahlt
 * einfach - oder umgekehrt, je nachdem welcher Schreibvorgang gewinnt.
 *
 * **Die Loesung: ein Anspruch je Bitte.** Wer ausfuehren will, ruft es kurz
 * in den Raum („ich nehme Bitte X"), wartet einen Wimpernschlag und fuehrt nur
 * aus, wenn seine Kennung die kleinste aller Meldungen ist. Die Kennung ist je
 * Client zufaellig und bleibt, solange er laeuft - dieselbe Verbindung gewinnt
 * also immer, und es entsteht kein Hin und Her.
 *
 * **Warum kein Herzschlag mit Client-Liste.** Der naheliegende Weg waere, dass
 * alle Clients sich staendig melden und der mit der kleinsten Kennung
 * ausfuehrt. Dann muss man aber entscheiden, wann eine Meldung veraltet ist -
 * und in genau diesem Fenster fuehrt entweder niemand aus (der Gewaehlte ist
 * laengst weg) oder wieder zwei. Ein Anspruch je Bitte kennt das Problem
 * nicht: Es meldet sich, wer in diesem Moment da ist.
 *
 * Der Preis sind {@link WARTE} Millisekunden vor jedem Kauf. Das sieht
 * niemand; die Bestaetigung kommt ohnehin als Meldung und nicht als Fenster.
 */

import { SOCKET } from "./const.js";

/** Diese Verbindung. Zufaellig, und sie bleibt, solange der Tab lebt. */
const KLIENT = foundry.utils.randomID();

/**
 * Wie lange auf die Ansprueche der anderen gewartet wird.
 *
 * Reichlich bemessen fuer eine Runde ueber den Server: Der Anspruch geht zum
 * Server und von dort an die anderen Clients, das ist ein Weg wie jede andere
 * Socket-Nachricht auch. 250 ms halten auch eine Leitung aus, die nicht im
 * selben Haus steht - und sie fallen bei einem Kauf nicht auf.
 */
const WARTE = 250;

/** Bitte -> Kennungen derer, die sie ausfuehren wollen. */
const ansprueche = new Map();

function eintragen(schluessel, klientId) {
  if (!ansprueche.has(schluessel)) {
    ansprueche.set(schluessel, new Set());
    // Wer einen Anspruch hoert, auf den niemand wartet, raeumt ihn selbst weg.
    setTimeout(() => ansprueche.delete(schluessel), 5000);
  }
  ansprueche.get(schluessel).add(klientId);
}

/** Ein fremder Anspruch. Kommt aus socket.js. */
export function aufVorsitz(daten) {
  if (daten?.tat !== "anspruch") return;
  if (!daten.schluessel || !daten.klientId) return;
  eintragen(daten.schluessel, daten.klientId);
}

/**
 * Bin ich die Spielleitung, die ausfuehrt?
 *
 * Zwei Huerden nacheinander: erst Foundrys eigene (bin ich **der** aktive
 * Spielleiter-Benutzer), dann unsere (bin ich unter dessen Verbindungen die
 * erste). Ohne die erste wuerde bei zwei verschiedenen Spielleitungen die
 * zufaellig kleinere Kennung gewinnen statt der, den Foundry ueberall sonst
 * meint.
 *
 * @param {string} schluessel  Kennung der Bitte. Zwei Bitten duerfen sie sich
 *                             nie teilen - sonst nimmt die zweite die Meldungen
 *                             der ersten fuer ihre eigenen.
 * @returns {Promise<boolean>}
 */
export async function darfIchAusfuehren(schluessel) {
  if (!game.user.isGM) return false;
  if (game.users.activeGM?.id !== game.user.id) return false;
  if (!schluessel) return true;   // Ohne Kennung kein Wettstreit: lieber einmal als keinmal.

  eintragen(schluessel, KLIENT);
  game.socket.emit(SOCKET.NAME, {
    typ: SOCKET.VORSITZ, tat: "anspruch", schluessel, klientId: KLIENT
  });

  await new Promise(r => setTimeout(r, WARTE));

  const gemeldet = [...(ansprueche.get(schluessel) ?? [KLIENT])].sort();
  ansprueche.delete(schluessel);
  return gemeldet[0] === KLIENT;
}

/**
 * Die alte, synchrone Frage - fuer Stellen, an denen nichts ausgefuehrt wird.
 *
 * Zum Anzeigen und Verzweigen reicht sie: „Waere ich zustaendig?" Nur wer
 * wirklich etwas schreibt, muss {@link darfIchAusfuehren} abwarten.
 */
export function waereZustaendig() {
  return game.user.isGM && game.users.activeGM?.id === game.user.id;
}

/** Eine Kennung fuer eine Bitte. */
export function bittenKennung() {
  return foundry.utils.randomID();
}
