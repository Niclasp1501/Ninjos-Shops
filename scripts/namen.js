/**
 * Wie jemand am Tisch heißt.
 *
 * **Die Figur zuerst, das Konto klein daneben.** Bis zum 04.10.2026 standen
 * beim Vorzeigen, im Angebot und in der Besucherliste die Anmeldenamen der
 * Konten. Am Tisch denkt die Spielleitung aber in Figuren: „Zeig Nadylos den
 * Laden", nicht „zeig Nina den Laden", und bei einem Konto wie „Testnutzer2"
 * wusste niemand mehr, wer dahintersteckt. Am Tisch gemeldet.
 *
 * Hat ein Konto keine Figur, etwa ein Monitor, bleibt der Anmeldename stehen.
 */

const esc = t => foundry.utils.escapeHTML(String(t ?? ""));

/** Der Name der zugewiesenen Figur, oder `null`. */
export function figurVon(benutzer) {
  return benutzer?.character?.name ?? null;
}

/** Als HTML: Figur, dahinter klein das Konto. Ohne Figur nur das Konto. */
export function namenHtml(benutzer) {
  const figur = figurVon(benutzer);
  return figur
    ? `<span class="shops-figurname">${esc(figur)}</span> <em class="shops-anmeldename">${esc(benutzer.name)}</em>`
    : `<span class="shops-figurname">${esc(benutzer?.name)}</span>`;
}
