/**
 * Die Schauansicht: der Laden auf dem Bildschirm an der Wand.
 *
 * **Der Teil, den keines der fünf Vorbildmodule hat** - und der Grund, aus dem
 * dieses Modul überhaupt eigenständig ist (KONZEPT-shops.md, Abschnitt 8).
 *
 * Sie ist eine Vollbildschicht ohne Fensterrahmen: kein Titelbalken, kein
 * Schliessen-Kreuz, kein Knopf. **Bedient wird sie nie.** Der Monitor hat
 * keine Tastatur, und niemand steht auf, um darauf zu tippen - die Steuerung
 * liegt bei der Spielleitung, im Ladenbogen.
 *
 * **Eine Uhr, viele Schirme.** Das Umblaettern treibt die Spielleitung und
 * verschickt jede Seite; die Schirme zeigen nur, was ihnen gesagt wird. Liefe
 * auf jedem Geraet eine eigene Uhr, stuenden zwei Monitore im selben Raum
 * binnen Minuten auf verschiedenen Seiten - und das sieht man sofort.
 *
 * Der Fortschrittsbalken laeuft dagegen **oertlich**: Er ist eine Animation,
 * kein Zustand. Er beginnt mit jeder Seite neu und braucht dafuer keine
 * Nachricht.
 *
 * **Wer sie bekommt, ist eine Wahl beim Vorzeigen** und nicht an die
 * Monitorerkennung gebunden (Entscheidung 5): Ein Beamer oder ein zweites
 * Notebook ist kein Monitorbenutzer und sieht doch genauso aus.
 */

import { MODULE_ID, SETTINGS, SOCKET, LADEN_TYP, WARE, OFFENER_LADEN } from "./const.js";
import { grundpreisCp, preisCp, alsText } from "./preise.js";
import { waereZustaendig } from "./vorsitz.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Merkmal am Benutzer: Dieser Bildschirm zeigt gross. */
export const SCHAU_MERKMAL = "schau";

/** So viele Karten je Seite. Mehr wird aus zwei Metern unleserlich. */
const JE_SEITE = 6;

/* ── Was gezeigt wird ──────────────────────────────────────────────── */

/**
 * Die Ware eines Ladens, wie der Saal sie sieht.
 *
 * Verborgenes faellt weg - die Schauansicht haengt an der Wand, und was unter
 * der Theke liegt, liegt dort auch fuer den ganzen Raum.
 */
export function schauWaren(laden) {
  return laden.items
    .filter(i => i.flags?.[MODULE_ID]?.[WARE.VERBORGEN] !== true)
    .map(item => {
      const merkmal = item.flags?.[MODULE_ID] ?? {};
      const fest = Number.isFinite(merkmal[WARE.FESTPREIS]) ? merkmal[WARE.FESTPREIS] : null;
      return {
        id: item.id,
        name: item.name,
        img: item.img,
        hinweis: merkmal[WARE.HINWEIS] ?? "",
        dienst: merkmal[WARE.DIENST] === true,
        bestand: Number(item.system?.quantity ?? 1),
        preisText: alsText(preisCp(grundpreisCp(item.system?.price), laden.system, fest), kuerzel)
      };
    });
}

/** Wie viele Seiten dieser Laden hat. Mindestens eine. */
export function seitenZahl(laden) {
  return Math.max(1, Math.ceil(schauWaren(laden).length / JE_SEITE));
}

/* ── Die Schicht auf dem Bildschirm ────────────────────────────────── */

let schicht = null;
let balkenTakt = null;

function schichtHolen() {
  if (schicht?.isConnected) return schicht;
  schicht = document.createElement("div");
  schicht.id = `${MODULE_ID}-schau`;
  schicht.className = "ninjos-shops shops-schau";
  document.body.append(schicht);

  /*
   * **Ein Ausweg, aber nur fuer die Spielleitung.** Auf einem Monitor ist die
   * Schicht mit Absicht unbedienbar - dort sitzt niemand. Wer sie sich aber
   * einmal ansehen will, sitzt davor und haette sonst nichts als die
   * Aktualisierungstaste: Die Schicht deckt den ganzen Bildschirm, also auch
   * den Ladenbogen mit seiner Steuerung. Escape schliesst sie deshalb - und
   * fuer alle anderen tut die Taste nichts.
   */
  if (game.user.isGM) {
    schicht.dataset.ausweg = "1";
    document.addEventListener("keydown", escapeHoren, { capture: true });
  }
  return schicht;
}

function escapeHoren(ereignis) {
  if (ereignis.key !== "Escape") return;
  if (!schicht?.isConnected) return;
  ereignis.preventDefault();
  ereignis.stopPropagation();
  schauSchliessen();
}

/** Die Schicht wegraeumen. */
export function schauSchliessen() {
  clearTimeout(balkenTakt);
  document.removeEventListener("keydown", escapeHoren, { capture: true });
  schicht?.remove();
  schicht = null;
}

/**
 * Eine Seite zeichnen.
 *
 * @param {Actor} laden
 * @param {number} seite    nullbasiert
 * @param {number} seiten   wie viele es insgesamt sind
 * @param {number} takt     Sekunden je Seite, 0 = angehalten
 */
export async function schauZeichnen(laden, { seite = 0, seiten = 1, takt = 0 } = {}) {
  if (laden?.type !== LADEN_TYP) return void schauSchliessen();

  const alle = schauWaren(laden);
  const von = seite * JE_SEITE;

  const html = await foundry.applications.handlebars.renderTemplate(
    `modules/${MODULE_ID}/templates/schau.hbs`,
    {
      ladenName: laden.name,
      kopfBild: laden.img,
      kopfFokus: laden.system?.kopfFokus ?? 50,
      begruessung: laden.system?.begruessung ?? "",
      haendlerName: laden.system?.haendlerName,
      /*
       * **Das Tokenbild, nicht das Bogenbild.** Der Bogen traegt oft ein
       * Brustbild im Hochformat; das Token ist der Kopf, wie er am Tisch
       * daliegt - und genau den erkennt der Saal aus zwei Metern wieder.
       */
      haendlerBild: (() => {
        const person = laden.system?.haendlerUuid ? fromUuidSync(laden.system.haendlerUuid) : null;
        return person?.prototypeToken?.texture?.src || person?.img || null;
      })(),
      waren: alle.slice(von, von + JE_SEITE),
      seite: seite + 1,
      seiten,
      mehrereSeiten: seiten > 1,
      laeuft: takt > 0
    }
  );

  const el = schichtHolen();
  el.innerHTML = html;

  /*
   * Der Balken wird nach dem Einhaengen gestartet, nicht im Stylesheet: Eine
   * Uebergangsdauer, die schon beim Zeichnen steht, laeuft im selben Bild los
   * und springt - der Browser hat den Anfangswert dann nie gesehen.
   */
  clearTimeout(balkenTakt);
  const oben = el.querySelector(".shops-sand-oben");
  const unten = el.querySelector(".shops-sand-unten");
  if (oben && unten && takt > 0) {
    /*
     * Der Sand faellt ueber eine Verschiebung, nicht ueber eine Hoehe: Die
     * Rechtecke stecken in einem Beschnitt in Trichterform, und geschoben
     * wird der Ausschnitt. Eine animierte Hoehe waere dasselbe Bild mit mehr
     * Rechenarbeit und in Safari unzuverlaessig.
     */
    for (const [feld, von] of [[oben, 0], [unten, 15]]) {
      feld.style.transition = "none";
      feld.style.transform = `translateY(${von}px)`;
    }
    balkenTakt = setTimeout(() => {
      oben.style.transition = `transform ${takt}s linear`;
      unten.style.transition = `transform ${takt}s linear`;
      oben.style.transform = "translateY(15px)";
      unten.style.transform = "translateY(0)";
    }, 30);
  }
}

/* ── Was die Spielleitung treibt ───────────────────────────────────── */

/** Der laufende Vortrag. Nur auf dem Client der Spielleitung gefuellt. */
let vortrag = null;

/** Wer sieht gerade gross? */
export function schauZuschauer(ladenUuid) {
  return game.users.filter(u =>
    u.getFlag(MODULE_ID, SCHAU_MERKMAL) === true &&
    u.getFlag(MODULE_ID, OFFENER_LADEN) === ladenUuid);
}

/** Der Zustand, den die Spielleitung gerade steuert - fuer ihre Knoepfe. */
export function schauZustand() {
  if (!vortrag) return null;
  return { ladenUuid: vortrag.ladenUuid, seite: vortrag.seite,
           seiten: vortrag.seiten, laeuft: vortrag.laeuft };
}

function senden() {
  if (!vortrag) return;
  const paket = {
    typ: SOCKET.SCHAU, tat: "seite",
    ladenUuid: vortrag.ladenUuid, seite: vortrag.seite, seiten: vortrag.seiten,
    takt: vortrag.laeuft ? vortrag.takt : 0
  };
  game.socket.emit(SOCKET.NAME, paket);
  if (game.user.getFlag(MODULE_ID, SCHAU_MERKMAL)) aufSchau(paket);
  for (const app of foundry.applications.instances.values()) {
    if (app?.document?.type === LADEN_TYP) app.render?.(false);
  }
}

function uhrStellen() {
  clearInterval(vortrag?.uhr);
  if (!vortrag?.laeuft || vortrag.seiten < 2) return;
  vortrag.uhr = setInterval(() => {
    vortrag.seite = (vortrag.seite + 1) % vortrag.seiten;
    senden();
  }, vortrag.takt * 1000);
}

/**
 * Den Vortrag beginnen - oder auf einen anderen Laden umstellen.
 *
 * Ruft `ladenZeigen` vorher; hier wird nur noch geblaettert.
 */
export function schauBeginnen(laden) {
  if (!game.user.isGM) return;
  clearInterval(vortrag?.uhr);
  vortrag = {
    ladenUuid: laden.uuid,
    seite: 0,
    seiten: seitenZahl(laden),
    takt: Math.max(3, Number(game.settings.get(MODULE_ID, SETTINGS.BLAETTERTAKT)) || 10),
    laeuft: true,
    uhr: null
  };
  senden();
  uhrStellen();
}

/** Anhalten oder weiterlaufen lassen. */
export function schauUmschalten() {
  if (!vortrag) return;
  vortrag.laeuft = !vortrag.laeuft;
  senden();
  uhrStellen();
}

/**
 * Eine Seite vor oder zurueck.
 *
 * **Von Hand blaettern haelt an.** Wer weiterschaltet, weil jemand fragt „was
 * war das dritte nochmal", will nicht, dass die Anzeige zwei Sekunden spaeter
 * von selbst weiterspringt.
 */
export function schauBlaettern(richtung) {
  if (!vortrag) return;
  vortrag.laeuft = false;
  vortrag.seite = (vortrag.seite + richtung + vortrag.seiten) % vortrag.seiten;
  senden();
  uhrStellen();
}

/** Den Vortrag beenden. */
export function schauBeenden() {
  clearInterval(vortrag?.uhr);
  vortrag = null;
  game.socket.emit(SOCKET.NAME, { typ: SOCKET.SCHAU, tat: "aus" });
  if (game.user.getFlag(MODULE_ID, SCHAU_MERKMAL)) schauSchliessen();
}

/** Die Seitenzahl neu bestimmen, wenn sich die Auslage aendert. */
export async function schauNachfuehren(ladenUuid) {
  if (!vortrag || vortrag.ladenUuid !== ladenUuid) return;
  const laden = await fromUuid(ladenUuid);
  if (!laden) return void schauBeenden();
  vortrag.seiten = seitenZahl(laden);
  if (vortrag.seite >= vortrag.seiten) vortrag.seite = 0;
  senden();
  uhrStellen();
}

/* ── Empfang ───────────────────────────────────────────────────────── */

/** Einstiegspunkt aus socket.js. */
export async function aufSchau(daten) {
  /*
   * **„Wo sind wir?" beantwortet die Spielleitung, nicht der Schirm.**
   * Ein Bildschirm, der neu geladen hat, weiss nur, dass er gross zeigen
   * soll - nicht, welche Seite gerade steht und ob geblaettert wird. Er fragt
   * deshalb nach, statt darauf zu warten, dass zufaellig ein Takt kommt.
   */
  if (daten.tat === "wo") {
    if (!waereZustaendig()) return;
    if (vortrag) return void senden();
    const laden = daten.ladenUuid ? await fromUuid(daten.ladenUuid) : null;
    if (laden?.type === LADEN_TYP) schauBeginnen(laden);
    return;
  }

  if (!game.user.getFlag(MODULE_ID, SCHAU_MERKMAL)) return;
  if (daten.tat === "aus") return void schauSchliessen();
  if (daten.tat !== "seite") return;

  const laden = await fromUuid(daten.ladenUuid);
  if (!laden) return void schauSchliessen();
  await schauZeichnen(laden, { seite: daten.seite, seiten: daten.seiten, takt: daten.takt });
}

/**
 * Nach einem Neuladen wieder anzeigen.
 *
 * Ein Bildschirm an der Wand wird nicht bedient - stuerzt der Browser ab oder
 * laedt jemand neu, muesste sonst die Spielleitung aufstehen. Das Merkmal am
 * Benutzer ueberlebt, also kommt die Schicht von selbst zurueck; die
 * Seitenzahl bringt die naechste Nachricht.
 */
export async function schauWiederherstellen() {
  /*
   * **Die Spielleitung nimmt den Vortrag wieder auf.** Der laeuft im
   * Arbeitsspeicher genau der Verbindung, die ihn gestartet hat - laedt sie
   * neu, blaettert niemand mehr, und die Schirme bleiben auf ihrem letzten
   * Bild stehen. Genau so gesehen am 06.09.2026: „ich sehe nur angehalten".
   */
  if (waereZustaendig() && !vortrag) {
    const traeger = game.users.find(u => u.getFlag(MODULE_ID, SCHAU_MERKMAL) === true
      && u.getFlag(MODULE_ID, OFFENER_LADEN));
    const laden = traeger ? await fromUuid(traeger.getFlag(MODULE_ID, OFFENER_LADEN)) : null;
    if (laden?.type === LADEN_TYP) schauBeginnen(laden);
  }

  if (!game.user.getFlag(MODULE_ID, SCHAU_MERKMAL)) return;
  const uuid = game.user.getFlag(MODULE_ID, OFFENER_LADEN);
  const laden = uuid ? await fromUuid(uuid) : null;
  if (laden?.type !== LADEN_TYP) return;

  await schauZeichnen(laden, { seite: 0, seiten: seitenZahl(laden), takt: 0 });

  // Und gleich nachfragen, wo der Vortrag gerade steht.
  game.socket.emit(SOCKET.NAME, { typ: SOCKET.SCHAU, tat: "wo", ladenUuid: uuid });
  if (waereZustaendig()) aufSchau({ tat: "wo", ladenUuid: uuid });
}
