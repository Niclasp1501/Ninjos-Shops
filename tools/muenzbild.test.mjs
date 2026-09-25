/**
 * Prueft, dass Betraege im Text als Muenzen erkannt werden, und nur sie.
 *
 * `node tools/muenzbild.test.mjs`. Laeuft auch im Release-Ablauf.
 *
 * Die Erkennung liest fertige, uebersetzte Saetze. Genau dort kann sie
 * danebengreifen: ein Kuerzel ohne Zahl davor, eine Zahl mitten in einem
 * Namen, ein Satz, der schon maskiertes HTML ist. Jeder Fall hier ist so ein
 * Rand.
 */

const KUERZEL = { de: { pp: "PM", gp: "GM", ep: "EM", sp: "SM", cp: "KM" },
                  en: { pp: "pp", gp: "gp", ep: "ep", sp: "sp", cp: "cp" } };
let sprache = "de";

globalThis.game = { i18n: { localize: k => KUERZEL[sprache][k.split(".").pop()] ?? k } };
globalThis.foundry = { utils: { escapeHTML: t => String(t)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") } };

const { muenzenHtml } = await import("../scripts/muenzbild.js");

let gelaufen = 0, gefallen = 0;
function pruefe(was, ist, soll) {
  gelaufen++;
  if (ist !== soll) { gefallen++; console.log(`  FEHLER  ${was}\n          ist  ${ist}\n          soll ${soll}`); }
}

/** Nur die erkannten Muenzen, als „Zahl Sorte" hintereinander. */
const muenzen = html => [...html.matchAll(/data-sorte="(\w+)"><span class="shops-geld-zahl">([^<]*)</g)]
  .map(m => `${m[2]} ${m[1]}`).join(" | ");

pruefe("ein Betrag", muenzen(muenzenHtml("10 GM")), "10 gp");
pruefe("alle fuenf Sorten", muenzen(muenzenHtml("1 PM 2 GM 3 EM 4 SM 5 KM")), "1 pp | 2 gp | 3 ep | 4 sp | 5 cp");
pruefe("mitten im Satz", muenzen(muenzenHtml("Es fehlen 10 GM 5 SM.")), "10 gp | 5 sp");
pruefe("Trennpunkt aus muenzText", muenzen(muenzenHtml("3 GM · 5 SM")), "3 gp | 5 sp");
pruefe("der Trennpunkt verschwindet", muenzenHtml("3 GM · 5 SM").includes("·"), false);
pruefe("geschuetztes Leerzeichen", muenzen(muenzenHtml("37 GM")), "37 gp");
pruefe("Kuerzel ohne Zahl bleibt Text", muenzen(muenzenHtml("GM und SM")), "");
pruefe("Zahl ohne Kuerzel bleibt Text", muenzen(muenzenHtml("1× Kurzschwert")), "");
pruefe("kein Treffer in einem Wort", muenzen(muenzenHtml("2 GMX")), "");
pruefe("der Rest des Satzes bleibt stehen",
  muenzenHtml("Zurück: 1 GM.").replace(/<[^>]+>/g, ""), "Zurück: 1GM.");

// Maskieren: roher Text wird maskiert, schon maskierter nicht noch einmal.
pruefe("roher Text wird maskiert", muenzenHtml("<b>5 GM</b>").startsWith("&lt;b&gt;"), true);
pruefe("maskierter Text bleibt, wie er ist",
  muenzenHtml("Tom &amp; Jerry zahlen 5 GM", { schonHtml: true }).startsWith("Tom &amp; Jerry"), true);
pruefe("nichts wird doppelt maskiert",
  muenzenHtml("Tom &amp; Jerry", { schonHtml: true }).includes("&amp;amp;"), false);

// Englisch: kleine Kuerzel, und „gp" im Satz.
sprache = "en";
const { muenzenHtml: englisch } = await import(`../scripts/muenzbild.js?en`);
pruefe("englische Kuerzel", muenzen(englisch("Change: 1 gp 5 sp.")), "1 gp | 5 sp");

console.log(`\n${gelaufen - gefallen}/${gelaufen} bestanden.`);
process.exit(gefallen ? 1 : 0);
