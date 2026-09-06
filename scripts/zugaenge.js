/**
 * Wege zu den Laeden: Verzeichnis, In-Person-Leiste, Spielerknopf.
 *
 * Ein Laden steht im Akteursverzeichnis, aber **nur bei der Spielleitung** -
 * fuer Spieler ist er unsichtbar, und das ist zugesichert (siehe AGENTS.md).
 * Damit fehlt Spielern jeder Weg zurueck, wenn sie das vorgezeigte Fenster
 * wegklicken: Das Merkmal sagt weiter "offen", das Fenster ist aber weg bis
 * zum Neuladen. Diese Datei schliesst genau diese Luecke - und legt der
 * Spielleitung ihre Wege dorthin, wo sie ohnehin hinschaut.
 */

import { MODULE_ID, SETTINGS, LADEN_TYP, OFFENER_LADEN } from "./const.js";
import {
  spielerFensterOeffnen, spielerFensterIstOffen, spielerFensterSchliessen
} from "./spieler-fenster.js";
import { marktbuchOeffnen } from "./marktbuch.js";

/** Alle Laeden der Welt, alphabetisch. */
export function alleLaeden() {
  return game.actors
    .filter(a => a.type === LADEN_TYP)
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

/**
 * Welche Laeden darf dieser Spieler von sich aus oeffnen?
 *
 * Drei Bedingungen, und alle drei muessen gelten: der weltweite Schalter, die
 * Liste am einzelnen Laden (**wer**) und seine Szenenbindung (**wo**). Der
 * Schalter ist die uebergeordnete Antwort auf dieselbe Frage - wer ihn aus
 * laesst, will es an keinem Laden.
 *
 * Die Spielleitung sieht immer alle: Sie zeigt Laeden vor, und sie tut das
 * auch von einer anderen Szene aus.
 */
export function offenbareLaeden() {
  if (game.user.isGM) return alleLaeden();
  if (!game.settings.get(MODULE_ID, SETTINGS.SPIELER_DUERFEN_OEFFNEN)) return [];
  return alleLaeden().filter(l =>
    l.system.darfSelbstOeffnen?.(game.user) && l.system.giltHier?.() !== false);
}

/** Der Laden, den dieser Benutzer gerade vorgezeigt bekommt. */
function vorgezeigterLaden() {
  const uuid = game.user.getFlag(MODULE_ID, OFFENER_LADEN);
  if (!uuid) return null;
  return game.actors.find(a => a.uuid === uuid) ?? null;
}

/**
 * Einen Laden aufmachen - der eine Weg, den alle Knoepfe nehmen.
 *
 * Die Spielleitung bekommt den Bogen, alle anderen das Spielerfenster. Das
 * ist keine Bequemlichkeit, sondern die Trennung selbst: Der Bogen zeigt
 * verborgene Ware und den Ankaufsfaktor.
 */
export function ladenAufmachen(laden) {
  if (!laden) return;
  if (game.user.isGM) laden.sheet.render(true);
  else spielerFensterOeffnen(laden);
}

/**
 * Die Liste der erreichbaren Laeden. Bei genau einem wird er direkt geoeffnet -
 * eine Auswahl mit einem Eintrag ist ein Klick zu viel.
 */
export async function ladenWaehlen() {
  const vorgezeigt = vorgezeigterLaden();
  const erreichbar = offenbareLaeden();

  // Der wichtigste Fall zuerst: das weggeklickte Fenster zurueckholen.
  if (vorgezeigt && !game.user.isGM && !spielerFensterIstOffen()) {
    return ladenAufmachen(vorgezeigt);
  }
  if (!erreichbar.length) {
    if (vorgezeigt) return ladenAufmachen(vorgezeigt);
    return ui.notifications.info(game.i18n.localize("SHOPS.Zugang.KeineLaeden"));
  }
  if (erreichbar.length === 1) return ladenAufmachen(erreichbar[0]);

  const zeilen = erreichbar.map(l => `
    <button type="button" class="shops-ladenwahl" data-uuid="${l.uuid}">
      <img src="${l.img}" alt="">
      <span>${foundry.utils.escapeHTML(l.name)}</span>
      ${l.uuid === vorgezeigt?.uuid
        ? `<em>${game.i18n.localize("SHOPS.Zugang.Vorgezeigt")}</em>` : ""}
    </button>`).join("");

  const gewaehlt = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("SHOPS.Zugang.Titel") },
    classes: ["ninjos-shops"],
    position: { width: 380 },
    content: `<div class="shops-ladenliste">${zeilen}</div>`,
    buttons: [{ action: "abbrechen", label: game.i18n.localize("SHOPS.Abbrechen") }],
    rejectClose: false,
    render: (_ereignis, dialog) => {
      for (const knopf of dialog.element.querySelectorAll(".shops-ladenwahl")) {
        knopf.addEventListener("click", () => {
          const laden = game.actors.find(a => a.uuid === knopf.dataset.uuid);
          dialog.close();
          ladenAufmachen(laden);
        });
      }
    }
  });
  return gewaehlt;
}

/** Einen neuen Laden anlegen und seinen Bogen oeffnen. */
async function ladenAnlegen() {
  const laden = await Actor.implementation.create({
    name: game.i18n.localize("SHOPS.Zugang.NeuerLaden"),
    type: LADEN_TYP
  });
  laden?.sheet.render(true);
}

/* ── Knopf im Akteursverzeichnis ───────────────────────────────────── */

/**
 * Foundry haengt eigene Knoepfe in die Fusszeile der Seitenleiste. Wir setzen
 * unseren daneben statt in die Kopfzeile: Dort steht "Akteur erstellen", und
 * ein zweiter Knopf gleicher Groesse daneben laesst niemanden mehr erkennen,
 * welcher der gewoehnliche ist.
 */
function verzeichnisKnopf(app, element) {
  if (!game.user.isGM) return;
  const wurzel = element instanceof HTMLElement ? element : element?.[0];
  const fuss = wurzel?.querySelector(".directory-footer, .header-actions");
  const ziel = fuss ?? wurzel?.querySelector(".directory-header");
  if (!ziel || ziel.querySelector(`.${MODULE_ID}-verzeichnis`)) return;

  const leiste = document.createElement("div");
  leiste.className = `${MODULE_ID}-verzeichnis ninjos-shops shops-verzeichnisleiste`;
  leiste.innerHTML = `
    <button type="button" class="shops-verzeichnis-knopf" data-tat="neu">
      <i class="fa-solid fa-scale-balanced"></i> ${game.i18n.localize("SHOPS.Zugang.NeuerLaden")}
    </button>
    <button type="button" class="shops-verzeichnis-knopf shops-zweit" data-tat="buch"
            title="${game.i18n.localize("SHOPS.Marktbuch.Knopf")}">
      <i class="fa-solid fa-book"></i>
    </button>`;
  leiste.querySelector('[data-tat="neu"]').addEventListener("click", ladenAnlegen);
  leiste.querySelector('[data-tat="buch"]').addEventListener("click", marktbuchOeffnen);
  ziel.append(leiste);
}

/**
 * Im Verzeichnis steht das **Tokenbild**, nicht das Kopfbild.
 *
 * Die Seitenleiste zeigt `actor.img`, und das ist bei einem Laden seit dem
 * Kopfbild ein breites Bild des Ladeninneren. Auf ein Quadrat von 32 Pixeln
 * gequetscht ergibt das einen Farbfleck, an dem sich kein Laden mehr erkennen
 * laesst - waehrend das Tokenbild genau dafuer gemacht ist.
 *
 * Getauscht wird nur die Anzeige. Das Dokument bleibt unberuehrt: `img` ist
 * und bleibt das Kopfbild, sonst haetten Bogen und Spielerfenster nichts mehr
 * zu zeigen.
 */
function verzeichnisBilder(app, element) {
  const wurzel = element instanceof HTMLElement ? element : element?.[0];
  if (!wurzel) return;

  for (const eintrag of wurzel.querySelectorAll("[data-entry-id]")) {
    const laden = game.actors.get(eintrag.dataset.entryId);
    if (laden?.type !== LADEN_TYP) continue;

    const bild = laden.prototypeToken?.texture?.src;
    if (!bild) continue;

    const feld = eintrag.querySelector("img");
    if (feld && feld.getAttribute("src") !== bild) feld.setAttribute("src", bild);
  }
}

/* ── Eintrag in der Leiste der In-Person Tools ─────────────────────── */

/**
 * Die In-Person Tools bleiben **unberuehrt**.
 *
 * Statt dort eine Zeile einzubauen, haengt sich dieses Modul an das Zeichnen
 * ihres Fensters und setzt seinen Knopf selbst hinein. Damit braucht das
 * andere Modul keine Aenderung, und faellt es weg, faellt der Knopf mit weg -
 * ohne dass hier etwas kaputtgeht. Die Verbindung bleibt einseitig, so wie es
 * Abschnitt 3 des Konzepts verlangt.
 */
function inPersonKnopf(app, element) {
  if (!/InPersonPanel/.test(app?.constructor?.name ?? "")) return;
  const wurzel = element instanceof HTMLElement ? element : element?.[0];
  if (!wurzel || wurzel.querySelector(`.${MODULE_ID}-inperson`)) return;

  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = `${MODULE_ID}-inperson ninjos-shops shops-inperson-knopf`;
  knopf.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> ${game.i18n.localize("SHOPS.Zugang.Knopf")}`;
  knopf.addEventListener("click", () => ladenWaehlen());
  wurzel.querySelector(".window-content, form, div")?.append(knopf);
}

/* ── Werkzeug in der Szenenleiste ──────────────────────────────────── */

/**
 * Der Weg fuer alle, die kein Verzeichnis haben - also die Spieler.
 *
 * Er erscheint nur, wenn es tatsaechlich etwas zu oeffnen gibt: entweder ein
 * vorgezeigter Laden, der weggeklickt wurde, oder einer, den dieser Spieler
 * selbst aufmachen darf. Ein Knopf, der immer da ist und meistens nichts tut,
 * ist schlimmer als keiner.
 */
function szenenWerkzeug(steuerungen) {
  const zeigbar = game.user.isGM
    || offenbareLaeden().length > 0
    || !!game.user.getFlag(MODULE_ID, OFFENER_LADEN);
  if (!zeigbar) return;

  const token = steuerungen.tokens ?? steuerungen.token;
  if (!token?.tools) return;

  token.tools[`${MODULE_ID}-laeden`] = {
    name: `${MODULE_ID}-laeden`,
    title: "SHOPS.Zugang.Knopf",
    icon: "fa-solid fa-scale-balanced",
    button: true,
    visible: true,
    order: 99,
    onChange: () => ladenWaehlen(),
    onClick: () => ladenWaehlen()
  };
}

/**
 * Die Haken anmelden. Gehoert in `init`.
 *
 * **`getSceneControlButtons` wird genau einmal gerufen**, wenn Foundry die
 * Szenenleiste baut - und `ui.controls.render()` ruft ihn nicht erneut. Ein
 * Haken, der erst bei `ready` haengt, kommt also nie zum Zug; das Werkzeug
 * fehlte in der ersten Probe genau deshalb. Registriert wird deshalb frueh,
 * gerufen wird ohnehin erst spaeter.
 */
export function zugaengeHaken() {
  Hooks.on("getSceneControlButtons", szenenWerkzeug);
  Hooks.on("renderActorDirectory", verzeichnisKnopf);
  Hooks.on("renderActorDirectory", verzeichnisBilder);
  Hooks.on("renderApplicationV2", inPersonKnopf);
}

/** Was erst mit einer fertigen Welt geht. Gehoert in `ready`. */
export function zugaengeEinrichten() {
  Hooks.on("updateUser", benutzer => {
    if (benutzer.id === game.user.id) ui.controls?.render();
  });

  /*
   * Die Szene wechselt - und mit ihr, an welche Laeden man herankommt.
   *
   * Wer den Marktplatz verlaesst, steht nicht mehr im Laden. Ein Fenster, das
   * dann offen bleibt, laesst weiterkaufen, waehrend die Gruppe drei Karten
   * weiter im Wald steht.
   *
   * **Nur selbst geoeffnete Laeden.** Was die Spielleitung vorzeigt, bleibt
   * stehen: Sie hat es aufgemacht, sie macht es zu. Das Merkmal am Benutzer
   * unterscheidet die beiden Faelle - selbst geoeffnete tragen keins.
   */
  const szeneGewechselt = () => {
    if (game.user.isGM) return;
    if (!spielerFensterIstOffen()) return;
    const vorgezeigt = game.user.getFlag(MODULE_ID, OFFENER_LADEN);
    const laden = foundry.applications.instances.get(`${MODULE_ID}-spieler`)?.laden;
    if (!laden || laden.uuid === vorgezeigt) return;
    if (laden.system.giltHier?.() !== false) return;
    spielerFensterSchliessen();
    ui.notifications.info(game.i18n.format("SHOPS.Zugang.NichtMehrHier", { laden: laden.name }));
  };

  /*
   * Zwei Haken, weil es zwei Arten gibt, die Szene zu wechseln. `canvasReady`
   * meldet, dass dieser Client eine andere Karte betrachtet - aber nur, wenn
   * er ueberhaupt eine Leinwand hat. Wer ohne arbeitet, erfaehrt den Wechsel
   * nur daran, dass eine andere Szene aktiv wird.
   */
  Hooks.on("canvasReady", szeneGewechselt);
  Hooks.on("updateScene", (szene, aenderungen) => {
    if (aenderungen.active === true) szeneGewechselt();
  });

  /*
   * Das Verzeichnis ist bei `ready` laengst gezeichnet, und ein Haken, der
   * erst danach haengt, wird dafuer nie mehr gerufen. Ohne diese Zeile
   * erscheint der Knopf erst, wenn zufaellig etwas anderes ein Neuzeichnen
   * ausloest - beim ersten Start also gar nicht.
   */
  if (ui.actors?.rendered) ui.actors.render();
}
