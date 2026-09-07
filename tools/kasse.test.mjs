/**
 * Tests fuer Preise und Kasse.
 *
 * Kein Testrahmen, kein node_modules: `node tools/kasse.test.mjs`. Die beiden
 * geprueften Dateien fassen bewusst kein Foundry-Dokument an, damit genau das
 * geht.
 *
 * Jeder Fall hier stand vorher als Frage im Konzept. Wer einen neuen findet,
 * traegt ihn ein, bevor er ihn behebt.
 */

import { grundpreisCp, preisCp, ankaufCp, zerlege, alsText, alsMuenzfeld, ausMuenzfeld, wechselgeldText, KUPFERWERT } from "../scripts/preise.js";
import { bezahle, vermoegenCp, schreibeGut, muenzenAbziehen, muenzenDazu } from "../scripts/kasse.js";

let gelaufen = 0, gefallen = 0;

function pruefe(was, ist, soll) {
  gelaufen++;
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a !== b) { gefallen++; console.log(`  FEHLER  ${was}\n          ist  ${a}\n          soll ${b}`); }
}

/* ── Preise ────────────────────────────────────────────────────────── */

pruefe("2 gp sind 200 cp", grundpreisCp({ value: 2, denomination: "gp" }), 200);
pruefe("1 cp bleibt 1 cp", grundpreisCp({ value: 1, denomination: "cp" }), 1);
pruefe("5 sp sind 50 cp", grundpreisCp({ value: 5, denomination: "sp" }), 50);
pruefe("1 pp sind 1000 cp", grundpreisCp({ value: 1, denomination: "pp" }), 1000);
pruefe("1 ep sind 50 cp", grundpreisCp({ value: 1, denomination: "ep" }), 50);
pruefe("ohne Preis: 0", grundpreisCp(undefined), 0);
pruefe("Preis 0: 0", grundpreisCp({ value: 0, denomination: "gp" }), 0);

// Genau der Fall, an dem dnd5es eigenes valueInGP scheitert: Math.floor(0.01).
pruefe("die Kerze ist nicht geschenkt", grundpreisCp({ value: 1, denomination: "cp" }) > 0, true);

pruefe("Aufschlag 1.2 auf 100 cp", preisCp(100, { aufschlag: 1.2 }), 120);
pruefe("Aufschlag rundet auf", preisCp(1, { aufschlag: 1.2 }), 2);
pruefe("kein Aufschlag angegeben", preisCp(100, {}), 100);
pruefe("Festpreis schlaegt Aufschlag", preisCp(100, { aufschlag: 5 }, 42), 42);
pruefe("Festpreis 0 ist gratis, nicht ungesetzt", preisCp(100, { aufschlag: 5 }, 0), 0);
pruefe("Ankauf ab Werk aus", ankaufCp(100, {}), 0);
pruefe("Ankauf 0.5 rundet ab", ankaufCp(101, { ankauf: 0.5 }), 50);

pruefe("250 cp zerlegt", zerlege(250), { gp: 2, sp: 5 });
pruefe("kein Elektrum im Wechselgeld", zerlege(50), { sp: 5 });
pruefe("1000 cp sind ein Platin", zerlege(1000), { pp: 1 });
pruefe("Text", alsText(250), "2 gp 5 sp");
pruefe("Text fuer nichts", alsText(0), "0 cp");

/* ── Vermoegen ─────────────────────────────────────────────────────── */

pruefe("leerer Beutel", vermoegenCp({}), 0);
pruefe("gemischter Beutel", vermoegenCp({ pp: 1, gp: 2, ep: 1, sp: 3, cp: 4 }), 1000 + 200 + 50 + 30 + 4);

/* ── Bezahlen ──────────────────────────────────────────────────────── */

pruefe("passend zahlen",
  bezahle({ gp: 5 }, 200),
  { bestand: { cp: 0, sp: 0, ep: 0, gp: 3, pp: 0 }, gezahlt: { gp: 2 }, zurueck: {} });

pruefe("zu wenig Geld", bezahle({ gp: 1 }, 200), null);

pruefe("nichts kostet nichts",
  bezahle({ gp: 1 }, 0),
  { bestand: { cp: 0, sp: 0, ep: 0, gp: 1, pp: 0 }, gezahlt: {}, zurueck: {} });

// Der Fall, um den es geht: ein Platinstueck kauft einen Dolch.
pruefe("Platin kauft Dolch",
  bezahle({ pp: 1 }, 200),
  { bestand: { cp: 0, sp: 0, ep: 0, gp: 8, pp: 0 }, gezahlt: { pp: 1 }, zurueck: { gp: 8 } });

// Kleingeld zuerst, damit der Beutel sortiert bleibt.
pruefe("erst das Kupfer",
  bezahle({ cp: 5, gp: 1 }, 5),
  { bestand: { cp: 0, sp: 0, ep: 0, gp: 1, pp: 0 }, gezahlt: { cp: 5 }, zurueck: {} });

// Kleingeld reicht nicht ganz: die naechstkleinere Muenze wird aufgebrochen.
pruefe("Silberling aufbrechen",
  bezahle({ cp: 5, sp: 1 }, 11),
  { bestand: { cp: 4, sp: 0, ep: 0, gp: 0, pp: 0 }, gezahlt: { cp: 5, sp: 1 }, zurueck: { cp: 4 } });

// Aufgebrochen wird die *kleinste* passende Muenze, nicht die erstbeste.
pruefe("nicht das Platin anfassen, wenn Gold genuegt",
  bezahle({ gp: 1, pp: 1 }, 50),
  { bestand: { cp: 0, sp: 5, ep: 0, gp: 0, pp: 1 }, gezahlt: { gp: 1 }, zurueck: { sp: 5 } });

// Elektrum wird angenommen, aber nie herausgegeben.
pruefe("Elektrum zahlt, kommt aber nicht zurueck",
  bezahle({ ep: 1 }, 30),
  { bestand: { cp: 0, sp: 2, ep: 0, gp: 0, pp: 0 }, gezahlt: { ep: 1 }, zurueck: { sp: 2 } });

// Alles auf einmal: genau das Vermoegen ausgeben.
pruefe("bis auf den letzten Kupfer",
  bezahle({ gp: 1, sp: 2, cp: 3 }, 123),
  { bestand: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, gezahlt: { cp: 3, sp: 2, gp: 1 }, zurueck: {} });

pruefe("einer zu viel", bezahle({ gp: 1, sp: 2, cp: 3 }, 124), null);

// Der Eingabebestand darf nicht veraendert werden.
const vorher = { gp: 5 };
bezahle(vorher, 200);
pruefe("Eingabe bleibt unberuehrt", vorher, { gp: 5 });

/* ── Gutschrift ────────────────────────────────────────────────────── */

pruefe("Gutschrift ohne Elektrum",
  schreibeGut({ cp: 1 }, 250),
  { cp: 1, sp: 5, ep: 0, gp: 2, pp: 0 });

/* ── Der Satz, den der Spieler nach dem Kauf liest ─────────────────── */

// Genau der Fall aus dem Kopf dieser Datei: 1 pp kauft einen Dolch fuer 2 gp.
pruefe("das Platinstueck kauft den Dolch und gibt acht Gold zurueck",
  wechselgeldText(bezahle({ pp: 1 }, 200).zurueck), "8 gp");
pruefe("groesste Muenze zuerst",
  wechselgeldText({ cp: 4, gp: 8, sp: 5 }), "8 gp 5 sp 4 cp");
pruefe("passend bezahlt sagt nichts", wechselgeldText(bezahle({ gp: 5 }, 200).zurueck), null);
pruefe("leer bleibt leer", wechselgeldText({}), null);
pruefe("Nullen zaehlen nicht als Wechselgeld", wechselgeldText({ gp: 0, sp: 0 }), null);

/* ── Zufallsprobe: was bezahlt wurde, muss auch ankommen ───────────── */

let zufallsfehler = 0;
for (let i = 0; i < 20000; i++) {
  const habe = {
    pp: Math.floor(Math.random() * 4), gp: Math.floor(Math.random() * 20),
    ep: Math.floor(Math.random() * 3), sp: Math.floor(Math.random() * 20),
    cp: Math.floor(Math.random() * 30)
  };
  const gesamt = vermoegenCp(habe);
  const betrag = Math.floor(Math.random() * (gesamt + 50));
  const e = bezahle(habe, betrag);
  if (betrag > gesamt) { if (e !== null) zufallsfehler++; continue; }
  if (!e) { zufallsfehler++; continue; }
  // Die einzige Bedingung, die wirklich zaehlt.
  if (vermoegenCp(e.bestand) !== gesamt - betrag) zufallsfehler++;
  // Und niemand darf eine negative Anzahl Muenzen haben.
  if (Object.values(e.bestand).some(n => n < 0 || !Number.isInteger(n))) zufallsfehler++;
}
pruefe("20000 Zufallskaeufe gehen genau auf", zufallsfehler, 0);

/* ── Das Eingabefeld fuer den Festpreis ────────────────────────────── */

// Die Umkehrung von grundpreisCp: was der Bogen anzeigt, muss wieder dasselbe
// ergeben, sonst wandert ein Festpreis bei jedem Oeffnen des Bogens.
pruefe("200 cp sind 2 gp", alsMuenzfeld(200), { value: 2, denomination: "gp" });
pruefe("1000 cp sind 1 pp", alsMuenzfeld(1000), { value: 1, denomination: "pp" });
pruefe("50 cp sind 5 sp", alsMuenzfeld(50), { value: 5, denomination: "sp" });
pruefe("1 cp bleibt 1 cp", alsMuenzfeld(1), { value: 1, denomination: "cp" });
pruefe("205 cp passen in keine groessere Sorte", alsMuenzfeld(205), { value: 205, denomination: "cp" });
pruefe("0 zeigt 0 gp, nicht 0 cp", alsMuenzfeld(0), { value: 0, denomination: "gp" });
pruefe("negativ wird 0", alsMuenzfeld(-5), { value: 0, denomination: "gp" });

// Am Handelstisch ist ein negativer Preis sinnvoll: die Person gibt heraus.
pruefe("mit Vorzeichen bleibt negativ", alsMuenzfeld(-600, { vorzeichen: true }), { value: -6, denomination: "gp" });
pruefe("mit Vorzeichen: 60 KM sind -6 SM", alsMuenzfeld(-60, { vorzeichen: true }), { value: -6, denomination: "sp" });

// Die Umkehrung - genau das, was zwei Preisfelder bis dahin nicht konnten.
pruefe("6 SM sind 60 KM", ausMuenzfeld(6, "sp"), 60);
pruefe("3 KM bleiben 3 KM", ausMuenzfeld(3, "cp"), 3);
pruefe("2,5 GM sind 250 KM", ausMuenzfeld(2.5, "gp"), 250);
pruefe("negativ bleibt negativ", ausMuenzfeld(-6, "sp"), -60);
pruefe("Unsinn wird 0", ausMuenzfeld("", "gp"), 0);
pruefe("hin und zurueck ueber Silber", ausMuenzfeld(...Object.values(alsMuenzfeld(60))), 60);

// 5000 Werte hin und zurueck. Genau hier verliert sonst jemand seinen Festpreis.
let feldfehler = 0;
for (let cp = 1; cp <= 5000; cp++) {
  const feld = alsMuenzfeld(cp);
  if (grundpreisCp(feld) !== cp) feldfehler++;
}
pruefe("5000 Festpreise gehen hin und zurueck", feldfehler, 0);

/* ── Muenzen auf den Tisch legen ───────────────────────────────────── */

/*
 * Am 08.09.2026 bekam ein Spieler einen Dolch fuer 2 GM 4 SM, indem er 2 GM
 * auf den Tisch legte: Die Waage zog sie ab, aus der Boerse gingen nur die
 * fehlenden 40 Kupfer, und die 2 GM blieben liegen, wo sie waren. Seither
 * wandern hingelegte Muenzen wirklich - als die Muenzen, die sie sind.
 */
pruefe("drei Silber sind drei Silber, kein gewechseltes Gold",
  muenzenAbziehen({ pp: 0, gp: 2, ep: 0, sp: 5, cp: 0 }, { sp: 3 }),
  { cp: 0, sp: 2, ep: 0, gp: 2, pp: 0 });
pruefe("was nicht da ist, wird nicht hingelegt",
  muenzenAbziehen({ pp: 0, gp: 0, ep: 0, sp: 2, cp: 0 }, { sp: 3 }), null);
pruefe("ein Goldstueck wird dafuer nicht aufgebrochen",
  muenzenAbziehen({ pp: 0, gp: 9, ep: 0, sp: 0, cp: 0 }, { sp: 1 }), null);
pruefe("nichts hinlegen aendert nichts",
  muenzenAbziehen({ pp: 1, gp: 2, ep: 3, sp: 4, cp: 5 }, {}),
  { cp: 5, sp: 4, ep: 3, gp: 2, pp: 1 });
pruefe("drueben kommen dieselben Muenzen an",
  muenzenDazu({ pp: 0, gp: 1, ep: 0, sp: 0, cp: 0 }, { sp: 3 }),
  { cp: 0, sp: 3, ep: 0, gp: 1, pp: 0 });
pruefe("hin und zurueck ist der Ausgangsbestand",
  muenzenDazu(muenzenAbziehen({ pp: 1, gp: 7, ep: 0, sp: 3, cp: 9 }, { gp: 5, cp: 4 }), { gp: 5, cp: 4 }),
  { cp: 9, sp: 3, ep: 0, gp: 7, pp: 1 });

/* ── Ergebnis ──────────────────────────────────────────────────────── */

console.log(`\n${gelaufen - gefallen}/${gelaufen} bestanden.`);
process.exit(gefallen ? 1 : 0);
