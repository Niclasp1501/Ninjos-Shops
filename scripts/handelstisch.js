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
 * **Wer etwas hinlegt, sagt, was er dafür haben will.** Bis zum 18.09.2026
 * rechnete das Modul jedes Stück selbst mit dem Preis des Gegenstands, und die
 * Spielleitung konnte nur nachträglich überschreiben. Am Tisch gemeldet: Beim
 * Handeln geht es gerade darum auszuloten, was man haben möchte; ein Preis,
 * den niemand genannt hat, nimmt dem Gespräch den Anfang. Jetzt nennt der
 * Spieler den Preis für seine Sachen, die Spielleitung den für die der
 * Person, und beide können ihn jederzeit ändern. Die andere Seite antwortet,
 * indem sie selbst etwas hinlegt, Münzen dazulegt oder um einen anderen Preis
 * bittet. Der Listenpreis steht nur als Auskunft daneben.
 */

import { MODULE_ID, SOCKET, WARE, SETTINGS } from "./const.js";
import { grundpreisCp, alsText, alsMuenzfelder, muenzfelderVon, preisText, eingegebeneMuenzen,
         EINGABE_SORTEN, KUPFERWERT } from "./preise.js";
import { vermoegenCp, muenzenAbziehen, muenzenDazu, zahleAus } from "./kasse.js";
import { laedenVon } from "./verknuepfung.js";
import { leseMuenzfelder } from "./muenzfeld.js";
import { uebergeben, pruefeSeite, inhaltVon, muenzenIn, stecktIn } from "./lager.js";
import { darfIchAusfuehren, bittenKennung } from "./vorsitz.js";
import { verkaufbareSachen } from "./verkauf.js";
import { Wahl, WAHL_AKTIONEN, muenzText, muenzenSaeubern } from "./tisch-wahl.js";
import { chipHinlegen, chipWegnehmen } from "./chip.js";
import { abbruchMelden, erfolgZeigen, hinweisMelden, hinweisZeigen, istWortbruch } from "./melden.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Merkmal am Benutzer: der offene Handel. Einer je Spieler. */
export const TISCH = "handel";

/** Was fuer einen Posten verlangt wird. Ohne genannten Preis: noch nichts. */
const hatPreis = p => Number.isFinite(p?.preisCp);
const preisVon = p => hatPreis(p) ? p.preisCp : 0;
const summe = seite => (seite ?? []).reduce((s, p) => s + preisVon(p), 0);

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
 * Zwei Summen: was auf ihrer Seite liegt und was auf seiner, jeweils mit den
 * Preisen, die ihr Besitzer genannt hat, und den Muenzen dazu. Was dazwischen
 * fehlt, steht daneben.
 */
export function tischStand(handel) {
  if (!handel) return null;

  const geldNsc = Math.max(0, Math.round(handel.geldNsc || 0));
  const geldSpieler = Math.max(0, Math.round(handel.geldSpieler || 0));

  const linksCp = summe(handel.seiteNsc) + geldNsc;
  const rechtsCp = summe(handel.seiteSpieler) + geldSpieler;
  const differenzCp = linksCp - rechtsCp;

  /*
   * **Wer mit Muenzen ueberzahlt, bekommt heraus.** Seit dem 18.09.2026, wie
   * im Laden: Wer ein Platinstueck fuer etwas zu fuenf Gold hinlegt, bekommt
   * fuenf Gold zurueck, statt dass die Waage „zu viel" sagt. Herausgegeben
   * wird hoechstens, was diese Seite an Muenzen hingelegt hat; was sie an Ware
   * mehr gibt, ist Verhandlungssache und kein Wechselgeld.
   *
   * Mit „passend zahlen" gibt es kein Wechselgeld, fuer diesen einen Handel.
   * Die Spielleitung stellt das am Tisch um; vorbelegt wird es vom Laden der
   * Person, falls sie genau einen fuehrt.
   */
  const passend = handel.passend === true;
  let wechselAn = null;
  let wechselCp = 0;
  if (!passend && differenzCp < 0 && geldSpieler > 0) {
    wechselAn = "spieler"; wechselCp = Math.min(-differenzCp, geldSpieler);
  } else if (!passend && differenzCp > 0 && geldNsc > 0) {
    wechselAn = "nsc"; wechselCp = Math.min(differenzCp, geldNsc);
  }
  const offenCp = differenzCp < 0 ? differenzCp + wechselCp : differenzCp - wechselCp;

  /*
   * Ein Posten ohne Preis ist eine offene Frage, keine Null. Zugesagt werden
   * kann erst, wenn fuer alles etwas genannt ist; eine ausdrueckliche 0 heisst
   * geschenkt und zaehlt als genannt.
   */
  const ohnePreis = [...(handel.seiteNsc ?? []), ...(handel.seiteSpieler ?? [])]
    .filter(p => !hatPreis(p));

  const zeile = p => ({
    ...p,
    hatPreis: hatPreis(p),
    // In den Muenzen, in denen er genannt wurde: 5 EM bleiben 5 EM.
    preisText: preisText(preisVon(p), p.preisMuenzen, kuerzel),
    grundText: p.grundCp ? alsText(p.grundCp * p.menge, kuerzel) : "",
    inhaltGeldText: muenzText(p.inhaltMuenzen),
    darinEtwas: !!((p.inhalt ?? []).length || Object.keys(p.inhaltMuenzen ?? {}).length)
  });

  return {
    ...handel,
    seiteNsc: (handel.seiteNsc ?? []).map(zeile),
    seiteSpieler: (handel.seiteSpieler ?? []).map(zeile),

    geldNsc, geldSpieler,
    geldNscText: muenzText(handel.muenzenNsc) || alsText(geldNsc, kuerzel),
    geldSpielerText: muenzText(handel.muenzenSpieler) || alsText(geldSpieler, kuerzel),

    passend,
    wechselAn,
    wechselAnSpieler: wechselAn === "spieler",
    wechselCp,
    wechselText: alsText(wechselCp, kuerzel),

    linksText: alsText(linksCp, kuerzel),
    rechtsText: alsText(rechtsCp, kuerzel),

    offenCp,
    offenText: alsText(Math.abs(offenCp), kuerzel),
    fehlt: offenCp > 0,
    zuViel: offenCp < 0,
    ausgeglichen: offenCp === 0,
    allePreise: ohnePreis.length === 0,
    ohnePreisNamen: ohnePreis.map(p => p.name).join(", "),

    /*
     * **Zwei Zusagen, nicht eine.** Ein Tausch ist eine Abrede zwischen
     * zweien; jede Aenderung danach setzt beide zurueck, denn die alte Zusage
     * galt einem anderen Tisch.
     */
    // Ohne Spielleitung fuehrt niemand aus, siehe tausch.js.
    ohneSpielleitung: !game.users.activeGM,
    bereitSpieler: handel.bereitSpieler === true,
    bereitGm: handel.bereitGm === true,
    zusageWegSpieler: handel.zusageWegSpieler === true,
    zusageWegGm: handel.zusageWegGm === true,

    leer: !((handel.seiteNsc ?? []).length || (handel.seiteSpieler ?? []).length
            || geldNsc || geldSpieler)
  };
}

/** Der eigene offene Handel. */
export function eigenerTisch() {
  return game.user.getFlag(MODULE_ID, TISCH) ?? null;
}

/**
 * Die Zusagen fallen weg, weil sich etwas geaendert hat.
 *
 * Jede Aenderung macht aus dem Handel einen anderen: ein Stueck mehr, ein
 * anderer Preis, eine Muenze weniger. Ein Ja, das dem alten Tisch galt, gilt
 * dem neuen nicht. `zusageWeg` ist die Spur davon: Sie sorgt dafuer, dass im
 * Fenster steht, warum die eigene Zusage verschwunden ist, statt dass sie
 * still wegfaellt. Die naechste Zusage loescht sie wieder.
 */
function ohneZusagen(handel) {
  return {
    bereitSpieler: false,
    bereitGm: false,
    zusageWegSpieler: handel.bereitSpieler === true || handel.zusageWegSpieler === true,
    zusageWegGm: handel.bereitGm === true || handel.zusageWegGm === true
  };
}

/* ── Was die Spielleitung tut ──────────────────────────────────────── */

/** Zahlt die Person nur passend? Vorbelegt von ihrem Laden, falls es genau einer ist. */
function passendVorbelegt(person) {
  const laeden = laedenVon(person);
  return laeden.length === 1 && laeden[0].system?.passendZahlen === true;
}

/** Wechselgeld fuer diesen einen Handel an oder aus. */
export async function passendSetzen(benutzerId, wert) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;
  await benutzer.setFlag(MODULE_ID, TISCH, { ...handel, passend: !!wert, ...ohneZusagen(handel) });
  await funken([benutzerId]);
}

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
      passend: passendVorbelegt(person),
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
    { ...handel, [feld]: liste, preisCp: null, ...ohneZusagen(handel) });
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
    preisCp: null, ...ohneZusagen(handel)
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
   * Ein genannter Preis bleibt stehen, solange dasselbe Stueck in derselben
   * Menge daliegt. Wer die Menge aendert, handelt einen anderen Posten aus.
   */
  const vorher = new Map((handel[feld] ?? []).map(p => [p.itemId, p]));

  // Was in einem hingelegten Behaelter steckt, reist mit ihm, siehe tausch.js.
  const behaelter = new Set((posten ?? [])
    .map(p => traeger.items.get(p.itemId))
    .filter(i => i?.type === "container")
    .map(i => i.id));

  const liste = [];
  for (const p of posten ?? []) {
    const item = traeger.items.get(p.itemId);
    if (!item || liste.some(z => z.itemId === item.id)) continue;
    if (stecktIn(item, behaelter, traeger)) continue;
    const vorrat = item.type === "container" ? 1 : Number(item.system?.quantity ?? 1);
    const menge = Math.min(Math.max(1, Math.floor(Number(p.menge) || 1)), vorrat);
    if (menge <= 0) continue;

    const alt = vorher.get(item.id);
    liste.push({
      itemId: item.id, name: item.name, img: item.img || null, menge,
      // Nur Auskunft. Gerechnet wird mit dem, was der Besitzer nennt.
      grundCp: grundpreisCp(item.system?.price),
      preisCp: alt && alt.menge === menge && hatPreis(alt) ? alt.preisCp : null,
      preisMuenzen: alt && alt.menge === menge && hatPreis(alt) ? (alt.preisMuenzen ?? null) : null,
      // Ein Beutel reist samt Inhalt - also gehoert der zu dem, was zugesagt wird.
      inhalt: inhaltVon(item),
      inhaltMuenzen: muenzenIn(item)
    });
  }

  const gedeckelt = muenzenDeckeln(muenzen, traeger.system?.currency);
  const neu = { ...handel, [feld]: liste, ...muenzFelder(seite, gedeckelt),
                ...ohneZusagen(handel) };
  await benutzer.setFlag(MODULE_ID, TISCH, neu);
  await funken([benutzerId]);
}

/**
 * Den Preis fuer einen Posten nennen oder aendern. Jede Seite fuer ihre
 * eigenen Sachen: der Spieler ueber seine Bitte, die Spielleitung fuer die
 * Person. Wie jede Aenderung nimmt das beide Zusagen zurueck.
 */
export async function preisSetzen(benutzerId, seite, itemId, betragCp, muenzen = null) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  const handel = benutzer?.getFlag(MODULE_ID, TISCH);
  if (!handel) return;
  const feld = seite === "nsc" ? "seiteNsc" : "seiteSpieler";
  /*
   * Kommen Muenzen mit, gilt ihr Wert. Der Betrag daneben ist dann nur eine
   * Abschrift, und eine Abschrift vom Client wird nicht geglaubt.
   */
  const saubere = muenzen ? eingegebeneMuenzen(muenzen) : null;
  const ausMuenzen = saubere ? Object.entries(saubere).reduce((s, [m, n]) => s + KUPFERWERT[m] * n, 0) : null;
  const wert = betragCp === null ? null
    : ausMuenzen !== null && Object.keys(saubere).length ? ausMuenzen
    : Math.max(0, Math.round(Number(betragCp) || 0));
  const liste = (handel[feld] ?? []).map(p => p.itemId !== itemId ? p
    : { ...p, preisCp: wert, preisMuenzen: saubere && Object.keys(saubere).length ? saubere : null });
  await benutzer.setFlag(MODULE_ID, TISCH, { ...handel, [feld]: liste, ...ohneZusagen(handel) });
  await funken([benutzerId]);
}

/**
 * Nach einem Preis fragen: fuenf Muenzfelder, der Listenpreis als Auskunft.
 *
 * Ein eigenes kleines Fenster statt Feldern in der Zeile. Fuenf Muenzfelder
 * je Posten liessen auf dem Tablet vom Namen nichts uebrig, und genannt wird
 * ein Preis selten, gelesen aber bei jedem Blick auf den Tisch.
 *
 * @returns {Promise<?{cp: number, muenzen: ?object}>} `null` bei Abbruch
 */
export async function preisFragen(posten) {
  const felder = !hatPreis(posten) ? {}
    : posten.preisMuenzen ? muenzfelderVon(posten.preisMuenzen) : alsMuenzfelder(posten.preisCp);
  const grundCp = (posten.grundCp ?? 0) * (posten.menge ?? 1);
  const inhalt = `
    <div class="shops-festpreis-dialog">
      <p class="shops-blockhinweis">${game.i18n.format("SHOPS.Tisch.PreisFrage", {
        menge: posten.menge ?? 1, name: foundry.utils.escapeHTML(posten.name ?? "")
      })}</p>
      ${grundCp ? `<p class="shops-listenpreis">${game.i18n.format("SHOPS.Tisch.Listenpreis",
        { preis: `<strong>${alsText(grundCp, kuerzel)}</strong>` })}</p>` : ""}
      <span class="shops-preisfeld">
        <span class="shops-muenzfelder">
          ${EINGABE_SORTEN.map(s => `<label><input type="number" data-muenze="${s}"
                        value="${felder[s] ?? ""}" min="0" step="1" placeholder="0"
                        aria-label="${kuerzel(s)}"><span>${kuerzel(s)}</span></label>`).join("")}
        </span>
      </span>
    </div>`;

  const knoepfe = [{
    action: "nennen", default: true, icon: "fa-solid fa-tag",
    label: game.i18n.localize("SHOPS.Tisch.PreisNennen"),
    callback: (_e, _k, dialog) => {
      const { cp, muenzen } = leseMuenzfelder(dialog.element);
      return { cp, muenzen };
    }
  }];
  if (grundCp) {
    knoepfe.push({ action: "liste", icon: "fa-solid fa-book",
      label: game.i18n.localize("SHOPS.Tisch.ListenpreisNehmen"), callback: () => ({ cp: grundCp, muenzen: null }) });
  }
  knoepfe.push({ action: "abbrechen", label: game.i18n.localize("SHOPS.Abbrechen"),
                 icon: "fa-solid fa-xmark", callback: () => null });

  const antwort = await DialogV2.wait({
    window: { title: game.i18n.localize("SHOPS.Tisch.PreisTitel"), icon: "fa-solid fa-tag" },
    classes: ["ninjos-shops"],
    position: { width: 420 },
    content: inhalt,
    buttons: knoepfe,
    // Wegklicken und Escape aendern nichts.
    rejectClose: false
  });
  return Number.isFinite(antwort?.cp) ? antwort : null;
}

/** Ein fertiger Satz an genau eine Person. */
function meldung(benutzerId, text) {
  if (benutzerId === game.user.id) return;
  game.socket.emit(SOCKET.NAME, { typ: SOCKET.HANDEL, tat: "meldung", an: benutzerId, text });
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
    /*
     * **Auch die Spielleitung bekommt das Fenster.** Ihr Tisch macht sich
     * gleich darauf zu; eine Meldung waere das Einzige, was den Abschluss
     * bezeugt, und genau die wurde am 10.09.2026 vermisst. Der Spieler
     * bekommt seines ueber die Antwort, siehe socket.js.
     */
    const stand = tischStand(vorher);
    erfolgZeigen(game.i18n.format("SHOPS.Tisch.GMGelungen", {
      spieler: foundry.utils.escapeHTML(spieler?.name ?? "?"),
      person: foundry.utils.escapeHTML(vorher?.personName ?? "?"),
      geld: stand ? stand.linksText : ""
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

  /*
   * **Was nicht aufgeht, darf trotzdem zugesagt werden, aber nicht aus
   * Versehen.** Vom 12.09. bis 18.09.2026 war die Zusage gesperrt, solange die
   * Waage nicht aufging: Ein Handel war durchgegangen, bei dem Geld fehlte,
   * ohne dass es jemand wollte. Am Tisch hiess das aber auch, dass ein
   * Spieler, der bewusst mehr gibt oder einen fehlenden Preis nicht nennen
   * mag, gar nicht zusagen konnte. Seitdem fragt der Knopf vorher nach, siehe
   * `zusageMitWarnung`. Hier wird nichts mehr gesperrt.
   */
  const feld = wer === "gm" ? "bereitGm" : "bereitSpieler";
  const spurFeld = wer === "gm" ? "zusageWegGm" : "zusageWegSpieler";
  await benutzer.setFlag(MODULE_ID, TISCH,
    { ...handel, [feld]: !!wert, [spurFeld]: false });

  const jetzt = benutzer.getFlag(MODULE_ID, TISCH);
  if (jetzt?.bereitGm && jetzt?.bereitSpieler) return void await abschliessen(benutzerId);

  await funken([benutzerId]);
  const wartetAuf = wer === "gm"
    ? benutzer.name
    : (handel.personName ?? game.i18n.localize("SHOPS.Tisch.DieAndereSeite"));
  ui.notifications.info(game.i18n.format("SHOPS.Tisch.WartetAuf", { wer: wartetAuf }));
}

/**
 * Vor einer Zusage warnen, wenn der Tausch nicht aufgeht.
 *
 * Nur wenn etwas nicht stimmt: Ein Preis fehlt, oder die Waage steht nicht
 * gleich. Dann ein Fenster mit dem Grund und einem Knopf, der das Verb traegt.
 * Wegklicken und Escape heissen nein.
 *
 * @param {object} stand  aus `tischStand`
 * @param {string} gegenueber  wer auf der anderen Seite steht, fuer den Satz
 * @param {{spielleitung?: boolean}} wie  aus Sicht der Spielleitung, die fuer die Person spricht
 * @returns {Promise<boolean>} ob zugesagt werden soll
 */
export async function zusageMitWarnung(stand, gegenueber, { spielleitung = false } = {}) {
  if (!stand || (stand.ausgeglichen && stand.allePreise)) return true;

  const saetze = [];
  if (!stand.allePreise) {
    saetze.push(game.i18n.format("SHOPS.Tisch.WarnungOhnePreis",
      { namen: foundry.utils.escapeHTML(stand.ohnePreisNamen) }));
  }
  if (!stand.ausgeglichen) {
    // Die Waage rechnet aus Sicht des Spielers. Die Spielleitung spricht fuer
    // die Person, fuer sie ist dieselbe Differenz die andere Richtung.
    const meineFehlt = spielleitung ? stand.zuViel : stand.fehlt;
    saetze.push(game.i18n.format(meineFehlt ? "SHOPS.Tisch.WarnungFehlt" : "SHOPS.Tisch.WarnungZuViel",
      { geld: stand.offenText, wer: foundry.utils.escapeHTML(gegenueber ?? "") }));
  }
  saetze.push(game.i18n.localize("SHOPS.Tisch.WarnungFolge"));

  return DialogV2.confirm({
    window: { title: game.i18n.localize("SHOPS.Tisch.WarnungTitel"), icon: "fa-solid fa-scale-unbalanced" },
    classes: ["ninjos-shops"],
    content: `<div class="shops-kaufdialog">${saetze.map(t => `<p>${t}</p>`).join("")}</div>`,
    yes: { label: game.i18n.localize("SHOPS.Tisch.WarnungJa"), icon: "fa-solid fa-handshake" },
    no: { label: game.i18n.localize("SHOPS.Abbrechen") },
    // Danebenklicken und Escape brechen ab, nie bestaetigen sie.
    defaultYes: false,
    rejectClose: false
  });
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
  if (!spielerKasse) return { ok: false, grund: "SHOPS.Tisch.GeldFehlt" };
  if (Object.keys(legtPerson).length && !personHatKasse) {
    return { ok: false, grund: "SHOPS.Tisch.GeldFehlt" };
  }
  let personKasse = personHatKasse
    ? muenzenAbziehen(person.system.currency, legtPerson) : null;
  if (personHatKasse && !personKasse) return { ok: false, grund: "SHOPS.Tisch.GeldFehlt" };

  spielerKasse = muenzenDazu(spielerKasse, legtPerson);
  if (personKasse) personKasse = muenzenDazu(personKasse, legtSpieler);

  /*
   * Das Wechselgeld kommt aus dem Beutel der anderen Seite, nachdem die
   * hingelegten Muenzen schon darin liegen. Wer ein Platinstueck bekommen hat,
   * kann es also selbst wechseln. Reicht es trotzdem nicht, wird nichts
   * getauscht, und der Grund steht im Fenster.
   */
  const stand = tischStand(handel);
  if (stand.wechselAn === "spieler") {
    if (!personKasse) return { ok: false, grund: "SHOPS.Tisch.KeinWechselgeld" };
    const raus = zahleAus(personKasse, stand.wechselCp);
    if (!raus) return { ok: false, grund: "SHOPS.Tisch.KeinWechselgeld" };
    personKasse = raus.bestand;
    spielerKasse = muenzenDazu(spielerKasse, raus.muenzen);
  } else if (stand.wechselAn === "nsc") {
    const raus = zahleAus(spielerKasse, stand.wechselCp);
    if (!raus) return { ok: false, grund: "SHOPS.Tisch.KeinWechselgeld" };
    spielerKasse = raus.bestand;
    if (personKasse) personKasse = muenzenDazu(personKasse, raus.muenzen);
  }

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
  const wechsel = stand.wechselAn === "spieler" ? -stand.wechselCp
    : stand.wechselAn === "nsc" ? stand.wechselCp : 0;
  const nettoCp = muenzenCp(legtSpieler) - muenzenCp(legtPerson) + wechsel;
  if (was.length) {
    const schreiben = nettoCp < 0 ? schreibeHandelVerkauf : schreibeHandel;
    await schreiben({
      person, figur, ok: true, was, summeCp: Math.abs(nettoCp),
      kaeufer: benutzer, verkaeufer: benutzer
    });
  }

  // `tisch` sagt der Gegenstelle, dass das ein Fenster wert ist und keine
  // Meldung: Der Tisch raeumt sich ab, es bleibt sonst nichts zu sehen.
  await handelMelden(stand, person, figur);

  const satz = game.i18n.format("SHOPS.Tisch.Gelungen", { person: person.name });
  return { ok: true, tisch: true,
           text: stand.wechselAnSpieler
             ? `${satz} ${game.i18n.format("SHOPS.Kauf.Wechselgeld", { geld: stand.wechselText })}`
             : satz };
}

/**
 * Der abgeschlossene Handel im Chat, gefluestert an die Spielleitung.
 *
 * **Warum.** Bis zum 18.09.2026 stand ein Handel mit einer Person nur im
 * Marktbuch, und dort als eine Zeile mit dem Geld, das unterm Strich die Seite
 * gewechselt hat. Was genau ueber den Tisch ging, zu welchem Preis und mit
 * welchem Wechselgeld, sah die Spielleitung nirgends, am Tisch gemeldet. Der
 * Tausch zwischen Spielern hat seine Karte schon lange (tausch.js).
 *
 * Gefluestert, nicht offen: Preise, die ein NSC genannt hat, sind Sache
 * zwischen ihm und dem Spieler.
 */
async function handelMelden(stand, person, figur) {
  const esc = foundry.utils.escapeHTML;
  const posten = p => {
    const name = p.menge > 1 ? `${esc(p.name)} &times;${p.menge}` : esc(p.name);
    return p.hatPreis ? `${name} (${esc(p.preisText)})` : name;
  };
  const seite = (liste, geldText, geld) => {
    const teile = [...(liste ?? []).map(posten), geld ? esc(geldText) : ""].filter(Boolean);
    return teile.length ? teile.join(", ") : game.i18n.localize("SHOPS.Tausch.Nichts");
  };
  const zeile = (wer, was) =>
    `<p><strong>${esc(wer)}</strong> ${game.i18n.localize("SHOPS.Tausch.Gibt")} ${was}</p>`;

  const zeilen = [
    zeile(person.name, seite(stand.seiteNsc, stand.geldNscText, stand.geldNsc)),
    zeile(figur.name, seite(stand.seiteSpieler, stand.geldSpielerText, stand.geldSpieler))
  ];
  if (stand.wechselCp) {
    zeilen.push(`<p>${game.i18n.format("SHOPS.Tisch.WechselAn", {
      wer: esc(stand.wechselAnSpieler ? figur.name : person.name), geld: stand.wechselText })}</p>`);
  }
  if (!stand.ausgeglichen) {
    zeilen.push(`<p><em>${game.i18n.format("SHOPS.Tisch.ChatUngleich", { geld: stand.offenText })}</em></p>`);
  }

  try {
    await ChatMessage.create({
      speaker: { alias: game.i18n.format("SHOPS.Tisch.ChatTitel", { person: person.name }) },
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      content: `<div class="ninjos-shops shops-tauschkarte">${zeilen.join("")}</div>`
    });
  } catch (fehler) {
    // Der Handel ist schon gelaufen; eine fehlende Karte darf ihn nicht umwerfen.
    console.error(`${MODULE_ID} | Handelskarte liess sich nicht schreiben`, fehler);
  }
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
export const tischPreis     = (itemId, cp, muenzen) => bitte("preis", { itemId, cp, muenzen });

/* ── Empfang ───────────────────────────────────────────────────────── */

/** Alle betroffenen Clients neu zeichnen lassen. */
async function funken(an) {
  const paket = { typ: SOCKET.HANDEL, tat: "stand", an };
  game.socket.emit(SOCKET.NAME, paket);
  aufTisch(paket);
}

/** Einstiegspunkt aus socket.js. */
export async function aufTisch(daten) {
  if (daten.tat === "meldung") {
    if (daten.an === game.user.id) {
      hinweisZeigen("SHOPS.Kauf.NichtGeklappt", foundry.utils.escapeHTML(daten.text ?? ""));
    }
    return;
  }
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
    case "preis":     return void await preisSetzen(daten.spielerId, "spieler", daten.itemId, daten.cp, daten.muenzen);
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
      preisNennen: Handelstisch.#preisNennen,
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
      // Die Sachen des NSC ansehen? Ab Werk nein, siehe SETTINGS.TISCH_ANSEHEN.
      nscAnsehen: game.user.isGM || game.settings.get(MODULE_ID, SETTINGS.TISCH_ANSEHEN),
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
    // Nicht nur die Vorlage laesst den Klick weg; auch hier gilt die Einstellung.
    if (seite === "nsc" && !game.user.isGM && !game.settings.get(MODULE_ID, SETTINGS.TISCH_ANSEHEN)) return;
    const traeger = seite === "nsc" ? await fromUuid(handel.personUuid) : game.user.character;
    if (!traeger) return;
    const { wareAnsehen } = await import("./ware-ansehen.js");
    wareAnsehen(traeger, itemId);
  }

  static #wegnehmen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    if (itemId) tischWegnehmen(itemId);
  }

  /** Was ich fuer mein Stueck haben will. Geht jederzeit wieder. */
  static async #preisNennen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    const posten = eigenerTisch()?.seiteSpieler?.find(p => p.itemId === itemId);
    if (!posten) return;
    const preis = await preisFragen(posten);
    if (preis) tischPreis(itemId, preis.cp, preis.muenzen);
  }

  static async #annehmen() {
    // Schon zugesagt? Dann nimmt der Knopf die Zusage zurueck.
    const handel = eigenerTisch();
    if (handel?.bereitSpieler) return void tischWiderrufen();
    if (await zusageMitWarnung(tischStand(handel), handel?.personName)) tischAnnehmen();
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
      preisNennen: HandelstischGM.#preisNennen,
      passendUmschalten: HandelstischGM.#passendUmschalten,
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

  /** Was die Person fuer ihr Stueck haben will. Geht jederzeit wieder. */
  static async #preisNennen(ereignis, ziel) {
    const itemId = ziel.closest("[data-item-id]")?.dataset.itemId;
    const handel = game.users.get(this.benutzerId)?.getFlag(MODULE_ID, TISCH);
    const posten = handel?.seiteNsc?.find(p => p.itemId === itemId);
    if (!posten) return;
    const preis = await preisFragen(posten);
    if (preis) preisSetzen(this.benutzerId, "nsc", itemId, preis.cp, preis.muenzen);
  }

  static #geldWeg() { geldSetzen(this.benutzerId, "nsc", {}); }

  static #passendUmschalten() {
    const handel = game.users.get(this.benutzerId)?.getFlag(MODULE_ID, TISCH);
    passendSetzen(this.benutzerId, !(handel?.passend === true));
  }

  /** Die Zusage der Spielleitung - und der Abschluss, wenn beide stehen. */
  static async #bestaetigen() {
    const benutzer = game.users.get(this.benutzerId);
    const handel = benutzer?.getFlag(MODULE_ID, TISCH);
    if (handel?.bereitGm) return void bereitSetzen(this.benutzerId, "gm", false);
    if (await zusageMitWarnung(tischStand(handel), benutzer?.name, { spielleitung: true })) {
      bereitSetzen(this.benutzerId, "gm", true);
    }
  }

  static async #beenden() {
    const person = game.users.get(this.benutzerId)?.getFlag(MODULE_ID, TISCH)?.personName ?? "";
    await tischBeenden([this.benutzerId]);
    // Beim Spieler geht der Tisch sonst wortlos zu.
    hinweisMelden([this.benutzerId], "SHOPS.Tisch.AbgeraeumtTitel",
      game.i18n.format("SHOPS.Tisch.AbgeraeumtText",
        { person: foundry.utils.escapeHTML(person) }));
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

    /*
     * **Auch das ist eine Aenderung.** Bis zum 12.09.2026 zog der Abgleich die
     * Liste nach und liess die Zusagen stehen. Wer zugesagt hatte und danach
     * ein Stueck vom Tisch verlor, stand mit einem Ja da, das fuer mehr Ware
     * gegolten hatte; bei gesetzter Forderung ging der Handel zum alten Preis
     * durch, obwohl weniger dalag.
     */
    await benutzer.setFlag(MODULE_ID, TISCH,
      { ...handel, [feld]: neu, preisCp: null, ...ohneZusagen(handel) });
    await funken([benutzer.id]);
  }
}
