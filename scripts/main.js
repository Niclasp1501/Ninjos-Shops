/**
 * Einstiegsdatei.
 *
 * **Stand: Schritt 5 von 6.** Es laufen die Einstellungen, das
 * Willkommensfenster, der Laden selbst, das Vorzeigen mit Spielerfenster,
 * Angebote der Spielleitung, der Kauf ueber die Spielleitung und das
 * Marktbuch. Ein Laden laesst sich anlegen, fuellen, bepreisen, vorzeigen -
 * und es laesst sich darin kaufen.
 *
 * Es fehlt die Schauansicht und die Bruecke zu den In-Person Tools (6).
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
import { zugaengeHaken, zugaengeEinrichten } from "./zugaenge.js";
import { anfrageFensterEinrichten } from "./anfrage-fenster.js";
import { buchFensterEinrichten } from "./ladenbuch.js";
import { offenenLadenWiederherstellen } from "./vorzeigen.js";
import { verknuepfungEinrichten, verknuepfungNachtragen } from "./verknuepfung.js";
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

/**
 * Sind die In-Person Tools da und geben sie ihre Monitorerkennung heraus?
 *
 * Eine Abhaengigkeit ist das nicht und wird auch keine: Fehlt das Modul oder
 * fehlt die Auskunft, faellt das Modul auf seine eigene Liste zurueck.
 * Siehe KONZEPT-shops.md, Abschnitt 3 - dort steht auch, dass die drei
 * Funktionen drueben noch in die API eingetragen werden muessen.
 */
export function inPersonBruecke() {
  const api = game.modules.get("ninjos-inperson-tools")?.active
    ? game.modules.get("ninjos-inperson-tools").api
    : null;
  return typeof api?.isMonitorUser === "function" ? api : null;
}

Hooks.once("init", () => {
  einstellungenEinrichten();
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
  await verknuepfungNachtragen();
  await offenenLadenWiederherstellen();
  await willkommenZeigen();
});
