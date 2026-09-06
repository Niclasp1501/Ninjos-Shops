/**
 * Verkaufen an den Laden - der Weg zurueck.
 *
 * Dieselbe Bauweise wie der Kauf und aus demselben Grund: Ein Spieler kann auf
 * einem fremden Akteur nichts anlegen, und der Laden ist ein fremder Akteur.
 * Er schickt also eine Bitte, die Spielleitung prueft von vorn und fuehrt aus.
 *
 * **Der Ankauf ist ab Werk aus.** `system.ankauf` ist der Faktor auf den
 * Grundpreis und steht auf 0 - ein Laden, der ungefragt alles aufkauft, ist die
 * haeufigste Art, wie eine Gruppe ein Dorf in Bargeld verwandelt. Wer ankaufen
 * will, stellt eine Zahl ein; damit ist der Schalter aus Entscheidung 2 des
 * Konzepts derselbe wie der Preis, und es gibt keinen zweiten daneben, den man
 * vergessen kann.
 *
 * **Hier wird `eigeneKasse` zum ersten Mal ernst.** Beim Kauf fuellt sie sich
 * nur; beim Ankauf muss sie reichen. Ein Laden ohne eigene Kasse zahlt
 * unbegrenzt - das ist der Normalfall und macht keine Arbeit. Einer mit Kasse
 * kann pleitegehen, und der Dorfschmied kauft das dritte Langschwert nicht
 * mehr. Genau dafuer ist die Einstellung da.
 */

import { MODULE_ID, WARE, LADEN_TYP } from "./const.js";
import { grundpreisCp, ankaufCp, alsText } from "./preise.js";
import { bezahle, schreibeGut, vermoegenCp } from "./kasse.js";
import { schreibeVerkaufVorgang, schreibeVerkaufErgebnis } from "./marktbuch.js";
import { buchen } from "./ladenbuch.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/**
 * Was sich ueberhaupt verkaufen laesst.
 *
 * Nur Dinge mit Preis und Stueckzahl - Zauber, Klassenmerkmale und
 * Waffenangriffe haben beides nicht und gehoeren nie in diese Liste. Der
 * Ausschluss laeuft ueber die Felder und nicht ueber eine Liste von Typen:
 * Eine Typenliste veraltet mit jeder Systemfassung, die Felder nicht.
 */
export function verkaufbareSachen(figur) {
  if (!figur) return [];
  return figur.items.filter(item => {
    const preis = item.system?.price;
    const menge = item.system?.quantity;
    return preis && Number.isFinite(Number(menge)) && Number(menge) > 0;
  });
}

/**
 * Alles pruefen, ohne etwas anzufassen.
 *
 * @returns {{ok: true, …}|{ok: false, grund: string}}
 */
export function pruefeVerkauf({ laden, item, figur, menge }) {
  if (!laden || laden.type !== LADEN_TYP) return { ok: false, grund: "SHOPS.Kauf.KeinLaden" };
  if (!item) return { ok: false, grund: "SHOPS.Verkauf.WegAusDemRucksack" };
  if (!figur) return { ok: false, grund: "SHOPS.Kauf.KeineFigur" };

  const system = laden.system;
  if (!(system.ankauf > 0)) return { ok: false, grund: "SHOPS.Verkauf.KauftNichtAn" };
  /*
   * Der sofortige Verkauf gilt nur fuer angehaktes. Ohne diese Zeile haenge
   * die Regel allein an der Anzeige, und eine Socket-Nachricht von Hand
   * verkaufte dem Kraeuterhaendler das Langschwert.
   */
  if (!nimmtLadenAn(laden, item)) return { ok: false, grund: "SHOPS.Verkauf.NimmtErNicht" };

  const stueck = Math.max(1, Math.floor(Number(menge) || 1));
  const bestand = Number(item.system?.quantity ?? 0);
  if (bestand < stueck) return { ok: false, grund: "SHOPS.Verkauf.SoVieleNicht" };

  const einzelCp = ankaufCp(grundpreisCp(item.system?.price), system);
  const summeCp = einzelCp * stueck;

  /*
   * Nichts fuer nichts. Bei einem Ankaufsfaktor von 0,5 rundet eine Fackel zu
   * 1 Kupfer auf **null** ab - der Verkauf ging dann durch, der Spieler bekam
   * kein Geld, und im Laden lag Gerümpel. Die Anzeige sperrt den Knopf
   * ohnehin; die Pruefung muss dasselbe sagen, sonst haengt die Regel allein
   * an der Oberflaeche.
   */
  if (summeCp <= 0) return { ok: false, grund: "SHOPS.Verkauf.Wertlos" };

  /*
   * Ein Laden ohne eigene Kasse zahlt aus dem Nichts - das ist Absicht und
   * der Normalfall. Nur wer eine fuehrt, kann sie leerkaufen.
   */
  let ladenZahlt = null;
  if (system.eigeneKasse) {
    ladenZahlt = bezahle(system.kasse, summeCp);
    if (!ladenZahlt) {
      return {
        ok: false, grund: "SHOPS.Verkauf.LadenPleite",
        hatCp: vermoegenCp(system.kasse)
      };
    }
  }

  return { ok: true, stueck, einzelCp, summeCp, bestand, ladenZahlt };
}

/**
 * Den Verkauf ausfuehren. **Nur bei der Spielleitung aufrufen.**
 */
export async function fuehreVerkaufAus({ ladenUuid, itemId, figurUuid, menge = 1, verkaeuferId }) {
  if (!game.user.isGM) return { ok: false, grund: "SHOPS.Kauf.KeinSpielleiter" };

  const laden = await fromUuid(ladenUuid);
  const figur = await fromUuid(figurUuid);
  const item = figur?.items?.get(itemId);
  const verkaeufer = game.users.get(verkaeuferId);

  const pruefung = pruefeVerkauf({ laden, item, figur, menge });
  await schreibeVerkaufVorgang({ laden, item, figur, verkaeufer, pruefung });
  if (!pruefung.ok) return { ok: false, grund: pruefung.grund };

  const { stueck, summeCp, bestand, ladenZahlt } = pruefung;
  const name = item.name;

  try {
    /*
     * Erst anlegen, dann abziehen - dieselbe Reihenfolge wie beim Kauf und aus
     * demselben Grund: Ein doppelter Gegenstand ist eine Laestigkeit, ein
     * verschwundener ein verlorener Abend.
     *
     * Liegt dieselbe Ware schon im Laden, waechst dort der Bestand, statt eine
     * zweite Zeile daneben zu stellen. Sonst stuenden nach drei Verkaeufen drei
     * Zeilen "Langschwert" in der Auslage.
     */
    const vorhanden = laden.items.find(i => i.name === name && i.type === item.type);
    if (vorhanden) {
      await vorhanden.update({ "system.quantity": Number(vorhanden.system.quantity ?? 0) + stueck });
    } else {
      const kopie = item.toObject();
      delete kopie._id;
      kopie.system = kopie.system ?? {};
      kopie.system.quantity = stueck;
      // Die Merkmale des Ladens gehoeren dem Laden - eine angekaufte Ware
      // erbt nicht den Festpreis oder das "verborgen" aus einem fremden.
      delete kopie.flags?.[MODULE_ID];
      await laden.createEmbeddedDocuments("Item", [kopie]);
    }

    // Geld an die Figur.
    await figur.update({ "system.currency": schreibeGut(figur.system?.currency ?? {}, summeCp) });

    // Und aus der Ladenkasse heraus, falls er eine fuehrt.
    if (ladenZahlt) await laden.update({ "system.kasse": ladenZahlt.bestand });

    // Zuletzt aus dem Rucksack nehmen.
    const rest = bestand - stueck;
    if (rest > 0) await item.update({ "system.quantity": rest });
    else await item.delete();
  } catch (fehler) {
    console.error(`${MODULE_ID} | Verkauf abgebrochen`, fehler);
    await schreibeVerkaufErgebnis({ laden, name, figur, verkaeufer, ok: false, grund: String(fehler) });
    return { ok: false, grund: "SHOPS.Kauf.Abgebrochen" };
  }

  await schreibeVerkaufErgebnis({ laden, name, figur, verkaeufer, ok: true, stueck, summeCp });
  await buchen(laden, {
    art: "verkauf",
    userId: verkaeuferId,
    userName: verkaeufer?.name ?? "?",
    figurName: figur.name,
    was: [{ name, menge: stueck }],
    summeCp
  });

  return {
    ok: true,
    text: game.i18n.format("SHOPS.Verkauf.Gelungen", {
      menge: stueck, name, preis: alsText(summeCp, kuerzel)
    })
  };
}

/**
 * Nimmt der Laden **diese** Ware ohne zu fragen?
 *
 * Zwei Bedingungen, und beide muessen gelten: Der Laden fuehrt dasselbe
 * Stueck bereits in seiner Auslage, und dort ist der Haken "kauft er an"
 * gesetzt. Ein Kraeuterhaendler mag Traenke zurueckkaufen und trotzdem kein
 * Langschwert wollen; der Ankaufsfaktor allein sagt darueber nichts.
 *
 * Alles andere geht nicht verloren, es geht nur den anderen Weg: ueber eine
 * Anfrage, zu der die Spielleitung einen Preis nennt.
 */
export function nimmtLadenAn(laden, item) {
  if (!(laden?.system?.ankauf > 0)) return null;
  return laden.items.find(w =>
    w.name === item.name && w.type === item.type
    && w.flags?.[MODULE_ID]?.[WARE.ANKAUF] === true
  ) ?? null;
}

/** Die Liste fuers Spielerfenster: nur, was sofort durchgeht. */
export function verkaufslisteAufbereiten(laden, figur) {
  if (!laden || !figur || !(laden.system.ankauf > 0)) return [];

  return verkaufbareSachen(figur)
    .filter(item => nimmtLadenAn(laden, item))
    .map(item => {
      const grundCp = grundpreisCp(item.system?.price);
      const preisCp = ankaufCp(grundCp, laden.system);
      return {
        id: item.id,
        name: item.name,
        img: item.img,
        menge: Number(item.system?.quantity ?? 1),
        preisText: alsText(preisCp, kuerzel),
        wertlos: preisCp <= 0,
        // Eine Ware, die der Laden selbst als Dienstleistung fuehrt, kauft er
        // nicht zurueck - sie hat nie den Besitzer gewechselt.
        dienst: item.flags?.[MODULE_ID]?.[WARE.DIENST] === true
      };
    })
    .filter(z => !z.dienst)
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}


/**
 * Eine angenommene Anfrage ausfuehren.
 *
 * Derselbe Ablauf wie beim sofortigen Verkauf, nur mit dem ausgehandelten
 * Preis statt dem Ankaufsfaktor - und ohne die Pruefung auf den Haken: Die
 * Spielleitung hat der Sache eben ausdruecklich zugestimmt, das ist die
 * staerkere Erlaubnis.
 *
 * **Das Gegenueber kann eine Person ohne Laden sein.** Dann gilt, was in
 * handel.js zur Boerse steht: Sie wird belastet, aber sie **blockiert nicht**.
 * Wer den Preis genannt hat, hat entschieden; ein Handel, der am leeren Beutel
 * eines NSC scheitert, den die Spielleitung selbst aufgesetzt hat, waere eine
 * Ueberraschung ohne Nutzen. Ein Laden mit `eigeneKasse` kann sehr wohl
 * pleitegehen - das ist der Unterschied zwischen einem Ort und einem Menschen,
 * den man gerade am Feuer getroffen hat.
 */
export async function fuehreAnkaufAus(sitzung) {
  const gegenueber = await fromUuid(sitzung.gegenueberUuid);
  const figur = await fromUuid(sitzung.figurUuid);
  if (!gegenueber || !figur) return { ok: false, grund: "SHOPS.Kauf.KeinLaden" };

  const istLaden = gegenueber.type === LADEN_TYP;
  const summeCp = Math.max(0, Math.round(sitzung.angebotCp ?? 0));

  /* Kann der Laden das ueberhaupt zahlen? Eine Person wird nicht gefragt. */
  let ladenZahlt = null;
  if (istLaden && gegenueber.system.eigeneKasse) {
    ladenZahlt = bezahle(gegenueber.system.kasse, summeCp);
    if (!ladenZahlt) return { ok: false, grund: "SHOPS.Verkauf.LadenPleite" };
  }

  const namen = [];
  try {
    for (const posten of sitzung.posten) {
      const item = figur.items.get(posten.itemId);
      if (!item) continue;
      const stueck = Math.min(posten.menge, Number(item.system?.quantity ?? 0));
      if (stueck <= 0) continue;
      namen.push(item.name);

      // Erst anlegen, dann abziehen - wie ueberall in diesem Modul.
      const vorhanden = gegenueber.items.find(i => i.name === item.name && i.type === item.type);
      if (vorhanden) {
        await vorhanden.update({ "system.quantity": Number(vorhanden.system.quantity ?? 0) + stueck });
      } else {
        const kopie = item.toObject();
        delete kopie._id;
        kopie.system = kopie.system ?? {};
        kopie.system.quantity = stueck;
        delete kopie.flags?.[MODULE_ID];
        await gegenueber.createEmbeddedDocuments("Item", [kopie]);
      }

      const rest = Number(item.system?.quantity ?? 0) - stueck;
      if (rest > 0) await item.update({ "system.quantity": rest });
      else await item.delete();
    }

    await figur.update({ "system.currency": schreibeGut(figur.system?.currency ?? {}, summeCp) });
    if (ladenZahlt) await gegenueber.update({ "system.kasse": ladenZahlt.bestand });

    // Der Beutel der Person, falls sie einen hat. Reicht er nicht, bleibt er
    // unberuehrt - der Handel gilt trotzdem, siehe oben.
    if (!istLaden && gegenueber.system?.currency) {
      const gezahlt = bezahle(gegenueber.system.currency, summeCp);
      if (gezahlt) await gegenueber.update({ "system.currency": gezahlt.bestand });
    }
  } catch (fehler) {
    console.error(`${MODULE_ID} | Ankauf abgebrochen`, fehler);
    return { ok: false, grund: "SHOPS.Kauf.Abgebrochen" };
  }

  const verkaeufer = game.users.get(sitzung.spielerId);
  const was = sitzung.posten.map(p => ({ name: p.name, menge: p.menge }));

  if (istLaden) {
    await schreibeVerkaufErgebnis({
      laden: gegenueber, name: namen.join(", "), figur, verkaeufer,
      ok: true, stueck: sitzung.posten.length, summeCp
    });

    // Nur ein Laden fuehrt ein Buch. Eine Person hat keines.
    await buchen(gegenueber, {
      art: "verkauf",
      userId: sitzung.spielerId,
      userName: sitzung.spielerName,
      figurName: figur.name,
      was, summeCp,
      // Ein ausgehandelter Preis ist keiner nach Faktor - das gehoert dazu.
      sonderpreis: true
    });
  } else {
    const { schreibeHandelVerkauf } = await import("./marktbuch.js");
    await schreibeHandelVerkauf({ person: gegenueber, verkaeufer, figur, ok: true, was, summeCp });
  }

  return { ok: true, text: game.i18n.format("SHOPS.Anfrage.Erledigt", { preis: alsText(summeCp, kuerzel) }) };
}
