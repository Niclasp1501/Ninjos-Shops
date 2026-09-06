/**
 * Das Marktbuch - ein Journal, kein Datenklumpen in den Einstellungen.
 *
 * Dieselbe Begruendung wie beim Tauschlogbuch der In-Person Tools: Ein Journal
 * laesst sich lesen, durchsuchen, ausdrucken und liegt in der Weltsicherung.
 * Eine Spielleitung, die wissen will, wo die 400 Gold geblieben sind, findet
 * es; ein JSON in der Einstellungsdatenbank findet sie nie.
 *
 * **Geschrieben wird zweimal:** vor dem ersten Zugriff, was gemeint war, und
 * danach, was geschehen ist. Das ist der Sinn der Sache - ein Buch, das nur
 * gelungene Kaeufe kennt, schweigt genau dann, wenn man es braucht. Bricht der
 * Vorgang in der Mitte ab, steht die Absicht trotzdem da.
 */

import { MODULE_ID, SETTINGS } from "./const.js";
import { alsText } from "./preise.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Das Journal holen oder anlegen. Nur die Spielleitung darf das. */
async function buch() {
  if (!game.user.isGM) return null;

  const kennung = game.settings.get(MODULE_ID, SETTINGS.MARKTBUCH);
  if (kennung) {
    const vorhanden = game.journal.get(kennung);
    if (vorhanden) return vorhanden;
  }

  /*
   * Nur fuer die Spielleitung sichtbar. Ein Marktbuch, das die Spieler lesen
   * koennen, verraet jeden Sonderpreis und jeden Kauf der anderen - und
   * ausserdem den Ankaufsfaktor jedes Ladens.
   */
  const neu = await JournalEntry.implementation.create({
    name: game.i18n.localize("SHOPS.Marktbuch.Name"),
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE }
  });
  await game.settings.set(MODULE_ID, SETTINGS.MARKTBUCH, neu.id);
  return neu;
}

/**
 * Die Seite des heutigen Spieltags.
 *
 * Eine Seite je Tag statt einer je Kauf: Nach drei Sitzungen waeren es sonst
 * zweihundert Seiten, durch die niemand mehr blaettert.
 */
async function seiteHeute(journal) {
  const heute = new Date().toISOString().slice(0, 10);
  const titel = game.i18n.format("SHOPS.Marktbuch.Seite", { datum: heute });
  const vorhanden = journal.pages.find(p => p.name === titel);
  if (vorhanden) return vorhanden;

  const [neu] = await journal.createEmbeddedDocuments("JournalEntryPage", [{
    name: titel,
    type: "text",
    text: { format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content: "" }
  }]);
  return neu;
}

/** Eine Zeile anhaengen, ohne das Vorhandene neu zu schreiben. */
async function zeileAnhaengen(html) {
  const journal = await buch();
  if (!journal) return;
  const seite = await seiteHeute(journal);
  const bisher = seite.text?.content ?? "";
  await seite.update({ "text.content": bisher + html });
}

function uhrzeit() {
  return new Date().toLocaleTimeString(game.i18n.lang, { hour: "2-digit", minute: "2-digit" });
}

function fluchtHtml(text) {
  return foundry.utils.escapeHTML(String(text ?? ""));
}

/**
 * Was gemeint war - geschrieben, **bevor** irgendetwas angefasst wird.
 */
export async function schreibeVorgang({ laden, item, figur, kaeufer, pruefung, ausAngebot }) {
  const teile = [
    `<strong>${fluchtHtml(kaeufer?.name ?? "?")}</strong>`,
    game.i18n.localize("SHOPS.Marktbuch.Will"),
    `<em>${fluchtHtml(item?.name ?? "?")}</em>`,
    game.i18n.format("SHOPS.Marktbuch.BeiLaden", { laden: fluchtHtml(laden?.name ?? "?") })
  ];
  if (figur) teile.push(game.i18n.format("SHOPS.Marktbuch.MitFigur", { figur: fluchtHtml(figur.name) }));
  if (ausAngebot) teile.push(`<em>${game.i18n.localize("SHOPS.Marktbuch.AusAngebot")}</em>`);

  const ausgang = pruefung.ok
    ? `${game.i18n.localize("SHOPS.Marktbuch.Fuer")} <strong>${alsText(pruefung.summeCp, kuerzel)}</strong>`
    : `<span style="color:#8b0000">${game.i18n.localize(pruefung.grund)}</span>`;

  await zeileAnhaengen(`<p>${uhrzeit()} — ${teile.join(" ")} ${ausgang}</p>`);
}

/** Was geschehen ist - geschrieben **nach** dem Zugriff. */
export async function schreibeErgebnis({ laden, item, figur, kaeufer, ok, stueck, summeCp, dienst, grund, ausAngebot }) {
  if (!ok) {
    await zeileAnhaengen(
      `<p style="color:#8b0000">${uhrzeit()} — ` +
      `${game.i18n.localize("SHOPS.Marktbuch.Abgebrochen")} ${fluchtHtml(grund ?? "")}</p>`
    );
    return;
  }

  const was = dienst
    ? game.i18n.localize("SHOPS.Marktbuch.Dienst")
    : game.i18n.format("SHOPS.Marktbuch.Stueck", { menge: stueck });

  await zeileAnhaengen(
    `<p>${uhrzeit()} — <strong>${game.i18n.localize("SHOPS.Marktbuch.Erledigt")}</strong> ` +
    `${was} <em>${fluchtHtml(item?.name ?? "?")}</em> ` +
    `${game.i18n.format("SHOPS.Marktbuch.BeiLaden", { laden: fluchtHtml(laden?.name ?? "?") })} ` +
    `${game.i18n.localize("SHOPS.Marktbuch.Fuer")} <strong>${alsText(summeCp, kuerzel)}</strong>` +
    (figur ? ` — ${fluchtHtml(figur.name)}` : "") +
    (ausAngebot ? ` <em>(${game.i18n.localize("SHOPS.Marktbuch.AusAngebot")})</em>` : "") +
    `</p>`
  );
}

/** Das Marktbuch oeffnen, falls es eines gibt. */
export function marktbuchOeffnen() {
  const kennung = game.settings.get(MODULE_ID, SETTINGS.MARKTBUCH);
  const journal = kennung ? game.journal.get(kennung) : null;
  if (!journal) {
    ui.notifications.info(game.i18n.localize("SHOPS.Marktbuch.NochLeer"));
    return null;
  }
  journal.sheet.render(true);
  return journal;
}
