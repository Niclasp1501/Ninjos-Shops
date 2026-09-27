/**
 * Prueft, welche Ware beim Ausverkauf stehen bleiben darf.
 *
 * Am 18.09.2026 verschwand eine ausverkaufte Ware samt ihrem Haken „kauft er
 * an", und der Laden nahm danach nichts mehr davon an. Seitdem bleibt Ware
 * mit Bestand 0 stehen, aber nur, wenn dnd5e die 0 auch erlaubt; sonst lehnte
 * Foundry die Aenderung mitten im Kauf ab, nach dem Bezahlen.
 *
 * node tools/lager.test.mjs
 */
import { darfLeerStehen, istWare, inhaltText, einlagern } from "../scripts/lager.js";

let fehler = 0;
const pruefe = (name, ist, soll) => {
  const gut = ist === soll;
  if (!gut) fehler++;
  console.log(`${gut ? "✓" : "✗"} ${name}${gut ? "" : `  (ist ${ist}, soll ${soll})`}`);
};
const ware = quantity => ({ system: { schema: { fields: { quantity } } } });

pruefe("Heiltrank (min 0) bleibt stehen", darfLeerStehen(ware({ min: 0 })), true);
pruefe("Behaelter (min 1, max 1) wird geloescht", darfLeerStehen(ware({ min: 1, max: 1 })), false);
pruefe("Feld mit positive wird geloescht", darfLeerStehen(ware({ positive: true })), false);
pruefe("Feld ohne Grenzen bleibt stehen", darfLeerStehen(ware({})), true);
pruefe("ohne Mengenfeld wird geloescht", darfLeerStehen({ system: {} }), false);
pruefe("ohne alles wird geloescht", darfLeerStehen(null), false);

/* ── Was ist Ware? (28.09.2026: Zauber aus Staeben, Inhalt von Rucksaecken) ── */

const rucksack = { id: "r", type: "container", name: "Rucksack", system: { quantity: 1, container: null } };
const decke = { id: "d", type: "loot", name: "Decke", system: { quantity: 1, container: "r" } };
const fackeln = { id: "f", type: "consumable", name: "Fackel", system: { quantity: 10, container: "r" } };
const verwaist = { id: "v", type: "loot", name: "Rationen", system: { quantity: 5, container: "weg" } };
const zauber = { id: "z", type: "spell", name: "Fett", system: {}, flags: { dnd5e: { cachedFor: ".Item.x.Activity.y" } } };
rucksack.system.allContainedItems = [decke, fackeln];
const laden = { items: new Map([["r", rucksack], ["d", decke], ["f", fackeln], ["v", verwaist], ["z", zauber]]) };

pruefe("ein Rucksack ist Ware", istWare(rucksack, laden), true);
pruefe("die Decke darin nicht", istWare(decke, laden), false);
pruefe("ein Stueck mit verwaistem Behaelter ist lose und damit Ware", istWare(verwaist, laden), true);
pruefe("ein Zauber aus einem Stab nicht", istWare(zauber, laden), false);
pruefe("ohne Stueckzahl nicht", istWare({ system: {} }, laden), false);
pruefe("der Inhalt als Satzteil", inhaltText(rucksack), "Decke, 10× Fackel");
pruefe("kein Behaelter, kein Inhalt", inhaltText(decke), "");

// Eine Kopie landet lose beim Empfaenger, nicht in einem Behaelter, den es dort nicht gibt.
const angelegt = [];
const empfaenger = { items: { find: () => null }, createEmbeddedDocuments: async (_t, daten) => angelegt.push(...daten) };
await einlagern(empfaenger, { type: "loot", name: "Decke", toObject: () => structuredClone({ _id: "d", name: "Decke", type: "loot", system: { quantity: 1, container: "r" } }) }, 1);
pruefe("die Kopie liegt lose", angelegt[0]?.system?.container, null);

console.log(fehler ? `\n${fehler} Fälle falsch` : "\nalle Fälle richtig");
process.exit(fehler ? 1 : 0);
