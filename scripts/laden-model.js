/**
 * Das Datenmodell eines Ladens.
 *
 * Ein Laden ist ein Akteur vom Untertyp `ninjos-shops.laden` - ein eigenes
 * Dokument, kein Merkmal auf einem NSC. Warum, steht in KONZEPT-shops.md,
 * Abschnitt 4.
 *
 * **Der Gewinn gegenueber Flags steht in dieser Datei.** Ein Flag nimmt alles
 * an, was man hineinschreibt: Ein `aufschlag: "1,2"` mit Komma statt Punkt
 * faellt nirgends auf, es rechnet nur still falsch - und zwar zugunsten des
 * Kunden, weil `Number("1,2")` NaN ergibt und die Preisrechnung dann auf den
 * Grundpreis zurueckfaellt. Ein `NumberField` weist das beim Schreiben ab.
 *
 * Die Felder heissen wie im Konzept. Wer hier eines umbenennt, benennt es in
 * jeder bestehenden Welt nicht mit um - dafuer braeuchte es eine Migration.
 */

import { LADEN_TYP, LADEN_BILD, LADEN_SYMBOL, KAUFMODUS } from "./const.js";
import { KUPFERWERT } from "./preise.js";

const { StringField, NumberField, BooleanField, SchemaField, HTMLField, SetField } =
  foundry.data.fields;

/**
 * Die erlaubten Kaufmodi - aus const.js, nicht hier abgeschrieben. Zwei Listen
 * derselben drei Woerter laufen auseinander, sobald jemand einen vierten Modus
 * hinzufuegt, und das Feld nimmt ihn dann als ungueltig nicht an.
 */
const KAUFMODUS_WERTE = Object.values(KAUFMODUS);

/**
 * Die Kasse eines Ladens: fuenf ganze Zahlen, keine negativen.
 *
 * Eigene Felder statt `system.currency` von dnd5e - das gehoert dem System und
 * haengt an dessen Akteurstypen. Die Muenzsorten sind dieselben, und
 * `kasse.js` rechnet ohnehin nur mit `{ pp, gp, ep, sp, cp }`, egal woher das
 * Objekt kommt.
 */
function kassenFelder() {
  const felder = {};
  for (const sorte of Object.keys(KUPFERWERT)) {
    felder[sorte] = new NumberField({
      required: true, nullable: false, integer: true, min: 0, initial: 0
    });
  }
  return felder;
}

export class LadenModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      /**
       * Faktor auf den Grundpreis. `min: 0` und nicht `min: 0.01`: Ein Laden
       * mit Aufschlag 0 verschenkt alles, und das ist eine gueltige Szene -
       * die Ausruestungskammer der Garde etwa.
       */
      aufschlag: new NumberField({
        required: true, nullable: false, min: 0, initial: 1.2, step: 0.05
      }),

      /**
       * Was der Laden beim Ankauf zahlt, als Faktor auf den Grundpreis.
       * **0 heisst "kauft nichts an" und ist der Werkszustand** - ein Laden,
       * der ungefragt alles aufkauft, ist die haeufigste Art, wie eine Gruppe
       * ein Dorf ausraeumt.
       */
      ankauf: new NumberField({
        required: true, nullable: false, min: 0, initial: 0, step: 0.05
      }),

      /**
       * Aus: unbegrenztes Geld, der Normalfall, macht keine Arbeit.
       * An: zahlt aus `kasse` und kann leer werden. Der Unterschied zwischen
       * einem Requisit und einem Ort - siehe Konzept, Abschnitt 4.
       */
      eigeneKasse: new BooleanField({ initial: false }),
      kasse: new SchemaField(kassenFelder()),

      /** Stueck je Kauf. 0 = ohne Begrenzung. Gegen das leergekaufte Dorf. */
      hoechstmenge: new NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0
      }),

      kaufmodus: new StringField({
        required: true, nullable: false,
        choices: KAUFMODUS_WERTE, initial: "freigabe"
      }),

      /**
       * Ein bis zwei Saetze, die oben im Fenster stehen. HTMLField, weil der
       * Editor hier ohnehin einen Absatz erzeugt - und weil im Manifest
       * `htmlFields: ["begruessung"]` steht, damit Foundry den Inhalt beim
       * Import bereinigt.
       */
      begruessung: new HTMLField({ required: true, initial: "" }),

      /**
       * Welcher Teil des Kopfbildes zu sehen ist, senkrecht, in Prozent.
       *
       * Das Bild des Akteurs ist das Ladeninnere und laeuft oben als breiter
       * Streifen. Ein Innenraum ist selten in der Mitte am interessantesten -
       * mal steht der Tresen unten, mal haengt die Ware oben. 50 bedeutet
       * Mitte, 0 oben, 100 unten; die Zahl geht direkt als
       * `object-position` in die Anzeige.
       */
      kopfFokus: new NumberField({
        required: true, nullable: false, min: 0, max: 100, initial: 50, step: 1
      }),

      /**
       * Wer diesen Laden **selbst** aufmachen darf.
       *
       * Das ist ausdruecklich **nicht** Foundrys Rechtesystem. Ein
       * Besitzrecht auf dem Akteur wuerde den Laden im Akteursverzeichnis des
       * Spielers erscheinen lassen und ihm den Spielleiterbogen oeffnen -
       * samt verborgener Ware und Ankaufsfaktor. Genau das soll nie
       * passieren, deshalb fuehrt das Modul seine eigene Liste.
       *
       * Das Vorzeigen durch die Spielleitung ist davon unberuehrt: Sie darf
       * jederzeit jedem jeden Laden zeigen. Diese Liste beantwortet nur die
       * andere Frage - an welchen Laden ein Spieler von sich aus herankommt.
       *
       * `szenen` ist fuer die spaetere Bindung an die sichtbare Szene
       * vorgesehen und wird heute von nichts gelesen. Das Feld steht schon
       * hier, weil ein spaeter ergaenztes Feld in bestehenden Welten fehlt.
       */
      zugriff: new SchemaField({
        modus: new StringField({
          required: true, nullable: false,
          choices: ["niemand", "auswahl", "alle"], initial: "niemand"
        }),
        benutzer: new SetField(new StringField()),
        szenen: new SetField(new StringField())
      })
    };
  }

  /**
   * Ist dieser Laden gerade benutzbar?
   *
   * Ein gesperrter Laden ist keiner, der nichts taugt - er ist einer, den die
   * Spielleitung am Tisch selbst bedient. Ansehen geht immer.
   */
  get verkauftEtwas() {
    return this.kaufmodus !== "gesperrt";
  }

  /**
   * Darf dieser Benutzer den Laden von sich aus oeffnen?
   *
   * Die Spielleitung immer - sie haelt ohnehin die Wahrheit. Sonst
   * entscheidet die eigene Liste, und zusaetzlich muss der weltweite Schalter
   * es erlauben; der ist die uebergeordnete Antwort auf dieselbe Frage.
   */
  darfSelbstOeffnen(benutzer) {
    if (benutzer?.isGM) return true;
    if (this.zugriff.modus === "alle") return true;
    if (this.zugriff.modus === "auswahl") return this.zugriff.benutzer.has(benutzer?.id);
    return false;
  }

  /** Kauft dieser Laden an? */
  get kauftAn() {
    return this.ankauf > 0;
  }
}

/**
 * Untertyp und Bogen anmelden. Gehoert in `init` - danach ist es zu spaet,
 * Foundry hat die Dokumentklassen dann bereits gebaut.
 */
export function ladenTypEinrichten() {
  Object.assign(CONFIG.Actor.dataModels, { [LADEN_TYP]: LadenModel });

  /*
   * Das Symbol im "Akteur erstellen"-Dialog und im Verzeichnis. Ohne diesen
   * Eintrag bekommt ein fremder Untertyp Foundrys Kapuzenmaennchen - dasselbe
   * Bild wie ein namenloser NSC, und in einer Liste aus sechs Typen ist der
   * Laden dann der einzige ohne eigenes Zeichen.
   *
   * Dieselbe Waage wie in der Fensterleiste und auf den Knoepfen: Das Symbol
   * des Haendlers, und es gab sie schon, als es noch keine Ladenmarkisen gab.
   */
  CONFIG.Actor.typeIcons ??= {};
  CONFIG.Actor.typeIcons[LADEN_TYP] = "fa-solid fa-scale-balanced";

  /*
   * dnd5e zeichnet die Typen im Anlegen-Dialog nicht aus `typeIcons`, sondern
   * aus `CONFIG.DND5E.defaultArtwork.Actor` - als `<dnd5e-icon src="...">`.
   * Ohne Eintrag greift dort sein Rueckfall `documents/actor.svg`, also das
   * Kapuzenmaennchen. Der Zugriff ist abgesichert: Laeuft ein anderes System,
   * gibt es diesen Zweig nicht, und `typeIcons` oben traegt dann allein.
   */
  const dnd5e = CONFIG.DND5E?.defaultArtwork?.Actor;
  if (dnd5e) dnd5e[LADEN_TYP] = LADEN_SYMBOL;
}

/**
 * Neue Laeden bekommen ihr eigenes Bild - und ein Token, das dazu passt.
 *
 * Ueber `preCreateActor` und nicht ueber `getDefaultArtwork`: Letzteres ist
 * eine statische Methode der Akteursklasse, die zu ueberschreiben hiesse, an
 * einer Kernklasse zu drehen, die auch dem System und anderen Modulen gehoert.
 * Der Hook kommt fruegh genug und geht niemandem in die Quere.
 *
 * **`actorLink: true` ist der eigentliche Grund, warum das hier steht.** Ohne
 * die Verknuepfung bekaeme jedes Token auf der Karte eine eigene Kopie des
 * Inventars - zwei Marktstaende desselben Ladens haetten getrennte Bestaende,
 * und ein Kauf am einen liesse den anderen unberuehrt. Ein Laden ist ein Ort,
 * kein Rudel.
 *
 * Der Laden darf auf die Karte, muss aber nicht: Wer einen Marktstand am Hafen
 * zeigen will, stellt ihn hin; wer nicht, laesst es. Am Rechtemodell aendert
 * das nichts - vorgezeigt wird er weiterhin nur von der Spielleitung.
 */
export function ladenBilderEinrichten() {
  Hooks.on("preCreateActor", (dokument, daten) => {
    if (daten?.type !== LADEN_TYP) return;
    const aenderung = {};

    /*
     * Rechte ausdruecklich auf NONE. Ohne diese Zeile haengt es davon ab, was
     * die Welt als Voreinstellung fuer neue Akteure fuehrt - und ein Laden,
     * der im Akteursverzeichnis der Spieler auftaucht, gibt den
     * Spielleiterbogen mit verborgener Ware und Ankaufsfaktor preis. Wer
     * Zugriff regeln will, nimmt `system.zugriff`, nicht die Besitzrechte.
     */
    aenderung.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };

    if (!daten.img) aenderung.img = LADEN_BILD;
    if (!daten.prototypeToken?.texture?.src) {
      aenderung.prototypeToken = {
        texture: { src: LADEN_BILD },
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
        sight: { enabled: false }
      };
    }
    if (Object.keys(aenderung).length) dokument.updateSource(aenderung);
  });
}
