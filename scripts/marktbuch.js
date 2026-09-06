/**
 * Das Marktbuch - die Buchhaltung der Spielleitung ueber alle Laeden.
 *
 * **Kein Journal mehr.** Die erste Fassung schrieb HTML-Absaetze in eine
 * Journalseite je Spieltag. Das las sich wie ein Protokoll und nicht wie ein
 * Buch: nicht sortierbar, nicht filterbar, jede Zeile ein Textschnipsel, und
 * beim zweiten Spielabend blaetterte niemand mehr. Die Eintraege liegen jetzt
 * als Daten in einer Welteinstellung und bekommen ein eigenes Fenster - damit
 * laesst sich nach Laden filtern, und Zahlen bleiben Zahlen.
 *
 * **Unterschied zum Ladenbuch** (`ladenbuch.js`): Dies hier sammelt *alle*
 * Laeden, gehoert der Spielleitung allein und schreibt auch **fehlgeschlagene**
 * Versuche mit - wer wollte was und warum ging es nicht. Genau dafuer schlaegt
 * man es auf. Das Ladenbuch ist die Theke eines einzelnen Ladens und zeigt nur,
 * was durchging.
 */

import { MODULE_ID, SETTINGS } from "./const.js";
import { alsText } from "./preise.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/**
 * Wie viele Zeilen die Welt behaelt.
 *
 * Eine Einstellung geht in jede Weltsicherung. Fuenfhundert Zeilen decken
 * viele Abende und bleiben ein paar Dutzend Kilobyte; ohne Grenze waechst das
 * still weiter, bis jemand beim Laden wartet und niemand weiss, warum.
 */
const HOECHSTZAHL = 500;

/** Alle Zeilen, neueste zuerst. Nur die Spielleitung bekommt etwas. */
export function marktbuchZeilen() {
  if (!game.user.isGM) return [];
  const roh = game.settings.get(MODULE_ID, SETTINGS.MARKTBUCH) ?? [];
  return [...roh].reverse().map(z => ({
    ...z,
    summeText: alsText(z.summeCp ?? 0, kuerzel),
    grundText: z.grund ? game.i18n.localize(z.grund) : null,
    zeitText: new Date(z.zeit).toLocaleString(game.i18n.lang, {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    }),
    wasText: (z.was ?? []).map(w => (w.menge > 1 ? `${w.menge}× ${w.name}` : w.name)).join(", "),
    gekauft: z.art === "kauf",
    freigabe: z.art === "freigabe"
  }));
}

/** Eine Zeile anhaengen. Nur bei der Spielleitung. */
async function eintragen(eintrag) {
  if (!game.user.isGM) return;
  const bisher = game.settings.get(MODULE_ID, SETTINGS.MARKTBUCH) ?? [];
  const neu = [...bisher, { zeit: Date.now(), ...eintrag }].slice(-HOECHSTZAHL);
  await game.settings.set(MODULE_ID, SETTINGS.MARKTBUCH, neu);
  foundry.applications.instances.get(`${MODULE_ID}-marktbuch`)?.render(false);
}

/* ── Was die Vorgaenge melden ──────────────────────────────────────── */

/** Ein Kaufversuch, **bevor** etwas angefasst wird. Nur wenn er scheitert. */
export async function schreibeVorgang({ laden, item, figur, kaeufer, pruefung, ausAngebot }) {
  if (pruefung.ok) return;   // Gelungenes meldet erst das Ergebnis - sonst
                             // stuende jeder Kauf zweimal im Buch.
  await eintragen({
    art: "kauf", ok: false,
    ladenName: laden?.name ?? "?", ladenUuid: laden?.uuid ?? null,
    userName: kaeufer?.name ?? "?", figurName: figur?.name ?? null,
    was: [{ name: item?.name ?? "?", menge: 1 }],
    summeCp: 0, grund: pruefung.grund, sonderpreis: !!ausAngebot
  });
}

/** Ein gelungener oder abgebrochener Kauf. */
export async function schreibeErgebnis({ laden, item, figur, kaeufer, ok, stueck, summeCp, dienst, grund, ausAngebot }) {
  await eintragen({
    art: "kauf", ok: !!ok,
    ladenName: laden?.name ?? "?", ladenUuid: laden?.uuid ?? null,
    userName: kaeufer?.name ?? "?", figurName: figur?.name ?? null,
    was: [{ name: item?.name ?? "?", menge: dienst ? 1 : (stueck ?? 1) }],
    summeCp: summeCp ?? 0,
    grund: ok ? null : (grund ?? "SHOPS.Kauf.Abgebrochen"),
    dienst: !!dienst, sonderpreis: !!ausAngebot
  });
}

/**
 * Ein Ja oder ein Nein der Spielleitung im Freigabe-Modus.
 *
 * **Warum eine eigene Zeile und kein Feld am Kauf.** Der Kauf schreibt seine
 * Zeile gleich danach, und dort steht der Haendler als Gegenueber - das ist
 * richtig so, verkauft hat er. Wer das Ja gegeben hat, ist eine andere
 * Auskunft; bei drei Spielleitungen am Tisch beantwortet sie „wer hat das
 * durchgewinkt". Und ein **Nein** haette sonst gar keine Zeile: Es war eine
 * Meldung beim Spieler, die verschwand, und drei Wochen spaeter wusste
 * niemand mehr, dass ueberhaupt gefragt worden war.
 */
export async function schreibeFreigabe({ laden, eintrag, ok, wer, satz }) {
  await eintragen({
    art: "freigabe", ok: !!ok,
    ladenName: laden?.name ?? eintrag.ladenName ?? "?",
    ladenUuid: laden?.uuid ?? eintrag.ladenUuid ?? null,
    userName: eintrag.spielerName, figurName: eintrag.figurName,
    was: [{ name: eintrag.itemName, menge: eintrag.menge }],
    summeCp: eintrag.summeCp ?? 0,
    freigabeVon: wer ?? null,
    satz: satz || null,
    grund: ok ? null : "SHOPS.Freigabe.Abgelehnt"
  });
}

/** Ein Verkaufsversuch, der scheitert. */
export async function schreibeVerkaufVorgang({ laden, item, figur, verkaeufer, pruefung }) {
  if (pruefung.ok) return;
  await eintragen({
    art: "verkauf", ok: false,
    ladenName: laden?.name ?? "?", ladenUuid: laden?.uuid ?? null,
    userName: verkaeufer?.name ?? "?", figurName: figur?.name ?? null,
    was: [{ name: item?.name ?? "?", menge: 1 }],
    summeCp: 0, grund: pruefung.grund
  });
}

/** Ein gelungener oder abgebrochener Verkauf. */
export async function schreibeVerkaufErgebnis({ laden, name, figur, verkaeufer, ok, stueck, summeCp, grund }) {
  await eintragen({
    art: "verkauf", ok: !!ok,
    ladenName: laden?.name ?? "?", ladenUuid: laden?.uuid ?? null,
    userName: verkaeufer?.name ?? "?", figurName: figur?.name ?? null,
    was: [{ name: name ?? "?", menge: stueck ?? 1 }],
    summeCp: summeCp ?? 0,
    grund: ok ? null : (grund ?? "SHOPS.Kauf.Abgebrochen")
  });
}

/* ── Das Fenster ───────────────────────────────────────────────────── */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class Marktbuch extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-marktbuch`,
    classes: ["ninjos-shops", "shops-marktbuch"],
    position: { width: 640, height: 620 },
    window: { icon: "fa-solid fa-book", resizable: true },
    actions: { leeren: Marktbuch.#leeren }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/marktbuch.hbs`, scrollable: [".shops-buchliste"] }
  };

  /** Nach welchem Laden gefiltert wird. Leer = alle. */
  #laden = "";

  get title() { return game.i18n.localize("SHOPS.Marktbuch.Name"); }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const alle = marktbuchZeilen();
    const zeilen = this.#laden ? alle.filter(z => z.ladenUuid === this.#laden) : alle;

    // Die Laeden fuer die Auswahl: nur die, die auch vorkommen.
    const gesehen = new Map();
    for (const z of alle) if (z.ladenUuid) gesehen.set(z.ladenUuid, z.ladenName);

    return Object.assign(ctx, {
      zeilen,
      laeden: [...gesehen].map(([uuid, name]) => ({ uuid, name, gewaehlt: uuid === this.#laden })),
      gefiltert: !!this.#laden,
      anzahl: zeilen.length,
      gescheitert: zeilen.filter(z => !z.ok).length
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const wahl = this.element.querySelector("[data-ladenwahl]");
    wahl?.addEventListener("change", () => { this.#laden = wahl.value; this.render(false); });
  }

  /** Alles loeschen - mit Rueckfrage, denn es ist nicht wiederzubekommen. */
  static async #leeren() {
    const sicher = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("SHOPS.Marktbuch.LeerenTitel") },
      classes: ["ninjos-shops"],
      content: `<p>${game.i18n.localize("SHOPS.Marktbuch.LeerenFrage")}</p>`,
      yes: { label: game.i18n.localize("SHOPS.Marktbuch.LeerenJa"), icon: "fa-solid fa-trash" },
      no: { label: game.i18n.localize("SHOPS.Abbrechen") },
      defaultYes: false
    });
    if (!sicher) return;
    await game.settings.set(MODULE_ID, SETTINGS.MARKTBUCH, []);
    this.render(false);
  }
}

/** Das Marktbuch aufschlagen. */
export function marktbuchOeffnen() {
  if (!game.user.isGM) return null;
  const offen = foundry.applications.instances.get(`${MODULE_ID}-marktbuch`);
  if (offen) return offen.bringToFront?.() ?? offen.render(true);
  return new Marktbuch().render(true);
}
