/**
 * Szenen an einen Laden hängen - durch Hineinziehen.
 *
 * **Warum keine Häkchenliste mehr.** Bei 125 Szenen ist eine Liste aus 125
 * Kästchen keine Auswahl, sondern eine Suchaufgabe: Man scrollt an Namen
 * vorbei, die anders sortiert sind, als man sie erinnert, und sieht hinterher
 * nur Namen - kein Bild der Karte, die man gerade angehakt hat. Dasselbe
 * Problem, das die In-Person Tools mit ihrem Szenenfeld gelöst haben, und
 * dieselbe Antwort: hineinziehen, auswählen, herausnehmen.
 *
 * **Die Wahrheit steht am Laden, nicht an der Szene.** `zugriff.szenen` ist
 * der eine Speicher. Das Szenenfenster (siehe `szenenBogenEinrichten`) ist ein
 * zweites Fenster auf dieselben Daten und legt nichts eigenes an - sonst gäbe
 * es zwei Listen, die dasselbe meinen, und die laufen auseinander. Dieselbe
 * Begründung wie bei der Verknüpfung zum Händler (verknuepfung.js).
 *
 * **Geschrieben wird sofort.** Das Szenenfenster schickt nur seine eigenen
 * Felder ab; ein `flags.…`-Feld darin würde am Laden nichts ändern. Jeder
 * Zug und jeder Klick landet deshalb direkt am Dokument.
 */

import { MODULE_ID, LADEN_TYP } from "./const.js";

const { DialogV2 } = foundry.applications.api;

/** Ein Bild für eine Szene, so weit das Dokument eines kennt. */
function szenenBild(szene) {
  return szene?.thumb || szene?.background?.src || "icons/svg/direction.svg";
}

/**
 * Ein Feld mit den Szenen eines Ladens.
 *
 * @param {Actor} laden
 * @param {object} [optionen]
 * @param {boolean} [optionen.bearbeitbar]
 * @returns {HTMLElement}
 */
export function szenenFeldBauen(laden, { bearbeitbar = true } = {}) {
  const feld = document.createElement("div");
  feld.className = "shops-szenenfeld";

  const ablage = document.createElement("div");
  ablage.className = "shops-szenenfeld-ablage";
  feld.append(ablage);

  if (bearbeitbar) {
    const knoepfe = document.createElement("div");
    knoepfe.className = "shops-szenenfeld-knoepfe";
    knoepfe.innerHTML = `
      <button type="button" class="shops-szenenfeld-waehlen">
        <i class="fa-solid fa-magnifying-glass"></i>
        ${game.i18n.localize("SHOPS.Szenenfeld.Waehlen")}
      </button>`;
    feld.append(knoepfe);
    knoepfe.querySelector("button").addEventListener("click", async () => {
      const id = await szeneWaehlen(laden.system.zugriff?.szenen ?? new Set());
      if (id) await szeneHinzufuegen(laden, id);
      zeichnen();
    });
  }

  /** Aus dem Dokument neu zeichnen. Nie das ganze Fenster. */
  function zeichnen() {
    const ids = [...(laden.system.zugriff?.szenen ?? [])];
    ablage.classList.toggle("shops-leer-ablage", !ids.length);

    if (!ids.length) {
      ablage.innerHTML = `<span class="shops-szenenfeld-hinweis">${
        game.i18n.localize("SHOPS.Szenenfeld.Ueberall")}</span>`;
      return;
    }

    ablage.replaceChildren(...ids.map(id => {
      const szene = game.scenes.get(id);
      const chip = document.createElement("span");
      chip.className = "shops-szenenchip";
      chip.innerHTML = `
        <img src="${szenenBild(szene)}" alt="">
        <span>${foundry.utils.escapeHTML(szene?.name ?? game.i18n.localize("SHOPS.Szenenfeld.Fort"))}</span>
        ${bearbeitbar ? `<button type="button" class="shops-szenenchip-weg"
            data-id="${id}" title="${game.i18n.localize("SHOPS.Szenenfeld.Entfernen")}">
            <i class="fa-solid fa-xmark"></i></button>` : ""}`;
      chip.querySelector(".shops-szenenchip-weg")?.addEventListener("click", async () => {
        await szeneEntfernen(laden, id);
        zeichnen();
      });
      return chip;
    }));
  }

  if (bearbeitbar) {
    ablage.addEventListener("dragover", ereignis => {
      ereignis.preventDefault();
      ablage.classList.add("shops-darueber");
    });
    ablage.addEventListener("dragleave", () => ablage.classList.remove("shops-darueber"));

    ablage.addEventListener("drop", async ereignis => {
      ereignis.preventDefault();
      ablage.classList.remove("shops-darueber");

      let daten;
      try {
        daten = foundry.applications.ux.TextEditor.implementation.getDragEventData(ereignis);
      } catch { return; }

      if (daten?.type !== "Scene") {
        return ui.notifications.warn(game.i18n.localize("SHOPS.Szenenfeld.KeineSzene"));
      }
      const szene = await fromUuid(daten.uuid);
      if (!szene) return;
      await szeneHinzufuegen(laden, szene.id);
      zeichnen();
    });
  }

  zeichnen();
  feld.neuZeichnen = zeichnen;
  return feld;
}

/* ── Schreiben ─────────────────────────────────────────────────────── */

export async function szeneHinzufuegen(laden, szeneId) {
  const bisher = [...(laden.system.zugriff?.szenen ?? [])];
  if (bisher.includes(szeneId)) return;
  await laden.update({ "system.zugriff.szenen": [...bisher, szeneId] });
}

export async function szeneEntfernen(laden, szeneId) {
  const bisher = [...(laden.system.zugriff?.szenen ?? [])];
  await laden.update({ "system.zugriff.szenen": bisher.filter(id => id !== szeneId) });
}

/* ── Eine Liste, in die man tippen kann ────────────────────────────── */

/**
 * Szene auswählen.
 *
 * Gefiltert wird beim Tippen und nicht über einen Suchknopf: Man will die
 * Liste enger machen, während man sich an den Namen erinnert.
 */
export async function szeneWaehlen(schon = new Set()) {
  const drin = new Set([...schon]);
  const szenen = game.scenes.contents
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

  const zeilen = szenen.map(s => `
    <button type="button" class="shops-szenenwahl-zeile ${drin.has(s.id) ? "shops-schon-drin" : ""}"
            data-id="${s.id}" data-name="${foundry.utils.escapeHTML(s.name.toLowerCase())}">
      <img src="${szenenBild(s)}" alt="">
      <span>${foundry.utils.escapeHTML(s.name)}</span>
      ${s.active ? `<em>${game.i18n.localize("SHOPS.Zugriff.SzeneAktiv")}</em>` : ""}
      ${drin.has(s.id) ? '<i class="fa-solid fa-check"></i>' : ""}
    </button>`).join("");

  return new Promise(fertig => {
    let erledigt = false;
    const raus = wert => { if (!erledigt) { erledigt = true; fertig(wert); } };

    const dialog = new DialogV2({
      window: { title: game.i18n.localize("SHOPS.Szenenfeld.Waehlen"), icon: "fa-solid fa-map" },
      position: { width: 460, height: 520 },
      classes: ["ninjos-shops", "shops-szenenwahl"],
      content: `
        <div class="shops-szenenwahl-inhalt">
          <input type="search" class="shops-szenenwahl-filter" autofocus
                 placeholder="${game.i18n.localize("SHOPS.Szenenfeld.Filter")}">
          <div class="shops-szenenwahl-liste">${zeilen}</div>
        </div>`,
      buttons: [{ action: "abbrechen", label: game.i18n.localize("SHOPS.Abbrechen") }],
      submit: () => raus(null),
      render: (ereignis, element) => {
        const filter = element.querySelector(".shops-szenenwahl-filter");
        const zeilenEl = [...element.querySelectorAll(".shops-szenenwahl-zeile")];
        filter?.addEventListener("input", () => {
          const suche = filter.value.trim().toLowerCase();
          for (const z of zeilenEl) z.hidden = suche && !z.dataset.name.includes(suche);
        });
        for (const z of zeilenEl) {
          z.addEventListener("click", () => { raus(z.dataset.id); dialog.close(); });
        }
      }
    });
    dialog.render(true);
  });
}

/* ── Das Szenenfenster ─────────────────────────────────────────────── */

/** Kennung unseres Reiters in der Szenen-Konfiguration. */
const SZENE_REITER = "ninjosShops";

/**
 * Ein eigener Reiter „Läden" in der Szenen-Konfiguration.
 *
 * **Warum.** Bis zum 29.09.2026 stand das Feld unter „Verschiedenes", zwischen
 * Foundrys Journal- und Wiedergabelistenfeldern, wo es niemand vermutet. Die
 * In-Person Tools haben ihren eigenen Reiter „Am Tisch"; Shops bekommt
 * denselben Aufbau, damit beide Module sich an derselben Stelle gleich
 * anfühlen. Am Tisch so gewünscht.
 *
 * **Wie.** Ein ApplicationV2 beschreibt seine Reiter in zwei statischen
 * Listen, PARTS fuer den Inhalt und TABS fuer die Leiste, und baut, was darin
 * steht. Je ein Eintrag ist der vorgesehene Weg hinein, genau so wie bei den
 * In-Person Tools (dort `sceneTabEinrichten` in main.js). Laeuft bei `init`
 * fuer Foundrys Klasse und bei `setup` noch einmal fuer Szenenblaetter, die
 * andere Module mit eigenen PARTS anmelden. Zweimal schadet nicht.
 */
export function szenenReiterEinrichten() {
  const klassen = new Set([foundry.applications.sheets?.SceneConfig]);
  for (const eintrag of Object.values(CONFIG.Scene?.sheetClasses?.base ?? {})) klassen.add(eintrag?.cls);

  for (const cls of klassen) {
    try {
      reiterEinsetzen(cls);
    } catch (fehler) {
      // Nie den Start daran scheitern lassen. Ohne Reiter landet das Feld
      // wieder unter „Verschiedenes", siehe amSzenenbogen.
      console.warn(`${MODULE_ID} | Reiter in der Szenen-Konfiguration nicht eingesetzt`, cls?.name, fehler);
    }
  }
}

/** Eine Klasse: unser Teil vor dem Fuss, unser Eintrag ans Ende der Leiste. */
function reiterEinsetzen(cls) {
  const reiter = cls?.TABS?.sheet?.tabs;
  if (!cls?.PARTS || !Array.isArray(reiter)) return;

  if (!(SZENE_REITER in cls.PARTS)) {
    const teil = { template: `modules/${MODULE_ID}/templates/szene-laeden.hbs`, scrollable: [""] };
    // Vor den Fuss, sonst stuende der Reiter unter dem Speichern-Knopf.
    const teile = {};
    for (const [id, part] of Object.entries(cls.PARTS)) {
      if (id === "footer") teile[SZENE_REITER] = teil;
      teile[id] = part;
    }
    teile[SZENE_REITER] ??= teil;
    cls.PARTS = teile;
  }
  if (!reiter.some(t => t.id === SZENE_REITER)) {
    reiter.push({ id: SZENE_REITER, icon: "fa-solid fa-store", label: "SHOPS.Szenenfeld.Reiter" });
  }
}

/**
 * Den Reiter fuellen: welche Läden auf dieser Karte stehen.
 *
 * Fehlt der Reiter, weil ein fremdes Szenenblatt seine Reiter anders baut,
 * kommt das Feld wie frueher unter „Verschiedenes". Dort ist
 * **`.tab[data-tab="misc"]` gemeint, und das `.tab` ist wesentlich**: Zwei
 * Elemente tragen `data-tab="misc"`, der Knopf in der Reiterleiste und die
 * Seite darunter. Der Knopf kommt zuerst; ohne `.tab` landete das Feld in der
 * Leiste und laege ueber allem.
 */
function amSzenenbogen(app, element) {
  if (!game.user.isGM) return;
  const wurzel = element instanceof HTMLElement ? element : element?.[0];
  const reiter = wurzel?.querySelector(".shops-szenenreiter")
    ?? wurzel?.querySelector('.tab[data-tab="misc"]');
  if (!reiter || reiter.querySelector(".shops-szenenlaeden")) return;

  const szene = app.document;
  const kasten = document.createElement("fieldset");
  kasten.className = "ninjos-shops shops-szenenlaeden";
  kasten.innerHTML = `
    <legend>${game.i18n.localize("SHOPS.Szenenfeld.Legende")}</legend>
    <div class="form-group">
      <div class="form-fields shops-szenenlaeden-ablage"></div>
      <p class="hint">${game.i18n.localize("SHOPS.Szenenfeld.SzeneHinweis")}</p>
    </div>`;

  const ablage = kasten.querySelector(".shops-szenenlaeden-ablage");

  const zeichnen = () => {
    const laeden = game.actors.filter(a =>
      a.type === LADEN_TYP && a.system.zugriff?.szenen?.has(szene.id));

    if (!laeden.length) {
      ablage.innerHTML = `<span class="shops-szenenfeld-hinweis">${
        game.i18n.localize("SHOPS.Szenenfeld.KeinLaden")}</span>`;
      return;
    }
    ablage.replaceChildren(...laeden.map(laden => {
      const chip = document.createElement("span");
      chip.className = "shops-szenenchip";
      chip.innerHTML = `
        <img src="${laden.prototypeToken?.texture?.src || laden.img}" alt="">
        <span>${foundry.utils.escapeHTML(laden.name)}</span>
        <button type="button" class="shops-szenenchip-weg"
                title="${game.i18n.localize("SHOPS.Szenenfeld.Entfernen")}">
          <i class="fa-solid fa-xmark"></i></button>`;
      chip.querySelector("button").addEventListener("click", async () => {
        await szeneEntfernen(laden, szene.id);
        zeichnen();
      });
      return chip;
    }));
  };

  ablage.addEventListener("dragover", e => { e.preventDefault(); ablage.classList.add("shops-darueber"); });
  ablage.addEventListener("dragleave", () => ablage.classList.remove("shops-darueber"));
  ablage.addEventListener("drop", async ereignis => {
    ereignis.preventDefault();
    ablage.classList.remove("shops-darueber");
    let daten;
    try {
      daten = foundry.applications.ux.TextEditor.implementation.getDragEventData(ereignis);
    } catch { return; }
    const dokument = daten?.uuid ? await fromUuid(daten.uuid) : null;
    if (dokument?.type !== LADEN_TYP) {
      return ui.notifications.warn(game.i18n.localize("SHOPS.Szenenfeld.KeinLadenGezogen"));
    }
    await szeneHinzufuegen(dokument, szene.id);
    zeichnen();
  });

  zeichnen();
  reiter.append(kasten);
}

/** Haken anmelden. Gehoert in `ready`. */
export function szenenBogenEinrichten() {
  Hooks.on("renderSceneConfig", amSzenenbogen);
}
