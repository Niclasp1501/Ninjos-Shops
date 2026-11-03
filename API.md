# Ninjo's DnD Shops & Trade API for add-on modules

Shops exposes one object for other modules: `game.modules.get("ninjos-shops").api`. It is created at the end of Shops' `init` hook, so an add-on can use it in its own `init`, `setup` or `ready`. The hook `ninjosShopsReady` fires once the object exists.

What this file promises stays stable. Additions can come with any version; a change to a documented signature bumps `api.interface`.

## Checking compatibility

```js
const shops = game.modules.get("ninjos-shops")?.api;
if (!shops?.register) return;          // Shops missing, inactive, or too old to have this interface
if (shops.interface < 1) return;       // interface version of this document
```

- `api.version` Shops' module version, as in its `module.json`.
- `api.interface` version of this interface. Currently `1`.
- `api.atLeast(version)` true when Shops is at least that version (house scheme `<foundry>.<yymm>.<n>`).

## Where things run

Shops follows one rule throughout: **the gamemaster's client executes.** A player's client asks, and exactly one gamemaster connection carries out the purchase, the sale or the trade and writes the books. The `*Completed` hooks below therefore fire **on that one client only**. The `*Rendered` hooks fire on every client that draws the window.

## Reading

- `api.shops.list()` the shop actors this user can see. Shops are invisible to players, so on a player's client this is empty.
- `api.prices.baseCp(price)` an item's `system.price` in copper.
- `api.prices.priceCp(baseCp, shop, fixedCp?)` what the shop asks, after its markup; a fixed price wins.
- `api.prices.buyBackCp(baseCp, shop)` what the shop pays when buying back.
- `api.prices.format(cp)` copper as text in the user's language, in gold, silver and copper.
- `api.prices.toCoins(cp)` copper as coin fields `{ pp, gp, ep, sp, cp }`, the way Shops fills its own price inputs: gold, silver and copper, with platinum and electrum left empty.
- `api.prices.fromCoins(fields)` and back: coin fields to copper. Empty fields count as zero.
- `api.monitors.isMonitor(user)` whether this user is a display at the table. Shops asks Ninjo's In-Person Tools first and falls back on its own list.
- `api.monitors.active()` the display users connected right now.

All amounts are whole copper pieces.

## Selling at an agreed price

`api.sell({ shop, item, actor, user, quantity, totalCp, note })` sells `quantity` of `item` from `shop` to `actor` for `totalCp` in total. **Call it on the executing gamemaster's client only**; see `extension.internals.vorsitz` below, or wrap it in your own socket round.

It is for a price that is already agreed, such as a winning bid. The shop's purchase mode, maximum per purchase, hidden flag and exact-change setting do not apply, because those govern buying over the counter. Stock and the buyer's money are still checked. After that it takes the same path as any purchase: goods with their container contents, payment with change, stock, the till, both ledgers and `ninjosShops.purchaseCompleted`. `note` appears in the shop ledger.

Returns a promise for `{ ok: true, text }`, or `{ ok: false, grund, fehltCp? }`, where `grund` is a localisation key and `fehltCp` is how much copper the buyer is short.

## Adding to the interface

- `api.register({ id, requires, setup })` for add-ons that install deeper hooks. `id` is lowercase letters, digits and hyphens. `requires` is the interface version needed; `setup(extension)` runs once, or not at all when Shops' interface is older, in which case the gamemaster is told once. If `setup` throws, the add-on counts as not registered.
- `api.registerFeature(id)` / `api.hasFeature(id)` named capabilities. Where Shops has a built-in version of something, it asks here whether an add-on took over.
- `api.registerItemMenuEntry({ id, icon?, label, gmOnly?, when?(item, shop), onClick(item, shop, sheet) })` an entry in the ⋯ menu of a goods row in the shop sheet. `label` is a string, a localisation key, or a function returning one. `icon` is a Font Awesome class such as `"fa-gavel"`. `gmOnly` defaults to `true`. `when` decides per row; omit it to always show. The same `id` registered again replaces the entry. An entry whose `when`, `label` or `onClick` throws is skipped; the rest of the menu is unaffected.

## Hooks

Called with Foundry's `Hooks.on`. Each receives **one object**, so a field added later breaks no signature. Documents in the payload are live; treat them as read-only.

| Hook | Payload | When |
|---|---|---|
| `ninjosShopsReady` | `api` | the api object exists (end of Shops' `init`) |
| `ninjosShops.purchaseCompleted` | `{ shop, actor, user, items, totalCp, service, specialPrice }` | a purchase went through and is booked |
| `ninjosShops.saleCompleted` | `{ shop, person, actor, user, items, totalCp, negotiated }` | a player sold something, directly (`negotiated: false`) or after a price was named (`true`). Exactly one of `shop` and `person` is set. |
| `ninjosShops.tableCompleted` | `{ user, actor, personUuid, personName, npcItems, playerItems, npcCoins, playerCoins, changeCp, changeTo }` | a trade at the table with a person closed. `npcCoins` and `playerCoins` are what each side put on the table; `changeCp` came back to `changeTo` (`"player"`, `"npc"` or `null`) on top of that |
| `ninjosShops.tradeCompleted` | `{ a, b, incomplete }` | a trade between two players closed; `a` and `b` are `{ user, actor, items, coins }`, and `incomplete` is true when part of the handover failed |
| `ninjosShops.sheetRendered` | `{ sheet, element, shop }` | the shop sheet was drawn |
| `ninjosShops.playerWindowRendered` | `{ window, element, shop }` | a player's shop window was drawn |
| `ninjosShops.displayRendered` | `{ element, shop, page, pages }` | the full screen display for a monitor was drawn; `page` counts from 0 |

`items` is always a list of `{ itemId, name, quantity }`. `itemId` is the id the item had on the giving side and may no longer exist. A container that changes hands travels with its contents and is listed as the container alone. `coins` are `{ pp, gp, ep, sp, cp }` with the denominations present.

## Internals

`setup(extension)` receives the registry, which also carries `extension.internals`: the shop sheet and player window classes, the gamemaster election used before anything is executed, the handover of items and coins, the purse arithmetic, the shop ledger, the display flag, how people are named at the table, and the windows Shops uses to report results. They are what Shops itself uses, so an add-on does not have to rebuild the parts that are easy to get wrong. **They are not covered by this document** and may change between versions; state the interface version you tested against.

## Minimal add-on

`module.json`:

```json
{
  "id": "my-shops-addon",
  "title": "My Shops add-on",
  "version": "1.0.0",
  "compatibility": { "minimum": "13", "verified": "14" },
  "relationships": { "requires": [{ "id": "ninjos-shops", "type": "module", "compatibility": { "minimum": "14.2611.1" } }] },
  "esmodules": ["main.js"]
}
```

`main.js`:

```js
Hooks.once("ninjosShopsReady", (shops) => {
  if (shops.interface < 1) return;

  shops.registerItemMenuEntry({
    id: "price-note",
    icon: "fa-coins",
    label: "Post the price to chat",
    onClick: (item, shop) => ChatMessage.create({
      content: `${item.name}: ${shops.prices.format(shops.prices.priceCp(shops.prices.baseCp(item.system.price), shop))}`
    })
  });

  Hooks.on("ninjosShops.purchaseCompleted", ({ shop, actor, totalCp }) =>
    console.log(`${actor.name} spent ${shops.prices.format(totalCp)} at ${shop.name}`));
});
```
