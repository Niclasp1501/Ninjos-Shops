/**
 * Preise, in Kupfer gerechnet.
 *
 * **Alles ist eine ganze Zahl Kupfermuenzen.** Gold ist nur eine Anzeigeform.
 * Das ist die Entscheidung, an der ein Laden steht oder faellt: Wer in Gold mit
 * Nachkommastellen rechnet, hat irgendwann jemanden, dem 0,30000000000000004
 * Gold fehlen, und findet die Stelle nie wieder.
 *
 * **`system.price.valueInGP` wird nicht benutzt.** dnd5e rechnet es in
 * `data/item/templates/physical-item.mjs:251` als
 * `Math.floor(value * defaultCurrency.conversion / conversion)` - fuer eine
 * Kerze zu 1 cp ergibt das `Math.floor(0.01)`, also **null**. Alles unter einem
 * Goldstueck laese sich damit als geschenkt. Das Feld ist fuer eine Kasse
 * unbrauchbar; hier wird selbst umgerechnet.
 *
 * Die Funktionen hier fassen kein Foundry-Dokument an und schreiben nichts.
 * Sie bekommen Zahlen und geben Zahlen zurueck, damit sie ohne laufende Welt
 * geprueft werden koennen - siehe tools/kasse.test.mjs.
 */

/**
 * Wert einer Muenze in Kupfer.
 *
 * `CONFIG.DND5E.currencies[x].conversion` sagt, **wie viele davon ein Goldstueck
 * sind** (pp 0.1, gp 1, ep 2, sp 10, cp 100). Der Kupferwert ist also
 * 100 geteilt durch diese Zahl.
 *
 * Die Tabelle steht hier fest und wird nicht aus CONFIG gelesen: Ein Modul, das
 * die Muenzwerte veraendert, veraendert damit auch, was ein bereits gesetzter
 * Festpreis bedeutet - und ein Festpreis, der sich hinter dem Ruecken des
 * Spielleiters aendert, ist schlimmer als eine Tabelle, die nachgezogen werden
 * muss. Weicht ein Tisch davon ab, gehoert das hierher, sichtbar.
 */
export const KUPFERWERT = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };

/** Muenzsorten, von der kleinsten zur groessten. */
export const SORTEN_AUFSTEIGEND = ["cp", "sp", "ep", "gp", "pp"];

/**
 * Wechselgeld wird nie in Elektrum herausgegeben.
 *
 * Viele Tische benutzen es nicht und wissen mit einer ep im Beutel nichts
 * anzufangen. Angenommen wird es trotzdem, wenn es da ist - nur zurueck kommt
 * es nicht.
 */
export const WECHSELGELD_SORTEN = ["pp", "gp", "sp", "cp"];

/**
 * Grundpreis eines Gegenstands in Kupfer.
 *
 * @param {object} preis  `system.price`, also `{ value, denomination }`
 * @returns {number} ganzzahlig, 0 wenn kein Preis gesetzt ist
 */
export function grundpreisCp(preis) {
  const wert = Number(preis?.value ?? 0);
  if (!Number.isFinite(wert) || wert <= 0) return 0;
  const muenze = KUPFERWERT[preis?.denomination] ?? KUPFERWERT.gp;
  return Math.round(wert * muenze);
}

/**
 * Was der Gegenstand in diesem Laden kostet.
 *
 * Ein Festpreis schlaegt den Aufschlag - dafuer ist er da. Sonst wird
 * **aufgerundet**: Ein Haendler mit 20 % Aufschlag rundet zu seinen Gunsten,
 * und ein Preis von null durch Abrunden waere schlimmer als ein Kupferstueck
 * zu viel.
 *
 * @param {number} grundCp
 * @param {object} laden      das Ladenmerkmal
 * @param {?number} festpreisCp
 * @returns {number} ganzzahlig
 */
export function preisCp(grundCp, laden, festpreisCp = null) {
  if (Number.isFinite(festpreisCp) && festpreisCp >= 0) return Math.round(festpreisCp);
  const aufschlag = Number(laden?.aufschlag ?? 1);
  if (!Number.isFinite(aufschlag) || aufschlag <= 0) return grundCp;
  return Math.ceil(grundCp * aufschlag);
}

/**
 * Was der Haendler beim Ankauf zahlt.
 *
 * Hier wird **abgerundet**, aus demselben Grund, aus dem oben aufgerundet wird:
 * Der Haendler rundet zu seinen Gunsten. Ein Ankaufsfaktor von 0 heisst "kauft
 * nichts an" und ist der Werkszustand.
 */
export function ankaufCp(grundCp, laden) {
  const faktor = Number(laden?.ankauf ?? 0);
  if (!Number.isFinite(faktor) || faktor <= 0) return 0;
  return Math.floor(grundCp * faktor);
}

/**
 * Kupfer in Muenzen zerlegen, groesste zuerst.
 *
 * @param {number} cp
 * @param {string[]} sorten  welche Muenzen benutzt werden duerfen
 * @returns {object} z.B. `{ gp: 2, sp: 5 }` - Sorten mit 0 fehlen
 */
export function zerlege(cp, sorten = WECHSELGELD_SORTEN) {
  const raus = {};
  let rest = Math.max(0, Math.round(cp));
  for (const s of [...sorten].sort((a, b) => KUPFERWERT[b] - KUPFERWERT[a])) {
    const anzahl = Math.floor(rest / KUPFERWERT[s]);
    if (anzahl > 0) { raus[s] = anzahl; rest -= anzahl * KUPFERWERT[s]; }
  }
  return raus;
}

/**
 * Muenzsorten, in denen **Preise** genannt werden.
 *
 * **Kein Platin.** Am Tisch sagt niemand „ein Platin zwei Gold" - man sagt
 * zwoelf Gold. Die Zerlegung tat es trotzdem: Wer im Handelsfenster „12 GM"
 * eintippte, bei dem las der Spieler „1 PM 2 GM", und beim Heiltrank stand
 * „7 PM 5 GM" statt fuenfundsiebzig Gold. Gerechnet wird weiter in Kupfer,
 * und **im Beutel** bleibt Platin natuerlich liegen, wo es liegt - nur
 * genannt wird ein Preis in Gold, Silber und Kupfer.
 *
 * Elektrum fehlt aus dem alten Grund: Viele Tische benutzen es nicht.
 */
export const PREIS_SORTEN = ["gp", "sp", "cp"];

/**
 * Preis als lesbare Zeile: "2 gp 5 sp".
 *
 * Bewusst mehrteilig statt "2,5 gp". Am Tisch wird in Muenzen bezahlt, und wer
 * "2,5 Gold" liest, muss selbst umrechnen, was er hinlegt.
 *
 * @param {number} cp
 * @param {(sorte: string) => string} [kuerzel]  Uebersetzung der Muenzsorte
 * @param {string[]} [sorten]  welche Muenzen vorkommen duerfen
 */
export function alsText(cp, kuerzel = s => s, sorten = PREIS_SORTEN) {
  if (!cp) return `0 ${kuerzel("cp")}`;
  const teile = zerlege(cp, sorten);
  return Object.entries(teile).map(([s, n]) => `${n} ${kuerzel(s)}`).join(" ");
}

/**
 * Kupfer in ein Eingabefeld zerlegen: die groesste Muenze, die glatt aufgeht.
 *
 * Der Festpreis wird intern in Kupfer gehalten - aber niemand tippt fuer eine
 * Plattenruestung `150000` ein. Der Bogen zeigt deshalb Zahl und Muenzsorte,
 * so wie dnd5e den Grundpreis auch fuehrt, und rechnet beim Speichern zurueck.
 *
 * Gewaehlt wird die **groesste glatt teilende** Sorte: 200 cp werden zu
 * `2 gp`, nicht zu `20 sp`; 205 cp bleiben `205 cp`, weil jede groessere Sorte
 * einen Rest liesse und `20 sp 5 cp` nicht in ein Feld passt. Elektrum kommt
 * hier nicht vor - aus demselben Grund wie beim Wechselgeld.
 *
 * @param {number} cp
 * @returns {{value: number, denomination: string}}
 */
export function alsMuenzfeld(cp) {
  const betrag = Math.max(0, Math.round(Number(cp) || 0));
  if (betrag === 0) return { value: 0, denomination: "gp" };
  for (const s of ["pp", "gp", "sp"]) {
    if (betrag % KUPFERWERT[s] === 0) return { value: betrag / KUPFERWERT[s], denomination: s };
  }
  return { value: betrag, denomination: "cp" };
}
