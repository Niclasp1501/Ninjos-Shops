/**
 * Handel mit einer Person, die keinen Laden hat.
 *
 * **Wozu.** Nicht jeder, der etwas hergibt, fuehrt ein Geschaeft. Der Fremde
 * am Feuer, der Bauer mit zwei Fackeln, der Wachhauptmann, der eine Armbrust
 * loswerden will - dafuer einen Laden anzulegen, waere Buchhaltung fuer eine
 * Szene, die drei Saetze dauert.
 *
 * **Die Spielleitung loest aus, immer.** Ein Spieler kann keinen Handel
 * beginnen und niemanden ansprechen; er sieht nur, was ihm hingelegt wurde.
 * Das ist ausdruecklich so gewollt: Sonst stuende am Tisch die Frage im Raum,
 * mit wem man alles handeln darf, und die beantwortet das Gespraech, nicht
 * ein Fenster.
 *
 * **Was die Spielleitung waehlt, sieht der Spieler - und sonst nichts.** Der
 * Bogen einer Person enthaelt ihre ganze Ausruestung, ihre Zauber, ihr
 * Erspartes. Ein Handel legt genau die Stuecke vor, die gemeint sind, mit dem
 * Preis, der gemeint ist. Der Rest bleibt, wo er ist.
 *
 * **Das Angebot liegt als Merkmal am Benutzer**, nicht in der Nachricht -
 * dieselbe Begruendung wie bei angebot.js: Die Antwort des Spielers kommt von
 * seinem Client; stuenden die Preise darin, koennte er sich jeden beliebigen
 * schicken. Und es ueberlebt ein Neuladen.
 *
 * **Ein Angebot darf an mehrere gehen, und das bleibt so.** Am Tisch haelt
 * man ein Schwert in die Runde und nicht einem Einzelnen unter die Nase; ein
 * Handel, der nur an eine Person gehen kann, waere ein Werkzeug fuer einen
 * Fall, den es selten gibt. Nur: Das Schwert gibt es einmal. Deshalb ist
 * **der Bestand die Wahrheit und nicht das Angebot** - wer zuerst zugreift,
 * bekommt es, und bei allen anderen verschwindet es aus dem Fenster
 * (`handelAbgleichen`). Dass nicht zwei gleichzeitig gewinnen koennen, sichert
 * die Wahl in vorsitz.js: Genau eine Verbindung fuehrt aus, und sie tut es
 * nacheinander.
 *
 * **Das Geld der Person.** Ein NSC in dnd5e hat eine Boerse, und sie wird
 * belastet und gutgeschrieben. Sie **blockiert** aber nicht: Wer den Preis
 * genannt hat, hat entschieden, und ein Handel, der am leeren Beutel eines
 * NSC scheitert, den die Spielleitung selbst aufgesetzt hat, waere eine
 * Ueberraschung ohne Nutzen. Wer einen Beutel will, der leer werden kann,
 * nimmt einen Laden mit `eigeneKasse`.
 */

import { MODULE_ID, SOCKET } from "./const.js";
import { alsText } from "./preise.js";
import { bezahle, schreibeGut, vermoegenCp } from "./kasse.js";
import { darfIchAusfuehren, bittenKennung } from "./vorsitz.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Merkmal am Benutzer: der offene Handel. Einer je Spieler. */
export const OFFENER_HANDEL = "handel";

/* ── Was die Spielleitung schickt ──────────────────────────────────── */

/**
 * Einen Handel hinlegen.
 *
 * @param {Actor} person   Wer handelt - ein NSC, eine Figur, irgendwer.
 * @param {object} wahl
 * @param {string[]} wahl.an       Benutzerkennungen
 * @param {object[]} wahl.posten   `{ itemId, menge, preisCp }`
 * @param {boolean} wahl.nimmtAn   Darf der Spieler selbst etwas anbieten?
 * @param {string} wahl.satz       Ein Satz dazu
 */
export async function handelSenden(person, { an, posten, nimmtAn, satz }) {
  if (!game.user.isGM || !person || !an?.length) return;

  const sauber = (posten ?? [])
    .map(p => {
      const item = person.items.get(p.itemId);
      if (!item) return null;
      return {
        itemId: p.itemId,
        name: item.name,
        img: item.img || null,
        menge: Math.max(1, Math.floor(Number(p.menge) || 1)),
        preisCp: Math.max(0, Math.round(Number(p.preisCp) || 0))
      };
    })
    .filter(Boolean);

  if (!sauber.length && !nimmtAn) {
    return ui.notifications.warn(game.i18n.localize("SHOPS.Handel.NichtsGewaehlt"));
  }

  const handel = {
    id: foundry.utils.randomID(),
    personUuid: person.uuid,
    personName: person.name,
    personBild: person.prototypeToken?.texture?.src || person.img || null,
    posten: sauber,
    nimmtAn: !!nimmtAn,
    satz: String(satz ?? "").slice(0, 200),
    von: game.user.name
  };

  for (const id of an) {
    await game.users.get(id)?.setFlag(MODULE_ID, OFFENER_HANDEL, handel);
  }

  const paket = { typ: SOCKET.HANDEL, tat: "offen", an, handel };
  game.socket.emit(SOCKET.NAME, paket);
  if (an.includes(game.user.id)) aufHandel(paket);

  ui.notifications.info(game.i18n.format("SHOPS.Handel.Verschickt", {
    anzahl: an.length, person: person.name
  }));
}

/** Einen Handel wieder einpacken. */
export async function handelZuruecknehmen(benutzerId) {
  if (!game.user.isGM) return;
  await game.users.get(benutzerId)?.unsetFlag(MODULE_ID, OFFENER_HANDEL);
  const paket = { typ: SOCKET.HANDEL, tat: "offen", an: [benutzerId], handel: null };
  game.socket.emit(SOCKET.NAME, paket);
  if (benutzerId === game.user.id) aufHandel(paket);
}

/** Wer hat gerade einen Handel offen? */
export function handelTraeger() {
  return game.users.filter(u => u.getFlag(MODULE_ID, OFFENER_HANDEL));
}

/**
 * Alle offenen Angebote dieser Person am wirklichen Bestand nachziehen.
 *
 * Der Fall, um den es geht: Die Spielleitung legt einer ganzen Gruppe
 * dasselbe einzelne Stueck hin. Einer nimmt es. Ohne diese Funktion stuende
 * es bei den anderen weiter im Fenster, sie klickten darauf, und erst danach
 * saehen sie „Das liegt nicht mehr da". Mit ihr verschwindet es - und was nur
 * teilweise weg ist (drei von fuenf Fackeln), steht mit der Zahl da, die noch
 * stimmt.
 *
 * Laeuft nur bei der Spielleitung; ein Spieler schreibt fremde Merkmale nicht.
 *
 * @param {Actor} person
 * @param {{benutzerId: string, itemId: string}} [verbraucht]
 *        Was gerade genommen wurde - fuer den Nehmer ist dieser Posten
 *        erledigt, auch wenn noch Bestand da ist.
 */
export async function handelAbgleichen(person, verbraucht = null) {
  if (!game.user.isGM || !person) return;

  for (const benutzer of game.users) {
    const handel = benutzer.getFlag(MODULE_ID, OFFENER_HANDEL);
    if (handel?.personUuid !== person.uuid) continue;

    const neu = [];
    for (const posten of handel.posten ?? []) {
      if (verbraucht?.benutzerId === benutzer.id && verbraucht.itemId === posten.itemId) continue;
      const bestand = Number(person.items.get(posten.itemId)?.system?.quantity ?? 0);
      if (bestand <= 0) continue;
      neu.push(bestand < posten.menge ? { ...posten, menge: bestand } : posten);
    }

    const kennung = liste => liste.map(p => `${p.itemId}:${p.menge}`).join("|");
    if (kennung(handel.posten ?? []) === kennung(neu)) continue;

    // Bleibt nichts und darf der Spieler auch nichts anbieten, ist der Handel
    // vorbei - ein leeres Fenster ist eine Frage ohne Inhalt.
    const nachher = (neu.length || handel.nimmtAn) ? { ...handel, posten: neu } : null;
    if (nachher) await benutzer.setFlag(MODULE_ID, OFFENER_HANDEL, nachher);
    else await benutzer.unsetFlag(MODULE_ID, OFFENER_HANDEL);

    const paket = { typ: SOCKET.HANDEL, tat: "offen", an: [benutzer.id], handel: nachher };
    game.socket.emit(SOCKET.NAME, paket);
    if (benutzer.id === game.user.id) aufHandel(paket);
  }
}

/* ── Was der Spieler sieht und tut ─────────────────────────────────── */

/** Der eigene offene Handel, fertig fuer die Anzeige. */
export function eigenerHandel() {
  const handel = game.user.getFlag(MODULE_ID, OFFENER_HANDEL);
  if (!handel) return null;
  return {
    ...handel,
    posten: (handel.posten ?? []).map(p => ({
      ...p,
      einzelText: alsText(p.preisCp, kuerzel),
      summeText: alsText(p.preisCp * p.menge, kuerzel)
    }))
  };
}

/**
 * Einen Posten nehmen.
 *
 * Der Preis geht **nicht** mit - er steht am Merkmal, das nur die
 * Spielleitung schreibt. Ueber den Socket geht nur, welcher Posten gemeint
 * ist.
 */
export function postenNehmen(itemId) {
  const figur = game.user.character;
  if (!figur) return ui.notifications.warn(game.i18n.localize("SHOPS.Kauf.KeineFigur"));
  if (!game.users.activeGM) return ui.notifications.warn(game.i18n.localize("SHOPS.Kauf.KeinSpielleiter"));

  const bitte = {
    typ: SOCKET.HANDEL, tat: "nehmen",
    itemId, figurUuid: figur.uuid, kaeuferId: game.user.id, bitteId: bittenKennung()
  };
  game.socket.emit(SOCKET.NAME, bitte);
  if (game.user.isGM) aufHandel(bitte);
}

/**
 * Danke, nein.
 *
 * **Warum es das geben muss.** Ohne Ablehnen bleibt das Fenster stehen, bis
 * die Spielleitung es zuruecknimmt - und die merkt nicht, dass der Spieler
 * laengst weitergegangen ist. Ein Angebot, das man nur annehmen oder ignorieren
 * kann, ist keine Frage, sondern eine Auslage.
 *
 * Weggeraeumt wird bei der Spielleitung: Das Merkmal liegt am Benutzer, und
 * ein Spieler schreibt es nicht selbst - dieselbe Bauweise wie ueberall sonst.
 */
export function handelAblehnen() {
  const handel = game.user.getFlag(MODULE_ID, OFFENER_HANDEL);
  if (!handel) return;

  const bitte = { typ: SOCKET.HANDEL, tat: "ablehnen", spielerId: game.user.id,
                  bitteId: bittenKennung() };
  game.socket.emit(SOCKET.NAME, bitte);
  if (game.user.isGM) aufHandel(bitte);
}

/* ── Ausfuehren, bei der Spielleitung ──────────────────────────────── */

/**
 * Einen Posten uebergeben und bezahlen.
 *
 * Wie beim Kauf im Laden: **erst anlegen, dann abziehen**. Bricht es
 * dazwischen ab, gibt es den Gegenstand doppelt statt gar nicht - die
 * verkraftbare Haelfte des Ungluecks.
 */
/**
 * Waehrend ein Zugriff laeuft, raeumt er selbst auf.
 *
 * Ohne das schriebe der Haken unten mitten in den Vorgang hinein: `item.delete()`
 * loest ihn aus, und dann aendern zwei Stellen dasselbe Merkmal.
 */
let laeuft = false;

async function nehmenAusfuehren({ itemId, figurUuid, kaeuferId }) {
  const kaeufer = game.users.get(kaeuferId);
  const handel = kaeufer?.getFlag(MODULE_ID, OFFENER_HANDEL);
  const posten = handel?.posten?.find(p => p.itemId === itemId);
  if (!posten) return { ok: false, grund: "SHOPS.Handel.NichtMehrDa" };

  const person = await fromUuid(handel.personUuid);
  const item = person?.items?.get(itemId);
  const figur = await fromUuid(figurUuid);
  if (!person || !item || !figur) return { ok: false, grund: "SHOPS.Handel.NichtMehrDa" };

  const bestand = Number(item.system?.quantity ?? 1);
  if (bestand < posten.menge) return { ok: false, grund: "SHOPS.Kauf.NichtGenugDa" };

  const summeCp = posten.preisCp * posten.menge;
  const boerse = figur.system?.currency ?? {};
  const gezahlt = bezahle(boerse, summeCp);
  if (!gezahlt) {
    return { ok: false, grund: "SHOPS.Kauf.ZuWenigGeld", fehltCp: summeCp - vermoegenCp(boerse) };
  }

  try {
    laeuft = true;
    const kopie = item.toObject();
    delete kopie._id;
    kopie.system = kopie.system ?? {};
    kopie.system.quantity = posten.menge;
    delete kopie.flags?.[MODULE_ID];
    await figur.createEmbeddedDocuments("Item", [kopie]);

    await figur.update({ "system.currency": gezahlt.bestand });

    const rest = bestand - posten.menge;
    if (rest > 0) await item.update({ "system.quantity": rest });
    else await item.delete();

    // Die Boerse der Person, falls sie eine hat. Sie blockiert nie.
    if (person.system?.currency) {
      await person.update({ "system.currency": schreibeGut(person.system.currency, summeCp) });
    }

    /*
     * Der Posten ist verbraucht - und zwar nicht nur beim Nehmer. Wer sonst
     * dasselbe Angebot offen hat, sieht ab jetzt den Bestand, den es
     * wirklich noch gibt.
     */
    await handelAbgleichen(person, { benutzerId: kaeuferId, itemId });
  } catch (fehler) {
    console.error(`${MODULE_ID} | Handel abgebrochen`, fehler);
    return { ok: false, grund: "SHOPS.Kauf.Abgebrochen" };
  } finally {
    laeuft = false;
  }

  const { schreibeHandel } = await import("./marktbuch.js");
  await schreibeHandel({
    person, kaeufer, figur, ok: true,
    was: [{ name: posten.name, menge: posten.menge }], summeCp
  });

  return {
    ok: true,
    text: game.i18n.format("SHOPS.Kauf.Gelungen", {
      menge: posten.menge, name: posten.name, preis: alsText(summeCp, kuerzel)
    })
  };
}

/**
 * Haken anmelden. Gehoert in `ready`.
 *
 * Nicht nur ein Zugriff veraendert den Bestand: Die Spielleitung nimmt einem
 * NSC etwas ab, waehrend sein Angebot bei drei Leuten offen steht. Auch dann
 * soll dort stehen, was es wirklich noch gibt.
 *
 * `createItem` fehlt mit Absicht. Was einmal aus einem Angebot herausgefallen
 * ist, kommt nicht von selbst zurueck - das Angebot ist eine Zusage der
 * Spielleitung, und die erneuert sie, indem sie es noch einmal hinlegt.
 */
export function handelEinrichten() {
  if (!game.user.isGM) return;

  const nachziehen = dokument => {
    if (laeuft) return;
    const person = dokument?.parent;
    if (!person?.uuid) return;
    const betroffen = game.users.some(u =>
      u.getFlag(MODULE_ID, OFFENER_HANDEL)?.personUuid === person.uuid);
    if (betroffen) handelAbgleichen(person);
  };

  Hooks.on("updateItem", nachziehen);
  Hooks.on("deleteItem", nachziehen);
}

/** Einstiegspunkt aus socket.js. */
export async function aufHandel(daten) {
  if (daten.tat === "offen") {
    if (Array.isArray(daten.an) && !daten.an.includes(game.user.id)) return;
    const { handelFensterZeigen } = await import("./handel-fenster.js");
    return void handelFensterZeigen();
  }

  if (daten.tat === "ablehnen") {
    if (!await darfIchAusfuehren(daten.bitteId)) return;
    const spieler = game.users.get(daten.spielerId);
    const handel = spieler?.getFlag(MODULE_ID, OFFENER_HANDEL);
    await spieler?.unsetFlag(MODULE_ID, OFFENER_HANDEL);
    game.socket.emit(SOCKET.NAME, { typ: SOCKET.HANDEL, tat: "offen", an: [daten.spielerId], handel: null });
    ui.notifications.info(game.i18n.format("SHOPS.Handel.Abgelehnt", {
      spieler: spieler?.name ?? "?", person: handel?.personName ?? "?"
    }));
    return;
  }

  if (daten.tat === "nehmen") {
    if (!await darfIchAusfuehren(daten.bitteId)) return;
    const ergebnis = await nehmenAusfuehren(daten);
    const { aufAntwort } = await import("./socket.js");
    game.socket.emit(SOCKET.NAME, { typ: SOCKET.ANTWORT, an: [daten.kaeuferId], ergebnis });
    if (daten.kaeuferId === game.user.id) aufAntwort({ an: [daten.kaeuferId], ergebnis });
  }
}
