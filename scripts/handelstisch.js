/**
 * Der Handelstisch - ein Blatt statt sieben Fenster.
 *
 * **Warum es ihn gibt.** Der Handel mit einer Person lief bis hierher über
 * vier Fenster: eines zum Zusammenstellen, eines zum Hinlegen, eines zum
 * Packen der Gegenleistung, eines zum Verhandeln. Beim Testen am 08.09.2026
 * kam heraus, was daran nicht stimmt - und zwar nicht als ein Fehler, sondern
 * als sechs: Man konnte keinen Preis nennen; man konnte nur ein Gegenangebot
 * machen und nur in den Münzen der Spielleitung; das Schließen eines Fensters
 * warf den Handel weg; das Verkaufen machte das Fenster kleiner statt größer;
 * „Ich hätte da auch etwas" öffnete noch eines dazu.
 *
 * Sechs Symptome, eine Ursache: **Jeder Schritt hatte ein eigenes Fenster.**
 * Baldur's Gate und Divinity zeigen denselben Vorgang auf einem Blatt - links
 * seine Sachen, rechts meine, unten die Differenz, ein Knopf. Das ist keine
 * Geschmacksfrage, sondern der Unterschied zwischen „ich sehe, was der Tausch
 * kostet" und „ich klicke mich durch und rechne selbst".
 *
 * **Der Tisch gilt vorerst nur für den Handel mit einer Person.** Das
 * Ladenfenster bleibt, wie es ist; dort funktioniert das Kaufen. Es bekommt
 * dieselbe Bedienung später - dann ist sie überall gleich.
 *
 * ── Wie er gebaut ist ───────────────────────────────────────────────
 *
 * **Der Handel liegt als Merkmal am Benutzer**, wie bisher schon. Das ist
 * jetzt keine Nebensache mehr, sondern die Antwort auf einen der Fehler: Ein
 * geschlossenes Fenster darf den Handel nicht wegwerfen. Er läuft, bis der
 * Spieler ihn beendet oder die Spielleitung ihn zurücknimmt - ein Neuladen,
 * ein versehentliches Wegklicken und ein Absturz ändern daran nichts. Wer das
 * Fenster zumacht, bekommt unten rechts einen Knopf, der es zurückholt.
 *
 * **Nur die Spielleitung schreibt.** Ein Spieler kann fremde Merkmale nicht
 * ändern, und seine Werte kämen von seinem Client. Er schickt also Bitten:
 * „leg das auf meine Seite", „nimm das wieder weg", „ich nehme an". Gerechnet
 * wird bei der Spielleitung, und die Werte stehen fertig im Merkmal.
 *
 * **Beide Seiten tragen ihren Wert mit sich.** Was die Person hinlegt, zählt
 * mit dem Verkaufspreis (Aufschlag ihres Ladens, falls sie einen führt); was
 * der Spieler hinlegt, mit dem, was sie dafür gäbe. Die Differenz steht unten
 * und ist der Preis - **es sei denn, die Spielleitung überschreibt ihn.** Sie
 * hat immer das letzte Wort; das Modul rechnet nur vor.
 */

import { MODULE_ID, SOCKET, WARE } from "./const.js";
import { grundpreisCp, preisCp, alsText, wechselgeldText, alsMuenzfeld, ausMuenzfeld,
         PREIS_SORTEN } from "./preise.js";
import { bezahle, schreibeGut, vermoegenCp } from "./kasse.js";
import { einlagern } from "./lager.js";
import { darfIchAusfuehren, bittenKennung } from "./vorsitz.js";
import { laedenVon } from "./verknuepfung.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Merkmal am Benutzer: der offene Handel. Einer je Spieler. */
export const TISCH = "handel";

/**
 * Was eine Person für gebrauchte Ware gibt, als Faktor auf den Grundpreis.
 * Dieselbe Zahl wie in anfrage.js und aus demselben Grund: Eine Person hat
 * keine Ankaufspolitik, und die Hälfte ist die Zahl, die am Tisch fällt.
 */
const PERSON_ANKAUF = 0.5;

/* ── Rechnen ───────────────────────────────────────────────────────── */

/** Was die Person für dieses Stück haben will. */
function wertHergeben(person, item) {
  const laeden = laedenVon(person);
  const laden = laeden.length === 1 ? laeden[0] : null;
  const fest = item.flags?.[MODULE_ID]?.[WARE.FESTPREIS];
  return preisCp(grundpreisCp(item.system?.price), laden?.system,
                 Number.isFinite(fest) ? fest : null);
}

/** Was die Person für dieses Stück gibt. */
function wertAnnehmen(item) {
  return Math.floor(grundpreisCp(item.system?.price) * PERSON_ANKAUF);
}

const summe = seite => (seite ?? []).reduce((s, p) => s + p.wertCp * p.menge, 0);

/**
 * Was eine Seite insgesamt hinlegt - Ware **und** Geld.
 *
 * **Geld ist ein Ding auf dem Tisch, kein Sonderfall.** Der erste Entwurf
 * kannte nur Ware und rechnete die Differenz aus; wer fuenf Gold drauflegen
 * wollte, hatte keinen Ort dafuer. Ein Feld „ich biete" half nicht wirklich -
 * das ist ein Vorschlag fuer den Endpreis, nicht dasselbe wie Muenzen, die
 * man vor sich hinlegt und die jeder sofort mitrechnen sieht.
 */
const seitenwert = (seite, geldCp) => summe(seite) + Math.max(0, Math.round(geldCp || 0));

/**
 * Der Handel, fertig für die Anzeige.
 *
 * `differenzCp` ist positiv, wenn der Spieler zahlt. Ein überschriebener Preis
 * ersetzt sie - dann rechnet niemand mehr nach, dann gilt das Wort.
 */
export function tischStand(handel) {
  if (!handel) return null;
  const nscCp = seitenwert(handel.seiteNsc, handel.geldNsc);
  const spielerCp = seitenwert(handel.seiteSpieler, handel.geldSpieler);
  const roh = nscCp - spielerCp;
  const gilt = Number.isFinite(handel.preisCp) ? handel.preisCp : roh;

  const schmuecken = seite => (seite ?? []).map(p => ({
    ...p, summeText: alsText(p.wertCp * p.menge, kuerzel)
  }));

  return {
    ...handel,
    seiteNsc: schmuecken(handel.seiteNsc),
    seiteSpieler: schmuecken(handel.seiteSpieler),
    nscText: alsText(nscCp, kuerzel),
    spielerText: alsText(spielerCp, kuerzel),
    differenzCp: gilt,
    /*
     * **Zwei Zusagen, nicht eine.** Bis hierher schloss der Spieler allein ab:
     * Er konnte etwas auf seine Seite legen und sofort bestaetigen, ohne dass
     * die Spielleitung dieser Zusammenstellung je zugestimmt haette. Ein
     * Tausch ist aber eine Abrede zwischen zweien.
     *
     * **Jede Aenderung setzt beide zurueck.** Wer nach der Zusage noch etwas
     * dazulegt oder den Preis anfasst, handelt einen anderen Tausch aus - und
     * die alte Zusage galt ihm nicht.
     */
    bereitSpieler: handel.bereitSpieler === true,
    bereitGm: handel.bereitGm === true,
    ueberschrieben: Number.isFinite(handel.preisCp) && handel.preisCp !== roh,
    zahltSpieler: gilt > 0,
    bekommtSpieler: gilt < 0,
    ausgeglichen: gilt === 0,
    differenzText: alsText(Math.abs(gilt), kuerzel),
    /*
     * Fürs Eingabefeld der Spielleitung: Zahl **und** Münzsorte. Nur Gold
     * anzubieten hiess, dass sechs Silber als „0,6" getippt werden mussten und
     * drei Kupfer gar nicht gingen. Das Vorzeichen bleibt erhalten - negativ
     * heisst, die Person gibt heraus.
     */
    preisFeld: alsMuenzfeld(gilt, { vorzeichen: true }),
    geldNsc: handel.geldNsc ?? 0,
    geldSpieler: handel.geldSpieler ?? 0,
    geldNscText: alsText(handel.geldNsc ?? 0, kuerzel),
    geldSpielerText: alsText(handel.geldSpieler ?? 0, kuerzel),
    geldNscFeld: alsMuenzfeld(handel.geldNsc ?? 0),
    geldSpielerFeld: alsMuenzfeld(handel.geldSpieler ?? 0),
    leer: !(handel.seiteNsc?.length || handel.seiteSpieler?.length
            || handel.geldNsc || handel.geldSpieler)
  };
}

/** Der eigene offene Handel. */
export function eigenerTisch() {
  return game.user.getFlag(MODULE_ID, TISCH) ?? null;
}

/* ── Was die Spielleitung tut ──────────────────────────────────────── */

/** Einen Tisch aufmachen - oder den bestehenden um Empfänger erweitern. */
export async function tischOeffnen(person, benutzerIds, satz = "") {
  if (!game.user.isGM || !person) return;
  const an = [...new Set(benutzerIds)].filter(id => game.users.get(id));
  if (!an.length) return ui.notifications.warn(game.i18n.localize("SHOPS.Handel.NiemandGewaehlt"));

  for (const id of an) {
    const benutzer = game.users.get(id);
    const schon = benutzer.getFlag(MODULE_ID, TISCH);
    // Ein laufender Handel mit derselben Person wird nicht zurückgesetzt -
    // sonst räumte ein zweites Aufmachen den Tisch ab, den man gerade deckt.
    if (schon?.personUuid === person.uuid) continue;
    await benutzer.setFlag(MODULE_ID, TISCH, {
      id: foundry.utils.randomID(),
      personUuid: person.uuid,
      personName: person.name,
      personBild: person.prototypeToken?.texture?.src || person.img || null,
      satz: String(satz ?? "").slice(0, 200),
      seiteNsc: [], seiteSpieler: [],
      geldNsc: 0, geldSpieler: 0,
      preisCp: null,
      bereitSpieler: false,
      bereitGm: false,
      von: game.user.name
    });
  }
  await funken(an);
  ui.notifications.info(game.i18n.format("SHOPS.Tisch.Eroeffnet",
    { anzahl: an.length, person: person.name }));
}

/** Etwas auf eine Seite legen. Läuft immer bei der Spielleitung. */
export async function auflegen(benutzerId, seite, itemId, menge = 1) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;

  const person = await fromUuid(handel.personUuid);
  const figur = benutzer.character;
  const traeger = seite === "nsc" ? person : figur;
  const item = traeger?.items?.get(itemId);
  if (!item) return;

  const vorrat = Number(item.system?.quantity ?? 1);
  const feld = seite === "nsc" ? "seiteNsc" : "seiteSpieler";
  const liste = [...(handel[feld] ?? [])];
  const drin = liste.find(p => p.itemId === itemId);
  const wunsch = Math.max(1, Math.floor(Number(menge) || 1));

  // Nie mehr auflegen, als wirklich da liegt.
  const schon = drin?.menge ?? 0;
  const platz = Math.max(0, vorrat - schon);
  if (platz <= 0) return;
  const dazu = Math.min(wunsch, platz);

  if (drin) drin.menge += dazu;
  else liste.push({
    itemId, name: item.name, img: item.img || null, menge: dazu,
    wertCp: seite === "nsc" ? wertHergeben(person, item) : wertAnnehmen(item)
  });

  // Jede Änderung setzt einen überschriebenen Preis zurück: Er galt für einen
  // anderen Tisch als den, der jetzt daliegt.
  await benutzer.setFlag(MODULE_ID, TISCH,
    { ...handel, [feld]: liste, preisCp: null, bereitSpieler: false, bereitGm: false });
  await funken([benutzerId]);
}

/** Etwas wieder herunternehmen. */
export async function wegnehmen(benutzerId, seite, itemId) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;
  const feld = seite === "nsc" ? "seiteNsc" : "seiteSpieler";
  const liste = (handel[feld] ?? []).filter(p => p.itemId !== itemId);
  await benutzer.setFlag(MODULE_ID, TISCH,
    { ...handel, [feld]: liste, preisCp: null, bereitSpieler: false, bereitGm: false });
  await funken([benutzerId]);
}

/**
 * Geld auf eine Seite legen.
 *
 * Es zaehlt wie Ware: Die Summe der Seite waechst, und die Waage unten sagt
 * sofort, was danach noch fehlt. Mehr als da ist, geht nicht - wer nichts hat,
 * legt nichts hin.
 */
export async function geldSetzen(benutzerId, seite, betragCp) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;

  const traeger = seite === "nsc"
    ? await fromUuid(handel.personUuid)
    : benutzer.character;
  const habe = vermoegenCp(traeger?.system?.currency ?? {});
  const wert = Math.max(0, Math.min(Math.round(Number(betragCp) || 0), habe));

  const feld = seite === "nsc" ? "geldNsc" : "geldSpieler";
  await benutzer.setFlag(MODULE_ID, TISCH,
    { ...handel, [feld]: wert, preisCp: null, bereitSpieler: false, bereitGm: false });
  await funken([benutzerId]);
}

/** Den Preis überschreiben. `null` gibt die Rechnung wieder frei. */
export async function preisSetzen(benutzerId, preisCp) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;
  const wert = preisCp === null ? null : Math.round(Number(preisCp) || 0);
  // Ein neuer Preis ist ein neuer Handel - beide sagen noch einmal zu.
  await benutzer.setFlag(MODULE_ID, TISCH,
    { ...handel, preisCp: wert, bereitSpieler: false, bereitGm: false });
  await funken([benutzerId]);
}

/**
 * Beide haben zugesagt - jetzt wird getauscht.
 *
 * Steht eigens hier und nicht im Socket-Verteiler: Ausgelöst wird der
 * Abschluss von der **zweiten** Zusage, und die kann von beiden Seiten
 * kommen - vom Spieler über den Socket oder von der Spielleitung mit einem
 * Klick in ihrem eigenen Fenster.
 */
async function abschliessen(benutzerId) {
  const spieler = game.users.get(benutzerId);
  const vorher = spieler?.getFlag(MODULE_ID, TISCH);
  const ergebnis = await abschliessenAusfuehren(benutzerId);

  const { aufAntwort } = await import("./socket.js");
  game.socket.emit(SOCKET.NAME, { typ: SOCKET.ANTWORT, an: [benutzerId], ergebnis });
  if (benutzerId === game.user.id) aufAntwort({ an: [benutzerId], ergebnis });

  /*
   * Auch die Spielleitung erfaehrt es: Sie hat den Preis gesetzt und sitzt
   * womoeglich nicht daneben. Sonst saehe sie den Tisch verschwinden und
   * wuesste nicht, ob abgeschlossen oder abgebrochen wurde.
   */
  if (ergebnis?.ok) {
    const stand = tischStand(vorher);
    ui.notifications.info(game.i18n.format("SHOPS.Tisch.GMGelungen", {
      spieler: spieler?.name ?? "?",
      person: vorher?.personName ?? "?",
      geld: stand ? stand.differenzText : ""
    }));
    foundry.applications.instances.get(`${MODULE_ID}-tisch-gm-${benutzerId}`)?.close();
  } else if (ergebnis?.grund) {
    // Scheitert es, bleibt der Tisch stehen - aber ohne Zusagen.
    const jetzt = spieler?.getFlag(MODULE_ID, TISCH);
    if (jetzt) await spieler.setFlag(MODULE_ID, TISCH,
      { ...jetzt, bereitSpieler: false, bereitGm: false });
    ui.notifications.warn(game.i18n.localize(ergebnis.grund));
  }
  await funken([benutzerId]);
}

/**
 * Eine Zusage setzen - und ausführen, sobald beide stehen.
 *
 * Läuft immer bei der Spielleitung; der Spieler schickt nur seine Bitte.
 */
export async function bereitSetzen(benutzerId, wer, wert = true) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;

  const feld = wer === "gm" ? "bereitGm" : "bereitSpieler";
  await benutzer.setFlag(MODULE_ID, TISCH, { ...handel, [feld]: !!wert });

  const jetzt = benutzer.getFlag(MODULE_ID, TISCH);
  if (jetzt?.bereitGm && jetzt?.bereitSpieler) return void await abschliessen(benutzerId);

  await funken([benutzerId]);
  const wartetAuf = wer === "gm"
    ? benutzer.name
    : (handel.personName ?? game.i18n.localize("SHOPS.Tisch.DieAndereSeite"));
  ui.notifications.info(game.i18n.format("SHOPS.Tisch.WartetAuf", { wer: wartetAuf }));
}

/** Den Tisch abräumen - für einen Spieler oder für alle. */
export async function tischBeenden(benutzerIds = null) {
  if (!game.user.isGM) return;
  const ziele = benutzerIds
    ? benutzerIds.map(id => game.users.get(id)).filter(Boolean)
    : game.users.filter(u => u.getFlag(MODULE_ID, TISCH));
  for (const u of ziele) await u.unsetFlag(MODULE_ID, TISCH);
  await funken(ziele.map(u => u.id));
}

/** Wer hat gerade einen Tisch offen? */
export function tischTraeger() {
  return game.users.filter(u => u.getFlag(MODULE_ID, TISCH));
}

/* ── Abschließen ───────────────────────────────────────────────────── */

/**
 * Den Tausch ausführen.
 *
 * **Erst anlegen, dann abziehen** - wie überall in diesem Modul: Bricht es
 * dazwischen ab, gibt es einen Gegenstand doppelt statt gar nicht.
 *
 * Das Geld der Person blockiert nicht. Wer den Preis genannt hat, hat
 * entschieden; ein Handel, der am leeren Beutel eines NSC scheitert, den die
 * Spielleitung selbst aufgesetzt hat, wäre eine Überraschung ohne Nutzen.
 */
async function abschliessenAusfuehren(benutzerId) {
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return { ok: false, grund: "SHOPS.Handel.NichtMehrDa" };

  const person = await fromUuid(handel.personUuid);
  const figur = benutzer.character;
  if (!person || !figur) return { ok: false, grund: "SHOPS.Kauf.KeineFigur" };

  const stand = tischStand(handel);
  const zahlt = stand.differenzCp;

  // Reicht das Geld? Nur der Spieler wird gefragt.
  let gezahlt = null;
  if (zahlt > 0) {
    gezahlt = bezahle(figur.system?.currency ?? {}, zahlt);
    if (!gezahlt) {
      return { ok: false, grund: "SHOPS.Kauf.ZuWenigGeld",
               fehltCp: zahlt - vermoegenCp(figur.system?.currency ?? {}) };
    }
  }

  // Liegt alles noch da, was auf dem Tisch liegt?
  for (const [seite, traeger] of [["seiteNsc", person], ["seiteSpieler", figur]]) {
    for (const p of handel[seite] ?? []) {
      const item = traeger.items.get(p.itemId);
      if (!item || Number(item.system?.quantity ?? 0) < p.menge) {
        return { ok: false, grund: "SHOPS.Handel.NichtMehrDa" };
      }
    }
  }

  try {
    // Ware über den Tisch, in beide Richtungen.
    for (const [seite, von, zu] of [["seiteNsc", person, figur], ["seiteSpieler", figur, person]]) {
      for (const p of handel[seite] ?? []) {
        const item = von.items.get(p.itemId);
        await einlagern(zu, item, p.menge);
        const rest = Number(item.system?.quantity ?? 0) - p.menge;
        if (rest > 0) await item.update({ "system.quantity": rest });
        else await item.delete();
      }
    }

    // Und das Geld.
    if (zahlt > 0) {
      await figur.update({ "system.currency": gezahlt.bestand });
      if (person.system?.currency) {
        await person.update({ "system.currency": schreibeGut(person.system.currency, zahlt) });
      }
    } else if (zahlt < 0) {
      await figur.update({ "system.currency": schreibeGut(figur.system?.currency ?? {}, -zahlt) });
      if (person.system?.currency) {
        const raus = bezahle(person.system.currency, -zahlt);
        if (raus) await person.update({ "system.currency": raus.bestand });
      }
    }

    await benutzer.unsetFlag(MODULE_ID, TISCH);
  } catch (fehler) {
    console.error(`${MODULE_ID} | Handel abgebrochen`, fehler);
    return { ok: false, grund: "SHOPS.Kauf.Abgebrochen" };
  }

  /*
   * **Eine Zeile, nicht zwei.** Der erste Entwurf schrieb je Seite eine -
   * und bei einem Tausch, den der Spieler bezahlt, stand daneben „verkauft
   * fuer 0 KM". Er hatte aber einen Streitkolben hergegeben, nicht
   * verschenkt. Das Buch beantwortet die Frage „wo sind die vierhundert Gold
   * geblieben"; es fliesst genau ein Betrag, und der steht in einer Zeile.
   * Was ueber den Tisch ging, steht vollstaendig daneben - in beide
   * Richtungen.
   */
  const { schreibeHandel, schreibeHandelVerkauf } = await import("./marktbuch.js");
  const was = [...(handel.seiteNsc ?? []), ...(handel.seiteSpieler ?? [])]
    .map(p => ({ name: p.name, menge: p.menge }));

  if (was.length) {
    const schreiben = zahlt < 0 ? schreibeHandelVerkauf : schreibeHandel;
    await schreiben({
      person, figur, ok: true, was, summeCp: Math.abs(zahlt),
      kaeufer: benutzer, verkaeufer: benutzer
    });
  }

  const zurueck = gezahlt ? wechselgeldText(gezahlt.zurueck, kuerzel) : null;
  const satz = game.i18n.format("SHOPS.Tisch.Gelungen", { person: person.name });
  return { ok: true, text: zurueck
    ? `${satz} ${game.i18n.format("SHOPS.Kauf.Wechselgeld", { geld: zurueck })}` : satz };
}

/* ── Was der Spieler schickt ───────────────────────────────────────── */

function bitte(tat, mehr = {}) {
  const paket = { typ: SOCKET.HANDEL, tat, spielerId: game.user.id,
                  bitteId: bittenKennung(), ...mehr };
  game.socket.emit(SOCKET.NAME, paket);
  if (game.user.isGM) aufTisch(paket);
}

export const tischAuflegen  = (itemId, menge) => bitte("auflegen", { seite: "spieler", itemId, menge });
export const tischWegnehmen = itemId => bitte("wegnehmen", { seite: "spieler", itemId });
export const tischAnnehmen  = () => bitte("annehmen");
export const tischWiderrufen = () => bitte("widerrufen");
export const tischGeld      = cp => bitte("geld", { betragCp: cp });
export const tischAufgeben  = () => bitte("aufgeben");

/* ── Empfang ───────────────────────────────────────────────────────── */

/** Alle betroffenen Clients neu zeichnen lassen. */
async function funken(an) {
  const paket = { typ: SOCKET.HANDEL, tat: "stand", an };
  game.socket.emit(SOCKET.NAME, paket);
  aufTisch(paket);
}

/** Einstiegspunkt aus socket.js. */
export async function aufTisch(daten) {
  if (daten.tat === "stand") {
    tischZeichnen();
    // Die Spielleitung sieht die Tische aller Spieler in ihrem eigenen Fenster.
    for (const app of foundry.applications.instances.values()) {
      if (app instanceof HandelstischGM) app.render(false);
    }
    return;
  }

  if (!game.user.isGM) return;
  if (!await darfIchAusfuehren(daten.bitteId)) return;

  switch (daten.tat) {
    case "auflegen":  return void await auflegen(daten.spielerId, "spieler", daten.itemId, daten.menge);
    case "wegnehmen": return void await wegnehmen(daten.spielerId, "spieler", daten.itemId);
    case "geld":      return void await geldSetzen(daten.spielerId, "spieler", daten.betragCp);
    case "aufgeben": {
      const handel = game.users.get(daten.spielerId)?.getFlag(MODULE_ID, TISCH);
      await tischBeenden([daten.spielerId]);
      ui.notifications.info(game.i18n.format("SHOPS.Handel.Abgelehnt", {
        spieler: game.users.get(daten.spielerId)?.name ?? "?",
        person: handel?.personName ?? "?"
      }));
      return;
    }
    // Der Spieler sagt zu. Ausgefuehrt wird erst, wenn beide zugesagt haben.
    case "annehmen": return void await bereitSetzen(daten.spielerId, "spieler", true);
    case "widerrufen": return void await bereitSetzen(daten.spielerId, "spieler", false);

  }
}

/* ── Das Fenster des Spielers ──────────────────────────────────────── */

export class Handelstisch extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-tisch`,
    classes: ["ninjos-shops", "shops-tisch"],
    position: { width: 760, height: "auto" },
    window: { icon: "fa-solid fa-handshake", resizable: true },
    actions: {
      ansehen: Handelstisch.#ansehen,
      auflegen: Handelstisch.#auflegen,
      wegnehmen: Handelstisch.#wegnehmen,
      annehmen: Handelstisch.#annehmen,
      geldLegen: Handelstisch.#geldLegen,
      geldWeg: () => tischGeld(0),
      aufgeben: Handelstisch.#aufgeben
    }
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/handelstisch.hbs`,
      scrollable: [".shops-tisch-nsc", ".shops-tisch-spieler", ".shops-tisch-vorrat"]
    }
  };

  get title() {
    return game.i18n.format("SHOPS.Tisch.Titel", { person: eigenerTisch()?.personName ?? "" });
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const handel = eigenerTisch();
    const figur = game.user.character;
    const stand = tischStand(handel);
    const aufDemTisch = new Set((handel?.seiteSpieler ?? []).map(p => p.itemId));

    const { verkaufbareSachen } = await import("./verkauf.js");
    return Object.assign(ctx, {
      stand,
      muenzsorten: PREIS_SORTEN.map(sorte => ({ sorte, kuerzel: kuerzel(sorte) })),
      figurName: figur?.name ?? null,
      boerse: figur ? alsText(vermoegenCp(figur.system?.currency ?? {}), kuerzel) : null,
      // Was der Spieler noch hinlegen könnte.
      vorrat: figur ? verkaufbareSachen(figur)
        .filter(i => !aufDemTisch.has(i.id))
        .map(i => ({ id: i.id, name: i.name, img: i.img,
                     menge: Number(i.system?.quantity ?? 1),
                     wertText: alsText(wertAnnehmen(i), kuerzel) }))
        .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang)) : []
    });
  }

  static async #ansehen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    const seite = ziel.closest("[data-seite]")?.dataset.seite;
    const handel = eigenerTisch();
    if (!itemId || !handel) return;
    const traeger = seite === "nsc" ? await fromUuid(handel.personUuid) : game.user.character;
    if (!traeger) return;
    const { wareAnsehen } = await import("./ware-ansehen.js");
    wareAnsehen(traeger, itemId);
  }

  static #auflegen(ereignis, ziel) {
    const zeile = ziel.closest("[data-item-id]");
    const menge = Number(zeile?.querySelector("[data-menge]")?.value) || 1;
    if (zeile) tischAuflegen(zeile.dataset.itemId, menge);
  }

  static #wegnehmen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    if (itemId) tischWegnehmen(itemId);
  }

  static #annehmen() {
    // Schon zugesagt? Dann nimmt der Knopf die Zusage zurueck.
    if (eigenerTisch()?.bereitSpieler) tischWiderrufen();
    else tischAnnehmen();
  }

  /** Geld auf die eigene Seite legen. */
  static #geldLegen() {
    const feld = this.element.querySelector("[data-geld]");
    const sorte = this.element.querySelector("[data-geldsorte]");
    if (!feld) return;
    tischGeld(ausMuenzfeld(feld.value, sorte?.value ?? "gp"));
  }

  static async #aufgeben() {
    const handel = eigenerTisch();
    const sicher = await DialogV2.confirm({
      window: { title: game.i18n.localize("SHOPS.Tisch.AufgebenTitel") },
      classes: ["ninjos-shops"],
      content: `<p class="shops-kaufdialog">${game.i18n.format("SHOPS.Tisch.AufgebenFrage",
        { person: foundry.utils.escapeHTML(handel?.personName ?? "") })}</p>`,
      yes: { label: game.i18n.localize("SHOPS.Tisch.Aufgeben"), icon: "fa-solid fa-hand" },
      no: { label: game.i18n.localize("SHOPS.Abbrechen") },
      defaultYes: false
    });
    if (sicher) tischAufgeben();
  }

  /**
   * @override
   *
   * **Zumachen beendet den Handel nicht.** Genau das war einer der Fehler: Wer
   * das Fenster wegklickte, war raus. Der Handel läuft weiter, und unten
   * rechts erscheint der Knopf, der ihn zurückholt.
   */
  async close(options = {}) {
    const raus = await super.close(options);
    chipNachziehen();
    return raus;
  }
}

/* ── Der Knopf, der den Tisch zurückholt ───────────────────────────── */

const CHIP = `${MODULE_ID}-tischchip`;

function chipNachziehen() {
  document.getElementById(CHIP)?.remove();
  const handel = eigenerTisch();
  const offen = foundry.applications.instances.get(`${MODULE_ID}-tisch`)?.rendered;
  if (!handel || offen) return;

  const chip = document.createElement("button");
  chip.id = CHIP;
  chip.type = "button";
  chip.className = "ninjos-shops shops-tischchip";
  chip.innerHTML = `<i class="fa-solid fa-handshake" aria-hidden="true"></i>
    <span>${game.i18n.format("SHOPS.Tisch.Zurueckholen",
      { person: foundry.utils.escapeHTML(handel.personName ?? "") })}</span>`;
  chip.addEventListener("click", () => tischZeigen());
  document.body.append(chip);
}

/* ── Auf- und zumachen ─────────────────────────────────────────────── */

let fenster = null;

/** Den Tisch beim Spieler zeigen. */
export function tischZeigen() {
  if (!eigenerTisch()) return null;
  fenster ??= new Handelstisch();
  fenster.render(true);
  document.getElementById(CHIP)?.remove();
  return fenster;
}

/** Zeichnen, was gerade gilt: Fenster, Chip, oder nichts. */
export function tischZeichnen() {
  const handel = eigenerTisch();
  const app = foundry.applications.instances.get(`${MODULE_ID}-tisch`);
  if (!handel) {
    app?.close({ force: true });
    document.getElementById(CHIP)?.remove();
    fenster = null;
    return;
  }
  if (app?.rendered) app.render(false);
  else chipNachziehen();
}

/**
 * Haken anmelden. Gehört in `ready`.
 *
 * Ein Tisch überlebt ein Neuladen - deshalb kommt er beim Start von selbst
 * zurück. Als Fenster, wenn er neu ist; als Knopf, wenn er schon lief.
 */
export function tischEinrichten() {
  Hooks.on("updateUser", (benutzer, aenderungen) => {
    if (benutzer.id !== game.user.id) return;
    if (!foundry.utils.hasProperty(aenderungen, `flags.${MODULE_ID}.${TISCH}`)) return;
    const handel = eigenerTisch();
    const app = foundry.applications.instances.get(`${MODULE_ID}-tisch`);
    if (handel && !app?.rendered) tischZeigen();
    else tischZeichnen();
  });

  tischHakenGM();
  if (eigenerTisch()) tischZeigen();
}

/* ── Das Fenster der Spielleitung ──────────────────────────────────── */

/**
 * Dieselbe Ansicht, andere Seite: Die Spielleitung deckt den Tisch der Person
 * und setzt den Preis. Ein Fenster je Spieler - zwei Leute, die gleichzeitig
 * mit derselben Person handeln, führen zwei Gespräche.
 */
export class HandelstischGM extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-tisch-gm`,
    classes: ["ninjos-shops", "shops-tisch", "shops-tisch-gm"],
    position: { width: 820, height: "auto" },
    window: { icon: "fa-solid fa-handshake", resizable: true },
    actions: {
      ansehen: HandelstischGM.#ansehen,
      auflegen: HandelstischGM.#auflegen,
      wegnehmen: HandelstischGM.#wegnehmen,
      preisUebernehmen: HandelstischGM.#preisUebernehmen,
      preisFrei: HandelstischGM.#preisFrei,
      bestaetigen: HandelstischGM.#bestaetigen,
      geldLegen: HandelstischGM.#geldLegen,
      geldWeg: HandelstischGM.#geldWeg,
      beenden: HandelstischGM.#beenden
    }
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/handelstisch-gm.hbs`,
      scrollable: [".shops-tisch-nsc", ".shops-tisch-spieler", ".shops-tisch-vorrat"]
    }
  };

  #benutzerId;

  constructor(benutzerId, options = {}) {
    super(options);
    this.#benutzerId = benutzerId;
  }

  get benutzerId() { return this.#benutzerId; }

  get title() {
    const name = game.users.get(this.#benutzerId)?.name ?? "";
    return game.i18n.format("SHOPS.Tisch.GMTitel", { spieler: name });
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const benutzer = game.users.get(this.#benutzerId);
    const handel = benutzer?.getFlag(MODULE_ID, TISCH);
    const stand = tischStand(handel);
    const person = handel ? await fromUuid(handel.personUuid) : null;
    const aufDemTisch = new Set((handel?.seiteNsc ?? []).map(p => p.itemId));

    const handelbar = new Set(["weapon", "equipment", "consumable", "tool",
                               "loot", "container", "backpack"]);
    return Object.assign(ctx, {
      stand,
      muenzsorten: PREIS_SORTEN.map(sorte => ({ sorte, kuerzel: kuerzel(sorte) })),
      spielerName: benutzer?.name ?? "?",
      figurName: benutzer?.character?.name ?? null,
      boerse: benutzer?.character
        ? alsText(vermoegenCp(benutzer.character.system?.currency ?? {}), kuerzel) : null,
      vorrat: person ? person.items
        .filter(i => handelbar.has(i.type) && !aufDemTisch.has(i.id))
        .map(i => ({ id: i.id, name: i.name, img: i.img,
                     menge: Number(i.system?.quantity ?? 1),
                     wertText: alsText(wertHergeben(person, i), kuerzel) }))
        .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang)) : []
    });
  }

  static async #ansehen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    const handel = game.users.get(this.benutzerId)?.getFlag(MODULE_ID, TISCH);
    const person = handel ? await fromUuid(handel.personUuid) : null;
    if (!itemId || !person) return;
    const { wareAnsehen } = await import("./ware-ansehen.js");
    wareAnsehen(person, itemId);
  }

  static #auflegen(ereignis, ziel) {
    const zeile = ziel.closest("[data-item-id]");
    const menge = Number(zeile?.querySelector("[data-menge]")?.value) || 1;
    if (zeile) auflegen(this.benutzerId, "nsc", zeile.dataset.itemId, menge);
  }

  static #wegnehmen(ereignis, ziel) {
    const zeile = ziel.closest("[data-item-id]");
    const seite = ziel.closest("[data-seite]")?.dataset.seite ?? "nsc";
    if (zeile) wegnehmen(this.benutzerId, seite, zeile.dataset.itemId);
  }

  static #preisUebernehmen() {
    const feld = this.element.querySelector("[data-preis]");
    const sorte = this.element.querySelector("[data-sorte]");
    if (!feld) return;
    preisSetzen(this.benutzerId, ausMuenzfeld(feld.value, sorte?.value ?? "gp"));
  }

  static #preisFrei() { preisSetzen(this.benutzerId, null); }

  /** Was der Spieler bietet, zum Preis machen. */
  /** Geld auf die Seite der Person legen. */
  static #geldLegen() {
    const feld = this.element.querySelector("[data-geld]");
    const sorte = this.element.querySelector("[data-geldsorte]");
    if (!feld) return;
    geldSetzen(this.benutzerId, "nsc", ausMuenzfeld(feld.value, sorte?.value ?? "gp"));
  }

  static #geldWeg() { geldSetzen(this.benutzerId, "nsc", 0); }

  /** Die Zusage der Spielleitung - und der Abschluss, wenn beide stehen. */
  static #bestaetigen() {
    const handel = game.users.get(this.benutzerId)?.getFlag(MODULE_ID, TISCH);
    bereitSetzen(this.benutzerId, "gm", !handel?.bereitGm);
  }

  static async #beenden() {
    await tischBeenden([this.benutzerId]);
    this.close();
  }
}

/** Bei der Spielleitung: den Tisch für diesen Spieler aufmachen. */
export function tischGMZeigen(benutzerId) {
  const alt = foundry.applications.instances.get(`${MODULE_ID}-tisch-gm-${benutzerId}`);
  if (alt) { alt.render(true); return alt; }
  const app = new HandelstischGM(benutzerId, { id: `${MODULE_ID}-tisch-gm-${benutzerId}` });
  app.render(true);
  return app;
}

/* ── Der Weg hinein ────────────────────────────────────────────────── */

/**
 * Wem soll der Tisch gedeckt werden?
 *
 * Nur angemeldete Spieler mit zugeordneter Figur. Ohne Figur ginge der Tausch
 * nicht - es gäbe weder einen Rucksack noch eine Börse -, und ein Monitor an
 * der Wand ist Zuschauer, kein Handelspartner.
 */
async function empfaengerWaehlen(person) {
  const leute = game.users.filter(u => !u.isGM && u.active && u.character);
  if (!leute.length) {
    ui.notifications.warn(game.i18n.localize("SHOPS.Handel.NiemandDa"));
    return null;
  }

  const zeilen = leute.map(u => `
    <label class="shops-zugriffszeile">
      <input type="checkbox" name="wer" value="${u.id}">
      <span class="shops-spielername">${foundry.utils.escapeHTML(u.name)}</span>
      <em class="shops-handel-figur">${foundry.utils.escapeHTML(u.character.name)}</em>
    </label>`).join("");

  return DialogV2.wait({
    window: { title: game.i18n.format("SHOPS.Handel.VorbereitenTitel", { person: person.name }),
              icon: "fa-solid fa-handshake" },
    classes: ["ninjos-shops"],
    position: { width: 420 },
    content: `<div class="shops-zugriffsliste shops-tisch-wahl">${zeilen}</div>
      <label class="shops-breit"><span>${game.i18n.localize("SHOPS.Anfrage.Satz")}</span>
      <input type="text" name="satz" placeholder="${
        game.i18n.localize("SHOPS.Handel.SatzPlatzhalter")}"></label>`,
    buttons: [
      { action: "auf", default: true, icon: "fa-solid fa-handshake",
        label: game.i18n.localize("SHOPS.Tisch.Aufmachen"),
        callback: (_e, _k, dialog) => {
          const w = dialog.element;
          return {
            an: [...w.querySelectorAll('input[name="wer"]:checked')].map(i => i.value),
            satz: w.querySelector('input[name="satz"]').value.trim()
          };
        } },
      { action: "abbrechen", label: game.i18n.localize("SHOPS.Abbrechen"), callback: () => null }
    ],
    rejectClose: false
  });
}

/** Tisch mit dieser Person aufmachen - der eine Weg, den der Knopf nimmt. */
export async function tischStarten(person) {
  if (!game.user.isGM || !person) return;

  /*
   * **Ein laufender Handel wird zurueckgeholt, nicht neu begonnen.** Machte
   * die Spielleitung ihr Fenster zu, kam sie an den Tisch nicht mehr heran -
   * der Spieler hat dafuer den Knopf unten rechts, sie hatte nichts. Der
   * Knopf am Bogen fuehrt jetzt zurueck, wenn schon einer gedeckt ist.
   */
  const laufend = game.users.filter(u =>
    u.getFlag(MODULE_ID, TISCH)?.personUuid === person.uuid);
  if (laufend.length) {
    for (const u of laufend) tischGMZeigen(u.id);
    return;
  }

  const wahl = await empfaengerWaehlen(person);
  if (!wahl?.an?.length) return;
  await tischOeffnen(person, wahl.an, wahl.satz);
  for (const id of wahl.an) tischGMZeigen(id);
}

/**
 * Ein Knopf in der Titelleiste jedes Personenbogens.
 *
 * Nicht nur bei Händlern - der ganze Sinn der Sache ist, dass die Person
 * keinen Laden hat.
 */
function bogenKnopf(app, element) {
  if (!game.user.isGM) return;
  const dokument = app?.document;
  if (dokument?.documentName !== "Actor") return;
  if (dokument.type?.startsWith(MODULE_ID)) return;   // Der Laden hat seinen eigenen Weg.

  const wurzel = element instanceof HTMLElement ? element : element?.[0];
  const kopf = wurzel?.querySelector(".window-header");
  if (!kopf || kopf.querySelector(`.${MODULE_ID}-handelknopf`)) return;

  const name = game.i18n.localize("SHOPS.Handel.Starten");
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = `header-control icon fa-solid fa-handshake ${MODULE_ID}-handelknopf`;
  knopf.dataset.tooltip = name;
  knopf.setAttribute("aria-label", name);
  knopf.addEventListener("click", ereignis => {
    ereignis.preventDefault();
    ereignis.stopPropagation();
    tischStarten(dokument);
  });

  const schliessen = kopf.querySelector('[data-action="close"]');
  if (schliessen) schliessen.before(knopf);
  else kopf.append(knopf);
}

/** Haken für die Spielleitung. Wird aus `tischEinrichten` mitgerufen. */
export function tischHakenGM() {
  if (!game.user.isGM) return;
  Hooks.on("renderApplicationV2", bogenKnopf);

  /*
   * **Der Bestand ist die Wahrheit, nicht der Tisch.** Legt die Spielleitung
   * dasselbe einzelne Stück bei zwei Spielern auf, und einer schließt ab, liegt
   * es beim anderen weiter da. Er klickte auf etwas, das es nicht mehr gibt.
   * Dasselbe, wenn sie dem NSC von Hand etwas abnimmt.
   */
  const nachziehen = dokument => {
    const traeger = dokument?.parent;
    if (traeger?.uuid) tischAbgleichen(traeger);
  };
  Hooks.on("updateItem", nachziehen);
  Hooks.on("deleteItem", nachziehen);
}

/**
 * Alle Tische am wirklichen Bestand nachziehen.
 *
 * Betrifft beide Seiten: Was die Person hingelegt hat, kann ihr abhanden
 * gekommen sein; was der Spieler hingelegt hat, ebenso. Was ganz weg ist,
 * verschwindet vom Tisch; was nur teilweise weg ist, steht mit der Zahl da,
 * die noch stimmt.
 */
export async function tischAbgleichen(traeger) {
  if (!game.user.isGM || !traeger?.uuid) return;

  for (const benutzer of game.users) {
    const handel = benutzer.getFlag(MODULE_ID, TISCH);
    if (!handel) continue;

    const istNsc = handel.personUuid === traeger.uuid;
    const istSpieler = benutzer.character?.uuid === traeger.uuid;
    if (!istNsc && !istSpieler) continue;

    const feld = istNsc ? "seiteNsc" : "seiteSpieler";
    const neu = [];
    for (const p of handel[feld] ?? []) {
      const da = Number(traeger.items.get(p.itemId)?.system?.quantity ?? 0);
      if (da <= 0) continue;
      neu.push(da < p.menge ? { ...p, menge: da } : p);
    }

    const kennung = liste => liste.map(p => `${p.itemId}:${p.menge}`).join("|");
    if (kennung(handel[feld] ?? []) === kennung(neu)) continue;

    await benutzer.setFlag(MODULE_ID, TISCH, { ...handel, [feld]: neu, preisCp: null });
    await funken([benutzer.id]);
  }
}
