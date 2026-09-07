/**
 * Das Spielerfenster - die Listenansicht aus Abschnitt 8 des Konzepts.
 *
 * Zeigt die Auslage (ohne Verborgenes), Preise, die eigene Boerse, ein
 * offenes Angebot der Spielleitung und den Kaufknopf.
 *
 * **Hier bewegt sich kein Geld.** Der Knopf schickt eine Bitte an die
 * Spielleitung, die alles noch einmal von vorn prueft und ausfuehrt
 * (KONZEPT-shops.md, Abschnitt 7). Was hier steht, ist eine Anzeige, kein
 * Vertrag - zwischen dem Zeichnen und dem Klick kann der Aufschlag sich
 * geaendert haben oder die Ware weg sein.
 *
 * Pro Client gibt es nur eines: Ein neuer Laden ersetzt den vorherigen
 * (Entscheidung 3 im Konzept).
 */

import { MODULE_ID, WARE, KAUFMODUS, SOCKET } from "./const.js";
import { grundpreisCp, preisCp, alsText, KUPFERWERT } from "./preise.js";
import { vermoegenCp } from "./kasse.js";
import { eigenesAngebot } from "./angebot.js";
import { verkaufslisteAufbereiten } from "./verkauf.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Welche Figur handelt an diesem Client?
 *
 * Wie in den In-Person Tools: zugewiesener Charakter, sonst der einzige
 * besessene. Zwei oder mehr ohne Zuweisung sind mehrdeutig.
 */
export function eigeneFigur() {
  if (game.user.character) return game.user.character;
  const eigene = game.actors.filter(a =>
    a.type === "character" && a.testUserPermission(game.user, "OWNER")
  );
  return eigene.length === 1 ? eigene[0] : null;
}

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Das eine Fenster dieses Clients. */
let offen = null;

export class SpielerFenster extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-spieler`,
    classes: ["ninjos-shops", "spieler-fenster"],
    position: { width: 580, height: 660 },
    window: {
      icon: "fa-solid fa-scale-balanced",
      resizable: true,
      controls: [
        { icon: "fa-solid fa-scroll", label: "SHOPS.Buch.Knopf", action: "ladenbuch" }
      ]
    },
    actions: {
      kaufen: SpielerFenster.#kaufen,
      wareAnsehen: SpielerFenster.#wareAnsehen,
      verkaufen: SpielerFenster.#verkaufen,
      anfrageStellen: SpielerFenster.#anfrage,
      ladenbuch: SpielerFenster.#ladenbuch,
      angebotAnnehmen: SpielerFenster.#angebotAnnehmen,
      blickWechseln: SpielerFenster.#blickWechseln
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/spieler-fenster.hbs`,
      scrollable: [".shops-spieler-ware"]
    }
  };

  /** @type {Actor} */
  #laden;

  /**
   * „kaufen" oder „verkaufen" - welche Absicht gerade dran ist.
   *
   * Zwei Listen untereinander liessen das Fenster wachsen, sobald der Spieler
   * etwas dabeihatte, und machten dabei die Auslage kleiner: Man sah weniger
   * Ware, weil man mehr besass. Zwei Knoepfe trennen die Absichten, und beide
   * Listen bekommen die ganze Hoehe.
   */
  #blick = "kaufen";

  constructor(laden, options = {}) {
    super(options);
    this.#laden = laden;
  }

  get laden() { return this.#laden; }
  get ladenUuid() { return this.#laden?.uuid; }

  /** Frischen Akteur setzen (STAND / Reload). */
  ladenSetzen(laden) { this.#laden = laden; }

  /** @override */
  get title() {
    return this.#laden?.name ?? game.i18n.localize("SHOPS.Spieler.Titel");
  }

  /** @override */
  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const laden = this.#laden;
    const system = laden.system;

    const figur = eigeneFigur();
    const angebot = eigenesAngebot(laden.uuid);
    const angebotsWare = angebot ? laden.items.get(angebot.itemId) : null;

    return Object.assign(ctx, {
      ladenName: laden.name,
      kopfbild: laden.img,
      kopfFokus: system.kopfFokus ?? 50,
      haendler: system.haendlerUuid ? fromUuidSync(system.haendlerUuid) : null,
      begruessung: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.begruessung ?? "", { relativeTo: laden, secrets: false }
      ),
      blick: this.#blick,
      zeigtKaufen: this.#blick === "kaufen",
      zeigtVerkaufen: this.#blick === "verkaufen",
      ware: this.#wareAufbereiten(system),
      boerse: this.#boerseAufbereiten(figur),
      figurName: figur?.name ?? null,
      gesperrt: system.kaufmodus === KAUFMODUS.GESPERRT,
      freigabe: system.kaufmodus === KAUFMODUS.FREIGABE,
      keinSpielleiter: !game.users.activeGM,
      /*
       * Die eigene Habe steht nur da, wenn der Laden ueberhaupt ankauft -
       * `system.ankauf` ist ab Werk 0. Eine leere Liste "Verkaufen" unter
       * jedem Laden waere ein Versprechen, das die meisten nicht halten.
       */
      verkauf: verkaufslisteAufbereiten(laden, figur),
      kauftAn: laden.system.ankauf > 0,
      angebot: angebot && angebotsWare ? {
        ...angebot, name: angebotsWare.name, img: angebotsWare.img,
        // Als fertiger Wahrheitswert, nicht als Vergleich in der Vorlage:
        // Handlebars kennt keinen Groesser-Vergleich, und ein fehlender
        // Helfer wirft dort nicht, er liefert still nichts.
        mehrere: angebot.menge > 1
      } : null
    });
  }

  /**
   * Sichtbare Auslage: Verborgenes raus, Dienste gekennzeichnet.
   *
   * `bezahlbar` entscheidet nur ueber die Beschriftung des Knopfes. Die
   * Wahrheit liegt bei der Spielleitung; hier soll niemand nur raten muessen,
   * warum nichts passiert.
   */
  #wareAufbereiten(system) {
    const figur = eigeneFigur();
    const habeCp = figur ? vermoegenCp(figur.system?.currency ?? {}) : 0;

    return this.#laden.items.contents
      .filter(item => item.flags?.[MODULE_ID]?.[WARE.VERBORGEN] !== true)
      .map(item => {
        const merkmal = item.flags?.[MODULE_ID] ?? {};
        const grundCp = grundpreisCp(item.system?.price);
        const festCp = Number.isFinite(merkmal[WARE.FESTPREIS]) ? merkmal[WARE.FESTPREIS] : null;
        const dienst = merkmal[WARE.DIENST] === true;
        const menge = item.system?.quantity ?? 1;
        const preis = preisCp(grundCp, system, festCp);

        return {
          id: item.id,
          name: item.name,
          img: item.img,
          menge,
          preisText: alsText(preis, kuerzel),
          hinweis: merkmal[WARE.HINWEIS] ?? "",
          /*
           * Eben noch unter der Theke, jetzt in der Auslage. Eine Stunde lang
           * traegt das Stueck die Marke - lange genug fuer die Szene, in der
           * es hervorgeholt wurde, und kurz genug, dass nicht der halbe Laden
           * dauerhaft „neu" heisst.
           */
          frisch: Number.isFinite(merkmal[WARE.HERVORGEHOLT])
            && (Date.now() - merkmal[WARE.HERVORGEHOLT]) < 3600000,
          dienst,
          ausverkauft: !dienst && menge <= 0,
          zuTeuer: !!figur && habeCp < preis
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  }

  /** Eigene Boerse als Muenzzeilen, oder null wenn keine Figur. */
  #boerseAufbereiten(figur) {
    if (!figur) return null;
    const geld = figur.system?.currency ?? {};
    /*
     * **Leere Sorten fallen weg.** Vorher stand dort „9 PM 968 GM 0 EM 9 SM
     * 0 KM" - zwei Nullen mitten in der eigenen Habe, die man jedes Mal
     * ueberlesen muss. Wer nichts in Elektrum hat, hat kein Elektrum.
     */
    const alle = Object.keys(KUPFERWERT).map(sorte => ({
      sorte, kuerzel: kuerzel(sorte), wert: Number(geld[sorte] ?? 0) || 0
    }));
    const gefuellt = alle.filter(m => m.wert > 0);
    // Ganz ohne Geld bleibt eine Null stehen, sonst waere die Zeile leer.
    return gefuellt.length ? gefuellt : [alle.find(m => m.sorte === "gp")];
  }

  /** Zwischen Kaufen und Verkaufen umschalten. */
  static #blickWechseln(ereignis, ziel) {
    const wohin = ziel.dataset.blick;
    if (!wohin || wohin === this.#blick) return;
    this.#blick = wohin;
    this.render(false);
  }

  /* ── Aktionen ────────────────────────────────────────────────────── */

  /** Kaufen: fragt nach, dann geht die Bitte an die Spielleitung. */
  /**
   * Ein Stueck aus der Naehe ansehen.
   *
   * Der Weg, den es bisher nicht gab: Wer wissen will, was ein Stueck kann,
   * hat im Regal nur eine Zeile. Die Beschreibung steht am Gegenstand - und
   * der gehoert dem Laden, also kann der Spieler seinen Bogen nicht oeffnen.
   */
  static async #wareAnsehen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    const { wareAnsehen } = await import("./ware-ansehen.js");
    wareAnsehen(this.#laden, itemId);
  }

  static async #kaufen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    const item = this.#laden.items.get(itemId);
    if (!item) return;
    await this.#bitteSenden(item, 1, null);
  }

  /**
   * Etwas aus dem eigenen Rucksack an den Laden geben.
   *
   * Derselbe Weg wie beim Kauf, nur andersherum: Die Bitte geht an die
   * Spielleitung, die alles noch einmal prueft. Der Preis wird auch hier dort
   * neu gerechnet - was hier steht, ist eine Anzeige.
   */
  static async #verkaufen(ereignis, ziel) {
    const figur = eigeneFigur();
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    const item = figur?.items.get(itemId);
    if (!item) return;
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("SHOPS.Kauf.KeinSpielleiter"));

    const zeile = verkaufslisteAufbereiten(this.#laden, figur).find(z => z.id === itemId);
    const inhalt = `
      <div class="shops-kaufdialog">
        <p>${game.i18n.format("SHOPS.Verkauf.Frage", {
          name: foundry.utils.escapeHTML(item.name),
          preis: zeile?.preisText ?? "?",
          laden: foundry.utils.escapeHTML(this.#laden.name)
        })}</p>
      </div>`;

    const sicher = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("SHOPS.Verkauf.Titel") },
      classes: ["ninjos-shops"],
      content: inhalt,
      yes: { label: game.i18n.localize("SHOPS.Verkauf.Ja"), icon: "fa-solid fa-hand-holding" },
      no: { label: game.i18n.localize("SHOPS.Abbrechen") },
      defaultYes: false
    });
    if (!sicher) return;

    const bitte = {
      typ: SOCKET.VERKAUFEN,
      ladenUuid: this.#laden.uuid,
      itemId: item.id,
      figurUuid: figur.uuid,
      menge: 1,
      verkaeuferId: game.user.id,
      // Woran die Spielleitungen erkennen, dass sie dieselbe Bitte meinen.
      bitteId: foundry.utils.randomID()
    };

    if (game.user.isGM) {
      const { fuehreVerkaufAus } = await import("./verkauf.js");
      const { aufAntwort } = await import("./socket.js");
      aufAntwort({ an: [game.user.id], ergebnis: await fuehreVerkaufAus(bitte) });
      return;
    }
    game.socket.emit(SOCKET.NAME, bitte);
  }

  /**
   * Eine Verkaufsanfrage stellen.
   *
   * Der Weg fuer alles, was der Laden nicht ohne Frage nimmt: Der Spieler
   * packt zusammen, die Spielleitung nennt einen Preis, er nimmt an oder
   * nicht. Gebaut wie der Tausch in den In-Person Tools - siehe anfrage.js.
   */
  static async #anfrage() {
    const figur = eigeneFigur();
    if (!figur) return ui.notifications.warn(game.i18n.localize("SHOPS.Kauf.KeineFigur"));
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("SHOPS.Kauf.KeinSpielleiter"));
    const { packenOeffnen } = await import("./anfrage-fenster.js");
    packenOeffnen(this.#laden, figur);
  }

  /** Das eigene Buch bei diesem Laden. */
  static async #ladenbuch() {
    const { ladenbuchOeffnen } = await import("./ladenbuch.js");
    ladenbuchOeffnen(this.#laden);
  }

  /** Ein Angebot annehmen - Menge und Preis stehen fest. */
  static async #angebotAnnehmen() {
    const angebot = eigenesAngebot(this.#laden.uuid);
    const item = angebot ? this.#laden.items.get(angebot.itemId) : null;
    if (!item) return;
    await this.#bitteSenden(item, angebot.menge, angebot);
  }

  /**
   * Rueckfrage und Absenden.
   *
   * **Warum ueberhaupt gefragt wird:** Die Karten liegen dicht untereinander,
   * der Knopf ist klein, und ein Fehlgriff kostet das Geld einer Figur. Kein
   * `confirm()` - siehe die Regel in der CLAUDE.md des Workspace: eigener
   * Dialog, die Frage in der Ueberschrift, das Verb auf dem Knopf.
   */
  async #bitteSenden(item, menge, angebot) {
    const figur = eigeneFigur();
    if (!figur) return ui.notifications.warn(game.i18n.localize("SHOPS.Kauf.KeineFigur"));
    if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("SHOPS.Kauf.KeinSpielleiter"));

    const system = this.#laden.system;
    const merkmal = item.flags?.[MODULE_ID] ?? {};
    const einzelCp = angebot
      ? angebot.preisCp
      : preisCp(grundpreisCp(item.system?.price), system,
                Number.isFinite(merkmal[WARE.FESTPREIS]) ? merkmal[WARE.FESTPREIS] : null);
    const summeCp = einzelCp * menge;
    const habeCp = vermoegenCp(figur.system?.currency ?? {});

    const inhalt = `
      <div class="shops-kaufdialog">
        <p>${game.i18n.format("SHOPS.Kauf.Frage", {
          menge, name: foundry.utils.escapeHTML(item.name),
          preis: alsText(summeCp, kuerzel), figur: foundry.utils.escapeHTML(figur.name)
        })}</p>
        <p class="shops-blockhinweis">${game.i18n.format("SHOPS.Kauf.Danach", {
          rest: alsText(Math.max(0, habeCp - summeCp), kuerzel)
        })}</p>
        ${system.kaufmodus === KAUFMODUS.FREIGABE && !angebot
          ? `<p class="shops-blockhinweis">${game.i18n.localize("SHOPS.Kauf.BrauchtFreigabe")}</p>` : ""}
      </div>`;

    const sicher = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("SHOPS.Kauf.Titel") },
      classes: ["ninjos-shops"],
      content: inhalt,
      yes: { label: game.i18n.localize("SHOPS.Kauf.Ja"), icon: "fa-solid fa-hand-holding" },
      no: { label: game.i18n.localize("SHOPS.Abbrechen") },
      // Danebenklicken und Escape brechen ab, nie bestaetigen sie.
      defaultYes: false
    });
    if (!sicher) return;

    const bitte = {
      typ: SOCKET.KAUFEN,
      ladenUuid: this.#laden.uuid,
      itemId: item.id,
      figurUuid: figur.uuid,
      menge,
      kaeuferId: game.user.id,
      // Siehe vorsitz.js: Ohne diese Kennung kauft eine doppelt angemeldete
      // Spielleitung zweimal ein und derselben Bitte.
      bitteId: foundry.utils.randomID()
    };

    /*
     * Ist die Spielleitung dieser Client selbst, geht nichts ueber den Socket
     * - der kommt nie zum Absender zurueck. Dann wird direkt ausgefuehrt.
     */
    if (game.user.isGM) {
      const { fuehreKaufAus } = await import("./kauf.js");
      const { aufAntwort } = await import("./socket.js");
      const ergebnis = await fuehreKaufAus(bitte);
      aufAntwort({ an: [game.user.id], ergebnis });
      return;
    }
    game.socket.emit(SOCKET.NAME, bitte);
  }

  /**
   * @override
   *
   * **Wer selbst zumacht, will es zubehalten.** Bis hierher raeumte `close`
   * nur die Variable oben weg; das Merkmal `OFFENER_LADEN` blieb stehen, und
   * beim naechsten Neuladen stellte `offenenLadenWiederherstellen` das Fenster
   * wieder hin. Man klickte es weg und es kam zurueck.
   *
   * Geloescht wird das Merkmal trotzdem nicht: Es beantwortet eine andere
   * Frage - **wem die Spielleitung den Laden gezeigt hat**. Daran haengen ihre
   * Zuschauerliste und der Weg, ein weggeklicktes Fenster ueber den
   * Zugangsknopf zurueckzuholen (zugaenge.js). Beides waere weg, wenn ein
   * Klick aufs Kreuz den Laden fuer beendet erklaerte.
   *
   * Stattdessen merkt sich **dieses Geraet**, dass hier zugemacht wurde. Am
   * Tablet weggeklickt heisst nicht am Rechner weggeklickt.
   */
  async close(options = {}) {
    if (offen === this) offen = null;
    // `force` setzt nur das Modul selbst: die Spielleitung macht zu, oder ein
    // anderer Laden nimmt den Platz ein. Das ist keine Entscheidung des Spielers.
    if (!options.force) wegklickenMerken(this.ladenUuid);
    return super.close(options);
  }
}

/* ── Weggeklickt: eine Notiz auf diesem Geraet ─────────────────────── */

const WEGGEKLICKT = `${MODULE_ID}:weggeklickt`;

/**
 * `localStorage` kann werfen - privates Fenster, gesperrte Seitendaten. Ein
 * Laden, der sich einmal zu viel oeffnet, ist besser als ein Client, der beim
 * Hochfahren aussteigt.
 */
function wegklickenMerken(ladenUuid) {
  if (!ladenUuid) return;
  try { window.localStorage.setItem(WEGGEKLICKT, ladenUuid); } catch { /* egal */ }
}

function wegklickenVergessen() {
  try { window.localStorage.removeItem(WEGGEKLICKT); } catch { /* egal */ }
}

/** Wurde genau dieser Laden auf diesem Geraet weggeklickt? */
export function wurdeWeggeklickt(ladenUuid) {
  try { return window.localStorage.getItem(WEGGEKLICKT) === ladenUuid; }
  catch { return false; }
}

/**
 * Spielerfenster oeffnen. Ein zweites ersetzt das erste.
 *
 * Aufmachen hebt das Wegklicken auf - egal ob die Spielleitung den Laden neu
 * vorzeigt oder der Spieler ihn selbst wieder holt. Sonst kaeme er einmal und
 * beim naechsten Neuladen nicht mehr.
 */
export function spielerFensterOeffnen(laden) {
  wegklickenVergessen();
  if (offen) {
    if (offen.ladenUuid === laden.uuid) {
      offen.ladenSetzen(laden);
      offen.render(true);
      return offen;
    }
    offen.close({ force: true });
    offen = null;
  }
  offen = new SpielerFenster(laden);
  offen.render(true);
  return offen;
}

/** Fenster schliessen, falls offen. */
export function spielerFensterSchliessen() {
  if (!offen) return;
  offen.close({ force: true });
  offen = null;
}

/** Offenes Fenster dieses Ladens aktualisieren (STAND). */
export function spielerFensterAktualisieren(laden) {
  if (!offen || offen.ladenUuid !== laden.uuid) {
    spielerFensterOeffnen(laden);
    return;
  }
  offen.ladenSetzen(laden);
  offen.render(false);
}

export function spielerFensterIstOffen() {
  return !!offen;
}
