/**
 * Der Bogen eines Ladens - die Verwaltungsansicht aus Abschnitt 8 des Konzepts.
 *
 * Was die Spielleitung hier tut: einen Laden einrichten, Ware hineinziehen,
 * Preise setzen, Verborgenes verbergen, den Laden vorzeigen. Der Kauf und
 * die Schauansicht kommen in den Schritten 5 und 6 dazu.
 *
 * **Das Hineinziehen ist geerbt, nicht selbst gebaut.** `ActorSheetV2` bringt
 * in v14 einen vollstaendigen Drop-Empfaenger mit (`_onDropItem` in
 * client/applications/sheets/actor-sheet.mjs): Kopie aus dem Kompendium mit
 * `game.items.fromCompendium`, Sortieren innerhalb desselben Akteurs, Rechte-
 * pruefung. Ein zweiter Empfaenger daneben legte jedes Item doppelt an - genau
 * das stand hier in der ersten Fassung. Was bleibt, ist nur die Rueckmeldung
 * beim Darueberziehen.
 *
 * Ob dnd5e ein Item auf einen fremden Untertyp fallen laesst, sichert weiterhin
 * niemand zu (KONZEPT-shops.md, Abschnitt 4). Das entscheidet sich in der Welt.
 */

import { MODULE_ID, LADEN_TYP, WARE, OFFENES_ANGEBOT } from "./const.js";
import { grundpreisCp, preisCp, ankaufCp, alsText, alsMuenzfeld, KUPFERWERT } from "./preise.js";
import { einstellungenOeffnen } from "./laden-einstellungen.js";
import { angebotDialog, angebotSenden, angebotZuruecknehmen } from "./angebot.js";
import { marktbuchOeffnen } from "./marktbuch.js";
import { ladenbuchOeffnen } from "./ladenbuch.js";
import {
  werSieht,
  vorzeigbareBenutzer,
  ladenZeigen,
  ladenSchliessen,
  benutzerWaehlen
} from "./vorzeigen.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** Muenzkuerzel in der Sprache des Clients. */
function kuerzel(sorte) {
  return game.i18n.localize(`SHOPS.Muenze.${sorte}`);
}

export class LadenBogen extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["ninjos-shops", "laden-bogen"],
    position: { width: 780, height: 720 },
    window: { icon: "fa-solid fa-scale-balanced", resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      wareOeffnen: LadenBogen.#wareOeffnen,
      wareLoeschen: LadenBogen.#wareLoeschen,
      wareSchalter: LadenBogen.#wareSchalter,
      einstellungenOeffnen: LadenBogen.#einstellungen,
      wareAnbieten: LadenBogen.#wareAnbieten,
      angebotZurueck: LadenBogen.#angebotZurueck,
      marktbuch: LadenBogen.#marktbuch,
      ladenbuch: LadenBogen.#ladenbuch,
      zeigenAllen: LadenBogen.#zeigenAllen,
      zeigenAuswahl: LadenBogen.#zeigenAuswahl,
      schliessenAllen: LadenBogen.#schliessenAllen,
      schliessenUser: LadenBogen.#schliessenUser
    }
  };

  static PARTS = {
    kopf: { template: `modules/${MODULE_ID}/templates/laden-kopf.hbs` },
    vorzeigen: { template: `modules/${MODULE_ID}/templates/laden-vorzeigen.hbs` },
    ware: {
      template: `modules/${MODULE_ID}/templates/laden-ware.hbs`,
      // Ohne diese Angabe wirft jeder Klick auf einen Schalter die Liste
      // zurueck an den Anfang - bei zwanzig Zeilen faellt das sofort auf.
      scrollable: ["", ".shops-ware"]
    }
  };

  /** @override */
  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const laden = this.document.system;

    return Object.assign(ctx, {
      laden,
      bearbeitbar: this.isEditable,
      istGM: game.user.isGM,
      begruessung: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        laden.begruessung ?? "", { relativeTo: this.document }
      ),
      // Nur noch fuer die Muenzauswahl am Festpreis - die Einstellungen des
      // Ladens stehen seit dem eigenen Fenster in laden-einstellungen.js.
      muenzen: Object.keys(KUPFERWERT).map(sorte => ({
        sorte, kuerzel: kuerzel(sorte), wert: laden.kasse?.[sorte] ?? 0
      })),
      ware: this.#wareAufbereiten(laden),
      zuschauer: werSieht(this.document.uuid).map(u => {
        const angebot = u.getFlag(MODULE_ID, OFFENES_ANGEBOT);
        const passend = angebot?.ladenUuid === this.document.uuid ? angebot : null;
        return {
          id: u.id, name: u.name, active: u.active,
          angebot: passend
            ? { name: this.document.items.get(passend.itemId)?.name ?? "?",
                preisText: alsText(passend.preisCp * passend.menge, kuerzel) }
            : null
        };
      })
    });
  }

  /**
   * Die Auslage, Zeile fuer Zeile.
   *
   * Der Preis steht hier als Anzeige. Beim Kauf wird er beim Spielleiter neu
   * gerechnet - was in einem Fenster steht, ist keine Zusage (Abschnitt 7).
   */
  #wareAufbereiten(laden) {
    return this.document.items.contents
      .map(item => {
        const merkmal = item.flags?.[MODULE_ID] ?? {};
        const grundCp = grundpreisCp(item.system?.price);
        const festCp = Number.isFinite(merkmal[WARE.FESTPREIS]) ? merkmal[WARE.FESTPREIS] : null;
        const feld = alsMuenzfeld(festCp ?? 0);

        return {
          id: item.id,
          name: item.name,
          img: item.img,
          menge: item.system?.quantity ?? 1,
          grundText: alsText(grundCp, kuerzel),
          preisText: alsText(preisCp(grundCp, laden, festCp), kuerzel),
          ankaufText: laden.ankauf > 0 ? alsText(ankaufCp(grundCp, laden), kuerzel) : null,
          hatFestpreis: festCp !== null,
          festWert: feld.value,
          festSorte: feld.denomination,
          hinweis: merkmal[WARE.HINWEIS] ?? "",
          verborgen: merkmal[WARE.VERBORGEN] === true,
          dienst: merkmal[WARE.DIENST] === true,
          ankauf: merkmal[WARE.ANKAUF] === true
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.isEditable) return;

    /*
     * `change` von Hand und nicht ueber `actions`: ApplicationV2 loest
     * `data-action` nur auf `click` aus. Und diese Felder gehoeren nicht ins
     * Formular des Akteurs - sie schreiben auf Gegenstaende, also eigene
     * Dokumente, die das Bogenformular nicht mit abschickt.
     */
    for (const feld of this.element.querySelectorAll("[data-ware-feld]")) {
      feld.addEventListener("change", this.#wareGeaendert.bind(this));
    }

    this.#rueckmeldungEinrichten();
  }

  /**
   * Rueckmeldung beim Darueberziehen - nur die Optik. Das Anlegen selbst
   * macht die geerbte `_onDrop`-Kette; `_onDragOver` ist der Haken, den
   * ActorSheetV2 dafuer bereitstellt.
   *
   * Ohne diese Rueckmeldung ist nicht zu erkennen, ob der Bogen den Wurf
   * ueberhaupt annimmt - und wer einmal ins Leere gezogen hat, versucht es
   * kein zweites Mal.
   */
  _onDragOver(ereignis) {
    super._onDragOver(ereignis);
    this.element.classList.add("shops-zieht");
  }

  #rueckmeldungEinrichten() {
    const ziel = this.element;
    ziel.addEventListener("dragleave", ereignis => {
      if (!ziel.contains(ereignis.relatedTarget)) ziel.classList.remove("shops-zieht");
    });
    ziel.addEventListener("drop", () => ziel.classList.remove("shops-zieht"));
  }

  /** Ein Feld an einer Warenzeile wurde geaendert. */
  async #wareGeaendert(ereignis) {
    const feld = ereignis.currentTarget;
    const zeile = feld.closest("[data-item-id]");
    const item = this.document.items.get(zeile?.dataset.itemId);
    if (!item) return;

    switch (feld.dataset.wareFeld) {
      case "menge":
        return item.update({ "system.quantity": Math.max(0, Number(feld.value) || 0) });

      case "hinweis":
        return item.setFlag(MODULE_ID, WARE.HINWEIS, feld.value.trim());

      /*
       * Zahl und Muenzsorte gehoeren zusammen, stehen aber in zwei Feldern.
       * Gespeichert wird immer der Kupferwert - eine Zahl, kein Paar, das
       * auseinanderlaufen kann.
       *
       * Ein leeres Feld loescht den Festpreis (`null`), eine 0 setzt ihn auf
       * gratis. Das ist ein Unterschied, und er ist gewollt: "kein Festpreis"
       * heisst Aufschlag auf den Grundpreis, "0" heisst geschenkt.
       */
      case "festpreis":
      case "festsorte": {
        const zahlFeld = zeile.querySelector('[data-ware-feld="festpreis"]');
        const sorteFeld = zeile.querySelector('[data-ware-feld="festsorte"]');
        if (zahlFeld.value.trim() === "") return item.unsetFlag(MODULE_ID, WARE.FESTPREIS);
        const cp = grundpreisCp({ value: Number(zahlFeld.value), denomination: sorteFeld.value });
        return item.setFlag(MODULE_ID, WARE.FESTPREIS, cp);
      }
    }
  }

  /* ── Aktionen ────────────────────────────────────────────────────── */

  static async #wareOeffnen(ereignis, ziel) {
    this.document.items.get(ziel.closest("[data-item-id]")?.dataset.itemId)?.sheet?.render(true);
  }

  /**
   * Ware aus der Auslage nehmen.
   *
   * Kein `confirm()` - siehe die Regel in der CLAUDE.md des Workspace. `DialogV2`
   * traegt die Frage in der Ueberschrift und das Verb auf dem Knopf, statt "OK"
   * gegen "Abbrechen" zu stellen.
   */
  static async #wareLoeschen(ereignis, ziel) {
    const item = this.document.items.get(ziel.closest("[data-item-id]")?.dataset.itemId);
    if (!item) return;

    const sicher = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("SHOPS.Bogen.WareLoeschenTitel") },
      content: `<p>${game.i18n.format("SHOPS.Bogen.WareLoeschenFrage", { name: item.name })}</p>`,
      yes: { label: game.i18n.localize("SHOPS.Bogen.WareLoeschenJa"), icon: "fa-solid fa-trash" },
      no: { label: game.i18n.localize("SHOPS.Abbrechen") },
      // Danebenklicken und Escape brechen ab, nie bestaetigen sie.
      defaultYes: false
    });
    if (sicher) await item.delete();
  }

  /** "Verborgen" und "Dienstleistung" umlegen. */
  static async #wareSchalter(ereignis, ziel) {
    const item = this.document.items.get(ziel.closest("[data-item-id]")?.dataset.itemId);
    if (!item) return;
    const merkmal = ziel.dataset.merkmal;
    await item.setFlag(MODULE_ID, merkmal, !(item.flags?.[MODULE_ID]?.[merkmal] === true));
  }

  /** Die Einstellungen dieses Ladens - eigenes Fenster. */
  static #einstellungen() {
    einstellungenOeffnen(this.document);
  }

  /**
   * Eine Ware jemandem zum Sonderpreis hinlegen.
   *
   * Der Weg ist umgekehrt zum gewoehnlichen Kauf: Nicht der Spieler sucht
   * aus und die Spielleitung bestaetigt, sondern die Spielleitung sagt
   * "das hier, fuer so viel". Warum der Preis dabei auf dem Benutzer landet
   * und nicht in der Nachricht, steht in angebot.js.
   */
  static async #wareAnbieten(ereignis, ziel) {
    const item = this.document.items.get(ziel.closest("[data-item-id]")?.dataset.itemId);
    if (!item) return;
    const wahl = await angebotDialog(this.document, item);
    if (!wahl) return;
    await angebotSenden(this.document, item, wahl);
    this.render(false);
  }

  /** Ein Angebot wieder einsammeln. */
  static async #angebotZurueck(ereignis, ziel) {
    const userId = ziel.dataset.userId;
    if (!userId) return;
    await angebotZuruecknehmen(userId);
    this.render(false);
  }

  /** Das Buch dieses Ladens - was hier gehandelt wurde. */
  static #ladenbuch() {
    ladenbuchOeffnen(this.document);
  }

  /** Das Marktbuch aufschlagen. */
  static #marktbuch() {
    marktbuchOeffnen();
  }

  /** Allen aktiven Spielern vorzeigen (ohne Spielleitung). */
  static async #zeigenAllen() {
    const ids = vorzeigbareBenutzer({ inklGm: false }).map(u => u.id);
    if (!ids.length) {
      return ui.notifications.warn(game.i18n.localize("SHOPS.Vorzeigen.NiemandDa"));
    }
    await ladenZeigen(this.document, ids);
    this.render(false);
  }

  /** Dialog: ausgewaehlte Benutzer. */
  static async #zeigenAuswahl() {
    const ids = await benutzerWaehlen(this.document);
    if (!ids?.length) return;
    await ladenZeigen(this.document, ids);
    this.render(false);
  }

  /** Allen Zuschauern dieses Ladens schliessen. */
  static async #schliessenAllen() {
    await ladenSchliessen(this.document.uuid, "alle");
    this.render(false);
  }

  /** Einem einzelnen Zuschauer schliessen. */
  static async #schliessenUser(ereignis, ziel) {
    const userId = ziel.dataset.userId;
    if (!userId) return;
    await ladenSchliessen(this.document.uuid, [userId]);
    this.render(false);
  }
}

/**
 * Den Bogen anmelden. Gehoert in `init`.
 *
 * `makeDefault: true` und die Typenliste sind beides noetig: Ohne den Typ
 * meldete sich der Bogen fuer jeden Akteur an, ohne `makeDefault` bekaeme ein
 * Laden Foundrys Notbogen und die Spielleitung saehe rohe Felder.
 */
export function ladenBogenEinrichten() {
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    Actor, MODULE_ID, LadenBogen,
    { types: [LADEN_TYP], makeDefault: true, label: "SHOPS.Bogen.Name" }
  );
}