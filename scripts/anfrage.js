/**
 * Die Verkaufsanfrage - das Hin und Her um einen Preis.
 *
 * Gebaut wie der Tausch in den In-Person Tools (`scripts/trade.js`), und aus
 * denselben Gruenden. Hier ist es nur ein Schritt mehr.
 *
 * **Die Spielleitung haelt die Wahrheit.** Es gibt genau eine Sitzung, sie
 * liegt auf dem Client der Spielleitung, und beide Seiten zeichnen aus dem
 * Zustand, den sie zurueckschickt. Ein Spieler kann auf einem fremden Akteur
 * ohnehin nichts anlegen - die Regel „keine Spielleitung, kein Handel" wird
 * damit nicht zum Sonderfall, sondern zur Bauweise.
 *
 * **Die Anfrage beschreibt sich selbst.** Sie traegt Namen, Bilder und Mengen
 * mit, nicht nur Kennungen: Die Spielleitung sieht Sachen aus einem fremden
 * Rucksack, und der Spieler soll spaeter genau das wiedererkennen, was er
 * eingepackt hat.
 *
 * **Die Zahlen sieht nur die Spielleitung.** Der uebliche Ankaufswert und der
 * Spielraum darum stehen in der Sitzung, werden aber vor dem Verschicken an
 * den Spieler entfernt. Sonst haette er beim Feilschen die Karten des
 * Haendlers auf dem Tisch liegen - und die Verhandlung waere keine mehr.
 *
 * **Jede Aenderung setzt die Zusage zurueck.** Wer packt, nachdem die
 * Spielleitung einen Preis genannt hat, verhandelt neu.
 *
 * **Das Gegenueber muss kein Laden sein.** Anfangs war es einer, und die
 * Sitzung hiess entsprechend `ladenUuid`. Dann kam der Handel mit Leuten ohne
 * Laden dazu (handel.js) - und dessen Rueckweg ist Zeile fuer Zeile dasselbe:
 * Der Spieler packt zusammen, die Spielleitung nennt einen Preis, beide sagen
 * ja oder nein. Zwei Verhandlungen nebeneinander zu bauen hiesse, jede
 * kuenftige Aenderung zweimal zu machen und die zweite beim ersten Mal zu
 * vergessen. Deshalb heisst es hier `gegenueber`, und nur an zwei Stellen wird
 * gefragt, ob es ein Laden ist: bei den Zahlen und beim Ausfuehren.
 */

import { MODULE_ID, SOCKET, LADEN_TYP } from "./const.js";
import { darfIchAusfuehren, waereZustaendig, bittenKennung } from "./vorsitz.js";
import { grundpreisCp, ankaufCp, alsText } from "./preise.js";
import { fuehreAnkaufAus } from "./verkauf.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Die Zustaende, die eine Anfrage durchlaeuft. */
export const ZUSTAND = {
  GEPACKT: "gepackt",       // Der Spieler hat abgeschickt, die Spielleitung ist dran
  VORSCHLAG: "vorschlag",   // Die Spielleitung hat einen Preis genannt
  ANGENOMMEN: "angenommen",
  ABGELEHNT: "abgelehnt",
  ZURUECKGEZOGEN: "zurueckgezogen"
};

const VORBEI = [ZUSTAND.ANGENOMMEN, ZUSTAND.ABGELEHNT, ZUSTAND.ZURUECKGEZOGEN];

/**
 * Was eine Person ohne Laden ueblicherweise zahlt, als Faktor auf den
 * Grundpreis.
 *
 * Ein Laden hat dafuer ein Feld (`ankauf`), das im Werkszustand **0** ist -
 * „kauft nichts an", damit kein Dorf ungefragt alles aufkauft. Eine Person
 * hat kein solches Feld, und 0 waere hier die falsche Antwort: Die
 * Spielleitung hat den Handel gerade selbst eroeffnet, will also handeln. Sie
 * bekaeme nur drei Nullen hingelegt und muesste den Preis aus dem Nichts
 * greifen.
 *
 * Die Haelfte ist die Zahl, die am Tisch ohnehin fällt. Sie ist ein
 * **Vorschlag**, kein Preis: Was am Ende gilt, tippt die Spielleitung.
 */
const PERSON_ANKAUF = 0.5;

/** Offene Anfragen. Nur auf dem Client der Spielleitung gefuellt. */
const sitzungen = new Map();

/** Was dieser Client gerade zeigt. */
let meine = null;

/** Wird gerufen, wenn sich `meine` aendert - die Fenster zeichnen daraufhin neu. */
let beiAenderung = () => {};

export function anfrageBeobachten(fn) { beiAenderung = fn ?? (() => {}); }
export function eigeneAnfrage() { return meine; }
export function offeneAnfragen() { return [...sitzungen.values()]; }

/**
 * Fuehrt dieser Client aus?
 *
 * Zum Anzeigen und Verzweigen reicht die synchrone Frage; wer schreibt, wartet
 * den Anspruch ab. Der Grund steht in vorsitz.js: Zwei Tabs derselben
 * Spielleitung sind beide `activeGM`.
 */
const istZustaendig = waereZustaendig;

/**
 * Eine Bitte an die Spielleitung.
 *
 * Sie geht **immer** ueber den Socket - auch wenn der Absender selbst die
 * Spielleitung ist. Der eigene Socket kommt nie zurueck, deshalb laeuft der
 * Anspruch daneben lokal mit. So durchlaufen alle Bitten denselben Weg, und
 * die Sitzung landet bei genau einer Verbindung.
 */
function anDieSpielleitung(nachricht) {
  const paket = {
    typ: SOCKET.ANFRAGE, ...nachricht, von: game.user.id, bitteId: bittenKennung()
  };
  game.socket.emit(SOCKET.NAME, paket);
  if (game.user.isGM) beiSpielleitungWennGewaehlt(paket);
}

/** Ausfuehren, wenn diese Verbindung den Anspruch gewinnt. */
async function beiSpielleitungWennGewaehlt(paket) {
  if (!await darfIchAusfuehren(paket.bitteId)) return;
  beiSpielleitung(paket);
}

/* ── Was ein Spieler tut ───────────────────────────────────────────── */

/**
 * Eine Anfrage abschicken.
 *
 * @param {Actor} gegenueber  Ein Laden oder eine Person
 * @param {Actor} figur
 * @param {{itemId: string, menge: number}[]} posten
 */
export function anfrageStellen(gegenueber, figur, posten) {
  anDieSpielleitung({
    tat: "stellen",
    gegenueberUuid: gegenueber.uuid,
    figurUuid: figur.uuid,
    posten: posten.map(p => ({ itemId: p.itemId, menge: Math.max(1, Math.floor(p.menge || 1)) }))
  });
}

/** Den Vorschlag der Spielleitung annehmen oder ablehnen. */
export function aufVorschlagAntworten(id, ja) {
  anDieSpielleitung({ tat: ja ? "annehmen" : "ablehnen", id });
}

/** Die eigene Anfrage zurueckziehen. */
export function anfrageZurueckziehen(id) {
  anDieSpielleitung({ tat: "zurueckziehen", id });
}

/* ── Was die Spielleitung tut ──────────────────────────────────────── */

/**
 * Einen Preis vorschlagen.
 *
 * **Null ist kein Preis.** Ein Vorschlag ueber nichts nimmt dem Spieler sein
 * Stueck und gibt ihm nichts dafuer - und weil der Knopf „Preis nennen" heisst
 * und nicht „einziehen", waere das eine Falle. Der direkte Ankauf weist einen
 * Wert von 0 aus demselben Grund ab (`SHOPS.Verkauf.Wertlos`), und was dort
 * gilt, gilt hier auch. Wer etwas geschenkt bekommen soll, bekommt es
 * geschenkt - dafuer braucht es keinen Handel.
 */
export function preisVorschlagen(id, preisCp, satz = "") {
  if (!istZustaendig()) return;
  if (!(Math.round(preisCp) > 0)) {
    return void ui.notifications.warn(game.i18n.localize("SHOPS.Anfrage.NullIstKeinPreis"));
  }
  beiSpielleitung({ tat: "vorschlagen", id, preisCp, satz, von: game.user.id });
}

/** Eine Anfrage rundheraus ablehnen. */
export function anfrageAbweisen(id, satz = "") {
  if (!istZustaendig()) return;
  beiSpielleitung({ tat: "abweisen", id, satz, von: game.user.id });
}

/* ── Die eine Stelle, an der entschieden wird ──────────────────────── */

async function beiSpielleitung(paket) {
  if (!istZustaendig()) return;
  const { tat, von } = paket;

  if (tat === "stellen") return void anfrageAufnehmen(paket);

  const sitzung = sitzungen.get(paket.id);
  if (!sitzung) return;

  switch (tat) {
    case "vorschlagen":
      sitzung.zustand = ZUSTAND.VORSCHLAG;
      sitzung.angebotCp = Math.max(0, Math.round(paket.preisCp) || 0);
      sitzung.satz = String(paket.satz ?? "").slice(0, 200);
      break;

    case "abweisen":
      sitzung.zustand = ZUSTAND.ABGELEHNT;
      sitzung.satz = String(paket.satz ?? "").slice(0, 200);
      break;

    case "zurueckziehen":
      // Nur der eigene Antragsteller darf das.
      if (sitzung.spielerId !== von) return;
      sitzung.zustand = ZUSTAND.ZURUECKGEZOGEN;
      break;

    case "ablehnen":
      if (sitzung.spielerId !== von) return;
      sitzung.zustand = ZUSTAND.ABGELEHNT;
      break;

    case "annehmen": {
      if (sitzung.spielerId !== von) return;
      if (sitzung.zustand !== ZUSTAND.VORSCHLAG) return;
      const ergebnis = await fuehreAnkaufAus(sitzung);
      sitzung.zustand = ergebnis.ok ? ZUSTAND.ANGENOMMEN : ZUSTAND.ABGELEHNT;
      sitzung.ergebnis = ergebnis;
      break;
    }

    default: return;
  }

  verteilen(sitzung);
  if (VORBEI.includes(sitzung.zustand)) sitzungen.delete(sitzung.id);
}

/**
 * Eine neue Anfrage aufnehmen und die Zahlen dazu ausrechnen.
 *
 * Hier entstehen die drei Werte, die **nur die Spielleitung** sieht: der
 * uebliche Ankaufswert und der Spielraum darum. Das Modul kennt keine
 * Laune und keine Beziehung - es rechnet nur aus, was oben und unten
 * vertretbar waere, und ueberlaesst die Entscheidung dem Tisch. Alles andere
 * waere eine Wirtschaftssimulation, und die ist ausdruecklich nicht gewollt.
 */
async function anfrageAufnehmen({ gegenueberUuid, figurUuid, posten, von }) {
  const gegenueber = await fromUuid(gegenueberUuid);
  const figur = await fromUuid(figurUuid);
  const spieler = game.users.get(von);
  if (!gegenueber || !figur || !spieler) return;

  /*
   * Ein Laden hat eine Ankaufspolitik, eine Person hat keine. Das sind die
   * beiden einzigen Stellen im Ablauf, an denen der Unterschied zaehlt - der
   * Rest der Verhandlung ist derselbe.
   */
  const istLaden = gegenueber.type === LADEN_TYP;
  const politik = istLaden
    ? gegenueber.system
    : { ankauf: PERSON_ANKAUF, spielraum: 0.25 };

  // Eine Anfrage je Spieler. Eine zweite ersetzt die erste - aus demselben
  // Grund, aus dem es nur einen offenen Laden gibt.
  for (const [id, alt] of sitzungen) {
    if (alt.spielerId === von) { alt.zustand = ZUSTAND.ZURUECKGEZOGEN; verteilen(alt); sitzungen.delete(id); }
  }

  const zeilen = [];
  for (const p of posten) {
    const item = figur.items.get(p.itemId);
    if (!item) continue;
    const menge = Math.min(Math.max(1, p.menge), Number(item.system?.quantity ?? 1));
    const grundCp = grundpreisCp(item.system?.price);
    zeilen.push({
      itemId: item.id,
      name: item.name,
      img: item.img,
      menge,
      // Nur fuer die Spielleitung - wird vor dem Versand an den Spieler entfernt.
      grundCp,
      ueblichCp: ankaufCp(grundCp, politik) * menge
    });
  }
  if (!zeilen.length) return;

  const ueblichCp = zeilen.reduce((s, z) => s + z.ueblichCp, 0);
  const spielraum = politik.spielraum ?? 0.25;

  const sitzung = {
    id: foundry.utils.randomID(),
    gegenueberUuid, gegenueberName: gegenueber.name, istLaden,
    figurUuid, figurName: figur.name,
    spielerId: von, spielerName: spieler.name,
    posten: zeilen,
    zustand: ZUSTAND.GEPACKT,
    angebotCp: null,
    satz: "",
    // Die drei Zahlen, die nur die Spielleitung sieht.
    ueblichCp,
    untenCp: Math.max(0, Math.floor(ueblichCp * (1 - spielraum))),
    obenCp: Math.ceil(ueblichCp * (1 + spielraum))
  };

  sitzungen.set(sitzung.id, sitzung);
  verteilen(sitzung);

  ui.notifications.info(game.i18n.format("SHOPS.Anfrage.Eingegangen", {
    spieler: spieler.name, anzahl: zeilen.length
  }));
}

/**
 * Die Sitzung an den Spieler schicken - **ohne** die Zahlen der Spielleitung.
 *
 * Nicht bloss ausgeblendet: entfernt. Was ueber den Socket geht, liegt im
 * Speicher des Spieler-Clients, und eine Zeile in der Konsole genuegte, um den
 * Spielraum des Haendlers zu lesen.
 */
function verteilen(sitzung) {
  const fuerSpieler = foundry.utils.deepClone(sitzung);
  delete fuerSpieler.ueblichCp;
  delete fuerSpieler.untenCp;
  delete fuerSpieler.obenCp;
  for (const zeile of fuerSpieler.posten) { delete zeile.grundCp; delete zeile.ueblichCp; }

  game.socket.emit(SOCKET.NAME, { typ: SOCKET.ANFRAGE, tat: "zustand", sitzung: fuerSpieler });

  // Der eigene Socket kommt nie zurueck. Die Spielleitung sieht ohnehin die
  // vollstaendige Sitzung, also wird sie hier von Hand gesetzt.
  uebernehmen(foundry.utils.deepClone(sitzung), true);
}

/** Empfang auf jedem Client. */
function uebernehmen(sitzung, alsSpielleitung = false) {
  const meins = sitzung.spielerId === game.user.id;
  if (!meins && !alsSpielleitung && !game.user.isGM) return;

  if (meins) {
    meine = { ...sitzung, vorbei: VORBEI.includes(sitzung.zustand) };
  }
  beiAenderung(meine, sitzung);
}

/** Eine erledigte Anfrage wegraeumen. */
export function anfrageWegraeumen() {
  meine = null;
  beiAenderung(null, null);
}

/** Einstiegspunkt aus socket.js. */
export function aufAnfrage(paket) {
  if (paket.tat === "zustand") return uebernehmen(paket.sitzung);
  beiSpielleitungWennGewaehlt(paket);
}

/** Lesbare Zahlen fuer die Anzeige. */
export function alsGeld(cp) {
  return alsText(cp ?? 0, kuerzel);
}
