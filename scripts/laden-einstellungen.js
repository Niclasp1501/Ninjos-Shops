/**
 * Die Einstellungen eines Ladens - ein eigenes Fenster.
 *
 * **Warum nicht mehr im Bogen.** Sie standen dort in einem aufklappbaren
 * Block, und aufgeklappt fuellten sie das halbe Fenster: sieben Felder mit je
 * zwei Zeilen Erklaerung, darunter kam die Auslage kaum noch vor. Eingestellt
 * wird ein Laden einmal, angesehen wird er jede Sitzung - das Verhaeltnis war
 * verkehrt herum. Hier stehen sie fuer sich, mit Platz fuer die Begruendungen,
 * und der Bogen zeigt wieder das, wofuer man ihn oeffnet.
 *
 * `DocumentSheetV2` und nicht ein eigenes Formular: Damit uebernimmt Foundry
 * das Speichern, die Rechtepruefung und - wichtig fuer die beiden Bilder - die
 * Aktion `editImage`, die den Dateiwaehler oeffnet und den Pfad zurueckschreibt.
 */

import { MODULE_ID, SETTINGS, KAUFMODUS, LADEN_BILD } from "./const.js";
import { KUPFERWERT } from "./preise.js";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

/** Die drei Zugriffsarten. Die Werte stehen so auch im Datenmodell. */
const ZUGRIFF = ["niemand", "auswahl", "alle"];

/**
 * Die Begruessung als schlichter Text fuers Eingabefeld.
 *
 * Das Feld ist ein `HTMLField`, der gespeicherte Wert traegt deshalb
 * `<p>...</p>` - im Eingabefeld stand das roh da und sah aus wie ein Fehler.
 * Ein bis zwei Saetze brauchen keine Auszeichnung; wer sie doch einmal
 * einsetzt, verliert sie beim naechsten Bearbeiten. Das ist der Preis dafuer,
 * dass das Feld aussieht wie ein Textfeld und nicht wie Quelltext.
 */
function alsSchlichterText(html) {
  if (!html) return "";
  const mitUmbruch = String(html)
    .replace(/<\/(p|div|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const hilf = document.createElement("div");
  hilf.innerHTML = mitUmbruch;
  return (hilf.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export class LadenEinstellungen extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["ninjos-shops", "laden-einstellungen"],
    position: { width: 580, height: "auto" },
    window: { icon: "fa-solid fa-sliders", resizable: false },
    form: { submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/laden-einstellungen.hbs` }
  };

  /** @override */
  get title() {
    return game.i18n.format("SHOPS.Einstellungen.Titel", { name: this.document.name });
  }

  /** @override */
  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const laden = this.document.system;
    const erlaubt = laden.zugriff?.benutzer ?? new Set();

    return Object.assign(ctx, {
      laden,
      bearbeitbar: this.isEditable,
      ladenBild: this.document.img || LADEN_BILD,
      tokenBild: this.document.prototypeToken?.texture?.src,
      begruessungText: alsSchlichterText(laden.begruessung),

      kaufmodi: Object.values(KAUFMODUS).map(wert => ({
        wert,
        name: game.i18n.localize(`SHOPS.Kaufmodus.${wert}`),
        gewaehlt: laden.kaufmodus === wert
      })),

      muenzen: Object.keys(KUPFERWERT).map(sorte => ({
        sorte,
        kuerzel: game.i18n.localize(`SHOPS.Muenze.${sorte}`),
        wert: laden.kasse?.[sorte] ?? 0
      })),

      zugriffsmodi: ZUGRIFF.map(wert => ({
        wert,
        name: game.i18n.localize(`SHOPS.Zugriff.${wert}`),
        gewaehlt: laden.zugriff?.modus === wert
      })),
      auswahlAktiv: laden.zugriff?.modus === "auswahl",
      spieler: game.users.filter(u => !u.isGM).map(u => ({
        id: u.id, name: u.name, active: u.active, erlaubt: erlaubt.has(u.id)
      })),

      /*
       * Der weltweite Schalter steht ueber der Liste. Steht er aus, bewirkt
       * hier gar nichts etwas - und das gehoert ins Fenster, nicht in die
       * Anleitung.
       */
      spielerDuerfenOeffnen: game.settings.get(MODULE_ID, SETTINGS.SPIELER_DUERFEN_OEFFNEN)
    });
  }

  /**
   * Ein Bildpfad ohne Endung darf nicht ins Formular.
   *
   * `FormDataExtended` sammelt jedes `img[data-edit]` mit ein und nimmt
   * dessen `src`. Steht dort nichts - weil der Dateiwaehler abgebrochen wurde
   * oder ein Laden gar kein Bild hat -, loest der Browser die leere Quelle zur
   * Seitenadresse auf, und Foundry weist die Aenderung mit "does not have a
   * valid file extension" ab. Der Fehler betrifft dann das **ganze** Formular:
   * Aufschlag, Kaufmodus und Zugriff werden mit verworfen.
   *
   * @override
   */
  _prepareSubmitData(ereignis, formular, formularDaten, aktualisierung) {
    const daten = super._prepareSubmitData(ereignis, formular, formularDaten, aktualisierung);
    const pfad = daten?.img;
    const sinnvoll = /\.[a-z0-9]{2,5}(\?.*)?$/i;
    if (typeof pfad === "string" && !sinnvoll.test(pfad)) delete daten.img;
    return daten;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.isEditable) return;

    /*
     * Die Zugriffsliste von Hand: Mehrere Kaestchen unter einem Namen macht
     * FormDataExtended zu Wahrheitswerten, nicht zu einer Liste - `SetField`
     * bekaeme dann `true` statt der Benutzerkennungen. Also wird bei jeder
     * Aenderung die ganze Liste neu geschrieben.
     */
    /*
     * Der Regler schiebt die Vorschau schon beim Ziehen, nicht erst beim
     * Loslassen. Ein Ausschnitt, den man erst nach dem Speichern sieht,
     * laesst sich nicht einstellen, sondern nur raten.
     */
    const regler = this.element.querySelector("[data-fokus]");
    const vorschau = this.element.querySelector(".shops-kopfbild-vorschau");
    if (regler && vorschau) {
      regler.addEventListener("input", () => {
        vorschau.style.objectPosition = `50% ${regler.value}%`;
      });
    }

    for (const kasten of this.element.querySelectorAll('[data-zugriff="benutzer"]')) {
      kasten.addEventListener("change", () => {
        const gewaehlt = [...this.element.querySelectorAll('[data-zugriff="benutzer"]:checked')]
          .map(k => k.value);
        this.document.update({ "system.zugriff.benutzer": gewaehlt });
      });
    }
  }
}

/**
 * Das Fenster zu einem Laden oeffnen.
 *
 * Ein vorhandenes wird nach vorn geholt statt ein zweites daneben zu stellen -
 * zwei Fenster auf dieselben Einstellungen ueberschreiben sich gegenseitig.
 */
export function einstellungenOeffnen(laden) {
  const kennung = `${MODULE_ID}-einstellungen-${laden.id}`;
  const offen = foundry.applications.instances.get(kennung);
  if (offen) return offen.bringToFront?.() ?? offen.render(true);
  return new LadenEinstellungen({ document: laden, id: kennung }).render(true);
}
