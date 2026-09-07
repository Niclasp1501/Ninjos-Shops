/**
 * Die Kasse: bezahlen und herausgeben.
 *
 * Die gefaehrlichste Datei des Moduls, und die einzige mit eigenen Tests
 * (tools/kasse.test.mjs). Hier verschwindet sonst irgendwann jemandes Geld, und
 * zwar so, dass es erst drei Sitzungen spaeter auffaellt.
 *
 * **Zwei Regeln, aus denen alles Uebrige folgt.**
 *
 * *Nichts anfassen, bevor feststeht, dass es reicht.* Die Funktion rechnet den
 * ganzen Vorgang durch und gibt einen fertigen neuen Bestand zurueck - oder
 * `null`. Sie veraendert den uebergebenen Bestand nie. Ein halb bezahlter Kauf
 * kann so gar nicht entstehen.
 *
 * *Ein Platinstueck muss einen Dolch kaufen koennen.* Wer 1 pp hat und einen
 * Dolch fuer 2 gp will, bezahlt und bekommt heraus. Genau daran scheitern die
 * einfachen Loesungen, die nur schauen, ob genug Goldstuecke da sind.
 *
 * Kein Foundry-Zugriff. Zahlen rein, Zahlen raus.
 */

import { KUPFERWERT, SORTEN_AUFSTEIGEND, WECHSELGELD_SORTEN, zerlege } from "./preise.js";

/**
 * Was jemand insgesamt hat, in Kupfer.
 *
 * @param {object} bestand  `system.currency`, also `{ pp, gp, ep, sp, cp }`
 */
export function vermoegenCp(bestand) {
  return SORTEN_AUFSTEIGEND.reduce(
    (summe, s) => summe + (Number(bestand?.[s]) || 0) * KUPFERWERT[s], 0
  );
}

/**
 * Bezahlen, mit Wechselgeld.
 *
 * Der Ablauf, und warum er so herum laeuft:
 *
 * 1. **Reicht es ueberhaupt?** Wenn nicht, sofort `null` - vor jeder Rechnerei.
 * 2. **Von unten nach oben zahlen.** Erst das Kleingeld, dann die groesseren
 *    Muenzen. Das haelt den Beutel sortiert: Wer immer mit Gold zahlt, hat
 *    irgendwann nur noch Kupfer und Platin.
 * 3. **Reicht das Kleingeld nicht, wird die naechste Muenze aufgebrochen.**
 *    Es gibt sie immer, wenn Schritt 1 durchging - der Beweis steht unten am
 *    Ende dieser Datei.
 * 4. **Herausgeben, groesste Muenze zuerst**, aber nie in Elektrum.
 *
 * @param {object} bestand  wird nicht veraendert
 * @param {number} betragCp
 * @returns {?{bestand: object, gezahlt: object, zurueck: object}}
 *          `null`, wenn das Geld nicht reicht
 */
export function bezahle(bestand, betragCp) {
  const betrag = Math.max(0, Math.round(Number(betragCp) || 0));
  const habe = {};
  for (const s of SORTEN_AUFSTEIGEND) habe[s] = Math.max(0, Number(bestand?.[s]) || 0);

  if (vermoegenCp(habe) < betrag) return null;
  if (betrag === 0) return { bestand: habe, gezahlt: {}, zurueck: {} };

  const gezahlt = {};
  let rest = betrag;

  // Schritt 2: von der kleinsten Sorte aufwaerts, aber nie mehr als noetig.
  for (const s of SORTEN_AUFSTEIGEND) {
    if (rest <= 0) break;
    const nehmen = Math.min(habe[s], Math.floor(rest / KUPFERWERT[s]));
    if (nehmen > 0) { gezahlt[s] = nehmen; rest -= nehmen * KUPFERWERT[s]; }
  }

  // Schritt 3: der Rest ist kleiner als jede noch vorhandene Muenze. Also die
  // kleinste davon aufbrechen - kleinste, damit nicht das Platinstueck dran
  // glauben muss, wenn ein Silberling genuegt.
  let ueberzahlt = 0;
  if (rest > 0) {
    const passend = SORTEN_AUFSTEIGEND.find(
      s => habe[s] - (gezahlt[s] ?? 0) > 0 && KUPFERWERT[s] >= rest
    );
    // Kann nach der Pruefung in Schritt 1 nicht eintreten. Trotzdem nicht
    // stillschweigend falsch weiterrechnen.
    if (!passend) return null;
    gezahlt[passend] = (gezahlt[passend] ?? 0) + 1;
    ueberzahlt = KUPFERWERT[passend] - rest;
    rest = 0;
  }

  const zurueck = ueberzahlt > 0 ? zerlege(ueberzahlt, WECHSELGELD_SORTEN) : {};

  const neu = { ...habe };
  for (const [s, n] of Object.entries(gezahlt)) neu[s] -= n;
  for (const [s, n] of Object.entries(zurueck)) neu[s] += n;

  return { bestand: neu, gezahlt, zurueck };
}

/**
 * Geld gutschreiben - fuer den Ankauf, wenn ein Laden ihn erlaubt.
 *
 * Ohne Elektrum, aus demselben Grund wie beim Wechselgeld.
 */
export function schreibeGut(bestand, betragCp) {
  const neu = {};
  for (const s of SORTEN_AUFSTEIGEND) neu[s] = Math.max(0, Number(bestand?.[s]) || 0);
  for (const [s, n] of Object.entries(zerlege(betragCp, WECHSELGELD_SORTEN))) neu[s] += n;
  return neu;
}

/**
 * Bestimmte Muenzen aus einem Bestand nehmen - Stueck fuer Stueck, ohne zu
 * wechseln.
 *
 * Das ist etwas anderes als {@link bezahle}: Wer drei Silberlinge auf den
 * Tisch legt, legt drei Silberlinge hin und kein Goldstueck, das zu 97 Kupfer
 * herausgegeben wird. Fehlt auch nur eine Muenze der verlangten Sorte, gibt es
 * `null` - halb hinlegen gibt es nicht.
 *
 * @returns {?object} neuer Bestand, oder `null`
 */
export function muenzenAbziehen(bestand, muenzen) {
  const neu = {};
  for (const s of SORTEN_AUFSTEIGEND) neu[s] = Math.max(0, Number(bestand?.[s]) || 0);
  for (const [s, n] of Object.entries(muenzen ?? {})) {
    const anzahl = Math.max(0, Math.floor(Number(n) || 0));
    if (!anzahl) continue;
    if (!(s in neu) || neu[s] < anzahl) return null;
    neu[s] -= anzahl;
  }
  return neu;
}

/** Dieselben Muenzen woanders dazulegen. Keine Umrechnung, kein Wechseln. */
export function muenzenDazu(bestand, muenzen) {
  const neu = {};
  for (const s of SORTEN_AUFSTEIGEND) neu[s] = Math.max(0, Number(bestand?.[s]) || 0);
  for (const [s, n] of Object.entries(muenzen ?? {})) {
    const anzahl = Math.max(0, Math.floor(Number(n) || 0));
    if (anzahl && s in neu) neu[s] += anzahl;
  }
  return neu;
}

/*
 * Warum Schritt 3 immer eine Muenze findet:
 *
 * Nach Schritt 2 ist `rest > 0` nur moeglich, wenn fuer jede Sorte entweder
 * alle Muenzen aufgebraucht sind oder ihr Wert groesser als `rest` ist. Waeren
 * alle aufgebraucht, waere das gesamte Vermoegen kleiner als der Betrag - das
 * hat Schritt 1 ausgeschlossen. Also bleibt mindestens eine Sorte uebrig, und
 * fuer die gilt `KUPFERWERT[s] > rest`. Genau danach sucht `passend`.
 */
