/**
 * Angebote: Die Spielleitung legt jemandem etwas zum Sonderpreis hin.
 *
 * Der Unterschied zum gewoehnlichen Kauf ist die Richtung. Sonst sucht der
 * Spieler etwas aus und die Spielleitung bestaetigt; hier sagt die
 * Spielleitung *„das hier, fuer so viel"* und der Spieler kann zugreifen. Das
 * ist die Bewegung, die am Tisch tatsaechlich vorkommt - der Haendler macht
 * einen Preis, weil die Gruppe ihm den Keller ausgeraeumt hat.
 *
 * **Der Preis steht auf dem Benutzer, nicht in der Nachricht.** Die Antwort
 * des Spielers kommt von seinem Client; stuende der Preis darin, koennte er
 * sich jeden beliebigen schicken. Das Angebot liegt deshalb als Merkmal auf
 * dem Benutzerdokument, das nur die Spielleitung schreibt, und `kauf.js` liest
 * es von dort.
 *
 * Es ueberlebt damit auch einen Neuladen - ein Angebot, das bei einem
 * Verbindungsabbruch verschwindet, muesste neu geschickt werden, und die
 * Spielleitung merkt nicht einmal, dass es weg ist.
 */

import { MODULE_ID, SOCKET, OFFENES_ANGEBOT, WARE, LADEN_TYP } from "./const.js";
import { grundpreisCp, preisCp, alsText, alsMuenzfeld, KUPFERWERT } from "./preise.js";

const kuerzel = s => game.i18n.localize(`SHOPS.Muenze.${s}`);

/** Wer hat diesen Laden gerade offen? Aus vorzeigen.js, ohne Ringschluss. */
function zuschauer(ladenUuid) {
  return game.users.filter(u => u.getFlag(MODULE_ID, "offenerLaden") === ladenUuid);
}

/**
 * Der Dialog: an wen, wie viele, zu welchem Preis.
 *
 * Vorbelegt mit dem Ladenpreis - der haeufigste Fall ist ein Nachlass darauf,
 * nicht eine Zahl aus dem Nichts. Und vorbelegt mit den Leuten, die den Laden
 * gerade offen haben: Ein Angebot an jemanden, der gar nicht hinsieht, ist
 * eine Nachricht ins Leere.
 */
export async function angebotDialog(laden, item) {
  const system = laden.system;
  const regulaerCp = preisCp(
    grundpreisCp(item.system?.price), system,
    Number.isFinite(item.flags?.[MODULE_ID]?.[WARE.FESTPREIS])
      ? item.flags[MODULE_ID][WARE.FESTPREIS] : null
  );
  const feld = alsMuenzfeld(regulaerCp);

  const sehen = new Set(zuschauer(laden.uuid).map(u => u.id));
  const leute = game.users.filter(u => !u.isGM && u.active);
  if (!leute.length) {
    ui.notifications.warn(game.i18n.localize("SHOPS.Vorzeigen.NiemandDa"));
    return null;
  }

  const zeilen = leute.map(u => `
    <label class="shops-wahl-zeile">
      <input type="checkbox" name="user" value="${u.id}" ${sehen.has(u.id) ? "checked" : ""}>
      <span>${foundry.utils.escapeHTML(u.name)}</span>
      ${sehen.has(u.id) ? `<em class="shops-sieht">${game.i18n.localize("SHOPS.Angebot.SiehtDenLaden")}</em>` : ""}
    </label>`).join("");

  const muenzen = Object.keys(KUPFERWERT).map(s =>
    `<option value="${s}" ${s === feld.denomination ? "selected" : ""}>${kuerzel(s)}</option>`).join("");

  const inhalt = `
    <div class="shops-angebot-dialog">
      <p class="shops-blockhinweis">${game.i18n.format("SHOPS.Angebot.Erklaerung", {
        name: foundry.utils.escapeHTML(item.name),
        preis: alsText(regulaerCp, kuerzel)
      })}</p>

      <div class="shops-angebot-felder">
        <label>
          <span>${game.i18n.localize("SHOPS.Angebot.Menge")}</span>
          <input type="number" name="menge" value="1" min="1" step="1">
        </label>
        <label>
          <span>${game.i18n.localize("SHOPS.Angebot.Preis")}</span>
          <span class="shops-preisfeld">
            <input type="number" name="preis" value="${feld.value}" min="0" step="1">
            <select name="sorte">${muenzen}</select>
          </span>
        </label>
      </div>

      <label class="shops-angebot-text">
        <span>${game.i18n.localize("SHOPS.Angebot.Text")}</span>
        <input type="text" name="text" placeholder="${game.i18n.localize("SHOPS.Angebot.TextPlatzhalter")}">
      </label>

      <p class="shops-blockhinweis">${game.i18n.localize("SHOPS.Angebot.AnWen")}</p>
      ${zeilen}
    </div>`;

  const antwort = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.format("SHOPS.Angebot.Titel", { name: item.name }) },
    classes: ["ninjos-shops"],
    position: { width: 460 },
    content: inhalt,
    buttons: [
      {
        action: "senden",
        label: game.i18n.localize("SHOPS.Angebot.Senden"),
        icon: "fa-solid fa-hand-holding",
        default: true,
        callback: (_e, _k, dialog) => {
          const w = dialog.element;
          return {
            an: [...w.querySelectorAll('input[name="user"]:checked')].map(i => i.value),
            menge: Math.max(1, Number(w.querySelector('[name="menge"]').value) || 1),
            preisCp: grundpreisCp({
              value: Number(w.querySelector('[name="preis"]').value) || 0,
              denomination: w.querySelector('[name="sorte"]').value
            }),
            text: w.querySelector('[name="text"]').value.trim()
          };
        }
      },
      { action: "abbrechen", label: game.i18n.localize("SHOPS.Abbrechen"), icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });

  if (!antwort || antwort === "abbrechen") return null;
  if (!antwort.an?.length) {
    ui.notifications.warn(game.i18n.localize("SHOPS.Angebot.NiemandGewaehlt"));
    return null;
  }
  return antwort;
}

/**
 * Das Angebot ablegen und die Empfaenger benachrichtigen.
 *
 * Ein neues Angebot ersetzt ein altes - aus demselben Grund, aus dem es nur
 * einen offenen Laden je Spieler gibt: Zwei gleichzeitige Angebote verdoppeln
 * jede Frage danach, welches gemeint war.
 */
export async function angebotSenden(laden, item, { an, menge, preisCp: preis, text }) {
  if (!game.user.isGM) return;
  if (laden?.type !== LADEN_TYP || !item) return;

  const angebot = {
    ladenUuid: laden.uuid,
    itemId: item.id,
    menge: Math.max(1, Math.floor(menge)),
    preisCp: Math.max(0, Math.round(preis)),
    text: String(text ?? "").slice(0, 200),
    von: game.user.name
  };

  for (const id of an) {
    const benutzer = game.users.get(id);
    if (benutzer) await benutzer.setFlag(MODULE_ID, OFFENES_ANGEBOT, angebot);
  }

  const paket = { typ: SOCKET.ANGEBOT, an, angebot };
  game.socket.emit(SOCKET.NAME, paket);
  if (an.includes(game.user.id)) aufAngebot(paket);

  ui.notifications.info(game.i18n.format("SHOPS.Angebot.Verschickt", {
    anzahl: an.length, name: item.name, preis: alsText(angebot.preisCp * angebot.menge, kuerzel)
  }));
}

/** Ein Angebot zuruecknehmen. */
export async function angebotZuruecknehmen(benutzerId) {
  if (!game.user.isGM) return;
  const benutzer = game.users.get(benutzerId);
  if (!benutzer) return;
  await benutzer.unsetFlag(MODULE_ID, OFFENES_ANGEBOT);
  const paket = { typ: SOCKET.ANGEBOT, an: [benutzerId], angebot: null };
  game.socket.emit(SOCKET.NAME, paket);
  if (benutzerId === game.user.id) aufAngebot(paket);
}

/** Empfang auf dem Client: das Fenster neu zeichnen, damit es auftaucht. */
export function aufAngebot({ an }) {
  if (Array.isArray(an) && !an.includes(game.user.id)) return;
  const fenster = foundry.applications.instances.get(`${MODULE_ID}-spieler`);
  fenster?.render(false);
}

/** Das offene Angebot dieses Benutzers, aufbereitet fuer die Anzeige. */
export function eigenesAngebot(ladenUuid) {
  const angebot = game.user.getFlag(MODULE_ID, OFFENES_ANGEBOT);
  if (!angebot || angebot.ladenUuid !== ladenUuid) return null;
  return {
    ...angebot,
    summeText: alsText(angebot.preisCp * angebot.menge, kuerzel),
    einzelText: alsText(angebot.preisCp, kuerzel)
  };
}
