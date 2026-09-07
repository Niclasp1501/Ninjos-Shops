/**
 * Der Kauf. Ausgefuehrt wird er **immer bei der Spielleitung**.
 *
 * Ein Spieler kann auf einem fremden Akteur nichts anlegen und nichts
 * loeschen - das ist keine Vorsichtsmassnahme, das ist die einzige Art, wie es
 * ueberhaupt geht (KONZEPT-shops.md, Abschnitt 7). Der Spieler schickt also
 * eine Bitte, die Spielleitung prueft sie noch einmal von vorn und fuehrt sie
 * aus.
 *
 * **Der Preis wird hier neu gerechnet, nie vom Spieler uebernommen.** Was in
 * seinem Fenster steht, ist eine Anzeige, kein Vertrag: Zwischen dem Zeichnen
 * des Fensters und dem Klick kann der Aufschlag sich geaendert haben, der
 * Bestand gesunken sein, der Laden geschlossen worden sein. Die einzige
 * Ausnahme ist ein Angebot der Spielleitung - dort *ist* der genannte Preis
 * die Zusage, und genau deshalb steht er auf dem Benutzer gespeichert und
 * kommt nicht aus der Socket-Nachricht.
 *
 * **Erst anlegen, dann abziehen.** Bricht es dazwischen ab, gibt es den
 * Gegenstand doppelt statt gar nicht. Dieselbe Begruendung wie in
 * `trade-mover.js` der In-Person Tools: Ein doppelter Gegenstand ist eine
 * Laestigkeit, ein verschwundener ein verlorener Abend.
 */

import { MODULE_ID, WARE, KAUFMODUS, OFFENES_ANGEBOT, LADEN_TYP } from "./const.js";
import { grundpreisCp, preisCp, alsText, wechselgeldText } from "./preise.js";
import { einlagern } from "./lager.js";
import { bezahle, schreibeGut, vermoegenCp } from "./kasse.js";
import { schreibeVorgang, schreibeErgebnis } from "./marktbuch.js";
import { buchen } from "./ladenbuch.js";

/** Muenzkuerzel in der Sprache des Clients. */
const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/**
 * Alles, was ein Kauf braucht, an einer Stelle geprueft.
 *
 * Gibt entweder `{ ok: true, … }` mit fertigen Zahlen zurueck oder
 * `{ ok: false, grund }` mit einem Textschluessel. Kein Dokument wird dabei
 * angefasst - erst wer diese Pruefung besteht, darf etwas veraendern.
 */
export function pruefeKauf({ laden, item, figur, menge, angebotCp = null }) {
  if (!laden || laden.type !== LADEN_TYP) return { ok: false, grund: "SHOPS.Kauf.KeinLaden" };
  if (!item) return { ok: false, grund: "SHOPS.Kauf.WegVomTisch" };
  if (!figur) return { ok: false, grund: "SHOPS.Kauf.KeineFigur" };

  const system = laden.system;
  const merkmal = item.flags?.[MODULE_ID] ?? {};

  if (merkmal[WARE.VERBORGEN] === true) return { ok: false, grund: "SHOPS.Kauf.WegVomTisch" };
  if (system.kaufmodus === KAUFMODUS.GESPERRT && angebotCp === null) {
    return { ok: false, grund: "SHOPS.Kauf.Gesperrt" };
  }

  const stueck = Math.max(1, Math.floor(Number(menge) || 1));
  const dienst = merkmal[WARE.DIENST] === true;
  const bestand = Number(item.system?.quantity ?? 1);

  // Eine Dienstleistung wechselt nicht den Besitzer und geht nie zur Neige.
  if (!dienst && bestand < stueck) return { ok: false, grund: "SHOPS.Kauf.NichtGenugDa" };
  if (system.hoechstmenge > 0 && stueck > system.hoechstmenge) {
    return { ok: false, grund: "SHOPS.Kauf.ZuViel" };
  }

  /*
   * Der Angebotspreis gilt fuer *ein* Stueck, wie jeder andere Preis auch.
   * `angebotCp === 0` ist gueltig und heisst geschenkt - deshalb die Pruefung
   * auf `null` und nicht auf Wahrheitswert.
   */
  const einzelCp = angebotCp !== null
    ? Math.max(0, Math.round(angebotCp))
    : preisCp(grundpreisCp(item.system?.price), system, festpreisVon(item));
  const summeCp = einzelCp * stueck;

  const boerse = figur.system?.currency ?? {};
  const gezahlt = bezahle(boerse, summeCp);
  if (!gezahlt) {
    return {
      ok: false, grund: "SHOPS.Kauf.ZuWenigGeld",
      fehltCp: summeCp - vermoegenCp(boerse)
    };
  }

  return { ok: true, stueck, dienst, einzelCp, summeCp, gezahlt, bestand };
}

/** Festpreis eines Gegenstands in Kupfer, oder `null`. */
function festpreisVon(item) {
  const wert = item.flags?.[MODULE_ID]?.[WARE.FESTPREIS];
  return Number.isFinite(wert) ? wert : null;
}

/**
 * Den Kauf ausfuehren. **Nur bei der Spielleitung aufrufen.**
 *
 * @returns {Promise<{ok: boolean, grund?: string, text?: string}>}
 */
export async function fuehreKaufAus({ ladenUuid, itemId, figurUuid, menge = 1, kaeuferId }) {
  if (!game.user.isGM) return { ok: false, grund: "SHOPS.Kauf.KeinSpielleiter" };

  const laden = await fromUuid(ladenUuid);
  const item = laden?.items?.get(itemId);
  const figur = await fromUuid(figurUuid);
  const kaeufer = game.users.get(kaeuferId);

  /*
   * Das Angebot liegt auf dem Benutzer, nicht in der Nachricht. Sonst
   * koennte ein Spieler sich seinen Preis selbst schicken - die Nachricht
   * kommt schliesslich von seinem Client.
   */
  const angebot = kaeufer?.getFlag(MODULE_ID, OFFENES_ANGEBOT) ?? null;
  const giltFuerDiesenKauf = angebot
    && angebot.ladenUuid === ladenUuid
    && angebot.itemId === itemId;
  const angebotCp = giltFuerDiesenKauf ? angebot.preisCp : null;
  const angebotsMenge = giltFuerDiesenKauf ? angebot.menge : null;

  const pruefung = pruefeKauf({
    laden, item, figur,
    menge: angebotsMenge ?? menge,
    angebotCp
  });

  await schreibeVorgang({ laden, item, figur, kaeufer, pruefung, ausAngebot: giltFuerDiesenKauf });
  if (!pruefung.ok) return { ok: false, grund: pruefung.grund, fehltCp: pruefung.fehltCp };

  const { stueck, dienst, summeCp, gezahlt, bestand } = pruefung;

  try {
    // 1. Erst anlegen. Bricht es danach ab, gibt es den Gegenstand doppelt
    //    statt gar nicht - das ist die verkraftbare Haelfte des Ungluecks.
    if (!dienst) await einlagern(figur, item, stueck);

    // 2. Dann bezahlen.
    await figur.update({ "system.currency": gezahlt.bestand });

    // 3. Dann den Bestand mindern. Dienstleistungen gehen nie zur Neige.
    if (!dienst) {
      const rest = bestand - stueck;
      if (rest > 0) await item.update({ "system.quantity": rest });
      else await item.delete();
    }

    // 4. Und die Kasse des Ladens fuellen, falls er eine hat.
    if (laden.system.eigeneKasse) {
      await laden.update({ "system.kasse": schreibeGut(laden.system.kasse, summeCp) });
    }

    // 5. Ein angenommenes Angebot ist verbraucht.
    if (giltFuerDiesenKauf) await kaeufer.unsetFlag(MODULE_ID, OFFENES_ANGEBOT);
  } catch (fehler) {
    console.error(`${MODULE_ID} | Kauf abgebrochen`, fehler);
    await schreibeErgebnis({ laden, item, figur, kaeufer, ok: false, grund: String(fehler) });
    return { ok: false, grund: "SHOPS.Kauf.Abgebrochen" };
  }

  await schreibeErgebnis({
    laden, item, figur, kaeufer, ok: true,
    stueck, summeCp, dienst, ausAngebot: giltFuerDiesenKauf
  });

  // Und in die Theke des Ladens, wo auch der Spieler es wiederfindet.
  await buchen(laden, {
    art: "kauf",
    userId: kaeuferId,
    userName: kaeufer?.name ?? "?",
    figurName: figur.name,
    was: [{ name: item.name, menge: stueck }],
    summeCp,
    sonderpreis: giltFuerDiesenKauf
  });

  // Was zurueckkam, gehoert in den Satz: Der Beutel rechnet richtig, aber
  // sichtbar war das bisher nicht.
  const zurueck = wechselgeldText(gezahlt.zurueck, kuerzel);
  const satz = game.i18n.format("SHOPS.Kauf.Gelungen", {
    menge: stueck, name: item.name, preis: alsText(summeCp, kuerzel)
  });

  return {
    ok: true,
    text: zurueck
      ? `${satz} ${game.i18n.format("SHOPS.Kauf.Wechselgeld", { geld: zurueck })}`
      : satz
  };
}
