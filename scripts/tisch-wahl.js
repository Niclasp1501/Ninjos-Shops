/**
 * Das Aussuchen - eine Lage ueber dem Tisch.
 *
 * **Der Tisch zeigt, was daraufliegt; das Aussuchen passiert darueber.** Bis
 * zum 08.09.2026 stand der ganze Vorrat des Spielers unter der Waage, jede
 * Zeile mit Mengenfeld und Knopf, und Geld kam ueber ein Zahlenfeld mit einem
 * Auswahlmenue fuer die Muenzsorte. Bei neun Gegenstaenden ging das, bei
 * sechzig war der Handel selbst - die vier Zeilen, um die es geht - nicht mehr
 * zu sehen. Und das Auswahlmenue klappte irgendwo auf, mit Rollbalken.
 *
 * Die In-Person Tools hatten das fuer den Tausch zwischen Spielern schon
 * geloest, und die Loesung wird hier uebernommen: Zwei Knoepfe an der eigenen
 * Seite, „Sachen" und „Muenzen", und jeder legt eine Lage ueber den Tisch, in
 * der man antippt, was mit soll. Fuer Mengen gibt es Stufenknoepfe - 0, -10,
 * -, +, +10, alles -, fuer Muenzen dieselben, je Sorte eine Zeile. Kein
 * Dropdown, kein Tippen.
 *
 * **Waehrend man aussucht, wird nichts gesendet.** Die andere Seite sieht den
 * Tisch einmal anders, wenn man fertig ist - nicht bei jedem Tipp. Ein Tisch,
 * dessen Gegenseite flackert, waehrend man blaettert, ist nicht zu lesen, und
 * jede dieser Aenderungen wuerde beide Zusagen zuruecksetzen.
 *
 * **Keine Preise in der Lage.** Was ein Stueck der Person wert ist, steht auf
 * dem Tisch, sobald es daliegt - dort rechnet die Waage damit. In der Auswahl
 * daneben waere dieselbe Zahl eine Verwirrung: Sie sieht aus wie ein Preis,
 * ist aber, was die Person dafuer gibt.
 *
 * Diese Datei kennt keinen Socket und kein Merkmal. Sie haelt den Entwurf,
 * baut die Ansicht und liefert die Handgriffe, die beide Fenster - Spieler
 * und Spielleitung - in ihre `actions` uebernehmen. Was das Fenster dafuer
 * mitbringen muss, steht bei `WAHL_AKTIONEN`.
 */

/** Die fuenf Sorten, so wie dnd5e sie zaehlt - von der schwersten abwaerts. */
export const MUENZEN = ["pp", "gp", "ep", "sp", "cp"];

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Muenzen, so wie sie hingelegt wurden: „2 GM · 5 SM". Leer, wenn keine. */
export function muenzText(muenzen) {
  return MUENZEN
    .filter(s => (muenzen?.[s] ?? 0) > 0)
    .map(s => `${muenzen[s]} ${kuerzel(s)}`)
    .join(" · ");
}

/** Nur die Sorten mit einer Zahl groesser null, ganzzahlig, nie negativ. */
export function muenzenSaeubern(muenzen) {
  const raus = {};
  for (const s of MUENZEN) {
    const n = Math.floor(Number(muenzen?.[s]) || 0);
    if (n > 0) raus[s] = n;
  }
  return raus;
}

/** Was gerade in der Lage ausgesucht ist. */
export class Wahl {
  /** "tisch" | "sachen" | "muenzen" */
  modus = "tisch";
  /** Item-Kennung -> Menge */
  sachen = new Map();
  /** Sorte -> Anzahl */
  muenzen = {};

  /** Den Entwurf mit dem fuellen, was schon auf dem Tisch liegt. */
  laden(posten, muenzen) {
    this.sachen = new Map((posten ?? []).map(p => [p.itemId, p.menge]));
    this.muenzen = { ...muenzenSaeubern(muenzen) };
  }

  /**
   * Die Ansicht der Lage - oder `null`, wenn der Tisch selbst zu sehen ist.
   *
   * @param {Item[]} vorrat   Was der Traeger hinlegen koennte
   * @param {object} boerse   Seine Muenzen, `system.currency`
   */
  kontext(vorrat, boerse) {
    if (this.modus === "tisch") return null;
    const zeilen = (vorrat ?? [])
      .map(item => {
        const hoechstens = item.type === "container" ? 1 : Math.max(1, Number(item.system?.quantity ?? 1));
        const gewaehlt = this.sachen.get(item.id) ?? 0;
        return {
          id: item.id, name: item.name, img: item.img || null,
          hoechstens, gewaehlt, an: gewaehlt > 0, stapel: hoechstens > 1
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

    const muenzen = MUENZEN
      .map(s => ({ sorte: s, kuerzel: kuerzel(s), habe: Number(boerse?.[s] ?? 0),
                   gewaehlt: this.muenzen[s] ?? 0 }))
      .filter(z => z.habe > 0 || z.gewaehlt > 0)
      .map(z => ({ ...z, an: z.gewaehlt > 0 }));

    return {
      modus: this.modus,
      sachenModus: this.modus === "sachen",
      zeilen, hatZeilen: zeilen.length > 0,
      muenzen, hatMuenzen: muenzen.length > 0
    };
  }

  /** Der Entwurf als das, was an den Tisch geht. */
  ergebnis() {
    const posten = [...this.sachen.entries()]
      .filter(([, n]) => n > 0)
      .map(([itemId, menge]) => ({ itemId, menge }));
    return { posten, muenzen: muenzenSaeubern(this.muenzen) };
  }

  sacheSchritt(id, hoechstens, schritt) {
    const naechste = Math.max(0, Math.min(hoechstens, (this.sachen.get(id) ?? 0) + schritt));
    if (naechste === 0) this.sachen.delete(id);
    else this.sachen.set(id, naechste);
  }

  muenzeSchritt(sorte, habe, schritt) {
    this.muenzen[sorte] = Math.max(0, Math.min(habe, (this.muenzen[sorte] ?? 0) + schritt));
  }
}

const schritt = ziel => Number(ziel.dataset.schritt) || 1;

/**
 * Die Handgriffe fuer beide Fenster - per `...WAHL_AKTIONEN` in `actions`.
 *
 * `this` ist das Fenster. Es muss mitbringen:
 * - `wahl`            eine {@link Wahl}
 * - `wahlLiegt()`     `{ posten, muenzen }` - was schon auf der eigenen Seite liegt
 * - `wahlVorrat()`    `Item[]` - was hingelegt werden koennte
 * - `wahlBoerse()`    `system.currency` des Traegers
 * - `wahlAbschicken(posten, muenzen)` - die Seite so an den Tisch geben
 */
export const WAHL_AKTIONEN = {
  wahlSachen() {
    const { posten, muenzen } = this.wahlLiegt();
    this.wahl.laden(posten, muenzen);
    this.wahl.modus = "sachen";
    this.render();
  },
  wahlMuenzen() {
    const { posten, muenzen } = this.wahlLiegt();
    this.wahl.laden(posten, muenzen);
    this.wahl.modus = "muenzen";
    this.render();
  },
  wahlZurueck() {
    this.wahl.modus = "tisch";
    this.render();
  },
  /*
   * Beide Haelften gehen jedes Mal mit - die Sachenlage traegt auch die
   * Muenzen aus dem Entwurf, unveraendert. Sonst koennte ein Wechsel zwischen
   * den beiden Lagen eine Haelfte verlieren.
   */
  wahlAufDenTisch() {
    const { posten, muenzen } = this.wahl.ergebnis();
    this.wahlAbschicken(posten, muenzen);
    this.wahl.modus = "tisch";
    this.render();
  },
  /** Die ganze Zeile ist der Schalter - kein kleines Kaestchen, das man treffen muss. */
  wahlUmschalten(ereignis, ziel) {
    const id = ziel.dataset.itemId;
    if (this.wahl.sachen.get(id)) this.wahl.sachen.delete(id);
    else this.wahl.sachen.set(id, 1);
    this.render();
  },
  wahlWeniger(ereignis, ziel) {
    this.wahl.sacheSchritt(ziel.dataset.itemId, Number(ziel.dataset.hoechstens) || 1, -schritt(ziel));
    this.render();
  },
  wahlMehr(ereignis, ziel) {
    this.wahl.sacheSchritt(ziel.dataset.itemId, Number(ziel.dataset.hoechstens) || 1, schritt(ziel));
    this.render();
  },
  wahlAlles(ereignis, ziel) {
    this.wahl.sachen.set(ziel.dataset.itemId, Number(ziel.dataset.hoechstens) || 1);
    this.render();
  },
  wahlNichts(ereignis, ziel) {
    this.wahl.sachen.delete(ziel.dataset.itemId);
    this.render();
  },
  muenzeWeniger(ereignis, ziel) {
    this.wahl.muenzeSchritt(ziel.dataset.sorte, Number(ziel.dataset.habe) || 0, -schritt(ziel));
    this.render();
  },
  muenzeMehr(ereignis, ziel) {
    this.wahl.muenzeSchritt(ziel.dataset.sorte, Number(ziel.dataset.habe) || 0, schritt(ziel));
    this.render();
  },
  muenzeAlles(ereignis, ziel) {
    this.wahl.muenzen[ziel.dataset.sorte] = Number(ziel.dataset.habe) || 0;
    this.render();
  },
  muenzeNichts(ereignis, ziel) {
    this.wahl.muenzen[ziel.dataset.sorte] = 0;
    this.render();
  }
};
