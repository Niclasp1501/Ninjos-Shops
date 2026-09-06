/**
 * Die Verknuepfung: von einer Person zu ihrem Laden.
 *
 * **Was hier fehlte.** `VERKNUEPFT` steht seit dem ersten Tag in `const.js`,
 * samt Begruendung, warum es eine Liste ist - und kein einziger Aufruf im
 * ganzen Modul las sie je. Damit gab es nur die eine Richtung: Der Laden wusste
 * ueber `haendlerUuid`, wer hinter der Theke steht. Der Weg zurueck fehlte,
 * und mit ihm das, was das Konzept „ein Klick auf sein Token oeffnet ihn"
 * nennt.
 *
 * **Eine Liste, keine einzelne Kennung.** Ein Haendler fuehrt zwei Staende,
 * ein Marktplatz drei Buden. Das kostet hier nichts und liesse sich spaeter
 * nicht mehr nachruesten, ohne bestehende Welten anzufassen.
 *
 * **Die Liste pflegt sich selbst.** Niemand traegt sie von Hand ein. Wer im
 * Ladenfenster einen Verkaeufer setzt, hat damit die Verknuepfung gesetzt;
 * wer ihn austauscht, hat sie umgehaengt. Zwei Angaben, die dasselbe meinen
 * und von Hand gepflegt werden muessen, laufen immer auseinander - und dann
 * oeffnet ein Token einen Laden, den es nicht mehr gibt.
 *
 * **Szenen-Noten sind bewusst nicht dabei.** Das Konzept nennt sie neben NSC
 * und Token, aber Foundry gibt einer Note kein Bedienfeld, an das sich ein
 * Knopf haengen liesse; es bliebe ein Merkmal, das niemand ausloesen kann.
 * Gelesen wird es trotzdem, wenn etwas anderes einmal darauf zeigt - die
 * Funktionen hier fragen nach dem Merkmal, nicht nach der Dokumentart.
 */

import { MODULE_ID, VERKNUEPFT, LADEN_TYP } from "./const.js";
import { ladenAufmachen } from "./zugaenge.js";

/**
 * Die Laeden, auf die ein Dokument zeigt.
 *
 * Nimmt alles, was Merkmale traegt: einen NSC, ein Token, eine Note. Ein Token
 * ohne eigenes Merkmal erbt das seines Akteurs - sonst muesste man jede
 * einzelne Marktbude auf der Karte eigens verknuepfen.
 */
export function laedenVon(dokument) {
  if (!dokument) return [];
  const eigene = dokument.getFlag?.(MODULE_ID, VERKNUEPFT) ?? [];
  const vomAkteur = eigene.length ? [] : (dokument.actor?.getFlag?.(MODULE_ID, VERKNUEPFT) ?? []);
  const uuids = eigene.length ? eigene : vomAkteur;

  return uuids
    .map(uuid => fromUuidSync(uuid))
    .filter(a => a?.type === LADEN_TYP);
}

/** Zeigt dieses Dokument auf mindestens einen Laden? */
export function fuehrtEinenLaden(dokument) {
  return laedenVon(dokument).length > 0;
}

/**
 * Die Liste an einem NSC nachziehen, wenn ein Laden seinen Verkaeufer wechselt.
 *
 * Nur die Spielleitung schreibt - ein Spieler haette auf einem fremden NSC
 * ohnehin keine Rechte, und die Regel „der Spielleiter haelt die Wahrheit"
 * gilt hier wie ueberall.
 */
async function listeSetzen(uuid, ladenUuid, dazu) {
  const person = uuid ? fromUuidSync(uuid) : null;
  if (!person?.setFlag) return;

  const bisher = person.getFlag(MODULE_ID, VERKNUEPFT) ?? [];
  const neu = dazu
    ? (bisher.includes(ladenUuid) ? bisher : [...bisher, ladenUuid])
    : bisher.filter(u => u !== ladenUuid);

  if (neu.length === bisher.length && dazu) return;
  if (!neu.length) return void await person.unsetFlag(MODULE_ID, VERKNUEPFT);
  await person.setFlag(MODULE_ID, VERKNUEPFT, neu);
}

/** Einen aus einer Liste von Laeden aussuchen. Gibt den Akteur zurueck. */
async function ausLaedenWaehlen(laeden, titel) {
  const zeilen = laeden.map(l => `
    <button type="button" class="shops-ladenwahl" data-uuid="${l.uuid}">
      <img src="${l.prototypeToken?.texture?.src || l.img}" alt="">
      <span>${foundry.utils.escapeHTML(l.name)}</span>
    </button>`).join("");

  const gewaehlt = await new Promise(fertig => {
    const dialog = new foundry.applications.api.DialogV2({
      window: { title: titel },
      classes: ["ninjos-shops"],
      content: `<div class="shops-wahl">${zeilen}</div>`,
      buttons: [{ action: "abbrechen", label: game.i18n.localize("SHOPS.Abbrechen") }],
      submit: () => fertig(null),
      render: (ereignis, element) => {
        for (const knopf of element.querySelectorAll(".shops-ladenwahl")) {
          knopf.addEventListener("click", () => { fertig(knopf.dataset.uuid); dialog.close(); });
        }
      }
    });
    dialog.render(true);
  });

  return gewaehlt ? laeden.find(l => l.uuid === gewaehlt) : null;
}

/**
 * Einen Laden oeffnen, der an einem Dokument haengt.
 *
 * Bei zweien fragt es nach - ein Haendler mit zwei Staenden ist ausdruecklich
 * vorgesehen, und dann ist die Frage berechtigt statt laestig.
 *
 * Haengt gar keiner dran, ist das fuer die Spielleitung keine Sackgasse,
 * sondern der Anfang: Sie hat den Bogen gerade offen und will genau jetzt
 * einen Laden daran haben.
 */
export async function ladenAmDokumentOeffnen(dokument) {
  const laeden = laedenVon(dokument);
  if (!laeden.length) return void ohneLaden(dokument);
  if (laeden.length === 1) return ladenAufmachen(laeden[0]);

  const gewaehlt = await ausLaedenWaehlen(laeden, game.i18n.localize("SHOPS.Zugang.Titel"));
  if (gewaehlt) ladenAufmachen(gewaehlt);
}

/**
 * Diese Person fuehrt noch keinen Laden - was nun.
 *
 * **Warum der Knopf trotzdem dasteht.** Frueher erschien er nur, wenn schon
 * ein Laden dranhing. Damit war er als Anzeige brauchbar und als Weg
 * unbrauchbar: Wer einem NSC einen Laden geben wollte, musste wissen, dass das
 * ueber ein Feld im Ladenbogen geht - also im Fenster, das er noch gar nicht
 * hat. Man legt einen Laden aber an, waehrend man die Person vor sich hat.
 *
 * Zwei Wege, weil es zwei Faelle gibt: Der Laden ist schon da und nur nicht
 * verbunden, oder es gibt ihn noch nicht.
 */
async function ohneLaden(person) {
  if (!game.user.isGM || person?.documentName !== "Actor") return;

  const wahl = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("SHOPS.Verknuepfung.KeinLadenTitel"),
              icon: "fa-solid fa-scale-balanced" },
    classes: ["ninjos-shops"],
    content: `<p class="shops-hinweisfeld">${game.i18n.format("SHOPS.Verknuepfung.KeinLadenText",
      { person: foundry.utils.escapeHTML(person.name) })}</p>`,
    buttons: [
      { action: "verknuepfen", icon: "fa-solid fa-link",
        label: game.i18n.localize("SHOPS.Verknuepfung.MitLadenVerbinden"),
        callback: () => "verknuepfen" },
      { action: "neu", icon: "fa-solid fa-plus",
        label: game.i18n.localize("SHOPS.Verknuepfung.NeuerLaden"),
        callback: () => "neu" },
      { action: "abbrechen", label: game.i18n.localize("SHOPS.Abbrechen"),
        callback: () => null }
    ],
    rejectClose: false
  });

  if (wahl === "verknuepfen") return void await ladenVerbinden(person);
  if (wahl === "neu") return void await ladenFuerPersonAnlegen(person);
}

/** Einen vorhandenen Laden an diese Person haengen. */
async function ladenVerbinden(person) {
  const frei = game.actors.filter(a => a.type === LADEN_TYP);
  if (!frei.length) {
    return ui.notifications.info(game.i18n.localize("SHOPS.Verknuepfung.KeineLaedenDa"));
  }

  const laden = await ausLaedenWaehlen(frei, game.i18n.localize("SHOPS.Verknuepfung.MitLadenVerbinden"));
  if (!laden) return;

  /*
   * Geschrieben wird nur `haendlerUuid`. Die Liste am NSC zieht der Haken in
   * `verknuepfungEinrichten` nach - eine zweite Stelle, die dasselbe schreibt,
   * waere genau die Doppelfuehrung, die oben ausgeschlossen ist.
   */
  await laden.update({ "system.haendlerUuid": person.uuid });
  ui.notifications.info(game.i18n.format("SHOPS.Verknuepfung.Verbunden",
    { laden: laden.name, person: person.name }));
  ladenAufmachen(laden);
}

/**
 * Einen neuen Laden fuer diese Person anlegen und aufmachen.
 *
 * Ohne `img`: Ein Laden ist ein Ort, kein Mensch, und `ladenBilderEinrichten`
 * setzt dafuer ein passendes Standardbild. Das Portraet des Haendlers darauf
 * zu legen sieht im Verzeichnis aus, als stuende die Person zweimal darin.
 */
async function ladenFuerPersonAnlegen(person) {
  const laden = await Actor.implementation.create({
    name: game.i18n.format("SHOPS.Verknuepfung.NeuerLadenName", { person: person.name }),
    type: LADEN_TYP,
    system: { haendlerUuid: person.uuid }
  });
  if (!laden) return;

  /*
   * `Actor.create` loest `preUpdateActor` nicht aus - der Haken sieht nur
   * Aenderungen. Die Liste am NSC muss hier also von Hand gesetzt werden,
   * sonst haette der neue Laden einen Verkaeufer, aber der Verkaeufer keinen
   * Knopf zu seinem Laden.
   */
  await listeSetzen(person.uuid, laden.uuid, true);
  ladenAufmachen(laden);
}

/**
 * Ein Knopf im Bedienfeld des Tokens.
 *
 * Das ist der „Klick auf sein Token" aus dem Konzept. Er erscheint nur, wenn
 * das Token wirklich auf einen Laden zeigt - ein Bedienfeld voller Knoepfe,
 * die meistens nichts tun, ist schlechter als keiner.
 */
function tokenKnopf(hud, element) {
  const wurzel = element instanceof HTMLElement ? element : element?.[0];
  const token = hud?.object?.document;
  if (!wurzel || !fuehrtEinenLaden(token)) return;
  if (wurzel.querySelector(`.${MODULE_ID}-tokenknopf`)) return;

  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = `control-icon ${MODULE_ID}-tokenknopf`;
  knopf.dataset.tooltip = game.i18n.localize("SHOPS.Verknuepfung.Oeffnen");
  knopf.innerHTML = `<i class="fa-solid fa-scale-balanced"></i>`;
  knopf.addEventListener("click", ereignis => {
    ereignis.preventDefault();
    ereignis.stopPropagation();
    ladenAmDokumentOeffnen(token);
  });

  (wurzel.querySelector(".col.left") ?? wurzel).append(knopf);
}

/**
 * Ein Knopf in der Titelleiste des Haendlerbogens.
 *
 * **Der Weg, der immer da ist.** Das Konzept nennt den Klick aufs Token, und
 * den gibt es auch - aber er setzt eine Leinwand voraus. In dieser Welt steht
 * Foundrys eigene Einstellung „Kein Canvas" auf **an**, wie auf jedem Tisch,
 * der ohne Karten spielt: Dann gibt es keine Tokens, kein Bedienfeld und
 * keinen Knopf. Der Bogen der Person dagegen laesst sich immer oeffnen, und
 * genau das meint das Konzept mit „ein Haendlerbogen sagt: ich fuehre diesen
 * Laden".
 *
 * **Fuer die Spielleitung steht er immer da**, auch ohne Laden - dann fuehrt er
 * zum Anlegen oder Verbinden (`ohneLaden`). Fuer Spieler nicht: Ein Knopf, der
 * nur zu Werkzeugen fuehrt, die sie nicht bedienen duerfen, ist im Weg.
 */
function bogenKnopf(app, element) {
  const dokument = app?.document;
  if (dokument?.documentName !== "Actor") return;
  if (dokument.type === LADEN_TYP) return;          // Der Laden selbst braucht ihn nicht.

  const hatLaden = fuehrtEinenLaden(dokument);
  if (!hatLaden && !game.user.isGM) return;

  const wurzel = element instanceof HTMLElement ? element : element?.[0];
  const kopf = wurzel?.querySelector(".window-header");
  if (!kopf || kopf.querySelector(`.${MODULE_ID}-bogenknopf`)) return;

  const beschriftung = game.i18n.localize(
    hatLaden ? "SHOPS.Verknuepfung.Oeffnen" : "SHOPS.Verknuepfung.KeinLadenTitel");

  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = `header-control icon fa-solid fa-scale-balanced ${MODULE_ID}-bogenknopf`;
  if (!hatLaden) knopf.classList.add(`${MODULE_ID}-ohne-laden`);
  knopf.dataset.tooltip = beschriftung;
  knopf.setAttribute("aria-label", beschriftung);
  knopf.addEventListener("click", ereignis => {
    ereignis.preventDefault();
    ereignis.stopPropagation();
    ladenAmDokumentOeffnen(dokument);
  });

  // Vor das Schliessen-Kreuz, nie dahinter: Das bleibt der letzte Knopf.
  const schliessen = kopf.querySelector('[data-action="close"]');
  if (schliessen) schliessen.before(knopf);
  else kopf.append(knopf);
}

/** Ein Eintrag im Kontextmenue des Akteursverzeichnisses. */
function verzeichnisEintrag(eintraege) {
  eintraege.push({
    name: "SHOPS.Verknuepfung.Oeffnen",
    icon: '<i class="fa-solid fa-scale-balanced"></i>',
    condition: li => {
      const id = li?.dataset?.entryId ?? li?.[0]?.dataset?.entryId;
      return fuehrtEinenLaden(game.actors.get(id));
    },
    callback: li => {
      const id = li?.dataset?.entryId ?? li?.[0]?.dataset?.entryId;
      ladenAmDokumentOeffnen(game.actors.get(id));
    }
  });
  return eintraege;
}

/** Haken anmelden. Gehoert in `ready`. */
export function verknuepfungEinrichten() {
  Hooks.on("renderTokenHUD", tokenKnopf);
  Hooks.on("renderApplicationV2", bogenKnopf);
  Hooks.on("getActorContextOptions", (verzeichnis, eintraege) => verzeichnisEintrag(eintraege));

  if (!game.user.isGM) return;

  /*
   * Der Verkaeufer wechselt - die Liste am NSC zieht nach.
   *
   * `_source` haelt den Stand **vor** der Aenderung; `aenderungen` nur das,
   * was sich aendert. Beides zusammen sagt, von wem auf wen umgehaengt wird.
   */
  Hooks.on("preUpdateActor", (akteur, aenderungen) => {
    if (akteur.type !== LADEN_TYP) return;
    if (!("haendlerUuid" in (aenderungen.system ?? {}))) return;
    akteur._shopsAlterHaendler = akteur.system.haendlerUuid || null;
  });

  Hooks.on("updateActor", async akteur => {
    if (akteur.type !== LADEN_TYP) return;
    if (!("_shopsAlterHaendler" in akteur)) return;
    const alt = akteur._shopsAlterHaendler;
    delete akteur._shopsAlterHaendler;
    const neu = akteur.system.haendlerUuid || null;
    if (alt === neu) return;

    if (alt) await listeSetzen(alt, akteur.uuid, false);
    if (neu) await listeSetzen(neu, akteur.uuid, true);
  });

  /* Ein geloeschter Laden laesst keine Verweise auf sich zurueck. */
  Hooks.on("deleteActor", async akteur => {
    if (akteur.type !== LADEN_TYP) return;
    await listeSetzen(akteur.system?.haendlerUuid, akteur.uuid, false);
  });
}

/**
 * Bestehende Laeden nachtragen.
 *
 * Wer heute schon einen Verkaeufer eingetragen hat, soll den Knopf am Token
 * bekommen, ohne ihn noch einmal setzen zu muessen. Laeuft einmal bei `ready`
 * und schreibt nur, wo wirklich etwas fehlt.
 */
export async function verknuepfungNachtragen() {
  if (!game.user.isGM) return;
  for (const laden of game.actors.filter(a => a.type === LADEN_TYP)) {
    const uuid = laden.system?.haendlerUuid;
    if (!uuid) continue;
    const person = fromUuidSync(uuid);
    const bisher = person?.getFlag?.(MODULE_ID, VERKNUEPFT) ?? [];
    if (bisher.includes(laden.uuid)) continue;
    await listeSetzen(uuid, laden.uuid, true);
  }
}
