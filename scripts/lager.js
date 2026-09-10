/**
 * Ware in einen Rucksack legen - und dabei stapeln.
 *
 * **Warum es diese Datei gibt.** Derselbe Vorgang stand an drei Stellen, und
 * nur eine davon stapelte. `fuehreAnkaufAus` in verkauf.js suchte im Ziel nach
 * einem gleichnamigen Stueck und erhoehte dessen Anzahl; `fuehreKaufAus` in
 * kauf.js und `nehmenAusfuehren` in handel.js legten stur ein neues an. Wer
 * zweimal fuenf Fackeln kaufte, hatte danach zwei Zeilen „Fackel" im
 * Rucksack - und beim dritten Mal drei.
 *
 * Das faellt nicht sofort auf, weil nichts fehlt. Es faellt beim Aufraeumen
 * auf, und dann ist der Rucksack voller Dubletten, die niemand mehr
 * zusammenfuehren mag.
 *
 * **Woran zwei Stuecke als dasselbe gelten: Name und Typ.** Nicht mehr. Ein
 * Vergleich ueber alle Felder waere genauer und in der Praxis nutzlos - schon
 * eine abweichende Beschreibung oder ein gesetztes Merkmal machte aus jedem
 * Kauf wieder eine eigene Zeile, und damit waere die Regel wirkungslos. Die
 * Ware kommt hier ohnehin frisch aus einem Laden oder von einer Person; sie
 * traegt keinen Zustand, den ein Stapeln verschluecken koennte.
 *
 * **Was bewusst nicht gestapelt wird:** Behaelter. dnd5e fuehrt sie ohne
 * Stueckzahl, jeder ist ein eigenes Ding mit eigenem Inhalt. Zwei Rucksaecke
 * zu einem „Rucksack x2" zusammenzulegen verloere, was drin ist.
 */

import { MODULE_ID } from "./const.js";

/** Typen, die dnd5e ohne sinnvolle Stueckzahl fuehrt. */
const NICHT_STAPELBAR = new Set(["container", "backpack"]);

/**
 * Ein Stueck einlagern: auf einen vorhandenen Stapel legen, sonst neu anlegen.
 *
 * @param {Actor} ziel      Wer es bekommt
 * @param {Item}  vorlage   Das Stueck, wie es beim Abgeber liegt
 * @param {number} stueck   Wie viele
 * @returns {Promise<"gestapelt"|"neu">}
 */
export async function einlagern(ziel, vorlage, stueck) {
  const menge = Math.max(1, Math.floor(Number(stueck) || 1));

  if (!NICHT_STAPELBAR.has(vorlage.type)) {
    const vorhanden = ziel.items.find(i => i.name === vorlage.name && i.type === vorlage.type);
    if (vorhanden && Number.isFinite(Number(vorhanden.system?.quantity))) {
      await vorhanden.update({
        "system.quantity": Number(vorhanden.system.quantity ?? 0) + menge
      });
      return "gestapelt";
    }
  }

  const kopie = vorlage.toObject();
  delete kopie._id;
  kopie.system = kopie.system ?? {};
  kopie.system.quantity = menge;
  // Die Ladenmerkmale gehoeren dem Laden, nicht der Ware im Rucksack.
  delete kopie.flags?.[MODULE_ID];
  await ziel.createEmbeddedDocuments("Item", [kopie]);
  return "neu";
}

/* ── Eine ganze Seite uebergeben ───────────────────────────────────── */

/**
 * Was am Stueck haengt und nicht mitreisen darf.
 *
 * `ownership` traegt die Rechte des Abgebers - der Empfaenger bekaeme sonst
 * ein Stueck, das jemand anderem gehoert. `equipped` und `attuned` sind
 * Zustaende am alten Traeger; dnd5e setzt sie beim Besitzerwechsel nicht
 * zurueck, und die Einstimmungszaehlung des Empfaengers waere falsch.
 * Nachgelesen in dnd5e 5.3.3.
 */
function kopieVon(item, menge) {
  const daten = item.toObject();
  delete daten._id;
  delete daten.ownership;
  delete daten.flags?.[MODULE_ID];
  if (daten.system) {
    if ("equipped" in daten.system) daten.system.equipped = false;
    if ("attuned" in daten.system) daten.system.attuned = false;
    if (menge !== undefined) daten.system.quantity = menge;
  }
  return daten;
}

/** Was in einem Behaelter liegt - beliebig tief. Bei allem anderen nichts. */
function darin(item) {
  return item.type === "container" ? (item.system?.allContainedItems ?? []) : [];
}

/**
 * Ware und Muenzen von einem Traeger zum anderen.
 *
 * **Ein Beutel reist als Ganzes.** Wer ihn hinlegt, legt hin, was drin ist -
 * alles andere waere eine Luege ueber das, was passiert. Der Inhalt haengt in
 * dnd5e ueber `system.container` an der Kennung des Beutels, und die Kopie
 * bekommt eine neue; deshalb wird erst angelegt und danach umgehaengt.
 *
 * **Erst anlegen, dann wegnehmen.** Bricht es dazwischen ab, gibt es das
 * Stueck zweimal statt keinmal. Eine Dublette ist Aerger, ein verschwundener
 * Gegenstand ein verlorener Abend.
 *
 * **Es fliegt keine Ausnahme.** Zurueck kommt ein Bericht, denn ein halb
 * ausgefuehrter Tausch muss *beschrieben* werden, nicht verschluckt: Wer
 * „angelegt bei Roxy, Loeschen bei Nadylos fehlgeschlagen" liest, raeumt das
 * in einer Minute auf.
 *
 * @param {Actor} von
 * @param {Actor} zu
 * @param {{itemId: string, menge: number}[]} posten
 * @param {Record<string, number>} muenzen  Sorte -> Anzahl, wird nicht gewechselt
 * @returns {Promise<{angelegt: string[], entfernt: string[], fehler: ?string}>}
 */
export async function uebergeben(von, zu, posten = [], muenzen = {}) {
  const bericht = { angelegt: [], entfernt: [], fehler: null };

  try {
    /* 1. Beim Empfaenger anlegen. */
    const wurzeln = [];
    for (const { itemId, menge } of posten ?? []) {
      const item = von?.items?.get(itemId);
      if (!item) throw new Error(`${itemId} liegt nicht mehr bei ${von?.name ?? "?"}`);

      const vorrat = Number(item.system?.quantity ?? 1);
      const wieviel = Math.max(1, Math.floor(Number(menge) || 1));
      const ganz = item.type === "container" || wieviel >= vorrat;

      if (item.type === "container") {
        const [huelle] = await zu.createEmbeddedDocuments("Item", [kopieVon(item)]);
        bericht.angelegt.push(huelle.name);

        const inhalt = [...darin(item)];
        if (inhalt.length) {
          const angelegt = await zu.createEmbeddedDocuments(
            "Item", inhalt.map(k => kopieVon(k)));
          angelegt.forEach(k => bericht.angelegt.push(k.name));

          // Alte Kennung -> neue, erst vollstaendig, dann umhaengen: Ein
          // Beutel im Beutel zeigt auf eine Kennung, die spaeter in der Liste
          // steht. Wessen alter Behaelter fehlt, landet in der Huelle - im
          // Beutel, den der Spieler sieht, statt lose im Rucksack.
          const neueKennung = new Map([[item.id, huelle.id]]);
          inhalt.forEach((k, i) => neueKennung.set(k.id, angelegt[i].id));
          await zu.updateEmbeddedDocuments("Item", inhalt.map((k, i) => ({
            _id: angelegt[i].id,
            "system.container": neueKennung.get(k.system?.container) ?? huelle.id
          })));
        }
      } else {
        // Stapeln, wo es geht - siehe oben, warum diese Datei existiert.
        await einlagern(zu, item, wieviel);
        bericht.angelegt.push(ganz ? item.name : `${item.name} (${wieviel})`);
      }

      wurzeln.push({ item, ganz, menge: wieviel });
    }

    /* 2. Muenzen - als die Muenzen, die sie sind. */
    const sorten = Object.keys(muenzen ?? {}).filter(s => (muenzen[s] ?? 0) > 0);
    if (sorten.length) {
      const abgeber = {}, empfaenger = {};
      for (const s of sorten) {
        const hat = Number(von.system?.currency?.[s] ?? 0);
        if (hat < muenzen[s]) throw new Error(`${von.name} hat nur noch ${hat} ${s}`);
        abgeber[`system.currency.${s}`] = hat - muenzen[s];
        empfaenger[`system.currency.${s}`] = Number(zu.system?.currency?.[s] ?? 0) + muenzen[s];
      }
      await zu.update(empfaenger);
      await von.update(abgeber);
    }

    /* 3. Und erst jetzt beim Abgeber wegnehmen. */
    const loeschen = [], mindern = [];
    for (const { item, ganz, menge } of wurzeln) {
      if (ganz) {
        const inhalt = [...darin(item)];
        loeschen.push(item.id, ...inhalt.map(k => k.id));
        // Der Inhalt wird mitgenannt: Bleibt das Loeschen stecken, muss im
        // Bericht stehen, dass ein Beutel *und vier Dinge darin* noch beim
        // Abgeber liegen - „Beutel" allein schickt die Spielleitung auf die
        // Suche nach einem Stueck statt nach fuenf.
        bericht.entfernt.push(item.name, ...inhalt.map(k => k.name));
      } else {
        mindern.push({ _id: item.id,
                       "system.quantity": Number(item.system?.quantity ?? 1) - menge });
        bericht.entfernt.push(`${item.name} (${menge})`);
      }
    }
    if (mindern.length) await von.updateEmbeddedDocuments("Item", mindern);
    if (loeschen.length) await von.deleteEmbeddedDocuments("Item", [...new Set(loeschen)]);
  } catch (fehler) {
    bericht.fehler = fehler?.message ?? String(fehler);
    console.error(`${MODULE_ID} | Uebergabe abgebrochen`, fehler);
  }

  return bericht;
}

/* ── Vor dem Bewegen: liegt das alles noch da? ─────────────────────── */

/** Was in einem Behaelter liegt, als Kennungen. Bei allem anderen nichts. */
export function inhaltVon(item) {
  return item?.type === "container"
    ? [...(item.system?.allContainedItems ?? [])].map(k => ({ id: k.id, name: k.name }))
    : [];
}

/**
 * Prueft eine Seite, ohne irgendetwas anzufassen.
 *
 * **Warum das eine eigene Funktion ist.** Am 10.09.2026 am Tisch: Ein Tausch
 * wurde abgeschlossen, obwohl die Gegenseite ihr Stueck zwischendurch
 * geloescht hatte. Die eigene Seite wanderte, die andere scheiterte - einer
 * hatte gegeben und nichts bekommen. Der Handelstisch prueft seit jeher vorher,
 * der Tausch zwischen Spielern tat es nicht.
 *
 * Geprueft wird auch der **Inhalt eines Behaelters**. Wer einen Beutel hinlegt
 * und ihn vor dem Abschluss ausraeumt, uebergibt etwas anderes als das, was
 * der andere gesehen und dem er zugestimmt hat.
 *
 * @returns {{ok: true}|{ok: false, was: string}}
 */
export function pruefeSeite(traeger, posten = [], muenzen = {}) {
  if (!traeger) return { ok: false, was: "?" };

  for (const p of posten) {
    const item = traeger.items.get(p.itemId);
    if (!item) return { ok: false, was: p.name ?? "?" };

    if (item.type !== "container") {
      const vorrat = Number(item.system?.quantity ?? 0);
      if (vorrat < Math.max(1, Number(p.menge) || 1)) return { ok: false, was: item.name };
      continue;
    }

    // Der Beutel selbst reicht nicht - es zaehlt, was drin ist.
    const drin = new Set(inhaltVon(item).map(k => k.id));
    for (const k of p.inhalt ?? []) {
      if (!drin.has(k.id)) return { ok: false, was: `${item.name}: ${k.name}` };
    }
  }

  for (const [sorte, anzahl] of Object.entries(muenzen ?? {})) {
    const hat = Math.floor(Number(traeger.system?.currency?.[sorte] ?? 0));
    if (hat < anzahl) return { ok: false, was: `${anzahl} ${sorte}` };
  }

  return { ok: true };
}
