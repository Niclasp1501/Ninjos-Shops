/**
 * Tests fuer die Schnittstelle der Zusatzmodule.
 *
 * `node tools/erweiterung.test.mjs`. Wie kasse.test.mjs ohne Testrahmen und
 * ohne Welt: erweiterung.js fasst bewusst nichts von Foundry an.
 *
 * Geprueft wird vor allem das, woran ein fremdes Modul scheitern kann, und
 * dass es dabei nur sich selbst trifft, nie den Laden.
 */

import { erweiterungAnlegen, erweiterung, SCHNITTSTELLE, HOOKS } from "../scripts/erweiterung.js";

let gelaufen = 0, gefallen = 0;

function pruefe(was, ist, soll) {
  gelaufen++;
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a !== b) { gefallen++; console.log(`  FEHLER  ${was}\n          ist  ${a}\n          soll ${b}`); }
}

/** Ein Protokoll, das mitschreibt statt auszugeben. */
function stilles() {
  const zeilen = { log: [], warn: [], error: [] };
  return {
    zeilen,
    log: (...a) => zeilen.log.push(a.join(" ")),
    warn: (...a) => zeilen.warn.push(a.join(" ")),
    error: (...a) => zeilen.error.push(String(a[0]))
  };
}

/* ── Anmelden ──────────────────────────────────────────────────────── */

{
  const protokoll = stilles();
  const stelle = erweiterungAnlegen({ protokoll });
  let aufrufe = 0, bekommen = null;
  const ok = stelle.register({ id: "shops-premium", requires: 1, setup: s => { aufrufe++; bekommen = s; } });
  pruefe("gueltige Anmeldung", ok, true);
  pruefe("setup bekommt die Anmeldestelle", bekommen === stelle, true);
  pruefe("angemeldet", stelle.isRegistered("shops-premium"), true);
  pruefe("zweites Anmelden meldet Erfolg", stelle.register({ id: "shops-premium", setup: () => { aufrufe++; } }), true);
  pruefe("setup laeuft trotzdem nur einmal", aufrufe, 1);
}

{
  const protokoll = stilles();
  const gewarnt = [];
  const stelle = erweiterungAnlegen({ protokoll, warnen: (id, r) => gewarnt.push([id, r]) });
  let lief = false;
  pruefe("neuere Schnittstelle verlangt", stelle.register({ id: "zukunft", requires: SCHNITTSTELLE + 1, setup: () => { lief = true; } }), false);
  pruefe("dann laeuft setup nicht", lief, false);
  pruefe("die Spielleitung wird gewarnt", gewarnt, [["zukunft", SCHNITTSTELLE + 1]]);
  pruefe("unsinnige Versionsangabe gilt als zu neu", stelle.register({ id: "unsinn", requires: "abc", setup: () => {} }), false);
  pruefe("ohne requires reicht Version 1", stelle.register({ id: "ohne", setup: () => {} }), true);
}

{
  const protokoll = stilles();
  const stelle = erweiterungAnlegen({ protokoll });
  pruefe("setup wirft", stelle.register({ id: "kaputt", setup: () => { throw new Error("nein"); } }), false);
  pruefe("dann nicht angemeldet", stelle.isRegistered("kaputt"), false);
  pruefe("und es steht im Protokoll", protokoll.zeilen.error.length, 1);
  pruefe("repariert darf es noch einmal", stelle.register({ id: "kaputt", setup: () => {} }), true);
}

{
  const stelle = erweiterungAnlegen({ protokoll: stilles() });
  for (const falsch of ["", "Gross", "mit leer", '"><script>', "-vorne", "a".repeat(65), null, undefined]) {
    pruefe(`Kennung ${JSON.stringify(falsch)} abgewiesen`, stelle.register({ id: falsch, setup: () => {} }), false);
  }
  pruefe("setup, das keine Funktion ist", stelle.register({ id: "ohne-setup", setup: "ja" }), false);
  pruefe("gar nichts uebergeben", stelle.register(), false);
}

/* ── Faehigkeiten ──────────────────────────────────────────────────── */

{
  const stelle = erweiterungAnlegen({ protokoll: stilles() });
  pruefe("unbekannte Faehigkeit", stelle.hasFeature("auktion"), false);
  stelle.registerFeature("auktion");
  pruefe("angemeldete Faehigkeit", stelle.hasFeature("auktion"), true);
}

/* ── Menueeintraege ────────────────────────────────────────────────── */

{
  const protokoll = stilles();
  const stelle = erweiterungAnlegen({ protokoll });
  const item = { id: "i1", name: "Langschwert", type: "weapon" };
  const shop = { id: "l1" };

  pruefe("Eintrag ohne onClick", stelle.registerItemMenuEntry({ id: "a", label: "A" }), false);
  pruefe("Eintrag ohne label", stelle.registerItemMenuEntry({ id: "a", onClick: () => {} }), false);
  pruefe("Eintrag mit boeser Kennung", stelle.registerItemMenuEntry({ id: "x y", label: "A", onClick: () => {} }), false);

  stelle.registerItemMenuEntry({ id: "auktion", icon: "fa-gavel", label: "Versteigern", onClick: () => "geklickt" });
  stelle.registerItemMenuEntry({ id: "spieler", label: "Fuer alle", gmOnly: false, onClick: () => {} });
  stelle.registerItemMenuEntry({ id: "nur-waffen", label: () => "Schaerfen", when: i => i.type === "weapon", onClick: () => {} });
  stelle.registerItemMenuEntry({ id: "nie", label: "Nie", when: () => false, onClick: () => {} });
  stelle.registerItemMenuEntry({ id: "wirft", label: "Wirft", when: () => { throw new Error("kaputt"); }, onClick: () => {} });
  stelle.registerItemMenuEntry({ id: "symbol", icon: 'fa-x" onclick="boese', label: "Symbol", onClick: () => {} });

  const gm = stelle.itemMenuEntries({ item, shop, isGM: true });
  pruefe("Spielleitung sieht, was fuer die Zeile gilt",
    gm.map(e => e.id), ["auktion", "spieler", "nur-waffen", "symbol"]);
  pruefe("label als Funktion wird aufgeloest", gm.find(e => e.id === "nur-waffen")?.label, "Schaerfen");
  pruefe("ein boeses Symbol wird ersetzt", gm.find(e => e.id === "symbol")?.icon, "fa-puzzle-piece");
  pruefe("ein werfendes when kostet nur sich selbst", protokoll.zeilen.error.length, 1);

  const spieler = stelle.itemMenuEntries({ item, shop, isGM: false });
  pruefe("Spieler sehen nur, was nicht gmOnly ist", spieler.map(e => e.id), ["spieler"]);

  pruefe("when fragt je Zeile",
    stelle.itemMenuEntries({ item: { type: "loot" }, shop, isGM: true }).some(e => e.id === "nur-waffen"), false);

  pruefe("Klick findet seinen Eintrag", stelle.itemMenuEntry("auktion")?.onClick(), "geklickt");
  pruefe("unbekannter Klick", stelle.itemMenuEntry("gibt-es-nicht"), null);

  stelle.registerItemMenuEntry({ id: "auktion", label: "Neu", onClick: () => "neu" });
  pruefe("dieselbe Kennung ersetzt, statt doppelt zu stehen",
    stelle.itemMenuEntries({ item, shop, isGM: true }).filter(e => e.id === "auktion").length, 1);
  pruefe("und zwar mit dem neuen Klick", stelle.itemMenuEntry("auktion").onClick(), "neu");
}

/* ── Was API.md verspricht ─────────────────────────────────────────── */

pruefe("Schnittstelle 1", SCHNITTSTELLE, 1);
pruefe("die Hook-Namen", HOOKS, {
  BEREIT: "ninjosShopsReady",
  KAUF: "ninjosShops.purchaseCompleted",
  VERKAUF: "ninjosShops.saleCompleted",
  TISCH: "ninjosShops.tableCompleted",
  TAUSCH: "ninjosShops.tradeCompleted",
  BOGEN: "ninjosShops.sheetRendered",
  SPIELERFENSTER: "ninjosShops.playerWindowRendered",
  SCHAU: "ninjosShops.displayRendered"
});
pruefe("die Namen lassen sich nicht umschreiben", Object.isFrozen(HOOKS), true);
pruefe("die Stelle des Moduls ist leer, bis jemand kommt", erweiterung.itemMenuEntries({ isGM: true }), []);

console.log(gefallen ? `\n${gefallen} von ${gelaufen} gefallen.` : `\n${gelaufen}/${gelaufen} bestanden.`);
process.exit(gefallen ? 1 : 0);
