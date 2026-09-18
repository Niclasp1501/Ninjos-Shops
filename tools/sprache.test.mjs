/**
 * Prueft die Sprachdateien.
 *
 * `node tools/sprache.test.mjs`. Laeuft auch im Release-Ablauf, vor dem Bauen.
 *
 * Drei Dinge, und jedes ist schon einmal durchgerutscht:
 *
 * - **Beide Sprachen tragen dieselben Schluessel.** Ein fehlender englischer
 *   Text erscheint beim Spieler als roher Schluessel.
 * - **Jeder Schluessel, der im Quelltext steht, ist uebersetzt.**
 * - **Kein Gedankenstrich** (Hausregel 4a). Am 19.09.2026 standen trotz der
 *   Regel 39 Texte je Sprache mit einem da, weil nichts sie gezaehlt hat.
 *   Bindestrich und Streckenstrich in Zahlen (`10–12`) bleiben erlaubt.
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const WURZEL = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const lies = f => fs.readFileSync(path.join(WURZEL, f), "utf8");
const liste = d => fs.readdirSync(path.join(WURZEL, d)).map(f => `${d}/${f}`);

let fehler = 0;
const falsch = text => { fehler++; console.log(`  FEHLER  ${text}`); };

const sprachen = { de: JSON.parse(lies("lang/de.json")), en: JSON.parse(lies("lang/en.json")) };

// 1. Gleiche Schluessel
for (const [a, b] of [["de", "en"], ["en", "de"]]) {
  const fehlt = Object.keys(sprachen[a]).filter(k => !(k in sprachen[b]));
  if (fehlt.length) falsch(`${fehlt.length} Schluessel nur in ${a}: ${fehlt.slice(0, 5).join(", ")}`);
}

// 2. Was im Quelltext steht, ist uebersetzt
const quelle = [...liste("scripts").filter(f => f.endsWith(".js")),
                ...liste("templates").filter(f => f.endsWith(".hbs"))].map(lies).join("\n");
const benutzt = new Set([...quelle.matchAll(/["'](SHOPS\.[A-Za-z0-9_.]+[A-Za-z0-9_])["']/g)].map(m => m[1]));
for (const code of Object.keys(sprachen)) {
  const fehlt = [...benutzt].filter(k => !(k in sprachen[code]));
  if (fehlt.length) falsch(`${code}: ${fehlt.length} benutzte Schluessel fehlen: ${fehlt.slice(0, 5).join(", ")}`);
}

// 3. Kein Gedankenstrich
const STRICH = /—|\s–\s/;
for (const [code, texte] of Object.entries(sprachen)) {
  for (const [k, v] of Object.entries(texte)) {
    if (STRICH.test(v)) falsch(`${code}: Gedankenstrich in ${k}`);
  }
}

console.log(fehler ? `\n${fehler} Fehler.` : `\nSprachdateien in Ordnung (${benutzt.size} benutzte Schluessel).`);
process.exit(fehler ? 1 : 0);
