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
import { grundpreisCp, preisCp, ankaufCp, alsText, alsMuenzfeld, ausMuenzfeld,
         PREIS_SORTEN, KUPFERWERT } from "./preise.js";
import { bezahle, schreibeGut, vermoegenCp, muenzenAbziehen, muenzenDazu } from "./kasse.js";
import { uebergeben, pruefeSeite, inhaltVon, muenzenIn } from "./lager.js";
import { darfIchAusfuehren, bittenKennung } from "./vorsitz.js";
import { laedenVon } from "./verknuepfung.js";
import { verkaufbareSachen } from "./verkauf.js";
import { Wahl, WAHL_AKTIONEN, muenzText, muenzenSaeubern } from "./tisch-wahl.js";
import { chipHinlegen, chipWegnehmen } from "./chip.js";
import { abbruchMelden, istWortbruch } from "./melden.js";

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

/**
 * Die Ankaufspolitik hinter dieser Person.
 *
 * Fuehrt sie einen Laden, gilt dessen eingestellter Ankaufswert - dieselbe
 * Zahl, mit der das Ladenfenster und die Verkaufsanfragen rechnen. Eine Person
 * ohne Laden hat keine Politik; dann die Haelfte, wie in anfrage.js.
 */
function politikVon(person) {
  const laeden = laedenVon(person);
  const laden = laeden.length === 1 ? laeden[0] : null;
  return laden?.system ?? { ankauf: PERSON_ANKAUF, spielraum: 0.25 };
}

/** Was die Person für dieses Stück von sich aus gäbe - ihr Ankaufswert. */
function ankaufWert(person, item) {
  return ankaufCp(grundpreisCp(item.system?.price), politikVon(person));
}

/** Wie weit sie sich davon wegbewegt, wenn sie gut oder schlecht gelaunt ist. */
function spielraumVon(person) {
  const wert = Number(politikVon(person).spielraum);
  return Number.isFinite(wert) ? wert : 0.25;
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
 * **Zwei Zahlen, nicht neun.** Bis zum 08.09.2026 stand hinter jedem Stueck
 * sein gerechneter Preis, und unten die Differenz. Das las sich wie eine
 * Rechnung, war aber keine: Der Spieler sah Grundpreise, die niemand von ihm
 * verlangt hatte, und die Summe darunter kam scheinbar aus dem Nichts.
 *
 * Jetzt gibt es genau zwei Betraege. **Was sie verlangt** - eine Zahl, die
 * die Spielleitung setzt (vorgeschlagen wird die Summe ihrer Preise). Und
 * **was er bringt**: was sie ihm fuer seine Ware anrechnet, plus die Muenzen,
 * die er hingelegt hat. Was dazwischen fehlt, steht daneben.
 *
 * Ihre eigenen Muenzen zaehlen zu ihrer Seite - sie gibt sie ja heraus.
 */
export function tischStand(handel) {
  if (!handel) return null;

  const geldNsc = Math.max(0, Math.round(handel.geldNsc || 0));
  const geldSpieler = Math.max(0, Math.round(handel.geldSpieler || 0));

  /* Was sie fuer ihre Ware will. Ohne Vorgabe: die Summe ihrer Preise. */
  const vorschlagCp = summe(handel.seiteNsc);
  const gefordertCp = Number.isFinite(handel.forderungCp) ? handel.forderungCp : vorschlagCp;

  /* Was sie ihm fuer ein Stueck anrechnet - ohne Vorgabe ihr Ankaufswert. */
  const angerechnet = p => Number.isFinite(p.anrechnungCp) ? p.anrechnungCp : p.wertCp * p.menge;
  const gebrachtCp = (handel.seiteSpieler ?? []).reduce((s, p) => s + angerechnet(p), 0);

  const linksCp = gefordertCp + geldNsc;
  const rechtsCp = gebrachtCp + geldSpieler;
  const offenCp = linksCp - rechtsCp;

  return {
    ...handel,
    /* Ihre Seite: die Preise sieht nur die Spielleitung - siehe die Vorlagen. */
    seiteNsc: (handel.seiteNsc ?? []).map(p => ({
      ...p, summeText: alsText(p.wertCp * p.menge, kuerzel),
      inhaltGeldText: muenzText(p.inhaltMuenzen),
      darinEtwas: !!((p.inhalt ?? []).length || Object.keys(p.inhaltMuenzen ?? {}).length)
    })),
    /* Seine Seite: was sie anrechnet, und fuer die Spielleitung die Spanne. */
    seiteSpieler: (handel.seiteSpieler ?? []).map(p => {
      const wert = angerechnet(p);
      return {
        ...p,
        anrechnungText: alsText(wert, kuerzel),
        inhaltGeldText: muenzText(p.inhaltMuenzen),
        darinEtwas: !!((p.inhalt ?? []).length || Object.keys(p.inhaltMuenzen ?? {}).length),
        grundText: alsText((p.grundCp ?? 0) * p.menge, kuerzel),
        eigenerWert: Number.isFinite(p.anrechnungCp),
        anrechnungFeld: alsMuenzfeld(wert),
        spanne: spanneVon(p)
      };
    }),

    geldNsc, geldSpieler,
    geldNscText: muenzText(handel.muenzenNsc) || alsText(geldNsc, kuerzel),
    geldSpielerText: muenzText(handel.muenzenSpieler) || alsText(geldSpieler, kuerzel),

    gefordertCp,
    gefordertText: alsText(gefordertCp, kuerzel),
    gebrachtText: alsText(rechtsCp, kuerzel),
    verlangtText: alsText(linksCp, kuerzel),
    forderungFeld: alsMuenzfeld(gefordertCp),
    ueberschrieben: Number.isFinite(handel.forderungCp) && handel.forderungCp !== vorschlagCp,

    offenCp,
    offenText: alsText(Math.abs(offenCp), kuerzel),
    fehlt: offenCp > 0,
    zuViel: offenCp < 0,
    ausgeglichen: offenCp === 0,

    /*
     * **Zwei Zusagen, nicht eine.** Ein Tausch ist eine Abrede zwischen
     * zweien; jede Aenderung danach setzt beide zurueck, denn die alte Zusage
     * galt einem anderen Tisch.
     */
    // Ohne Spielleitung fuehrt niemand aus, siehe tausch.js.
    ohneSpielleitung: !game.users.activeGM,
    bereitSpieler: handel.bereitSpieler === true,
    bereitGm: handel.bereitGm === true,

    leer: !((handel.seiteNsc ?? []).length || (handel.seiteSpieler ?? []).length
            || geldNsc || geldSpieler)
  };
}

/**
 * Die drei Zahlen, mit denen die Spielleitung einen Anrechnungswert setzt.
 *
 * Dieselbe Spanne wie bei den Verkaufsanfragen (anfrage.js) und aus demselben
 * Grund: Wer den Haendler verstimmt hat, bekommt die linke Zahl, wer gut mit
 * ihm steht, die rechte. Entschieden wird am Tisch.
 */
function spanneVon(posten) {
  const ueblich = posten.wertCp * posten.menge;
  if (!ueblich) return null;
  const spielraum = Number.isFinite(posten.spielraum) ? posten.spielraum : 0.25;
  const werte = [
    Math.max(0, Math.floor(ueblich * (1 - spielraum))),
    ueblich,
    Math.ceil(ueblich * (1 + spielraum))
  ];
  return werte.map(cp => ({ cp, text: alsText(cp, kuerzel) }));
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
 * Muenzen auf eine Seite legen.
 *
 * Sie zaehlen wie Ware: Die Summe der Seite waechst, und die Waage unten sagt
 * sofort, was danach noch fehlt. Je Sorte nie mehr als da ist - wer drei Gold
 * hat, legt hoechstens drei hin.
 *
 * Gespeichert wird beides: die Muenzen, wie sie liegen (fuer die Anzeige),
 * und ihr Kupferwert (fuer die Waage).
 */
export async function geldSetzen(benutzerId, seite, muenzen) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;
  const traeger = seite === "nsc"
    ? await fromUuid(handel.personUuid)
    : benutzer.character;
  const gedeckelt = muenzenDeckeln(muenzen, traeger?.system?.currency);
  await benutzer.setFlag(MODULE_ID, TISCH, {
    ...handel, ...muenzFelder(seite, gedeckelt),
    preisCp: null, bereitSpieler: false, bereitGm: false
  });
  await funken([benutzerId]);
}

/** Je Sorte hoechstens so viel, wie der Traeger hat. */
function muenzenDeckeln(muenzen, boerse) {
  const raus = {};
  for (const [sorte, n] of Object.entries(muenzenSaeubern(muenzen))) {
    const habe = Math.floor(Number(boerse?.[sorte] ?? 0));
    if (habe > 0) raus[sorte] = Math.min(n, habe);
  }
  return raus;
}

const muenzenCp = muenzen => Object.entries(muenzen ?? {})
  .reduce((s, [sorte, n]) => s + (KUPFERWERT[sorte] ?? 0) * n, 0);

/** Die beiden Merkmalsfelder einer Seite, aus den Muenzen. */
function muenzFelder(seite, muenzen) {
  return seite === "nsc"
    ? { muenzenNsc: muenzen, geldNsc: muenzenCp(muenzen) }
    : { muenzenSpieler: muenzen, geldSpieler: muenzenCp(muenzen) };
}

/**
 * Eine ganze Seite auf einmal hinlegen - Ware und Muenzen.
 *
 * Das ist, was die Lage ueber dem Tisch abschickt, wenn man fertig ist: nicht
 * ein Stueck nach dem anderen, sondern die Seite, wie sie jetzt sein soll.
 * Bewertet wird hier, bei der Spielleitung - der Client schickt Kennungen und
 * Mengen, keine Werte.
 */
export async function seiteSetzen(benutzerId, seite, posten, muenzen) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;

  const person = await fromUuid(handel.personUuid);
  const traeger = seite === "nsc" ? person : benutzer.character;
  if (!traeger) return;

  const feld = seite === "nsc" ? "seiteNsc" : "seiteSpieler";
  /*
   * Was die Spielleitung fuer ein Stueck eingetragen hat, bleibt stehen -
   * solange dasselbe Stueck in derselben Menge daliegt. Wer die Menge aendert,
   * handelt einen anderen Posten aus.
   */
  const vorher = new Map((handel[feld] ?? []).map(p => [p.itemId, p]));

  const liste = [];
  for (const p of posten ?? []) {
    const item = traeger.items.get(p.itemId);
    if (!item || liste.some(z => z.itemId === item.id)) continue;
    const vorrat = item.type === "container" ? 1 : Number(item.system?.quantity ?? 1);
    const menge = Math.min(Math.max(1, Math.floor(Number(p.menge) || 1)), vorrat);
    if (menge <= 0) continue;

    const alt = vorher.get(item.id);
    const zeile = {
      itemId: item.id, name: item.name, img: item.img || null, menge,
      wertCp: seite === "nsc" ? wertHergeben(person, item) : ankaufWert(person, item),
      // Ein Beutel reist samt Inhalt - also gehoert der zu dem, was zugesagt wird.
      inhalt: inhaltVon(item),
      inhaltMuenzen: muenzenIn(item)
    };
    if (seite === "spieler") {
      zeile.grundCp = grundpreisCp(item.system?.price);
      zeile.spielraum = spielraumVon(person);
      if (alt && alt.menge === menge && Number.isFinite(alt.anrechnungCp)) {
        zeile.anrechnungCp = alt.anrechnungCp;
      }
    }
    liste.push(zeile);
  }

  const gedeckelt = muenzenDeckeln(muenzen, traeger.system?.currency);
  const neu = { ...handel, [feld]: liste, ...muenzFelder(seite, gedeckelt),
                bereitSpieler: false, bereitGm: false };
  // Ihre Ware hat sich geaendert - dann gilt auch ihre alte Forderung nicht mehr.
  if (seite === "nsc") neu.forderungCp = null;
  await benutzer.setFlag(MODULE_ID, TISCH, neu);
  await funken([benutzerId]);
}

/**
 * Was sie fuer ihre Seite verlangt. `null` gibt die Rechnung wieder frei.
 *
 * Das Modul rechnet vor, die Spielleitung entscheidet: Ein Freundschaftspreis,
 * ein Aufschlag fuer den Unsympathen, ein glatter Betrag.
 */
export async function forderungSetzen(benutzerId, betragCp) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;
  const wert = betragCp === null ? null : Math.max(0, Math.round(Number(betragCp) || 0));
  await benutzer.setFlag(MODULE_ID, TISCH,
    { ...handel, forderungCp: wert, bereitSpieler: false, bereitGm: false });
  await funken([benutzerId]);
}

/**
 * Was sie ihm fuer ein Stueck anrechnet. `null` nimmt wieder ihren Ankaufswert.
 *
 * Das ist die Antwort auf „was ist dir das wert" - und der Grund, warum auf
 * seiner Seite ueberhaupt eine Zahl steht. Ohne sie waere sein Krummsaebel
 * einfach ein Bild auf dem Tisch.
 */
export async function anrechnenSetzen(benutzerId, itemId, betragCp) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;
  const liste = (handel.seiteSpieler ?? []).map(p => p.itemId !== itemId ? p : {
    ...p, anrechnungCp: betragCp === null ? null : Math.max(0, Math.round(Number(betragCp) || 0))
  });
  await benutzer.setFlag(MODULE_ID, TISCH,
    { ...handel, seiteSpieler: liste, bereitSpieler: false, bereitGm: false });
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
    if (istWortbruch(ergebnis.grund)) abbruchMelden([], ergebnis.was);
    else ui.notifications.warn(game.i18n.localize(ergebnis.grund));
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

  /*
   * **Es wandert genau das, was auf dem Tisch liegt.**
   *
   * Bis zum 08.09.2026 wanderte stattdessen die *Differenz*: Das Modul buchte
   * sie aus der Boerse ab, und die hingelegten Muenzen blieben liegen, wo sie
   * waren. Wer 2 GM hinlegte, bekam den Dolch fuer 2 GM 4 SM um genau diese
   * 2 GM billiger - jede hingelegte Muenze war ein Rabatt auf sich selbst.
   *
   * Jetzt greift niemand mehr in eine Boerse hinein. Was fehlt, steht auf der
   * Waage; hinlegen muss es der, dem es fehlt. Und wer zu viel hinlegt,
   * bekommt es heraus, indem die andere Seite Muenzen dazulegt - so, wie es
   * an einem Tisch auch zugeht.
   */
  const legtSpieler = muenzenSaeubern(handel.muenzenSpieler);
  const legtPerson = muenzenSaeubern(handel.muenzenNsc);
  const personHatKasse = !!person.system?.currency;

  // Nichts anfassen, bevor feststeht, dass alles noch da ist.
  let spielerKasse = muenzenAbziehen(figur.system?.currency ?? {}, legtSpieler);
  if (!spielerKasse) return { ok: false, grund: "SHOPS.Tisch.GeldWeg" };
  if (Object.keys(legtPerson).length && !personHatKasse) {
    return { ok: false, grund: "SHOPS.Tisch.GeldWeg" };
  }
  let personKasse = personHatKasse
    ? muenzenAbziehen(person.system.currency, legtPerson) : null;
  if (personHatKasse && !personKasse) return { ok: false, grund: "SHOPS.Tisch.GeldWeg" };

  spielerKasse = muenzenDazu(spielerKasse, legtPerson);
  if (personKasse) personKasse = muenzenDazu(personKasse, legtSpieler);

  /*
   * Liegt alles noch da, was auf dem Tisch liegt? Seit dem 10.09.2026 zaehlt
   * dabei auch der **Inhalt eines Behaelters**: Wer einen Beutel hinlegt und
   * ihn vorm Abschluss ausraeumt, uebergibt etwas anderes als das, dem der
   * andere zugestimmt hat.
   */
  for (const [seite, traeger] of [["seiteNsc", person], ["seiteSpieler", figur]]) {
    const pruefung = pruefeSeite(traeger, handel[seite] ?? [], {});
    if (!pruefung.ok) return { ok: false, grund: "SHOPS.Handel.NichtMehrDa", was: pruefung.was };
  }

  try {
    /*
     * Ware über den Tisch, in beide Richtungen - über **denselben** Weg wie
     * der Tausch zwischen Spielern. Vorher stand hier eine eigene Schleife mit
     * `einlagern`, die einen Behälter ohne seinen Inhalt kopierte: Ein Beutel
     * kam leer beim Käufer an. `uebergeben` hängt den Inhalt mit um, legt an,
     * bevor es wegnimmt, und lässt Rechte, Ausrüstung und Einstimmung zurück.
     * Die Münzen bleiben hier draußen; die stehen unten schon fertig.
     */
    for (const [seite, von, zu] of [["seiteNsc", person, figur], ["seiteSpieler", figur, person]]) {
      const posten = (handel[seite] ?? []).map(p => ({ itemId: p.itemId, menge: p.menge }));
      const bericht = await uebergeben(von, zu, posten, {});
      if (bericht.fehler) throw new Error(bericht.fehler);
    }

    // Und die Muenzen - beide Boersen stehen oben schon fertig da.
    await figur.update({ "system.currency": spielerKasse });
    if (personKasse) await person.update({ "system.currency": personKasse });

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

  /*
   * Ins Buch gehoert, was unterm Strich an Geld die Seite gewechselt hat -
   * die hingelegten Muenzen also mitgerechnet. „Dolch fuer 40 KM" waere in
   * dem Beispiel oben eine glatte Falschauskunft gewesen.
   */
  const nettoCp = muenzenCp(legtSpieler) - muenzenCp(legtPerson);
  if (was.length) {
    const schreiben = nettoCp < 0 ? schreibeHandelVerkauf : schreibeHandel;
    await schreiben({
      person, figur, ok: true, was, summeCp: Math.abs(nettoCp),
      kaeufer: benutzer, verkaeufer: benutzer
    });
  }

  // `tisch` sagt der Gegenstelle, dass das ein Fenster wert ist und keine
  // Meldung: Der Tisch raeumt sich ab, es bleibt sonst nichts zu sehen.
  return { ok: true, tisch: true,
           text: game.i18n.format("SHOPS.Tisch.Gelungen", { person: person.name }) };
}

/* ── Was der Spieler schickt ───────────────────────────────────────── */

function bitte(tat, mehr = {}) {
  if (!game.users.activeGM) {
    return void ui.notifications.warn(game.i18n.localize("SHOPS.Tisch.OhneSpielleitung"));
  }
  const paket = { typ: SOCKET.HANDEL, tat, spielerId: game.user.id,
                  bitteId: bittenKennung(), ...mehr };
  game.socket.emit(SOCKET.NAME, paket);
  if (game.user.isGM) aufTisch(paket);
}

export const tischWegnehmen = itemId => bitte("wegnehmen", { seite: "spieler", itemId });
export const tischAnnehmen  = () => bitte("annehmen");
export const tischWiderrufen = () => bitte("widerrufen");
export const tischGeld      = muenzen => bitte("geld", { muenzen });
export const tischSeite     = (posten, muenzen) => bitte("seite", { posten, muenzen });
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
    /*
     * Die Spielleitung sieht die Tische aller Spieler in ihrem eigenen
     * Fenster - und **ein abgeraeumter Tisch macht seines zu.**
     *
     * Vorher wurde hier nur neu gezeichnet. Nach einem abgeschlossenen Handel
     * ging das Fenster zu (das erledigt `abschliessen` selbst), nach jedem
     * anderen Ende aber nicht: Es fiel in seinen Leerzustand und blieb als
     * Rest stehen, der „fuer diesen Spieler ist gerade kein Tisch gedeckt"
     * sagte. Das trifft das Abraeumen ebenso wie ein „Handel beenden" des
     * Spielers.
     */
    for (const app of [...foundry.applications.instances.values()]) {
      if (!(app instanceof HandelstischGM)) continue;
      if (game.users.get(app.benutzerId)?.getFlag(MODULE_ID, TISCH)) app.render(false);
      else if (app.rendered) app.close({ force: true });
    }
    return;
  }

  if (!game.user.isGM) return;
  if (!await darfIchAusfuehren(daten.bitteId)) return;

  switch (daten.tat) {
    case "wegnehmen": return void await wegnehmen(daten.spielerId, "spieler", daten.itemId);
    case "geld":      return void await geldSetzen(daten.spielerId, "spieler", daten.muenzen);
    case "seite":     return void await seiteSetzen(daten.spielerId, "spieler", daten.posten, daten.muenzen);
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
      wegnehmen: Handelstisch.#wegnehmen,
      annehmen: Handelstisch.#annehmen,
      geldWeg: () => tischGeld({}),
      aufgeben: Handelstisch.#aufgeben,
      ...WAHL_AKTIONEN
    }
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/handelstisch.hbs`,
      scrollable: [".shops-tisch-nsc", ".shops-tisch-spieler", ".shops-wahl-liste"]
    }
  };

  /* Die Lage ueber dem Tisch - siehe tisch-wahl.js. */
  wahl = new Wahl();
  wahlLiegt() {
    const h = eigenerTisch();
    return { posten: h?.seiteSpieler ?? [], muenzen: h?.muenzenSpieler ?? {} };
  }
  wahlVorrat() { return verkaufbareSachen(game.user.character); }
  wahlBoerse() { return game.user.character?.system?.currency ?? {}; }
  wahlAbschicken(posten, muenzen) { tischSeite(posten, muenzen); }

  get title() {
    return game.i18n.format("SHOPS.Tisch.Titel", { person: eigenerTisch()?.personName ?? "" });
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const handel = eigenerTisch();
    const figur = game.user.character;
    const stand = tischStand(handel);
    // Ist der Tisch weg, ist auch nichts mehr auszusuchen.
    if (!handel) this.wahl.modus = "tisch";

    return Object.assign(ctx, {
      stand,
      figurName: figur?.name ?? null,
      boerse: figur ? alsText(vermoegenCp(figur.system?.currency ?? {}), kuerzel) : null,
      wahl: this.wahl.kontext(this.wahlVorrat(), this.wahlBoerse())
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

  static #wegnehmen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    if (itemId) tischWegnehmen(itemId);
  }

  static #annehmen() {
    // Schon zugesagt? Dann nimmt der Knopf die Zusage zurueck.
    if (eigenerTisch()?.bereitSpieler) tischWiderrufen();
    else tischAnnehmen();
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
  const handel = eigenerTisch();
  const offen = foundry.applications.instances.get(`${MODULE_ID}-tisch`)?.rendered;
  if (!handel || offen) return void chipWegnehmen(CHIP);

  chipHinlegen({
    id: CHIP,
    symbol: "fa-solid fa-handshake",
    text: game.i18n.format("SHOPS.Tisch.Zurueckholen", { person: handel.personName ?? "" }),
    beiKlick: () => tischZeigen()
  });
}

/* ── Auf- und zumachen ─────────────────────────────────────────────── */

let fenster = null;

/** Den Tisch beim Spieler zeigen. */
export function tischZeigen() {
  if (!eigenerTisch()) return null;
  fenster ??= new Handelstisch();
  fenster.render(true);
  chipWegnehmen(CHIP);
  return fenster;
}

/** Zeichnen, was gerade gilt: Fenster, Chip, oder nichts. */
export function tischZeichnen() {
  const handel = eigenerTisch();
  const app = foundry.applications.instances.get(`${MODULE_ID}-tisch`);
  if (!handel) {
    app?.close({ force: true });
    chipWegnehmen(CHIP);
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
  // Die Lage ueber dem Tisch ist ein Teilstueck beider Vorlagen.
  foundry.applications.handlebars.loadTemplates({
    "shops-tisch-wahl": `modules/${MODULE_ID}/templates/handelstisch-wahl.hbs`
  });

  Hooks.on("updateUser", (benutzer, aenderungen) => {
    if (benutzer.id !== game.user.id) return;
    if (!foundry.utils.hasProperty(aenderungen, `flags.${MODULE_ID}.${TISCH}`)) return;
    const handel = eigenerTisch();
    const app = foundry.applications.instances.get(`${MODULE_ID}-tisch`);
    if (handel && !app?.rendered) tischZeigen();
    else tischZeichnen();
  });

  Hooks.on("userConnected", () => tischZeichnen());
  tischHakenGM();
  if (eigenerTisch()) tischZeigen();
}

/* ── Das Fenster der Spielleitung ──────────────────────────────────── */

/** Was von einer Person ueber den Tisch gehen kann. Keine Zauber, keine Merkmale. */
const HANDELBAR = new Set(["weapon", "equipment", "consumable", "tool", "loot", "container", "backpack"]);

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
      wegnehmen: HandelstischGM.#wegnehmen,
      forderungUebernehmen: HandelstischGM.#forderungUebernehmen,
      forderungFrei: HandelstischGM.#forderungFrei,
      anrechnen: HandelstischGM.#anrechnen,
      anrechnenSchnell: HandelstischGM.#anrechnenSchnell,
      anrechnenFrei: HandelstischGM.#anrechnenFrei,
      bestaetigen: HandelstischGM.#bestaetigen,
      geldWeg: HandelstischGM.#geldWeg,
      beenden: HandelstischGM.#beenden,
      ...WAHL_AKTIONEN
    }
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/handelstisch-gm.hbs`,
      scrollable: [".shops-tisch-nsc", ".shops-tisch-spieler", ".shops-wahl-liste"]
    }
  };

  #benutzerId;
  /** Die Person, deren Seite die Spielleitung deckt - bei jedem Zeichnen geholt. */
  #person = null;

  /* Die Lage ueber dem Tisch - siehe tisch-wahl.js. Hier fuer die Seite der Person. */
  wahl = new Wahl();
  wahlLiegt() {
    const h = game.users.get(this.#benutzerId)?.getFlag(MODULE_ID, TISCH);
    return { posten: h?.seiteNsc ?? [], muenzen: h?.muenzenNsc ?? {} };
  }
  wahlVorrat() {
    return (this.#person?.items ?? []).filter(i => HANDELBAR.has(i.type));
  }
  wahlBoerse() { return this.#person?.system?.currency ?? {}; }
  wahlAbschicken(posten, muenzen) { seiteSetzen(this.#benutzerId, "nsc", posten, muenzen); }

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
    this.#person = handel ? await fromUuid(handel.personUuid) : null;
    if (!handel) this.wahl.modus = "tisch";

    return Object.assign(ctx, {
      stand,
      muenzsorten: PREIS_SORTEN.map(sorte => ({ sorte, kuerzel: kuerzel(sorte) })),
      spielerName: benutzer?.name ?? "?",
      figurName: benutzer?.character?.name ?? null,
      boerse: benutzer?.character
        ? alsText(vermoegenCp(benutzer.character.system?.currency ?? {}), kuerzel) : null,
      wahl: this.wahl.kontext(this.wahlVorrat(), this.wahlBoerse())
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

  static #wegnehmen(ereignis, ziel) {
    const zeile = ziel.closest("[data-item-id]");
    const seite = ziel.closest("[data-seite]")?.dataset.seite ?? "nsc";
    if (zeile) wegnehmen(this.benutzerId, seite, zeile.dataset.itemId);
  }

  static #forderungUebernehmen() {
    const feld = this.element.querySelector("[data-forderung]");
    const sorte = this.element.querySelector("[data-forderungsorte]");
    if (!feld) return;
    forderungSetzen(this.benutzerId, ausMuenzfeld(feld.value, sorte?.value ?? "gp"));
  }

  static #forderungFrei() { forderungSetzen(this.benutzerId, null); }

  /** Was ihr sein Stueck wert ist - aus dem Feld in seiner Zeile. */
  static #anrechnen(ereignis, ziel) {
    const zeile = ziel.closest("[data-item-id]");
    const feld = zeile?.querySelector("[data-anrechnung]");
    const sorte = zeile?.querySelector("[data-anrechnungsorte]");
    if (!feld) return;
    anrechnenSetzen(this.benutzerId, zeile.dataset.itemId,
                    ausMuenzfeld(feld.value, sorte?.value ?? "gp"));
  }

  /** Einer der drei Vorschlaege - ein Griff statt einer Zahl. */
  static #anrechnenSchnell(ereignis, ziel) {
    const zeile = ziel.closest("[data-item-id]");
    if (zeile) anrechnenSetzen(this.benutzerId, zeile.dataset.itemId, Number(ziel.dataset.wert) || 0);
  }

  static #anrechnenFrei(ereignis, ziel) {
    const zeile = ziel.closest("[data-item-id]");
    if (zeile) anrechnenSetzen(this.benutzerId, zeile.dataset.itemId, null);
  }

  static #geldWeg() { geldSetzen(this.benutzerId, "nsc", {}); }

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
