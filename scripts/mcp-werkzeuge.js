/**
 * Werkzeuge, die dieses Modul dem Sprachmodell über Ninjo's Foundry MCP anbietet.
 *
 * Warum hier und nicht dort: Preise, Ankaufsfaktoren und das Ladenbuch sind
 * Regeln **dieses** Moduls. Lägen die Werkzeuge im MCP-Server, müsste er sie
 * nachbauen — und liefe beim nächsten Umbau hier daneben. So rechnet jede
 * Auskunft mit `preisCp` und `ankaufCp`, also mit derselben Rechnung, die auch
 * die Auslage zeigt.
 *
 * Vorerst wird nur gelesen. Einbuchen und Verkaufen greifen in Bestand und
 * Ladenbuch ein; die kommen erst, wenn das Modul einmal am Tisch gelaufen ist.
 *
 * Damit überhaupt etwas passiert, muss `ninjos-shops` in den Einstellungen von
 * Ninjo's Foundry MCP unter „Module mit eigenen Werkzeugen" stehen. Ohne das
 * lehnt die Brücke die Anmeldung ab und schreibt den Grund ins Protokoll.
 */
import { MODULE_ID, LADEN_TYP, WARE } from "./const.js";
import { grundpreisCp, preisCp, ankaufCp, alsText } from "./preise.js";
import { zeilenFuer } from "./ladenbuch.js";

const MCP_MODUL = "ninjos-foundry-mcp";

/** Alle Läden der Welt. */
function laeden() {
  return game.actors.filter(a => a.type === LADEN_TYP);
}

/** Einen Laden über Name oder UUID finden — Name zuerst exakt, dann als Teiltext. */
function ladenFinden(bezeichnung) {
  const alle = laeden();
  const gesucht = String(bezeichnung ?? "").trim();
  if (!gesucht) throw new Error("Es fehlt der Laden.");

  const ueberUuid = alle.find(l => l.uuid === gesucht || l.id === gesucht);
  if (ueberUuid) return ueberUuid;

  const exakt = alle.filter(l => l.name === gesucht);
  if (exakt.length === 1) return exakt[0];
  if (exakt.length > 1) {
    throw new Error(
      `"${gesucht}" gibt es ${exakt.length}-mal. Bitte die UUID nehmen: ` +
        exakt.map(l => l.uuid).join(", ")
    );
  }

  const teil = alle.filter(l => l.name.toLowerCase().includes(gesucht.toLowerCase()));
  if (teil.length === 1) return teil[0];
  if (teil.length > 1) {
    throw new Error(
      `"${gesucht}" passt auf mehrere Läden: ` + teil.map(l => l.name).join(", ")
    );
  }
  throw new Error(`Kein Laden "${gesucht}" gefunden.`);
}

/** Eine Ware mit dem Preis, den der Laden dafür nimmt. */
function ware(laden, item) {
  const merkmal = k => item.getFlag(MODULE_ID, k);
  const grund = grundpreisCp(item.system?.price);
  const festpreis = merkmal(WARE.FESTPREIS);

  return {
    id: item.id,
    name: item.name,
    menge: item.system?.quantity ?? 1,
    grundpreis: alsText(grund),
    verkaufspreis: alsText(preisCp(grund, laden, festpreis ?? null)),
    ankaufspreis: alsText(ankaufCp(grund, laden)),
    festpreis: festpreis != null,
    hinweis: merkmal(WARE.HINWEIS) ?? null,
    verborgen: merkmal(WARE.VERBORGEN) === true,
    dienstleistung: merkmal(WARE.DIENST) === true,
    kauftDasAn: merkmal(WARE.ANKAUF) === true
  };
}

const WERKZEUGE = [
  {
    name: "laden-liste",
    description:
      "List the shops in this world: name, uuid and how many goods each holds. " +
      "Use this first to find the shop you mean.",
    inputSchema: { type: "object", properties: {} },
    handler: async () =>
      laeden().map(l => ({
        name: l.name,
        uuid: l.uuid,
        waren: l.items.size
      }))
  },
  {
    name: "laden-auslage",
    description:
      "What a shop sells and what it charges. Prices are computed with the shop's " +
      "own rules — its markup, its buy-in factor and any fixed price set on a single " +
      "item — so they match what a player sees. Also reports which goods are hidden " +
      "under the counter, which are services, and which the shop buys back without asking.",
    inputSchema: {
      type: "object",
      properties: {
        laden: { type: "string", description: "Shop name or uuid" },
        auchVerborgene: {
          type: "boolean",
          description: "Include goods kept under the counter (GM view). Default true."
        }
      },
      required: ["laden"]
    },
    handler: async ({ laden: bezeichnung, auchVerborgene = true }) => {
      const laden = ladenFinden(bezeichnung);
      const waren = laden.items.contents
        .map(i => ware(laden, i))
        .filter(w => auchVerborgene || !w.verborgen);
      return { laden: laden.name, uuid: laden.uuid, anzahl: waren.length, waren };
    }
  },
  {
    name: "laden-buch",
    description:
      "The ledger of a shop: what was bought and sold there. Use it to see how a " +
      "shop has been doing, or to check what a party spent.",
    inputSchema: {
      type: "object",
      properties: { laden: { type: "string", description: "Shop name or uuid" } },
      required: ["laden"]
    },
    handler: async ({ laden: bezeichnung }) => {
      const laden = ladenFinden(bezeichnung);
      const zeilen = zeilenFuer(laden, game.user);
      return { laden: laden.name, uuid: laden.uuid, eintraege: zeilen.length, zeilen };
    }
  }
];

/**
 * Beim Hochfahren einhängen. Der Hook wird von Ninjo's Foundry MCP gerufen,
 * nachdem dessen Einstellungen stehen — fehlt das Modul, passiert schlicht nichts.
 */
export function mcpWerkzeugeEinrichten() {
  Hooks.on(`${MCP_MODUL}.registerTools`, anmelden => {
    for (const w of WERKZEUGE) anmelden(MODULE_ID, w);
  });
}
