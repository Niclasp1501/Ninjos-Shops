/**
 * Feste Werte an einer Stelle.
 *
 * Die Merkmalspfade stehen hier und nirgends sonst als Zeichenkette im Code:
 * Sie liegen auf fremden Dokumenten - Akteuren und Gegenstaenden, die anderen
 * Modulen und dem System gehoeren - und ein Tippfehler darin faellt nicht auf,
 * er legt nur still ein zweites, leeres Merkmal an.
 */

export const MODULE_ID = "ninjos-shops";

/**
 * Der Untertyp, den dieses Modul anmeldet.
 *
 * Foundry stellt die Modulkennung selbst davor - im Manifest steht `"laden"`,
 * im `type`-Feld eines Dokuments steht `"ninjos-shops.laden"`. Beide Formen
 * werden gebraucht: die kurze im Manifest, die lange ueberall im Code.
 *
 * Warum ein eigener Typ und kein Merkmal auf einem NSC: KONZEPT-shops.md,
 * Abschnitt 4. Kurz - ein NSC haette genau einen Laden, brauchte
 * Trefferpunkte, die kein Regal hat, und Flags nehmen ein "1,2" mit Komma
 * widerspruchslos an.
 */
export const LADEN_TYP = `${MODULE_ID}.laden`;

/**
 * Merkmal auf allem, was auf Laeden zeigen darf - NSC, Token, Szenen-Note.
 *
 * Eine **Liste** von UUIDs, nicht eine einzelne: Ein Haendler fuehrt zwei
 * Staende, ein Marktplatz drei Buden. Das kostet hier nichts und laesst sich
 * spaeter nicht mehr nachruesten, ohne bestehende Welten anzufassen.
 *
 * Die Verknuepfung ist eine Zusatzfunktion. Ein Laden ohne jede ist genauso
 * gueltig - die Spielleitung zeigt ihn aus dem Verzeichnis heraus vor.
 */
export const VERKNUEPFT = "laeden";

export const SETTINGS = {
  /**
   * Der eine Schalter, dessen Antwort man kennen muss, bevor man das Modul
   * einschaltet - deshalb steht er in der Hauptliste und nicht auf einer
   * Unterseite. Ab Werk aus: Ein Laden wird vorgezeigt, nicht aufgesucht.
   */
  SPIELER_DUERFEN_OEFFNEN: "spielerDuerfenOeffnen",

  /** Takt der Schauansicht in Sekunden. */
  BLAETTERTAKT: "blaettertakt",

  /**
   * Monitore, wenn die In-Person Tools nicht da sind. Sind sie da, gewinnt
   * deren Antwort - siehe KONZEPT-shops.md, Abschnitt 3.
   */
  MONITORE: "monitore",

  /** Kennung des Marktbuch-Journals. Wird beim ersten Kauf angelegt. */
  MARKTBUCH: "marktbuch"
};

/**
 * Ein Kauf laeuft immer ueber den Spielleiter - ein Spieler kann auf einem
 * fremden Akteur nichts anlegen oder loeschen. Dieselbe Bauweise wie der
 * Tausch in den In-Person Tools, und aus demselben Grund.
 */
export const SOCKET = {
  NAME: `module.${MODULE_ID}`,
  KAUFEN: "kaufen",     // Spieler -> Spielleiter
  ZEIGEN: "zeigen",     // Spielleiter -> Spieler: Laden oeffnen
  SCHLIESSEN: "schliessen",
  STAND: "stand"        // Spielleiter -> alle offenen Fenster: neuer Bestand
};

/** Kaufmodus je Laden. Ab Werk "freigabe". */
export const KAUFMODUS = {
  GESPERRT: "gesperrt",   // ansehen ja, kaufen nein
  FREIGABE: "freigabe",   // Spieler fragt, Spielleiter bestaetigt
  DIREKT: "direkt"        // geht durch, sobald das Geld reicht
};
