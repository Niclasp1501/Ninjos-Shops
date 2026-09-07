/**
 * Die zwei Fenster der Verkaufsanfrage.
 *
 * **Packen** beim Spieler: Was soll der Laden nehmen, und wie viel davon.
 * **Verhandeln** bei der Spielleitung: Was ist es wert, und was biete ich.
 *
 * Beide zeichnen aus derselben Sitzung (`anfrage.js`) - die Spielleitung sieht
 * dabei drei Zahlen mehr, weil ihre Fassung der Sitzung sie enthaelt. Der
 * Spieler bekommt sie gar nicht erst geschickt; ausgeblendete Zahlen stuenden
 * im Speicher seines Clients und waeren mit einer Zeile in der Konsole zu
 * lesen.
 */

import { MODULE_ID } from "./const.js";
import { verkaufbareSachen } from "./verkauf.js";
import {
  ZUSTAND, anfrageStellen, aufVorschlagAntworten, anfrageZurueckziehen,
  preisVorschlagen, anfrageAbweisen, anfrageBeobachten, eigeneAnfrage,
  offeneAnfragen, anfrageWegraeumen, alsGeld
} from "./anfrage.js";
import {
  offeneFreigaben, freigabeErteilen, freigabeAblehnen, freigabeBeobachten
} from "./freigabe.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/* ── Packen: das Fenster des Spielers ──────────────────────────────── */

export class AnfragePacken extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-packen`,
    classes: ["ninjos-shops", "shops-packen"],
    position: { width: 520, height: 620 },
    window: { icon: "fa-solid fa-hand-holding", resizable: true },
    actions: {
      abschicken: AnfragePacken.#abschicken,
      zuruecknehmen: AnfragePacken.#zuruecknehmen,
      annehmen: AnfragePacken.#annehmen,
      ablehnen: AnfragePacken.#ablehnen,
      schliessen: AnfragePacken.#schliessen
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/anfrage-packen.hbs`, scrollable: [".shops-packliste"] }
  };

  /** Ein Laden oder eine Person - dem Packen ist das gleich. */
  #gegenueber;
  #figur;
  /** itemId -> Menge. Was gerade im Korb liegt. */
  #korb = new Map();

  constructor(gegenueber, figur, options = {}) {
    super(options);
    this.#gegenueber = gegenueber;
    this.#figur = figur;
  }

  get title() {
    return game.i18n.format("SHOPS.Anfrage.PackenTitel", { laden: this.#gegenueber?.name ?? "" });
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const laufend = eigeneAnfrage();
    const meine = laufend && laufend.gegenueberUuid === this.#gegenueber?.uuid ? laufend : null;

    return Object.assign(ctx, {
      gegenueberName: this.#gegenueber?.name,
      figurName: this.#figur?.name,
      anfrage: meine,
      wartet: meine?.zustand === ZUSTAND.GEPACKT,
      vorschlag: meine?.zustand === ZUSTAND.VORSCHLAG,
      vorbei: meine?.vorbei ?? false,
      abgelehnt: meine?.zustand === ZUSTAND.ABGELEHNT,
      angenommen: meine?.zustand === ZUSTAND.ANGENOMMEN,
      preisText: meine?.angebotCp != null ? alsGeld(meine.angebotCp) : null,
      // Solange nichts laeuft, wird gepackt.
      sachen: meine ? [] : verkaufbareSachen(this.#figur).map(item => ({
        id: item.id,
        name: item.name,
        img: item.img,
        habe: Number(item.system?.quantity ?? 1),
        drin: this.#korb.get(item.id) ?? 0
      })),
      korbLeer: this.#korb.size === 0
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);

    /*
     * Die Mengen von Hand: Ein Formular waere hier fehl am Platz, weil nichts
     * gespeichert wird - der Korb lebt nur, bis abgeschickt ist.
     */
    for (const feld of this.element.querySelectorAll("[data-korb]")) {
      feld.addEventListener("change", () => {
        const id = feld.closest("[data-item-id]")?.dataset.itemId;
        const menge = Math.max(0, Math.floor(Number(feld.value) || 0));
        if (!id) return;
        if (menge > 0) this.#korb.set(id, menge);
        else this.#korb.delete(id);
        this.render(false);
      });
    }
  }

  static #abschicken() {
    if (!this.#korb.size) return ui.notifications.warn(game.i18n.localize("SHOPS.Anfrage.KorbLeer"));
    anfrageStellen(this.#gegenueber, this.#figur,
      [...this.#korb].map(([itemId, menge]) => ({ itemId, menge })));
    this.#korb.clear();
    this.render(false);
  }

  static #zuruecknehmen() {
    const meine = eigeneAnfrage();
    if (meine) anfrageZurueckziehen(meine.id);
  }

  static #annehmen() {
    const meine = eigeneAnfrage();
    if (meine) aufVorschlagAntworten(meine.id, true);
  }

  static #ablehnen() {
    const meine = eigeneAnfrage();
    if (meine) aufVorschlagAntworten(meine.id, false);
  }

  static #schliessen() {
    anfrageWegraeumen();
    this.close();
  }
}

/* ── Verhandeln: das Fenster der Spielleitung ──────────────────────── */

export class AnfrageVerhandeln extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-verhandeln`,
    classes: ["ninjos-shops", "shops-verhandeln"],
    /*
     * Breiter als frueher: Bei 560 brach der Name eines Stuecks nach zwei
     * Dritteln ab, und die beiden Eingabefelder standen zu eng nebeneinander.
     * fensterpassen.js deckelt die Breite auf kleinen Schirmen wieder.
     */
    position: { width: 660, height: "auto" },
    window: { icon: "fa-solid fa-scale-balanced", resizable: true },
    actions: {
      bieten: AnfrageVerhandeln.#bieten,
      abweisen: AnfrageVerhandeln.#abweisen,
      uebernehmen: AnfrageVerhandeln.#uebernehmen,
      freigeben: AnfrageVerhandeln.#freigeben,
      kaufAblehnen: AnfrageVerhandeln.#kaufAblehnen
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/anfrage-verhandeln.hbs`, scrollable: [".shops-anfrageliste"] }
  };

  get title() { return game.i18n.localize("SHOPS.Anfrage.TresenTitel"); }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const { PREIS_SORTEN } = await import("./preise.js");
    return Object.assign(ctx, {
      muenzsorten: PREIS_SORTEN.map(sorte => ({
        sorte, kuerzel: game.i18n.localize(`SHOPS.Muenze.${sorte}`)
      })),
      freigaben: offeneFreigaben(),
      anfragen: offeneAnfragen().map(s => ({
        ...s,
        wartet: s.zustand === ZUSTAND.GEPACKT,
        vorgeschlagen: s.zustand === ZUSTAND.VORSCHLAG,
        ueblichText: alsGeld(s.ueblichCp),
        untenText: alsGeld(s.untenCp),
        obenText: alsGeld(s.obenCp),
        angebotText: s.angebotCp != null ? alsGeld(s.angebotCp) : null,
        // Kein Preis am Stueck heisst: kein Spielraum zum Anzeigen.
        ohneWert: !(s.untenCp || s.ueblichCp || s.obenCp),
        posten: s.posten.map(p => ({ ...p, wertText: alsGeld(p.ueblichCp) }))
      }))
    });
  }

  /** Einen der drei Vorschlagswerte ins Feld schreiben. */
  static async #uebernehmen(ereignis, ziel) {
    const kasten = ziel.closest("[data-anfrage-id]");
    const feld = kasten?.querySelector("[data-preis]");
    const sorte = kasten?.querySelector("[data-sorte]");
    if (!feld) return;
    /*
     * Die drei Vorschlagswerte stehen in Kupfer. Frueher landete diese Zahl
     * roh im Goldfeld - aus 50 Kupfer wurden 50 Gold. Jetzt wird sie in die
     * groesste glatt aufgehende Sorte zerlegt, wie beim Festpreis.
     */
    const { alsMuenzfeld } = await import("./preise.js");
    const feldwert = alsMuenzfeld(Number(ziel.dataset.wert) || 0);
    feld.value = feldwert.value;
    if (sorte) sorte.value = feldwert.denomination;
  }

  static async #bieten(ereignis, ziel) {
    const kasten = ziel.closest("[data-anfrage-id]");
    const id = kasten?.dataset.anfrageId;
    const satz = kasten?.querySelector("[data-satz]")?.value ?? "";
    if (!id) return;
    // Zahl und Muenzsorte - das Modul rechnet in Kupfer.
    const { ausMuenzfeld } = await import("./preise.js");
    preisVorschlagen(id, ausMuenzfeld(
      kasten.querySelector("[data-preis]")?.value,
      kasten.querySelector("[data-sorte]")?.value ?? "gp"), satz);
    this.render(false);
  }

  /** Ja zu einem Kaufwunsch. */
  static async #freigeben(ereignis, ziel) {
    const kasten = ziel.closest("[data-freigabe-id]");
    const id = kasten?.dataset.freigabeId;
    if (!id) return;
    await freigabeErteilen(id);
    this.render(false);
  }

  /** Nein zu einem Kaufwunsch - der Satz daneben geht als Begruendung mit. */
  static #kaufAblehnen(ereignis, ziel) {
    const kasten = ziel.closest("[data-freigabe-id]");
    const id = kasten?.dataset.freigabeId;
    if (!id) return;
    freigabeAblehnen(id, kasten.querySelector("[data-satz]")?.value ?? "");
    this.render(false);
  }

  static #abweisen(ereignis, ziel) {
    const kasten = ziel.closest("[data-anfrage-id]");
    const id = kasten?.dataset.anfrageId;
    if (id) anfrageAbweisen(id, kasten.querySelector("[data-satz]")?.value ?? "");
    this.render(false);
  }
}

/* ── Beide Fenster am Zustand haengen ──────────────────────────────── */

let packen = null;
let verhandeln = null;

/**
 * Das Packfenster oeffnen.
 *
 * @param {Actor} gegenueber  Ein Laden oder eine Person ohne Laden
 * @param {Actor} figur
 */
export function packenOeffnen(gegenueber, figur) {
  if (packen?.rendered) packen.close();
  packen = new AnfragePacken(gegenueber, figur);
  packen.render(true);
  return packen;
}

/**
 * Das Verhandlungsfenster der Spielleitung oeffnen.
 *
 * **`render(true)` allein reicht nicht.** Steht das Fenster schon offen,
 * bleibt es liegen, wo es liegt - und lag es hinter dem Ladenbogen, hat die
 * Spielleitung die Anfrage nicht gesehen. Genau so passiert am 06.09.2026:
 * Der Spieler wartete auf eine Antwort, die niemand bemerkt hatte.
 * Deshalb ausklappen, nach vorn holen, und sagen, dass etwas da ist.
 */
export async function verhandelnOeffnen(sitzung = null, kaufwunsch = null) {
  verhandeln ??= new AnfrageVerhandeln();
  /*
   * **Auf das Zeichnen warten.** `render` ist asynchron; wer direkt danach
   * `bringToFront()` ruft, greift auf ein Fenster zu, das es noch nicht gibt -
   * `Cannot read properties of undefined (reading 'style')`. Beim ersten
   * Aufmachen war das jedes Mal so.
   */
  await verhandeln.render(true);
  if (verhandeln.minimized) verhandeln.maximize();
  verhandeln.bringToFront();
  if (sitzung) ui.notifications.info(game.i18n.format("SHOPS.Anfrage.Eingegangen", {
    spieler: sitzung.spielerName ?? "", anzahl: sitzung.posten?.length ?? 0
  }));
  if (kaufwunsch) ui.notifications.info(game.i18n.format("SHOPS.Freigabe.Eingegangen", {
    spieler: kaufwunsch.spielerName, menge: kaufwunsch.menge,
    name: kaufwunsch.itemName, preis: kaufwunsch.summeText
  }));
  return verhandeln;
}

/**
 * Beim Zustandswechsel neu zeichnen - und der Spielleitung ungefragt das
 * Fenster aufmachen.
 *
 * Eine Anfrage, die nur als Meldung vorbeihuscht, geht am Tisch unter: Der
 * Spieler wartet dann auf eine Antwort, die niemand gesehen hat.
 */
export function anfrageFensterEinrichten() {
  /*
   * Ein Kaufwunsch im Modus „freigabe" ist genauso dringend wie eine
   * Verkaufsanfrage: Der Spieler wartet, bis jemand hinsieht.
   */
  freigabeBeobachten(eintrag => {
    if (!game.user.isGM) return;
    if (eintrag) verhandelnOeffnen(null, eintrag);
    else verhandeln?.render(false);
  });

  anfrageBeobachten((meine, sitzung) => {
    packen?.render(false);

    if (!game.user.isGM) return;
    if (sitzung?.zustand === ZUSTAND.GEPACKT) verhandelnOeffnen(sitzung);
    else verhandeln?.render(false);
  });
}
