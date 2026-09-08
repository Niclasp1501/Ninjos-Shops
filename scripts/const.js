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
 *
 * Gepflegt wird die Liste nicht von Hand, sondern aus `haendlerUuid` heraus -
 * siehe verknuepfung.js. Noten stehen dort bewusst nicht: Foundry gibt einer
 * Note kein Bedienfeld, an das sich ein Knopf haengen liesse.
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

/**
 * Das Zeichen des Ladentyps - im Anlegen-Dialog und im Verzeichnis.
 *
 * Eigene Datei und kein Kernsymbol: dnd5e zeichnet die Akteurstypen als
 * einfarbige Silhouetten (`systems/dnd5e/icons/svg/actors/`), und ein
 * gewoehnliches Bild in dieser Reihe sieht aus wie ein Fehler. Ohne Eintrag
 * bekommt ein fremder Untertyp dort dnd5es Kapuzenmaennchen - dasselbe Bild
 * wie ein namenloser NSC.
 */
export const LADEN_SYMBOL = `modules/${MODULE_ID}/assets/laden.svg`;

export const SETTINGS = {
  /**
   * Der eine Schalter, dessen Antwort man kennen muss, bevor man das Modul
   * einschaltet - deshalb steht er in der Hauptliste und nicht auf einer
   * Unterseite. Ab Werk aus: Ein Laden wird vorgezeigt, nicht aufgesucht.
   */
  SPIELER_DUERFEN_OEFFNEN: "spielerDuerfenOeffnen",

  /**
   * Welche Knoepfe im Akteursverzeichnis stehen: `beide`, `neu`, `buch`,
   * `keine`. Nicht jeder Tisch will eine fremde Leiste in seinem Verzeichnis.
   */
  VERZEICHNISLEISTE: "verzeichnisleiste",

  /** Takt der Schauansicht in Sekunden. */
  BLAETTERTAKT: "blaettertakt",

  /**
   * Wie die Schauansicht leuchtet: `"dunkel"` oder `"pergament"`.
   *
   * Ein dunkler Schirm blendet im abgedunkelten Wohnzimmer nicht - ein heller
   * ist auf einem Fernseher bei Tageslicht besser zu lesen. Beides ist
   * richtig, je nach Raum, und der Raum kennt nur der Tisch.
   */
  SCHAU_LICHT: "schauLicht",

  /**
   * Monitore, wenn die In-Person Tools nicht da sind. Sind sie da, gewinnt
   * deren Antwort - siehe KONZEPT-shops.md, Abschnitt 3.
   */
  MONITORE: "monitore",

  /** Kennung des Marktbuch-Journals. Wird beim ersten Kauf angelegt. */
  MARKTBUCH: "marktbuch",

  /**
   * Der Tausch zwischen zwei Spielern - zugezogen aus den In-Person Tools.
   * Drei Schalter, wie drueben: ob es ihn gibt, ob die Spielleitung
   * mittauschen darf, und ob jeder Tausch im Chat angesagt wird.
   */
  TAUSCH: "tausch",
  TAUSCH_MIT_GM: "tauschMitGm",
  TAUSCH_ANSAGE: "tauschAnsage"
};

/**
 * Ein Kauf laeuft immer ueber den Spielleiter - ein Spieler kann auf einem
 * fremden Akteur nichts anlegen oder loeschen. Dieselbe Bauweise wie der
 * Tausch in den In-Person Tools, und aus demselben Grund.
 */
export const SOCKET = {
  NAME: `module.${MODULE_ID}`,
  KAUFEN: "kaufen",     // Spieler -> Spielleiter: bitte kaufen
  VERKAUFEN: "verkaufen", // Spieler -> Spielleiter: bitte ankaufen (angehakte Ware)
  ANFRAGE: "anfrage",   // beide Richtungen: die Verkaufsanfrage und ihr Zustand
  ANTWORT: "antwort",   // Spielleiter -> Spieler: ging durch, oder warum nicht
  ZEIGEN: "zeigen",     // Spielleiter -> Spieler: Laden oeffnen
  SCHLIESSEN: "schliessen",
  STAND: "stand",       // Spielleiter -> alle offenen Fenster: neuer Bestand
  ANGEBOT: "angebot",   // Spielleiter -> Spieler: Ware zum Sonderpreis
  AUSLAGE: "auslage",   // Spielleiter -> Spieler: die Auslage als Datenpaket
  VORSITZ: "vorsitz",   // Spielleitung untereinander: wer fuehrt diese Bitte aus
  HANDEL: "handel",     // Handel mit einer Person ohne Laden
  TAUSCH: "tausch",     // Tausch zwischen zwei Spielern
  SCHAU: "schau"        // Spielleitung -> Schirme: welche Seite gerade steht
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
  /**
   * Wann ein Stueck unter der Theke hervorgeholt wurde, als Zeitstempel.
   *
   * Ware, die eben noch verborgen war und jetzt in der Auslage steht, ist
   * fuer den Spieler etwas anderes als Ware, die immer dalag - sie ist
   * gerade erst hervorgeholt worden, und das soll man sehen. Gesetzt wird
   * es beim Sichtbarmachen, geloescht beim Verbergen.
   */
  HERVORGEHOLT: "hervorgeholt",
  /** Dienstleistung: kostet Geld, wechselt nicht den Besitzer. */
  DIENST: "dienst",
  /**
   * Kauft der Laden **dieses** wieder an, ohne zu fragen?
   *
   * Der Ankaufsfaktor allein reicht dafuer nicht: Ein Kraeuterhaendler mag
   * Traenke zurueckkaufen und trotzdem kein Langschwert wollen. Angehaktes
   * geht sofort durch, alles andere ueber eine Anfrage mit Preisvorschlag.
   */
  ANKAUF: "ankauf"
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
