# Ninjo's Shops

**Status:** Konzept und Gerüst. Noch nicht benutzbar, noch nicht veröffentlicht.

Läden, die der Spielleiter **vorzeigt**, statt sie suchen zu lassen. Ein Laden
ist ein NSC oder ein Ort mit Ware im Inventar; wer ihn zu sehen bekommt,
entscheidet der Spielleiter — an alle, an einzelne Spieler, oder groß auf den
Bildschirm am Tisch.

Was gebaut wird und warum es so gebaut wird, steht vollständig in
**[KONZEPT-shops.md](KONZEPT-shops.md)**. Wer hier mitarbeitet, liest
zusätzlich [AGENTS.md](AGENTS.md).

## Was schon steht

- **Der Laden selbst** — ein eigener Dokumenttyp, kein Merkmal auf einem NSC.
  Er steht als Eintrag „Laden" im Akteursverzeichnis, hält echte Gegenstände,
  liegt in Ordnern — und hat keine Trefferpunkte, weil ein Regal keine braucht.
- **Der Ladenbogen** — Ware hineinziehen, Aufschlag oder Festpreis je Stück,
  eine Hinweiszeile des Händlers, Verborgenes unter der Theke,
  Dienstleistungen, die kein Gegenstand sind.
- **Preisrechnung** (`scripts/preise.js`) — Aufschlag, Festpreis, Umrechnung in
  Kupfer. Umgeht die Falle in dnd5es eigenem `valueInGP`.
- **Kasse** (`scripts/kasse.js`) — bezahlen mit Wechselgeld. Ein Platinstück
  kauft einen Dolch.
- **43 Tests** dafür: `node tools/kasse.test.mjs`

## Was noch fehlt

Das Vorzeigen und das Spielerfenster, der Kauf über den Spielleiter samt
Marktbuch, die Schauansicht für den Monitor. Reihenfolge in Abschnitt 11 des
Konzepts.

Und: Der Bogen hat noch in keiner Welt gelaufen. Geschrieben ist er,
ausprobiert nicht.

---

## 🇬🇧 English

**Status:** concept and scaffold. Not usable yet, not published.

Shops the gamemaster **shows** rather than the players find. A shop is an NPC or
a place with goods in its inventory; who gets to see it is the gamemaster's
call — everyone, single players, or large on the table's display.

The full design rationale is in `KONZEPT-shops.md` (German). A shop is a
Document sub-type of its own (`ninjos-shops.laden`), not a flag on an NPC.
Price calculation, the till and the shop sheet are written; showing a shop,
buying from it and the display view are not — and nothing has run in a live
world yet.
