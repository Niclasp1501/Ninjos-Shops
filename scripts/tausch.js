/**
 * Der Tausch zwischen zwei Spielern.
 *
 * **Woher das kommt.** Diese Funktion lag bis zum 08.09.2026 in Ninjo's
 * In-Person Tools (`scripts/trade.js`). Sie ist hierher gezogen, weil sie und
 * der Handelstisch dieselbe Sache aus zwei Richtungen sind: zwei Leute legen
 * etwas hin, beide sagen zu, es wechselt die Seite. Zwei Tauschfenster in zwei
 * Modulen nebeneinander waren genau die Uneinheitlichkeit, gegen die der Tisch
 * gebaut wurde. An der alten Stelle steht jetzt ein Hinweis.
 *
 * **Was beim Umzug besser wurde.** Drueben lag der laufende Tausch in einer
 * `Map` im Speicher der Spielleitung: Wer neu lud, verlor ihn. Hier liegt er -
 * wie der Handelstisch - als **Merkmal an beiden Benutzern** und uebersteht
 * jedes Neuladen. Und ausgefuehrt wird ueber `vorsitz.js` statt ueber
 * `game.users.activeGM`: Der nennt einen *Benutzer*, keine *Verbindung*, und
 * bei zwei angemeldeten Spielleitungen fuehrten sonst beide denselben Tausch
 * aus - jedes Stueck zweimal angelegt.
 *
 * **Was bewusst gleich blieb.** Die Spielleitung haelt die Wahrheit und
 * verteilt sie: Spieler reden nie direkt miteinander. Das klingt nach Umweg
 * und bringt dreierlei auf einmal - die beiden Auslagen koennen nicht
 * auseinanderlaufen, weil es nur eine gibt; niemand kann behaupten, sein
 * Gegenueber haette etwas anderes zugesagt; und die Regel „ohne Spielleitung
 * kein Tausch", die ohnehin gilt (nur sie darf auf fremden Akteuren anlegen
 * und loeschen), ist kein Sonderfall mehr, sondern schlicht der Ablauf.
 *
 * **Ein Angebot beschreibt sich selbst.** Ein Spieler kann den Akteur des
 * anderen nicht lesen, also traegt die Auslage Namen, Bilder und Mengen mit
 * sich statt Kennungen zum Nachschlagen. Die Kennungen sind auch drin, aber
 * nur die Spielleitung loest sie auf.
 *
 * **Jede Aenderung setzt beide Zusagen zurueck.** Ohne das koennte einer
 * zusagen, warten und im letzten Moment etwas vom Tisch nehmen.
 *
 * Hier wird **nicht gerechnet**. Was ein Stueck wert ist, geht keinem der
 * beiden etwas an, solange sie sich einig sind - anders als beim Handelstisch,
 * wo eine Person einen Preis verlangt. Auf dem Tisch liegt, was daliegt.
 */

import { MODULE_ID, SOCKET, SETTINGS } from "./const.js";
import { uebergeben, pruefeSeite, inhaltVon } from "./lager.js";
import { darfIchAusfuehren, bittenKennung } from "./vorsitz.js";
import { Wahl, WAHL_AKTIONEN, muenzText, muenzenSaeubern } from "./tisch-wahl.js";
import { chipHinlegen, chipWegnehmen } from "./chip.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/** Eine Einstellung dieses Moduls lesen, ohne beim Fehlen umzufallen. */
const einstellung = schluessel => {
  try { return game.settings.get(MODULE_ID, schluessel); } catch { return false; }
};

/** Merkmal an beiden Benutzern: der offene Tausch. Einer je Person. */
export const TAUSCH = "tausch";

/** Kennung des Fensters - eines je Client, es gibt nur einen Tausch. */
const FENSTER = `${MODULE_ID}-tausch`;

/** Der Zettel unten rechts, wenn das Fenster weggelegt ist. */
const CHIP = `${MODULE_ID}-tauschchip`;

/* ── Wer mit wem ───────────────────────────────────────────────────── */

/**
 * Mit welcher Figur handelt dieses Konto?
 *
 * Nicht einfach `user.character`. Das Feld ist die im Konto *zugewiesene*
 * Figur, und an vielen Tischen wird es nie ausgefuellt - die Spieler besitzen
 * ihren Bogen, oeffnen ihn aus der Seitenleiste und merken nie, dass es das
 * Feld gibt. In dieser Welt blieb die Partnerliste deshalb leer, waehrend zwei
 * Spieler danebensassen.
 *
 * Also: die zugewiesene, sonst die eine, die dieses Konto besitzt. Zwei oder
 * mehr besessene und keine zugewiesene ist echte Mehrdeutigkeit - das kann
 * niemand ausser dem Spieler entscheiden, und dieser Fall wird gemeldet statt
 * geraten.
 */
export function figurVon(benutzer) {
  if (benutzer?.character) return benutzer.character;
  const eigene = eigeneFiguren(benutzer);
  return eigene.length === 1 ? eigene[0] : null;
}

/** Spielerfiguren, die dieses Konto wirklich besitzt. */
function eigeneFiguren(benutzer) {
  return game.actors.filter(a =>
    a.type === "character" && benutzer && a.testUserPermission(benutzer, "OWNER"));
}

/** Warum dieses Konto nicht tauschen kann - oder `null`, wenn es kann. */
export function warumNicht(benutzer) {
  if (figurVon(benutzer)) return null;
  return eigeneFiguren(benutzer).length > 1 ? "mehrere" : "keine";
}

/**
 * Alle, die da sind - mit ihrer Figur oder dem Grund, warum sie keine haben.
 *
 * Nur wirklich Angemeldete: Ein Tausch mit jemandem, der nicht da ist, ist
 * kein Tausch, und ein Angebot, das niemand beantworten kann, stuende nur auf
 * dem Schirm herum. Die Spielleitung ist nur dabei, wenn die Einstellung es
 * sagt - die meisten Tische geben aus, statt mit ihr zu tauschen.
 *
 * Wer keine Figur hat, steht **trotzdem** in der Liste, mit seinem Grund. Ihn
 * wegzulassen erzeugte „hier ist niemand", waehrend zwei Spieler am Tisch
 * sassen: Eine Liste, die die Antwort verschweigt, ist schlechter als eine,
 * die sie ausgegraut zeigt.
 */
export function moeglichePartner() {
  const mitGm = einstellung(SETTINGS.TAUSCH_MIT_GM);
  return game.users
    .filter(u => u.active && u.id !== game.user.id && (mitGm || !u.isGM))
    .map(u => {
      const figur = figurVon(u);
      return {
        benutzerId: u.id,
        benutzerName: u.name,
        figurId: figur?.id ?? null,
        figurName: figur?.name ?? null,
        figurBild: figur?.img ?? null,
        grund: figur ? null : warumNicht(u)
      };
    });
}

/** Ist eine Spielleitung da, die es ausfuehren kann? */
export function spielleitungDa() { return !!game.users.activeGM; }

/* ── Der eigene Tausch ─────────────────────────────────────────────── */

export function eigenerTausch() {
  return game.user.getFlag(MODULE_ID, TAUSCH) ?? null;
}

/** Welche Seite bin ich? */
function meineSeite(tausch, benutzerId = game.user.id) {
  if (tausch?.a?.benutzerId === benutzerId) return "a";
  if (tausch?.b?.benutzerId === benutzerId) return "b";
  return null;
}

const leereSeite = () => ({ posten: [], muenzen: {}, bereit: false });

/**
 * Der Tausch, fertig fuer die Anzeige - aus Sicht dieses Clients.
 *
 * „Meine" und „seine" Seite haengen davon ab, wer hinsieht: Dasselbe Merkmal
 * liegt bei beiden Beteiligten und wird von jedem anders herum gelesen.
 */
export function tauschStand(tausch) {
  if (!tausch) return null;
  const ich = meineSeite(tausch);
  if (!ich) return null;
  const er = ich === "a" ? "b" : "a";

  const schmuecken = seite => ({
    ...seite,
    posten: (seite.posten ?? []).map(p => ({ ...p })),
    muenzText: muenzText(seite.muenzen),
    hatMuenzen: Object.keys(muenzenSaeubern(seite.muenzen)).length > 0,
    leer: !(seite.posten ?? []).length && !Object.keys(muenzenSaeubern(seite.muenzen)).length
  });

  return {
    ...tausch,
    ich: schmuecken(tausch[ich]),
    er: schmuecken(tausch[er]),
    gefragt: tausch.zustand === "gefragt",
    // Nur der Gefragte beantwortet die Frage; der Fragende wartet.
    binGefragt: tausch.zustand === "gefragt" && ich === "b",
    offen: tausch.zustand === "offen",
    laeuft: tausch.zustand === "laeuft",
    leer: !(tausch.a.posten ?? []).length && !(tausch.b.posten ?? []).length
          && !Object.keys(muenzenSaeubern(tausch.a.muenzen)).length
          && !Object.keys(muenzenSaeubern(tausch.b.muenzen)).length
  };
}

/* ── Was der Spieler schickt ───────────────────────────────────────── */

function bitte(tat, mehr = {}) {
  const paket = { typ: SOCKET.TAUSCH, tat, spielerId: game.user.id,
                  bitteId: bittenKennung(), ...mehr };
  game.socket.emit(SOCKET.NAME, paket);
  if (game.user.isGM) aufTausch(paket);
}

export const tauschFragen   = (partner, figurId) => bitte("fragen", { partner, figurId });
export const tauschAntworten = ja => bitte("antworten", { ja: !!ja });
export const tauschSeite    = (posten, muenzen) => bitte("seite", { posten, muenzen });
export const tauschBereit   = wert => bitte("bereit", { wert: !!wert });
export const tauschAufgeben = () => bitte("aufgeben");

/* ── Was die Spielleitung tut ──────────────────────────────────────── */

/** Beiden Beteiligten denselben Stand ins Merkmal schreiben. */
async function verteilen(tausch) {
  for (const seite of ["a", "b"]) {
    const u = game.users.get(tausch[seite].benutzerId);
    if (u) await u.setFlag(MODULE_ID, TAUSCH, tausch);
  }
  await funken([tausch.a.benutzerId, tausch.b.benutzerId]);
}

/** Bei beiden abraeumen. */
async function abraeumen(tausch) {
  const ids = [tausch.a.benutzerId, tausch.b.benutzerId];
  for (const id of ids) await game.users.get(id)?.unsetFlag(MODULE_ID, TAUSCH);
  await funken(ids);
}

async function funken(an) {
  const paket = { typ: SOCKET.TAUSCH, tat: "stand", an };
  game.socket.emit(SOCKET.NAME, paket);
  aufTausch(paket);
}

/** Laeuft bei dieser Person schon einer? */
function beschaeftigt(benutzerId) {
  return !!game.users.get(benutzerId)?.getFlag(MODULE_ID, TAUSCH);
}

/** Einstiegspunkt aus socket.js. */
export async function aufTausch(daten) {
  if (daten.tat === "stand") {
    tauschZeichnen();
    return;
  }
  if (!game.user.isGM) return;
  if (!einstellung(SETTINGS.TAUSCH)) return;
  if (!await darfIchAusfuehren(daten.bitteId)) return;

  const fragender = game.users.get(daten.spielerId);
  if (!fragender) return;

  if (daten.tat === "fragen") {
    const partner = game.users.get(daten.partner);
    if (!partner) return;
    if (beschaeftigt(fragender.id) || beschaeftigt(partner.id)) {
      return void meldung(fragender.id, "SHOPS.Tausch.Beschaeftigt");
    }
    /*
     * Name und Bild werden **hier** hineingeschrieben, auf dem einen Client,
     * der jeden Akteur lesen darf. Ein Spieler kann die Figur seines Partners
     * nicht nachschlagen; der Tausch muss beide beschreiben, so wie eine
     * Auslage sich selbst beschreibt.
     */
    const seite = (benutzer, figurId) => {
      const figur = game.actors.get(figurId);
      return {
        benutzerId: benutzer.id, benutzerName: benutzer.name,
        figurId, figurName: figur?.name ?? benutzer.name,
        figurBild: figur?.img ?? "icons/svg/mystery-man.svg",
        ...leereSeite()
      };
    };
    return void await verteilen({
      id: foundry.utils.randomID(),
      zustand: "gefragt",
      a: seite(fragender, daten.figurId),
      b: seite(partner, figurVon(partner)?.id)
    });
  }

  const tausch = fragender.getFlag(MODULE_ID, TAUSCH);
  if (!tausch) return;
  const seite = meineSeite(tausch, fragender.id);
  if (!seite) return;

  if (daten.tat === "aufgeben") {
    // Nicht, waehrend die Ware unterwegs ist: Zwischen den beiden Uebergaben
    // gibt es nichts mehr abzusagen.
    if (!["gefragt", "offen"].includes(tausch.zustand)) return;
    return void await abraeumen(tausch);
  }

  if (daten.tat === "antworten") {
    if (seite !== "b" || tausch.zustand !== "gefragt") return;
    if (!daten.ja) return void await abraeumen(tausch);
    return void await verteilen({ ...tausch, zustand: "offen" });
  }

  if (tausch.zustand !== "offen") return;

  if (daten.tat === "seite") {
    const figur = game.actors.get(tausch[seite].figurId);
    if (!figur) return;
    const liste = [];
    for (const p of daten.posten ?? []) {
      const item = figur.items.get(p.itemId);
      if (!item || liste.some(z => z.itemId === item.id)) continue;
      const vorrat = item.type === "container" ? 1 : Number(item.system?.quantity ?? 1);
      const menge = Math.min(Math.max(1, Math.floor(Number(p.menge) || 1)), vorrat);
      if (menge > 0) liste.push({
        itemId: item.id, name: item.name, img: item.img || null, menge,
        // Ein Beutel reist samt Inhalt - also gehoert der zu dem, was zugesagt wird.
        inhalt: inhaltVon(item)
      });
    }
    const boerse = figur.system?.currency ?? {};
    const muenzen = {};
    for (const [s, n] of Object.entries(muenzenSaeubern(daten.muenzen))) {
      const hat = Math.floor(Number(boerse[s] ?? 0));
      if (hat > 0) muenzen[s] = Math.min(n, hat);
    }
    // Ein veraenderter Tisch ist ein neuer Vorschlag - kein altes Ja gilt noch.
    return void await verteilen({
      ...tausch,
      [seite]: { ...tausch[seite], posten: liste, muenzen },
      a: { ...tausch.a, bereit: false, ...(seite === "a" ? { posten: liste, muenzen } : {}) },
      b: { ...tausch.b, bereit: false, ...(seite === "b" ? { posten: liste, muenzen } : {}) }
    });
  }

  if (daten.tat === "bereit") {
    const neu = {
      ...tausch,
      a: { ...tausch.a, bereit: seite === "a" ? daten.wert : tausch.a.bereit },
      b: { ...tausch.b, bereit: seite === "b" ? daten.wert : tausch.b.bereit }
    };
    if (neu.a.bereit && neu.b.bereit) return void await ausfuehren(neu);
    return void await verteilen(neu);
  }
}

/** Ein fertiger Satz an genau eine Person. */
function meldungText(benutzerId, text) {
  if (benutzerId === game.user.id) return;
  game.socket.emit(SOCKET.NAME, { typ: SOCKET.TAUSCH, tat: "meldung", an: benutzerId, text });
}

/** Eine kurze Nachricht an genau eine Person. */
function meldung(benutzerId, schluessel) {
  if (benutzerId === game.user.id) return ui.notifications.warn(game.i18n.localize(schluessel));
  game.socket.emit(SOCKET.NAME, { typ: SOCKET.TAUSCH, tat: "meldung", an: benutzerId, schluessel });
}

/**
 * Beide haben zugesagt - jetzt wechselt es die Seite.
 *
 * Laeuft auf dem Client der Spielleitung, weil nur sie auf fremden Akteuren
 * anlegen und loeschen darf.
 */
async function ausfuehren(tausch) {
  await verteilen({ ...tausch, zustand: "laeuft" });

  const figurA = game.actors.get(tausch.a.figurId);
  const figurB = game.actors.get(tausch.b.figurId);
  if (!figurA || !figurB) {
    await abraeumen(tausch);
    return void ui.notifications.warn(game.i18n.localize("SHOPS.Tausch.FigurWeg"));
  }

  /*
   * **Erst beide pruefen, dann beide bewegen.** Vorher wurde die eine Seite
   * uebergeben und danach die andere; scheiterte die zweite, hatte einer
   * gegeben und nichts bekommen. Genau so passiert am 10.09.2026: Die
   * Gegenseite loeschte ihr Stueck, der Tausch lief trotzdem los.
   */
  for (const [seite, figur] of [["a", figurA], ["b", figurB]]) {
    const pruefung = pruefeSeite(figur, tausch[seite].posten, tausch[seite].muenzen);
    if (pruefung.ok) continue;
    // Der Tisch bleibt stehen, aber ohne Zusagen - beide sollen sehen, warum.
    await verteilen({
      ...tausch, zustand: "offen",
      a: { ...tausch.a, bereit: false }, b: { ...tausch.b, bereit: false }
    });
    const text = game.i18n.format("SHOPS.Tausch.NichtMehrDa", { was: pruefung.was });
    ui.notifications.warn(text);
    for (const id of [tausch.a.benutzerId, tausch.b.benutzerId]) meldungText(id, text);
    return;
  }

  const berichte = [
    await uebergeben(figurA, figurB, tausch.a.posten, tausch.a.muenzen),
    await uebergeben(figurB, figurA, tausch.b.posten, tausch.b.muenzen)
  ];

  await abraeumen(tausch);

  const fehler = berichte.map(b => b.fehler).filter(Boolean);
  if (fehler.length) {
    ui.notifications.error(`${game.i18n.localize("SHOPS.Tausch.Steckengeblieben")} ${fehler.join(" | ")}`);
  }
  await ansage(tausch, figurA, figurB, fehler.length > 0);
}

/** Eine Karte im Chat, damit der Tisch sieht, was geschehen ist. */
async function ansage(tausch, figurA, figurB, kaputt) {
  if (!einstellung(SETTINGS.TAUSCH_ANSAGE)) return;
  const liste = seite => {
    const teile = [
      ...(seite.posten ?? []).map(p => p.menge > 1 ? `${p.name} &times;${p.menge}` : p.name),
      muenzText(seite.muenzen)
    ].filter(Boolean);
    return teile.length ? teile.join(", ") : game.i18n.localize("SHOPS.Tausch.Nichts");
  };
  const zeile = (figur, seite) =>
    `<p><strong>${foundry.utils.escapeHTML(figur.name)}</strong> ${game.i18n.localize("SHOPS.Tausch.Gibt")} ${liste(seite)}</p>`;

  await ChatMessage.create({
    content: `<div class="ninjos-shops shops-tauschkarte">
      ${zeile(figurA, tausch.a)}
      ${zeile(figurB, tausch.b)}
      ${kaputt ? `<p><strong>${game.i18n.localize("SHOPS.Tausch.Steckengeblieben")}</strong></p>` : ""}
    </div>`
  });
}

/* ── Das Fenster ───────────────────────────────────────────────────── */

export class Tauschtisch extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: FENSTER,
    classes: ["ninjos-shops", "shops-tisch"],
    position: { width: 760, height: "auto" },
    window: { icon: "fa-solid fa-right-left", resizable: true },
    actions: {
      ansehen: Tauschtisch.#ansehen,
      annehmen: Tauschtisch.#annehmen,
      jaSagen: () => tauschAntworten(true),
      neinSagen: () => tauschAntworten(false),
      aufgeben: Tauschtisch.#aufgeben,
      ...WAHL_AKTIONEN
    }
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/tauschtisch.hbs`,
      scrollable: [".shops-tisch-nsc", ".shops-tisch-spieler", ".shops-wahl-liste"]
    }
  };

  get title() {
    const t = eigenerTausch();
    const stand = tauschStand(t);
    return game.i18n.format("SHOPS.Tausch.Titel", { person: stand?.er?.figurName ?? "" });
  }

  /* Die Lage ueber dem Tisch - dieselbe wie am Handelstisch. */
  wahl = new Wahl();
  wahlLiegt() {
    const s = tauschStand(eigenerTausch());
    return { posten: s?.ich?.posten ?? [], muenzen: s?.ich?.muenzen ?? {} };
  }
  wahlVorrat() {
    const figur = figurVon(game.user);
    return (figur?.items ?? []).filter(i =>
      i.type === "container" || Number.isFinite(Number(i.system?.quantity)));
  }
  wahlBoerse() { return figurVon(game.user)?.system?.currency ?? {}; }
  wahlAbschicken(posten, muenzen) { tauschSeite(posten, muenzen); }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const stand = tauschStand(eigenerTausch());
    if (!stand || !stand.offen) this.wahl.modus = "tisch";
    return Object.assign(ctx, {
      stand,
      wahl: stand?.offen ? this.wahl.kontext(this.wahlVorrat(), this.wahlBoerse()) : null
    });
  }

  /**
   * Ein Stueck genauer ansehen - auch das der Gegenseite.
   *
   * Foundry schickt jedem Client **alle** Weltakteure und filtert nur die
   * Anzeige (siehe AGENTS.md). Die Figur des Gegenuebers laesst sich deshalb
   * lesen, und `wareAnsehen` baut daraus eine fluechtige Kopie, die als
   * Beobachter geoeffnet wird - dieselbe Nur-Lesen-Ansicht wie am
   * Handelstisch.
   */
  static async #ansehen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    const seite = ziel.closest("[data-seite]")?.dataset.seite;
    const stand = tauschStand(eigenerTausch());
    if (!itemId || !stand) return;
    const figurId = seite === "er" ? stand.er.figurId : stand.ich.figurId;
    const figur = game.actors.get(figurId);
    if (!figur) return;
    const { wareAnsehen } = await import("./ware-ansehen.js");
    wareAnsehen(figur, itemId);
  }

  static #annehmen() {
    const s = tauschStand(eigenerTausch());
    tauschBereit(!s?.ich?.bereit);
  }

  /**
   * @override
   *
   * **Zumachen beendet den Tausch nicht.** Der Zettel unten rechts holt ihn
   * zurueck - dasselbe wie am Handelstisch.
   */
  async close(options = {}) {
    const raus = await super.close(options);
    chipNachziehen();
    return raus;
  }

  static async #aufgeben() {
    const s = tauschStand(eigenerTausch());
    const sicher = await DialogV2.confirm({
      window: { title: game.i18n.localize("SHOPS.Tausch.AufgebenTitel") },
      classes: ["ninjos-shops"],
      content: `<p class="shops-kaufdialog">${game.i18n.format("SHOPS.Tausch.AufgebenFrage",
        { person: foundry.utils.escapeHTML(s?.er?.figurName ?? "") })}</p>`,
      yes: { label: game.i18n.localize("SHOPS.Tausch.Aufgeben"), icon: "fa-solid fa-hand" },
      no: { label: game.i18n.localize("SHOPS.Abbrechen") },
      defaultYes: false
    });
    if (sicher) tauschAufgeben();
  }
}

/**
 * Weggelegt heisst nicht beendet.
 *
 * Wer das Kreuz drueckt, will das Fenster los sein - der Tausch laeuft weiter,
 * und unten rechts liegt der Zettel, der ihn zurueckholt. Genau wie beim
 * Handelstisch und beim Laden.
 */
function chipNachziehen() {
  const tausch = eigenerTausch();
  const offen = foundry.applications.instances.get(FENSTER)?.rendered;
  if (!tausch || !meineSeite(tausch) || offen) return void chipWegnehmen(CHIP);

  const stand = tauschStand(tausch);
  chipHinlegen({
    id: CHIP,
    symbol: "fa-solid fa-right-left",
    text: game.i18n.format("SHOPS.Tausch.Zurueckholen", { person: stand?.er?.figurName ?? "" }),
    beiKlick: () => tauschZeigen()
  });
}

export function tauschZeigen() {
  const app = foundry.applications.instances.get(FENSTER) ?? new Tauschtisch();
  app.render(true);
  return app;
}

export function tauschZeichnen() {
  const app = foundry.applications.instances.get(FENSTER);
  const tausch = eigenerTausch();
  if (!tausch || !meineSeite(tausch)) {
    app?.close({ force: true });
    chipWegnehmen(CHIP);
    return;
  }
  if (app?.rendered) app.render(false);
  // Wer das Fenster weggelegt hat, bekommt es nicht ungefragt zurueck -
  // der Zettel unten rechts wird nur aufgefrischt.
  else if (document.getElementById(CHIP)) chipNachziehen();
  else tauschZeigen();
}

/* ── Die Partnerwahl ───────────────────────────────────────────────── */

/**
 * Wen frage ich?
 *
 * Eine grosse Zeile je Person, als Ganzes angetippt - kein Knopf zum Treffen
 * und keine Bestaetigung danach. Die Partnerwahl ist die eine Stelle, an der
 * ein Vertipper nichts kostet: Die andere Seite muss ohnehin noch ja sagen.
 */
export async function tauschStarten() {
  if (eigenerTausch()) return void tauschZeigen();

  const figur = figurVon(game.user);
  if (!figur) {
    return void ui.notifications.warn(game.i18n.localize(
      warumNicht(game.user) === "mehrere"
        ? "SHOPS.Tausch.MehrereFiguren" : "SHOPS.Tausch.KeineFigur"));
  }
  if (!spielleitungDa()) {
    return void ui.notifications.warn(game.i18n.localize("SHOPS.Tausch.KeineSpielleitung"));
  }

  const leute = moeglichePartner();
  const koennen = leute.filter(l => l.figurId);
  if (!koennen.length) {
    return void ui.notifications.warn(game.i18n.localize(
      leute.length ? "SHOPS.Tausch.NiemandBereit" : "SHOPS.Tausch.NiemandDa"));
  }

  const zeilen = koennen.map(l => `
    <button type="button" class="shops-partner" data-benutzer="${l.benutzerId}">
      <img src="${foundry.utils.escapeHTML(l.figurBild ?? "")}" alt="">
      <span class="shops-partner-mitte">
        <span class="shops-partner-name">${foundry.utils.escapeHTML(l.figurName)}</span>
        <span class="shops-partner-notiz">${foundry.utils.escapeHTML(l.benutzerName)}</span>
      </span>
      <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
    </button>`).join("");

  const gesperrt = leute.filter(l => !l.figurId).map(l => `
    <div class="shops-partner shops-gesperrt">
      <i class="fa-solid fa-user-slash" aria-hidden="true"></i>
      <span class="shops-partner-mitte">
        <span class="shops-partner-name">${foundry.utils.escapeHTML(l.benutzerName)}</span>
        <span class="shops-partner-notiz">${game.i18n.localize(
          l.grund === "mehrere" ? "SHOPS.Tausch.MehrereFiguren" : "SHOPS.Tausch.KeineFigur")}</span>
      </span>
    </div>`).join("");

  await DialogV2.wait({
    window: { title: game.i18n.localize("SHOPS.Tausch.WenFragen") },
    classes: ["ninjos-shops", "shops-tisch-wahl"],
    content: `<div class="shops-partnerliste">${zeilen}${gesperrt}</div>`,
    buttons: [{ action: "abbrechen", label: game.i18n.localize("SHOPS.Abbrechen") }],
    render: (ereignis, dialog) => {
      const wurzel = dialog.element ?? dialog;
      wurzel.querySelectorAll("[data-benutzer]").forEach(knopf => {
        knopf.addEventListener("click", () => {
          tauschFragen(knopf.dataset.benutzer, figur.id);
          dialog.close();
        });
      });
    }
  });
}

/* ── Einrichten ────────────────────────────────────────────────────── */

/* ── Der Knopf ueber der Spielerliste ──────────────────────────────── */

const KNOPF = "shops-tausch-knopf";

/**
 * Er sitzt **in `#players-active`**, nicht in `#players` selbst.
 *
 * Das ist keine Geschmacksfrage: `#ui-left` traegt `pointer-events: none`,
 * damit die Leinwand durch die Luecken der Oberflaeche erreichbar bleibt, und
 * nur `#players-active` und `#players-inactive` schalten es wieder an. Ein
 * Knopf eine Ebene hoeher zeichnet sich tadellos und laesst sich nicht
 * anklicken. (Gefunden in den In-Person Tools, wo genau das passiert war.)
 *
 * Bei jedem Zeichnen neu gebaut statt gemerkt: Foundry ersetzt die ganze
 * Liste, sobald jemand sich anmeldet, und eine gemerkte Verweisung zeigte
 * danach auf einen Knoten, der nicht mehr in der Seite haengt.
 */
function knopfSetzen(element) {
  const liste = element ?? document.getElementById("players");
  const wurzel = liste?.querySelector("#players-active") ?? liste;
  if (!wurzel) return;
  wurzel.querySelector(`#${KNOPF}`)?.remove();

  /*
   * Sind die In-Person Tools da, gehoert der Knopf ihnen - ihrer steht auch in
   * der Bogenansicht, wo wir nicht hinkommen, und ruft uns ohnehin auf. Zwei
   * Knoepfe nebeneinander, die dasselbe tun, waeren nur Rauschen.
   */
  if (!einstellung(SETTINGS.TAUSCH)) return;
  if (game.modules.get("ninjos-inperson-tools")?.active) return;

  const knopf = document.createElement("button");
  knopf.id = KNOPF;
  knopf.type = "button";
  knopf.innerHTML = `<i class="fa-solid fa-right-left"></i> <span>${game.i18n.localize("SHOPS.Tausch.Knopf")}</span>`;
  knopf.addEventListener("click", () => tauschStarten());
  wurzel.prepend(knopf);
}

export function tauschKnopfNachziehen() { knopfSetzen(); }

export function tauschEinrichten() {
  // Dieselbe Lage wie am Handelstisch. Doppeltes Laden schadet nicht.
  foundry.applications.handlebars.loadTemplates({
    "shops-tisch-wahl": `modules/${MODULE_ID}/templates/handelstisch-wahl.hbs`
  });

  Hooks.on("updateUser", (benutzer, aenderungen) => {
    if (benutzer.id !== game.user.id) return;
    if (!foundry.utils.hasProperty(aenderungen, `flags.${MODULE_ID}.${TAUSCH}`)) return;
    tauschZeichnen();
  });
  Hooks.on("renderPlayers", (app, element) => knopfSetzen(element));
  knopfSetzen();

  if (eigenerTausch()) tauschZeigen();
}
