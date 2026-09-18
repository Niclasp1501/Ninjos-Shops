/**
 * Der Festpreis eines Stuecks, in einem eigenen Fenster.
 *
 * **Warum nicht mehr in der Zeile.** Bis zum 18.09.2026 standen fuenf
 * Muenzfelder in jeder Warenzeile des Ladenbogens. Seit Platin und Elektrum
 * dazukamen, blieb vom Namen der Ware nur noch „A…" uebrig, und gebraucht
 * werden die Felder selten: Einen Festpreis setzt man einmal, lesen will man
 * den Namen jedes Mal. Am Tisch gemeldet.
 *
 * Gespeichert wird wie vorher der Kupferwert. Leer heisst „kein Festpreis",
 * also Aufschlag auf den Grundpreis; eine 0 heisst geschenkt. Deshalb gibt es
 * einen eigenen Knopf zum Entfernen, statt alle Felder leeren zu muessen.
 */

import { MODULE_ID, WARE } from "./const.js";
import { grundpreisCp, preisCp, alsText, alsMuenzfelder, muenzfelderVon, EINGABE_SORTEN } from "./preise.js";
import { leseMuenzfelder } from "./muenzfeld.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

export async function festpreisDialog(laden, item) {
  const system = laden.system;
  const grundCp = grundpreisCp(item.system?.price);
  const festCp = Number.isFinite(item.flags?.[MODULE_ID]?.[WARE.FESTPREIS])
    ? item.flags[MODULE_ID][WARE.FESTPREIS] : null;
  // Die Felder so, wie sie eingegeben wurden; aeltere Festpreise haben nur den Betrag.
  const eingegeben = item.flags?.[MODULE_ID]?.[WARE.FESTPREIS_MUENZEN];
  const felder = festCp === null ? {}
    : eingegeben ? muenzfelderVon(eingegeben) : alsMuenzfelder(festCp);

  const inhalt = `
    <div class="shops-festpreis-dialog">
      <p class="shops-blockhinweis">${game.i18n.format("SHOPS.Festpreis.Erklaerung", {
        grund: alsText(grundCp, kuerzel),
        preis: alsText(preisCp(grundCp, system, null), kuerzel)
      })}</p>
      <span class="shops-preisfeld">
        <span class="shops-muenzfelder">
          ${EINGABE_SORTEN.map(s => `<label><input type="number" data-muenze="${s}"
                        value="${felder[s] ?? ""}" min="0" step="1" placeholder="0"
                        aria-label="${kuerzel(s)}"><span>${kuerzel(s)}</span></label>`).join("")}
        </span>
      </span>
      <p class="shops-blockhinweis">${game.i18n.localize("SHOPS.Festpreis.Leer")}</p>
    </div>`;

  const knoepfe = [{
    action: "speichern",
    label: game.i18n.localize("SHOPS.Festpreis.Speichern"),
    icon: "fa-solid fa-tag",
    default: true,
    callback: (_e, _k, dialog) => leseMuenzfelder(dialog.element)
  }];
  if (festCp !== null) {
    knoepfe.push({
      action: "entfernen",
      label: game.i18n.localize("SHOPS.Festpreis.Entfernen"),
      icon: "fa-solid fa-eraser"
    });
  }
  knoepfe.push({ action: "abbrechen", label: game.i18n.localize("SHOPS.Abbrechen"), icon: "fa-solid fa-xmark" });

  const antwort = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.format("SHOPS.Festpreis.Titel", { name: item.name }) },
    classes: ["ninjos-shops"],
    position: { width: 420 },
    content: inhalt,
    buttons: knoepfe,
    // Wegklicken und Escape aendern nichts.
    rejectClose: false
  });

  if (!antwort || antwort === "abbrechen") return;
  if (antwort === "entfernen" || antwort.leer) {
    await item.unsetFlag(MODULE_ID, WARE.FESTPREIS_MUENZEN);
    return void item.unsetFlag(MODULE_ID, WARE.FESTPREIS);
  }
  /*
   * Alle fuenf Sorten ablegen, auch die mit null. Ein Merkmal wird beim
   * Speichern zusammengefuehrt, nicht ersetzt: Aus „5 EM" und danach „2 GM"
   * wuerde sonst „2 GM 5 EM".
   */
  await item.update({
    [`flags.${MODULE_ID}.${WARE.FESTPREIS}`]: antwort.cp,
    [`flags.${MODULE_ID}.${WARE.FESTPREIS_MUENZEN}`]:
      Object.fromEntries(EINGABE_SORTEN.map(s => [s, antwort.muenzen?.[s] ?? 0]))
  });
}
