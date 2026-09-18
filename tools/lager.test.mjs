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
import { darfLeerStehen } from "../scripts/lager.js";

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

console.log(fehler ? `\n${fehler} Fälle falsch` : "\nalle Fälle richtig");
process.exit(fehler ? 1 : 0);
