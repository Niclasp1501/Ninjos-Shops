/**
 * Einstiegsdatei.
 *
 * **Alle sechs Schritte stehen.** Ein Laden laesst sich anlegen, fuellen,
 * bepreisen, an Szenen binden und vorzeigen; darin wird gekauft (sofort,
 * gesperrt oder nach Freigabe), verkauft (direkt oder als Verhandlung) und
 * mitgeschrieben - in zwei Buechern. Dazu Angebote zum Sonderpreis, die
 * Verknuepfung vom Haendler zu seinem Laden, der Handel mit einer Person, die
 * gar keinen Laden hat, in beide Richtungen, und die Schauansicht samt Bruecke
 * zu den In-Person Tools.
 *
 * Reihenfolge und Begruendung stehen in KONZEPT-shops.md, Abschnitt 11.
 *
 * Wer hier weiterbaut, liest vorher Abschnitt 7: Die Bauweise "der
 * Spielleiter haelt die Wahrheit" laesst sich nicht nachtraeglich einziehen.
 */

import { MODULE_ID, SETTINGS } from "./const.js";
import { ladenTypEinrichten, ladenBilderEinrichten } from "./laden-model.js";
import { ladenBogenEinrichten } from "./laden-bogen.js";
import { willkommenEinrichten, willkommenZeigen } from "./willkommen.js";
import { mcpWerkzeugeEinrichten } from "./mcp-werkzeuge.js";
import { socketEinrichten } from "./socket.js";
import { zugaengeHaken, zugaengeEinrichten, leisteNachziehen } from "./zugaenge.js";
import { anfrageFensterEinrichten } from "./anfrage-fenster.js";
import { buchFensterEinrichten } from "./ladenbuch.js";
import { offenenLadenWiederherstellen } from "./vorzeigen.js";
import { verknuepfungEinrichten, verknuepfungNachtragen } from "./verknuepfung.js";
import { tischEinrichten } from "./handelstisch.js";
import { schauWiederherstellen } from "./schau.js";
import { monitorEinstellungEinrichten } from "./monitore.js";
import { marktbuchEinstellungEinrichten } from "./marktbuch.js";
import { szenenBogenEinrichten } from "./szenenfeld.js";
import { fensterPassenEinrichten } from "./fensterpassen.js";

function einstellungenEinrichten() {
  /**
   * Der eine Schalter, der in die Hauptliste gehoert: Ohne ihn weiss niemand,
   * ob die Spieler an diesem Tisch Laeden selbst aufmachen koennen. Ab Werk
   * aus - ein Laden wird vorgezeigt, nicht aufgesucht.
   */
  game.settings.register(MODULE_ID, SETTINGS.SPIELER_DUERFEN_OEFFNEN, {
    name: "SHOPS.Einstellung.SpielerDuerfenOeffnen.Name",
    hint: "SHOPS.Einstellung.SpielerDuerfenOeffnen.Hinweis",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  /*
   * Die Leiste im Akteursverzeichnis. Sie ist bequem, aber sie steht in einem
   * Fenster, das dem Modul nicht gehoert - wer sein Verzeichnis aufgeraeumt
   * haben will, soll sie abschalten koennen. Das Marktbuch bleibt trotzdem
   * erreichbar: ueber die Moduleinstellungen und das Menue jedes Ladenbogens.
   */
  game.settings.register(MODULE_ID, SETTINGS.VERZEICHNISLEISTE, {
    name: "SHOPS.Einstellung.Verzeichnisleiste.Name",
    hint: "SHOPS.Einstellung.Verzeichnisleiste.Hinweis",
    scope: "world",
    config: true,
    type: String,
    /*
     * **Hoechstens ein Knopf.** „Beide" gab es einmal und ist am 06.09.2026
     * weggefallen: Die Fusszeile des Akteursverzeichnisses gehoert nicht uns.
     * Dort stehen die Knoepfe anderer Module - beim Tisch, an dem das auffiel,
     * das Cheat Sheet -, und zwei volle Zeilen von hier draengten sie aus dem
     * Bild. Ein Modul, das sich im Fenster eines anderen breitmacht, nimmt
     * Platz, den es nicht besitzt.
     *
     * Beide Wege bleiben erreichbar: das Marktbuch ueber die
     * Moduleinstellungen und das Menue jedes Ladenbogens, ein neuer Laden ueber
     * „Akteur erstellen" und ueber den Knopf am Bogen der Person, die ihn
     * fuehren soll.
     */
    choices: {
      buch: "SHOPS.Einstellung.Verzeichnisleiste.Buch",
      neu: "SHOPS.Einstellung.Verzeichnisleiste.Neu",
      keine: "SHOPS.Einstellung.Verzeichnisleiste.Keine"
    },
    default: "buch",
    onChange: () => ui.actors?.render()
  });

  game.settings.register(MODULE_ID, SETTINGS.SCHAU_LICHT, {
    name: "SHOPS.Einstellung.SchauLicht.Name",
    hint: "SHOPS.Einstellung.SchauLicht.Hinweis",
    scope: "world",
    config: true,
    type: String,
    choices: {
      dunkel: "SHOPS.Einstellung.SchauLicht.Dunkel",
      pergament: "SHOPS.Einstellung.SchauLicht.Pergament"
    },
    default: "dunkel",
    onChange: () => import("./schau.js").then(s => s.schauNeuZeichnen())
  });

  game.settings.register(MODULE_ID, SETTINGS.BLAETTERTAKT, {
    name: "SHOPS.Einstellung.Blaettertakt.Name",
    hint: "SHOPS.Einstellung.Blaettertakt.Hinweis",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 3, max: 60, step: 1 },
    default: 10
  });

  /**
   * Monitore, wenn die In-Person Tools nicht da sind. Sind sie da, gewinnt
   * deren Antwort; diese Liste ist dann unbenutzt und steht deshalb nicht in
   * der Liste, sondern kommt spaeter auf die eigene Seite.
   */
  game.settings.register(MODULE_ID, SETTINGS.MONITORE, {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  /**
   * Die Zeilen des Marktbuchs.
   *
   * Frueher stand hier die Kennung eines Journals. Das las sich wie ein
   * Protokoll und nicht wie ein Buch - nicht filterbar, nicht sortierbar,
   * jede Zeile ein Textschnipsel. Jetzt liegen die Eintraege als Daten hier
   * und bekommen ein eigenes Fenster.
   */
  game.settings.register(MODULE_ID, SETTINGS.MARKTBUCH, {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
}

Hooks.once("init", () => {
  einstellungenEinrichten();
  monitorEinstellungEinrichten();
  marktbuchEinstellungEinrichten();
  // Beides muss in "init" stehen: Danach hat Foundry die Dokumentklassen
  // bereits gebaut, und ein spaeter angemeldetes Datenmodell greift nicht
  // mehr - die Laeden der Welt haetten dann rohe Felder statt Werten.
  ladenTypEinrichten();
  ladenBilderEinrichten();
  ladenBogenEinrichten();
  zugaengeHaken();
  willkommenEinrichten();
  // Muss in "init" stehen: Ninjo's Foundry MCP ruft seinen registerTools-Hook
  // beim Hochfahren, also bevor "ready" laeuft. Fehlt das Modul, passiert nichts.
  mcpWerkzeugeEinrichten();
});

Hooks.once("ready", async () => {
  socketEinrichten();
  // Muss vor dem ersten Fenster stehen: Auf einem Tablet lief das
  // Spielerfenster sonst unten aus dem Bild und war nicht mehr erreichbar.
  fensterPassenEinrichten();
  zugaengeEinrichten();
  anfrageFensterEinrichten();
  buchFensterEinrichten();
  verknuepfungEinrichten();
  tischEinrichten();
  szenenBogenEinrichten();
  await leisteNachziehen();
  await verknuepfungNachtragen();
  await offenenLadenWiederherstellen();
  await schauWiederherstellen();
  await willkommenZeigen();
});
