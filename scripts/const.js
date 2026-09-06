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

/**
 * Standardbild eines neuen Ladens.
 *
 * Aus dem Kern von Foundry (`icons/environment/settlement/`), damit nichts
 * mitgeliefert werden muss und das Bild in jeder Installation da ist. Ohne
 * diese Vorgabe traegt jeder neue Laden das Kapuzenmaennchen, das Foundry
 * fuer Akteure ohne Bild einsetzt - an einem Marktstand sieht das falsch aus.
 */
export const LADEN_BILD = "icons/environment/settlement/market-stall.webp";

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
  KAUFEN: "kaufen",     // Spieler -> Spielleiter: bitte kaufen
  ANTWORT: "antwort",   // Spielleiter -> Spieler: ging durch, oder warum nicht
  ZEIGEN: "zeigen",     // Spielleiter -> Spieler: Laden oeffnen
  SCHLIESSEN: "schliessen",
  STAND: "stand",       // Spielleiter -> alle offenen Fenster: neuer Bestand
  ANGEBOT: "angebot",   // Spielleiter -> Spieler: Ware zum Sonderpreis
  AUSLAGE: "auslage"    // Spielleiter -> Spieler: die Auslage als Datenpaket
};

/**
 * User-Flag: das offene Angebot an diesen Benutzer.
 *
 * `{ ladenUuid, itemId, menge, preisCp, text }`. Es liegt auf dem Benutzer und
 * nicht im Fenster, damit es einen Neuladen ueberlebt - ein Angebot, das beim
 * Verbindungsabbruch verschwindet, muesste die Spielleitung neu schicken und
 * merkt es nicht einmal.
 */
export const OFFENES_ANGEBOT = "angebot";

/**
 * Merkmale an einer Ware im Ladeninventar (flags.ninjos-shops.*).
 *
 * Eine Zeichenkette an einer Stelle: Ein Tippfehler legt sonst still ein
 * zweites, leeres Merkmal an und die Auslage reagiert auf nichts.
 */
export const WARE = {
  /** Festpreis in Kupfer; fehlt = Aufschlag auf den Grundpreis. */
  FESTPREIS: "festpreis",
  /** Ein Satz des Haendlers unter dem Namen. */
  HINWEIS: "hinweis",
  /** Unter der Theke - Spieler sehen es nicht. */
  VERBORGEN: "verborgen",
  /** Dienstleistung: kostet Geld, wechselt nicht den Besitzer. */
  DIENST: "dienst"
};

/**
 * User-Flag: UUID des Ladens, den dieser Benutzer gerade vorgezeigt bekommt.
 *
 * Ein geoeffneter Laden bleibt offen bis zum Schliessen - auch nach einem
 * Neuladen des Clients (KONZEPT-shops.md, Abschnitt 6). Immer nur einer:
 * ein neuer ersetzt den vorherigen.
 */
export const OFFENER_LADEN = "offenerLaden";


/** Kaufmodus je Laden. Ab Werk "freigabe". */
export const KAUFMODUS = {
  GESPERRT: "gesperrt",   // ansehen ja, kaufen nein
  FREIGABE: "freigabe",   // Spieler fragt, Spielleiter bestaetigt
  DIREKT: "direkt"        // geht durch, sobald das Geld reicht
};

/**
 * Kopfbild eines Ladens.
 *
 * Der Akteur bringt mit `img` genau ein Bild mit, und das ist hier das
 * **Ladeninnere**: breit, quer, oben im Fenster. Was fehlt, ist die Angabe,
 * *welcher* Ausschnitt zu sehen sein soll - ein Innenraum ist selten in der
 * Mitte am interessantesten. Dafuer steht `system.kopfFokus` (0-100 %).
 */
export const BANNER_HOEHE = 132;
