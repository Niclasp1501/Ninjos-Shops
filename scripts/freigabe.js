/**
 * Kaufwuensche, die auf ein Ja warten.
 *
 * **Was vorher fehlte.** Der Kaufmodus `freigabe` stand im Datenmodell, im
 * Einstellungsfenster und als Satz im Bestaetigungsdialog des Spielers - „Dieser
 * Laden gibt jeden Kauf erst nach Bestaetigung der Spielleitung frei". Nur
 * passiert ist nichts: Der Kauf lief durch wie im Modus `direkt`. Am 06.09.2026
 * im Zwei-Client-Test nachgemessen; der Satz war eine Behauptung.
 *
 * **Wie es jetzt laeuft.** Die Bitte kommt wie immer bei der Spielleitung an,
 * und sie wird auch wie immer vollstaendig geprueft - Bestand, Hoechstmenge,
 * Geld. Was daran scheitert, scheitert sofort und ohne jemanden zu fragen: Es
 * waere unhoeflich, die Spielleitung ueber einen Kauf entscheiden zu lassen,
 * der ohnehin nicht geht. Nur was durchginge, legt sich hier ab und wartet.
 *
 * **Ein Angebot braucht keine Freigabe.** Wer einen Preis genannt hat, hat
 * bereits zugestimmt; noch einmal zu fragen waere albern.
 *
 * **Der Speicher ist fluechtig.** Die Liste liegt im Arbeitsspeicher genau der
 * Verbindung, die den Kauf aufgenommen hat - so wie die Verhandlungen in
 * anfrage.js. Laedt die Spielleitung neu, sind offene Kaufwuensche weg und der
 * Spieler muss noch einmal klicken. Das ist der bewusste Preis dafuer, dass
 * nichts davon in der Welt gespeichert wird: Ein Kaufwunsch ist eine Frage im
 * Raum, kein Dokument.
 */

import { KAUFMODUS, SOCKET } from "./const.js";
import { alsText } from "./preise.js";
import { schreibeFreigabe } from "./marktbuch.js";
import { buchen } from "./ladenbuch.js";
import { pruefeKauf, fuehreKaufAus } from "./kauf.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Offene Kaufwuensche. Nur auf der ausfuehrenden Verbindung gefuellt. */
const wartend = new Map();

/** Wird gerufen, wenn sich etwas aendert - das Fenster zeichnet daraufhin neu. */
let beiAenderung = () => {};

export function freigabeBeobachten(fn) { beiAenderung = fn ?? (() => {}); }
export function offeneFreigaben() { return [...wartend.values()]; }

/**
 * Braucht dieser Kauf ein Ja?
 *
 * @param {Actor} laden
 * @param {number|null} angebotCp  Der zugesagte Preis, falls es einer ist.
 */
export function brauchtFreigabe(laden, angebotCp) {
  return laden?.system?.kaufmodus === KAUFMODUS.FREIGABE && angebotCp === null;
}

/**
 * Eine Bitte annehmen und liegen lassen.
 *
 * @returns {Promise<{ok: boolean, wartet?: boolean, grund?: string, text?: string}>}
 *          Die Antwort an den Spieler - entweder „liegt beim Haendler" oder
 *          der Grund, aus dem es schon jetzt nicht geht.
 */
export async function freigabeAufnehmen(bitte) {
  const laden = await fromUuid(bitte.ladenUuid);
  const item = laden?.items?.get(bitte.itemId);
  const figur = await fromUuid(bitte.figurUuid);
  const kaeufer = game.users.get(bitte.kaeuferId);

  /*
   * Vollstaendig pruefen, bevor jemand gefragt wird. Ein Kauf, der am Geld
   * oder am Bestand scheitert, scheitert jetzt - nicht erst, nachdem die
   * Spielleitung ihn freigegeben hat und der Spieler zwei Minuten gewartet
   * hat.
   */
  const pruefung = pruefeKauf({ laden, item, figur, menge: bitte.menge, angebotCp: null });
  if (!pruefung.ok) return { ok: false, grund: pruefung.grund, fehltCp: pruefung.fehltCp };

  // Eine zweite Bitte desselben Spielers zum selben Stueck ersetzt die erste.
  for (const [id, alt] of wartend) {
    if (alt.spielerId === bitte.kaeuferId && alt.itemId === bitte.itemId
        && alt.ladenUuid === bitte.ladenUuid) wartend.delete(id);
  }

  const id = foundry.utils.randomID();
  wartend.set(id, {
    id,
    bitte,
    ladenUuid: bitte.ladenUuid,
    ladenName: laden.name,
    itemId: bitte.itemId,
    itemName: item.name,
    img: item.img || null,
    menge: pruefung.stueck,
    dienst: pruefung.dienst,
    summeCp: pruefung.summeCp,
    summeText: alsText(pruefung.summeCp, kuerzel),
    spielerId: bitte.kaeuferId,
    spielerName: kaeufer?.name ?? "?",
    figurName: figur.name,
    zeit: Date.now()
  });

  beiAenderung(wartend.get(id));
  return { ok: true, wartet: true, text: game.i18n.format("SHOPS.Freigabe.Wartet", {
    menge: pruefung.stueck, name: item.name, laden: laden.name
  }) };
}

/**
 * Ja sagen - und den Kauf jetzt wirklich ausfuehren.
 *
 * Die Bitte wird dabei **nicht** noch einmal umgerechnet: `fuehreKaufAus`
 * prueft ohnehin alles von vorn, und zwar mit dem Stand von jetzt. Zwischen
 * der Frage und dem Ja kann der Bestand gesunken oder das Geld ausgegeben
 * worden sein; dann scheitert es dort, wo es hingehoert.
 */
export async function freigabeErteilen(id) {
  const eintrag = wartend.get(id);
  if (!eintrag) return;
  wartend.delete(id);
  beiAenderung(null);

  /*
   * **Wer freigegeben hat, gehoert ins Buch.** Der Kauf selbst schreibt seine
   * Zeile gleich danach - dort steht der Haendler als Gegenueber, und das ist
   * richtig so. Wer das Ja gegeben hat, ist eine andere Auskunft: Bei drei
   * Spielleitungen am Tisch beantwortet sie „wer hat das durchgewinkt".
   * Deshalb eine eigene Zeile davor und nicht ein Feld daneben.
   */
  const laden = await fromUuid(eintrag.ladenUuid);
  await schreibeFreigabe({ laden, eintrag, ok: true, wer: game.user.name });

  const ergebnis = await fuehreKaufAus(eintrag.bitte);
  antworten(eintrag.spielerId, ergebnis);
  return ergebnis;
}

/** Nein sagen. Ein Satz dazu ist freiwillig und steht in der Meldung. */
export async function freigabeAblehnen(id, satz = "") {
  const eintrag = wartend.get(id);
  if (!eintrag) return;
  wartend.delete(id);
  beiAenderung(null);

  const gesagt = String(satz ?? "").trim().slice(0, 200);

  /*
   * **Ein Nein wird aufgeschrieben.** Vorher stand von einer Ablehnung
   * nirgends etwas - fuer den Spieler war sie eine Meldung, die verschwand,
   * und drei Wochen spaeter wusste niemand mehr, dass sie stattgefunden hat.
   * „Wir haben doch damals gefragt" ist am Tisch eine echte Frage.
   */
  const laden = await fromUuid(eintrag.ladenUuid);
  await schreibeFreigabe({ laden, eintrag, ok: false, wer: game.user.name, satz: gesagt });

  /*
   * Auch ins Ladenbuch, denn das ist das Buch, das der Spieler aufschlaegt.
   * Ein **Ja** steht dort nicht eigens: Die Kaufzeile folgt einen Wimpernschlag
   * spaeter und sagt dasselbe.
   */
  await buchen(laden, {
    art: "abgelehnt",
    userId: eintrag.spielerId, userName: eintrag.spielerName,
    figurName: eintrag.figurName,
    was: [{ name: eintrag.itemName, menge: eintrag.menge }],
    summeCp: 0, satz: gesagt || null
  });

  antworten(eintrag.spielerId, {
    ok: false,
    grundText: gesagt || game.i18n.localize("SHOPS.Freigabe.Abgelehnt")
  });
}

/** Alles wegraeumen, was zu diesem Laden gehoert. */
export function freigabenWegraeumen(ladenUuid) {
  let etwas = false;
  for (const [id, eintrag] of wartend) {
    if (eintrag.ladenUuid === ladenUuid) { wartend.delete(id); etwas = true; }
  }
  if (etwas) beiAenderung(null);
}

/** Das Ergebnis zum Spieler bringen - auch, wenn er selbst die Spielleitung ist. */
function antworten(spielerId, ergebnis) {
  game.socket.emit(SOCKET.NAME, { typ: SOCKET.ANTWORT, an: [spielerId], ergebnis });
  if (spielerId === game.user.id) {
    import("./socket.js").then(m => m.aufAntwort({ an: [spielerId], ergebnis }));
  }
}
