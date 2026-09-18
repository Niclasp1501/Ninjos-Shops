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
import { grundpreisCp, preisCp, alsText, alsMuenzfelder, EINGABE_SORTEN } from "./preise.js";
import { leseMuenzfelder } from "./muenzfeld.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

export async function festpreisDialog(laden, item) {
  const system = laden.system;
  const grundCp = grundpreisCp(item.system?.price);
  const festCp = Number.isFinite(item.flags?.[MODULE_ID]?.[WARE.FESTPREIS])
    ? item.flags[MODULE_ID][WARE.FESTPREIS] : null;
  const felder = festCp === null ? {} : alsMuenzfelder(festCp);

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
  if (antwort === "entfernen" || antwort.leer) return void item.unsetFlag(MODULE_ID, WARE.FESTPREIS);
  await item.setFlag(MODULE_ID, WARE.FESTPREIS, antwort.cp);
}
