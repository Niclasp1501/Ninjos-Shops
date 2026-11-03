/**
 * Die Schnittstelle fuer Zusatzmodule.
 *
 * **Warum es sie gibt.** Am 11.09.2026 entschieden: Der Quellcode bleibt
 * oeffentlich, Bezahltes kommt als eigenes Modul, das hier andockt, und nicht
 * als gesperrter Code in diesem. Seit dem 13.09.2026 gilt dazu die Regel aus
 * FANG: Neue wesentliche Funktionen entstehen im Zusatzmodul, Verbesserungen
 * und Fehlerbehebungen hier. Dieses Modul bekommt dafuer nur Ansatzpunkte,
 * nie die Funktion selbst.
 *
 * **Was versprochen ist.** Alles, was in `API.md` steht: die Hooks, `register`,
 * die Menueeintraege, die Preisrechner. Aendert sich dort eine Signatur,
 * steigt {@link SCHNITTSTELLE}. Dazukommen darf jederzeit etwas.
 *
 * **Warum diese Datei nichts von Foundry weiss.** Die Anmeldung ist der Teil,
 * an dem ein fremdes Modul scheitern kann: falsche Kennung, zu alte
 * Schnittstelle, ein `setup`, das wirft. Genau das soll sich pruefen lassen,
 * ohne dass eine Welt laeuft, wie bei preise.js und kasse.js. Was Foundry
 * braucht (Warnung an die Spielleitung, Uebersetzung), reicht main.js herein.
 */

/** Version der Schnittstelle, wie sie in API.md beschrieben ist. */
export const SCHNITTSTELLE = 1;

/**
 * Die Hooks, die dieses Modul ruft.
 *
 * Englisch benannt, weil sie in API.md fuer fremde Autoren stehen, und alle
 * mit einem einzigen Objekt als Argument, damit ein spaeter dazukommendes Feld
 * keine Signatur bricht.
 */
export const HOOKS = Object.freeze({
  BEREIT: "ninjosShopsReady",
  KAUF: "ninjosShops.purchaseCompleted",
  VERKAUF: "ninjosShops.saleCompleted",
  TISCH: "ninjosShops.tableCompleted",
  TAUSCH: "ninjosShops.tradeCompleted",
  BOGEN: "ninjosShops.sheetRendered",
  SPIELERFENSTER: "ninjosShops.playerWindowRendered",
  SCHAU: "ninjosShops.displayRendered"
});

/**
 * Eine Kennung, die gefahrlos in einem Attribut steht.
 *
 * Sie landet im Menue als `data-tat="ext:<id>"`. Wer dort Anfuehrungszeichen
 * oder spitze Klammern hineinbekommt, schreibt in fremdes HTML.
 */
const KENNUNG = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Ein Font-Awesome-Name, und nur der. Er steht ungeprueft in einer Klasse. */
const SYMBOL = /^fa-[a-z0-9-]+$/;
const ERSATZSYMBOL = "fa-puzzle-piece";

/**
 * Die Anmeldestelle anlegen.
 *
 * @param {object}   [wege]
 * @param {Function} [wege.warnen]     `(id, requires)` wenn ein Zusatzmodul eine
 *                                     neuere Schnittstelle braucht. main.js
 *                                     sagt es der Spielleitung.
 * @param {object}   [wege.protokoll]  `console` oder etwas mit log/warn/error.
 */
export function erweiterungAnlegen({ warnen = () => {}, protokoll = console } = {}) {
  const angemeldet = new Map();
  const funktionen = new Set();
  let menue = [];

  const stelle = {
    version: SCHNITTSTELLE,

    /**
     * Ein Zusatzmodul anmelden.
     *
     * `setup` laeuft genau einmal. Wirft es, gilt das Modul als nicht
     * angemeldet und darf es spaeter noch einmal versuchen; halb eingerichtet
     * stehen zu bleiben waere schlechter.
     */
    register({ id, requires = 1, setup } = {}) {
      if (!KENNUNG.test(String(id ?? "")) || typeof setup !== "function") {
        protokoll.warn?.(`Ninjo's Shops | Zusatzmodul abgewiesen: Kennung "${id}" oder setup fehlt.`);
        return false;
      }
      if (!(Number(requires) <= SCHNITTSTELLE)) {
        protokoll.warn?.(`Ninjo's Shops | "${id}" braucht Schnittstelle ${requires}, hier gibt es ${SCHNITTSTELLE}.`);
        warnen(id, requires);
        return false;
      }
      if (angemeldet.has(id)) return true;
      try {
        setup(stelle);
      } catch (fehler) {
        protokoll.error?.(`Ninjo's Shops | "${id}" liess sich nicht einrichten.`, fehler);
        return false;
      }
      angemeldet.set(id, { requires: Number(requires) });
      protokoll.log?.(`Ninjo's Shops | Zusatzmodul "${id}" angemeldet.`);
      return true;
    },

    isRegistered(id) { return angemeldet.has(id); },

    /**
     * Benannte Faehigkeiten. Wo dieses Modul eine eingebaute Fassung derselben
     * Sache hat, fragt es hier, ob ein Zusatzmodul sie uebernommen hat.
     */
    registerFeature(id) { if (id) funktionen.add(String(id)); },
    hasFeature(id) { return funktionen.has(String(id)); },

    /**
     * Ein Eintrag im Menue einer Warenzeile im Ladenbogen.
     *
     * @param {object}   def
     * @param {string}   def.id
     * @param {string}   [def.icon]    Font Awesome, etwa "fa-gavel"
     * @param {string|Function} def.label  Text oder Sprachschluessel, oder
     *                                     eine Funktion, die ihn liefert
     * @param {boolean}  [def.gmOnly=true]
     * @param {Function} [def.when]    `(item, shop)` entscheidet je Zeile
     * @param {Function} def.onClick   `(item, shop, sheet)`
     */
    registerItemMenuEntry(def) {
      if (!KENNUNG.test(String(def?.id ?? ""))) return false;
      if (typeof def.onClick !== "function") return false;
      if (typeof def.label !== "string" && typeof def.label !== "function") return false;
      const eintrag = {
        id: def.id,
        icon: SYMBOL.test(String(def.icon ?? "")) ? def.icon : ERSATZSYMBOL,
        label: def.label,
        gmOnly: def.gmOnly !== false,
        when: typeof def.when === "function" ? def.when : null,
        onClick: def.onClick
      };
      menue = menue.filter(m => m.id !== eintrag.id).concat([eintrag]);
      return true;
    },

    /**
     * Die Eintraege, die fuer diese Zeile gelten, mit aufgeloestem Text.
     *
     * Ein fremdes `when` oder `label`, das wirft, kostet genau diesen einen
     * Eintrag und nicht das ganze Menue.
     */
    itemMenuEntries({ item, shop, isGM = false } = {}) {
      const raus = [];
      for (const m of menue) {
        if (m.gmOnly && !isGM) continue;
        try {
          if (m.when && !m.when(item, shop)) continue;
          const label = typeof m.label === "function" ? m.label(item, shop) : m.label;
          if (!label) continue;
          raus.push({ id: m.id, icon: m.icon, label: String(label) });
        } catch (fehler) {
          protokoll.error?.(`Ninjo's Shops | Menueeintrag "${m.id}" uebersprungen.`, fehler);
        }
      }
      return raus;
    },

    /** Den Eintrag zu einer Kennung, fuer den Klick. */
    itemMenuEntry(id) { return menue.find(m => m.id === id) ?? null; }
  };

  return stelle;
}

let warnungsWeg = () => {};

/**
 * Die eine Anmeldestelle dieses Moduls.
 *
 * main.js haengt sie an `game.modules.get("ninjos-shops").api`, laden-bogen.js
 * liest die Menueeintraege daraus. Die Tests legen sich mit
 * {@link erweiterungAnlegen} eigene an.
 */
export const erweiterung = erweiterungAnlegen({ warnen: (id, requires) => warnungsWeg(id, requires) });

/** Wohin die Warnung ueber ein zu neues Zusatzmodul geht. main.js setzt es. */
export function warnungWeiterleiten(fn) {
  if (typeof fn === "function") warnungsWeg = fn;
}
