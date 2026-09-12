# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning `<foundry-major>.<YYMM>.<patch>`.

## 14.2609.91 - 2026-09-12

A second evening of trading at the table, and the same rule as last time: every
entry below was reported there first.

### Fixed
- **A price could only be given in one denomination.** "1 gp" worked, "2 cp"
  worked, "1 gp and 2 cp" could not be typed at all. It hit every place a price
  is entered: the fixed price on a shop item, the gamemaster's price for a sale
  request, the asking price and the trade in value on the trading table, and the
  special offer. There are three fields now, gold, silver and copper. An empty
  field is still not a zero: no fixed price means the markup applies, an explicit
  zero means a gift.
- **A trade could be closed while money was missing.** Under the rule that only
  what lies on the table changes hands, the other side simply got less, and
  nobody had wanted that. An agreement is now refused unless the scales come out
  even, and the button says what is missing. Nothing is lost to the gamemaster by
  that: a discount or a gift is one entry in the asking price field, and then the
  scales come out even again.
- **An agreement stayed valid after the table changed.** Every deliberate change
  already dropped both agreements, but the sync that follows the real inventory
  did not. Losing an item from the table after saying yes left a yes that had
  been given for more goods, and with a fixed asking price the trade went through
  at the old price. The window now also says why an agreement disappeared,
  instead of letting it vanish without a word.
- **A sale request's offer never reached a player who had put the window away.**
  The gamemaster named a price, the player saw nothing, and there was no way back
  to the request. The offer now brings the window back, and a closed request
  waits bottom right like a shop or a trade.
- **A closed shop could not be reopened from the bottom right.** The trading
  table and the player to player trade had that note since the beginning, the
  shop did not, so closing its window locked a player out of a shop that was
  still open for them.
- **Two windows looked like Foundry instead of like the module**, and the shop
  picker laid its list over its own dialog. The list shared a class name with the
  picking layer that covers the trading table on purpose.
- **One text carried two meanings.** The small button that takes coin back off
  the table read "That coin is no longer there", because a second entry under the
  same name had quietly replaced it.

## 14.2609.88 - 2026-09-11

Almost everything in this release came from one evening of real trading at
the table. Each entry below was reported there first.

### Fixed
- **A trade could hand one side over and not the other.** Goods went on the
  table, the other player deleted theirs, the trade was accepted and paid for,
  and what had been on the table never arrived. The trade between players
  moved the first side and then the second, so when the second failed the
  first was already gone. Both sides are now checked before anything moves,
  by the same function on both tables.
- **A bag's contents were never checked, and on the NPC table never even
  moved.** Laying down a backpack and emptying it before closing handed over
  something other than what the other side agreed to. What is inside a bag,
  its own coins included, is now recorded when it goes on the table, shown
  under its name, and compared when the trade closes. The trading table also
  used a copy routine that left the contents behind, so a bag bought from an
  NPC arrived empty. Both tables now share the same handover.
- **A bag and what is in it could be promised twice.** Picking the blanket
  and then the backpack it lies in put both on the table. Only one blanket
  was ever handed over, but the table said otherwise. Anything inside a bag
  that is also on the table is now dropped from the list, and in the picking
  layer it says it travels inside that bag instead.
- **Opening a bag showed it empty.** The item sheet for a bag had no contents
  and the wrong weight, because its contents are neighbouring items on the
  same actor and the preview copy had none. A container now opens on a
  throwaway carrier that holds it and everything inside.
- **The tick in the picking layer did nothing.** It sat next to the tappable
  area rather than inside it. The whole row is a real button now, reachable
  from the keyboard.
- **The button promised the last step while doing the first.** It read
  "close trade" from the start, although pressing it only recorded your own
  agreement. It now follows the state: agree, close trade once the other side
  has agreed, or take your agreement back.
- **Dialog text sat small in the corner.** Foundry gives a dialog body no
  padding and no font size. Dialogs now have room, a reading size and a line
  length that stops before the edge.

### Added
- **A window for every ending.** A trade that closes, fails because something
  vanished, or is ended by someone else now says so in a window both sides
  confirm. A notification was the wrong place: it fades by itself, and the
  sheet view of In-Person Tools hides notifications entirely, so on the
  tablets at the table it reached nobody. Something not being there any more
  gets its own wording, kept apart from ordinary refusals such as not having
  enough money.
- **A way back for a parked trade.** Closing the trade window with the X no
  longer loses sight of it: a chip in the bottom right corner brings it back,
  as it already did for the trading table. Several chips stack.
- **A notice when no gamemaster is online.** The trade cannot go through
  without one, which is right, but nothing used to say so. The table shows it
  and the agree button waits.
- **Items in the trade window can be opened**, the other side's included,
  read only.

## 14.2609.75 - 2026-09-09

### Changed
- **Keeping other modules' windows on screen is now a job for Ninjo's In-Person
  Tools** when both modules run. The ability was born here because the trade
  needed it when it moved over, but it belongs at the table: a window that
  opens larger than the tablet is a table problem. Both modules carry the same
  file, and a fixed order decides who acts: In-Person Tools first, this module
  when it is installed alone. Without the rule both would clamp the same window
  one after the other: the same calculation, two moves, and three suspects when
  something goes wrong. Nothing changes for tables without In-Person Tools.

## 14.2609.74 - 2026-09-08

### Added
- **Trading between two players**, moved here from Ninjo's In-Person Tools. It
  and trading with a person are the same thing from two directions; two trade
  windows in two modules that looked different depending on what was installed
  helped nobody. The button over there now opens this table; if that module is
  missing, Shops puts its own on the player list. **Nothing is valued between
  two players.** What is on the table is what is on the table.
- **Picking in a layer above the table**, the same for both tables: tap, set
  the quantity with step buttons (0 / -10 / - / + / +10 / all), coins per kind.
  Before, the whole inventory stood below the scales and pushed the trade
  itself off screen; money came through a number field with a drop-down.
- **A container travels with its contents.** Goods now pass through the same
  place for both tables: the new item is created before the old one is taken
  away, the contents of a pouch are re-hung (they point at an id that changes
  on copy), and `ownership`, `equipped` and `attuned` stay behind.

### Changed
- **The player no longer sees base prices.** Every item of the person carried
  a computed price: nine numbers nobody had told them, and a total underneath
  that seemed to come from nowhere. Now there is one number: what she asks.
  The sum of her prices is suggested, and the gamemaster can set it to
  anything.
- **What the player hands over is priced by the gamemaster.** Before, it was
  silently credited at half the base price. Now her purchase value stands in
  the field, her range next to it as three buttons, and the base price as
  information underneath. All of it for the gamemaster only.

### Fixed
- **Money laid on the table never moved.** It counted on the scales but never
  left the purse: whoever put down 2 gp got the dagger for 2 gp 4 sp exactly
  those 2 gp cheaper. Every coin laid down was a discount on itself. Measured
  in the running world: 40 copper for a dagger at 2 gp 4 sp. Nothing reaches
  into a purse any more; what is on the table moves, and coins stay the coins
  they are.
- **A window without an item stayed open.** The gamemaster's trade table fell
  into its empty state instead of closing when cleared, and so did the
  negotiation window when no request was left. The latter had a deeper cause:
  the finished request was **announced before** it left the queue, so whoever
  looked on the announcement got a state that no longer existed.
- **Our window clamp touched Foundry's own interface.** It hangs on every
  `renderApplicationV2`, and in Foundry v13+ the sidebar, the player list and
  the directory tabs are ApplicationV2 too: `max-height: 1139px` sat in their
  style, written by us, and never taken back. Only what actually floats is
  touched now.
- **A trade could be closed by one side.** The player could put something on
  their side and confirm straight away, although the gamemaster had never
  agreed to that combination. A trade is an agreement between two; now
  **both** agree, and **every change resets both agreements**. Whoever adds
  something or touches the price after agreeing is negotiating a different
  trade, and the old agreement was not for it.
- **Other windows ran off the tablet screen.** dnd5e's hit dice dialog opened
  larger than the screen: no edge to drag, no cross to close, no way out. The
  same when editing hit points. They are not our windows, yet the player is
  stuck. `fensterpassen.js` clamps them too, **but never makes them larger**;
  it can be switched off in the settings.

### Added
- **The player can name a price.** Until now only the gamemaster could set
  one; whoever wanted to add gold had nowhere to do it. A field below the
  scales (amount and coin kind), and the gamemaster takes the bid over with
  one click.

### Changed
- **The trade table divides its space differently.** Both sides stretched over
  half the window height even with three rows in them, while "what you have
  with you" (the area where you actually put something down) sat as a
  collapsed row at the bottom. Now the sides take what their content needs (at
  most two fifths), and the inventory stands open and gets the rest. On a
  768-pixel tablet that is the difference between usable and not.

### Fixed
- **Only half the trade view was visible on a tablet.** Measured at 1058×577:
  the content needed 637 pixels with 523 available, and it was cut off at the
  bottom, which is exactly where the button to close the trade sits. The window
  itself stayed on screen, `fensterpassen.js` had done its job; the problem was
  that **every part had a fixed height and none gave way.** Now header, scales,
  price field and footer stay fixed, and the lists share what is left. Checked
  at 916×414: nothing cut off.
- **Windows could not be moved with a finger on a tablet.** The browser reads a
  swipe over the title bar as scrolling and cancels the drag as soon as the
  finger moves, which never shows with a mouse. `touch-action: none` on the
  title bar and the handles. It sits in `fensterpassen.js` and so travels into
  every module that gets the file.
- **The gamemaster was not told when a trade went through.** The result only
  went to the player, although the gamemaster set the price and may not be
  sitting next to them. She saw the table disappear and did not know whether
  it was completed or cancelled.

### Fixed
- **A click on "usual" offered a hundred times the amount.** The three
  suggestion buttons in the negotiation carry their value in **copper**; the
  field next to them was in **gold**. The button wrote the number in raw: 50
  copper became 50 gold, and one more click sent it. Exactly the kind of error
  nobody notices, because both numbers look plausible.
- **Prices could only be given in gold.** This affected the negotiation and
  the price at the trade table: whoever wanted to ask six silver had to type
  "0.6"; three copper were impossible. Both fields now have amount and coin
  kind, as the fixed price field and the special offers have had all along. At
  the trade table the sign is kept: negative means the person gives change.

### Fixed
- **A shop that had been clicked away came back by itself after a reload.**
  `close()` only cleared a module-internal variable; the flag on the user
  stayed, and the restore on start opened the window again. You clicked it
  away and it came back.

  The cause lay deeper: **one flag answered two questions**, "whom has the
  gamemaster shown this shop" and "do I have the window open right now". The
  flag therefore stays (otherwise the gamemaster would lose her list of viewers
  and the access button its way to bring a closed window back), but **the device
  remembers that it was closed here**. Closed on the tablet does not mean closed
  on the computer. When the gamemaster shows the shop again, or you bring it
  back yourself, the note counts as settled.

### Changed (licence)
- **The `LICENSE` now names both bundled images.** Until now it only listed the
  Font Awesome icon, followed by the sentence that everything else was supplied
  by Foundry at runtime and not distributed, which was simply wrong for
  `assets/ninjo.png`. Foundry asked about exactly that when reviewing the
  submission. The logo is a commissioned work, used with the artist's
  permission, all rights reserved.

### Added (release)
- **`LICENSE`**: proprietary, not open source. Use at your own table is
  expressly allowed, redistribution is not. The direction is a one-way street:
  proprietary can be switched to MIT at any time later, never the other way
  round. It also contains the **attribution for Font Awesome**:
  `assets/laden.svg` contains their `scale-balanced` path under CC BY 4.0, and
  unlike the other modules, which only use Font Awesome through CSS classes,
  this one distributes it.
- **Release workflow.** A `v*` tag builds the zip, creates the GitHub release
  and reports it to Foundry. It **aborts when the tag and `module.json`
  disagree**: Foundry goes by the number in the manifest, and a release with the
  wrong tag would reach nobody without anyone noticing.
- `.gitattributes`: fixed line endings.

### Changed (name)
- **The module is now called "Ninjo's Shops & Trade".** Trading with people who
  have no shop is finished, in both directions, and is not a side feature;
  whoever looks for a trade window reads past "Shops". The **id stays
  `ninjos-shops`** and never changes: Foundry tracks every installation by it,
  and a different id would be a different module.

### Fixed (welcome window)
- **The start hint pointed at a button that does not exist.** "Choose *Set up
  shop* in the sheet header": that label appears nowhere in the module. The way
  in is the scales in the title bar of the NPC sheet. It was the very first
  sentence a new user reads.
- The window did not mention trading at all. Its subtitle and third point now
  do.

### Added
- **"I have something too" now does something.** Until now the button in the
  trade window only showed a note that the way back was being built. It now
  opens the same packing window as at the shop counter: pack up, the gamemaster
  names a price, both say yes or no. For that the negotiation knows a
  **counterpart** instead of a shop. A person has no buying policy, so the module
  suggests half the base total and says next to it that this is a suggestion.
- **The shop button sits on every person's sheet**, not only on those who
  already run a shop. Without a shop it asks whether to link an existing one or
  create a new one. Before, you had to know that the link goes through a field
  in the shop sheet, in a window that did not exist yet.

### Changed
- **Only one button in the actor directory.** Two full rows pushed other
  modules' buttons off screen there; the footer belongs to the directory, not to
  this module. By default it shows the market ledger; "New shop" remains
  selectable, and both ways can be reached without the button too. The button is
  also no longer red but restrained: it sits in somebody else's window.
- **The markup now applies in the trade window too.** A price comes about in
  nine places in the module; eight calculated with the markup, this one gave the
  bare base price. Whoever let a trader with a 20 % markup sell goods from her
  hand sold them at cost. If the person runs exactly one shop, the price fields
  are now filled from it, and the window says where the numbers come from.
- **A purchase says what comes back.** Whoever buys a dagger for 2 gp with a
  platinum piece gets eight gold back. The calculation was always right, it just
  was not visible. Now the message says it.
- **And when it is not enough, how much is missing.** "Not enough money" left
  open whether one copper was missing or ten gold. The number was sent along the
  whole time and never shown.
- **An offer to several people cleans up after itself.** Whoever laid out a
  single item for a whole group used to find that it stayed in everybody else's
  window after the first person took it; they clicked it and only then learned
  they were too late. Now the stock decides: what is gone disappears, and what is
  only partly gone shows the number that is still true. That also applies when
  the gamemaster takes something off the NPC by hand.
- **"To whom" now only lists people something can be laid out for**: logged-in
  players with an assigned character. Without a character the taking fails with
  "You have no character" anyway, so the offer would sit with someone who cannot
  accept it; that also drops the display users. Before, eight rows stood there,
  one of them meant. The special offers have always filtered like this.
- **One footer in the trade window instead of two.** "No, thanks" and "I have
  something too" stood in separate boxes one above the other, and the hint text
  next to them was cut off on narrow windows.

### Fixed
- **Hidden goods carried two crossed-out eyes.** One came from the template, one
  from the stylesheet. The one from the template stays; it also carries its
  tooltip.
- **The ⋯ menu on the goods row did not open.** More precisely: it opened and
  lay behind the window. Since it hangs on the document (so the scrolling list
  does not cut it off), its `z-index` no longer counts against the row but
  against Foundry's windows, and those sit at 105 while the menu sat at 20. The
  click seemed to do nothing.
- **The display view stopped after a reload.** The presentation runs in the
  memory of exactly the connection that started it; if the gamemaster reloaded,
  nobody turned the pages any more, and the screen showed "paused" until someone
  stepped in by hand. The gamemaster now picks it up again on start, and a screen
  that comes back asks where the presentation is instead of waiting for the next
  tick.
- **Prices are given in gold, not platinum.** Whoever typed "12 gp" showed the
  player "1 pp 2 gp", and a healing potion cost "7 pp 5 gp" instead of 75 gold.
  Platinum stays where it is in the purse, and change is still paid out in it;
  only a price is *stated* in gold, silver and copper.
- **Zero is not a price.** An offer of nothing took the player's item and gave
  nothing for it. The direct purchase has long refused that; the negotiation now
  does too.
- **Windows grow again** when the screen gets larger, but only those nobody has
  resized by hand since. Whoever makes a window smaller is not overridden on the
  next rotation.
- **Wide windows did not use their width.** The name swallowed every extra
  pixel, and a gap opened between it and the stock. If the display is wide
  enough, it now stands in **two columns**, which uses the width and halves the
  height. Three columns when very wide.
- **Windows open larger.** On first opening a window may grow to one and a half
  times its default width, as long as the screen allows. Never again after that:
  whoever makes it smaller by hand wants it smaller.
- **The clamp froze `height: auto`.** It wrote a fixed height into every window,
  even when there was nothing to clamp, so a new request no longer made the window
  taller. Now the height is only touched when it really goes past the edge.
- **The negotiation window came up behind the shop sheet.** If it was already
  open it stayed where it was, the request went unnoticed, and the player waited
  for an answer nobody had seen. It now expands, comes to the front and shows the
  name and count.
- **An item without a price showed "0 cp" three times** and looked like an
  error. Now a sentence says that this item has no price.
- **Names were cut off although there was room next to them.** They wrap now;
  the window is wider, and values, fields and buttons move below each other when
  it gets tight instead of squeezing. If an item has no image, an icon stands
  there instead of an empty white box.
- **A purchase ran twice when the same gamemaster had two tabs open.**
  `game.users.activeGM` names a user, not a connection, so both tabs considered
  themselves responsible. Measured: two bookings 16 ms apart, two torches in the
  bag, paid once. Which connection executes is now decided by a claim per
  request (`scripts/vorsitz.js`).
- **On a tablet the player window ran off the bottom of the screen** and could
  no longer be reached there. Moving it did not help because the title bar was
  already at the top. Windows are now capped to the visible area and followed
  when the device rotates or the keyboard opens.

### Added
- **A trade can be declined.** "No, thanks" returns what was held out, clears
  the window and tells the gamemaster. Before, it stayed until she took it back
  herself, and she never learned that the player had long moved on.
- **An item can be viewed in the trade too.** A click on the image or name opens
  it large with its description. The price comes from the trade and not from a
  shop calculation: a person has no markup.
- **The buttons in the actor directory can be switched off**: both, one, or
  none. They sit in a window that does not belong to the module; whoever wants a
  tidy directory should be able to have one.
- **A third way to the market ledger:** in the module settings. Before, only two
  led there: the book button in the directory and the ⋮ menu of an *open* shop
  sheet. Both can be missing, and a ledger you can only find while you are
  already reading it is not one.
- **Look at goods up close.** A click on the image or name in the player window
  opens the item large, with its full description and a buy button. There was no
  way there before: the description belongs to the item, the item belongs to the
  shop, and a player cannot open its sheet.
- **The display view**: the shop on the screen on the wall. Full screen without
  a window frame, six cards per page, name in capitals, price in gold, a progress
  bar along the bottom. Nothing on it can be clicked: the display has no
  keyboard. It turns the page every ten seconds (configurable); **control is in
  the shop sheet**: pause, forward, back. Turning a page by hand pauses it, so the
  display does not jump on while someone is asking.
- **You decide who sees it large when showing the shop.** In the selection list
  each name has a "large" switch, preset for recognised displays. "Show to
  everyone" gives displays the display view and everybody else their window.
- **The bridge now really reads In-Person Tools.** Its API still does not expose
  display detection, but the two settings in which it keeps its screens are
  readable. Whoever has registered a display there does not have to register it
  here again. If they are empty, the module's own list applies: empty means "not
  set up", not "none".
- **A list of which users are displays** (module settings, Displays). If Ninjo's
  In-Person Tools runs and exposes its detection, its answer applies; the
  module's own list is then greyed out and says where the information comes from.
- **Trading with a person who has no shop.** A button in the title bar of every
  person's sheet: you tick which items are laid out, set quantity and price,
  choose the recipients, and the player sees only that, nothing else from this
  sheet. They take item by item; the money goes into the person's purse if they
  have one. **It is always started by the gamemaster**; a player cannot address
  anyone. The way back (the player offers something in turn) is prepared ("She
  also accepts things") and will be built next.
- **A click on the trader opens their shop.** The flag for it had been in the
  module since the first day and was read by nothing. It now maintains itself
  from the seller field: whoever enters someone there has set the link, and
  whoever replaces them has moved it. The way there leads through the title bar of
  the trader's sheet, the context menu in the actor directory and, where there
  is a canvas, the HUD of their token. A trader with two stalls is asked which
  one is meant.
- **Approvals are recorded in the ledgers.** The market ledger writes down every
  yes and every no with the name of whoever decided; in the shop ledger (the book
  the player opens) the no stands with its sentence. Before, a refusal was a
  message that disappeared.
- **A shop can be tied to scenes.** "On which scenes" in the shop settings:
  whoever does not have one of these maps in front of them cannot reach the shop.
  No selection still means everywhere. It is a filter on top of the access mode,
  not a third mode: "all players, but only in the market square". When the scene
  changes, a shop opened by the player closes; what the gamemaster is showing
  stays.
- **The "approval" purchase mode now does something.** It was in the data model,
  in the settings and as a sentence in the confirmation dialog, yet the purchase
  went through as with "direct". Now the request lands with the gamemaster, and
  the player only gets it after a yes. What fails on money, stock or the maximum
  quantity fails at once without asking anyone; a purchase at an agreed offer
  price needs no second yes.
- **Purchase requests and sale requests share one window**: "Requests at the
  counter". Two windows for the same question ("a player is asking something")
  would be one too many.
- **A seller per shop**: an NPC, dropped into the settings. They stand in the
  header of both windows and as the counterpart in the ledgers; the gamemaster no
  longer appears there, she only carries out the trade. Without a link, a neutral
  "Seller" is shown.

### Changed
- **The trade window looks like the shop window**: a 56-pixel image, price in
  gold, the same row. It is the same action: someone holds something out, you
  look at it and take it or not.
- **Windows open as far as their content needs**, at most to the edge of the
  screen. The shop sheet grows to exactly the height at which nothing scrolls any
  more; the player window goes to the edge if the screen is not tall enough.
  Whoever resizes it keeps that size.
- **Scenes are dragged in now.** Instead of a list of a hundred checkboxes there
  is a field: drag a scene in from the sidebar, or search a list you can type
  into via "Choose scene …". Chosen scenes show as chips with their map image;
  before, what you had ticked appeared only as a name.
- **It also works from the scene:** in the scene configuration under
  "Miscellaneous" there is "Shops on this map". You drag a shop in from the actor
  directory there. **It is still stored on the shop**: two lists meaning the same
  thing drift apart.
- **The seller stands on the right of the header**, as a face with a name, and
  the banner has become taller. As a small line under the shop's name it read
  like a footnote to the sign, although they are the counterpart in the trade and
  the name in both ledgers.
- **The window bar is no longer red** but a warm brown-black with a slight
  gradient, the leather spine of a book whose pages hold the shop. Pure black
  would be the bar of any application; the thin gold line below it stays, and it
  is how you recognise the module. Red thereby keeps only its three jobs: the one
  main action, the warning and the special case.
- **Paper instead of white.** The windows now sit on parchment: a warmer ground,
  borders like drawn lines, text in ink rather than black, and a fine fibre in the
  background. It works without an image, as noise in the background and not as a
  layer over the content, so the text stays smooth.
- **The display view can be set to light or dark** (module settings, "Display
  view: brightness"). Dark does not glare in a dimmed room, parchment reads better
  on a television in daylight. Only the table knows which room it is.
- **The player window got a proper entrance.** The goods image grew from 34 to 56
  pixels; the same image is the lead in the display view. Prices now carry the
  display view's gold, the buy button stands quietly and only fills when you mean
  it (four filled red blocks one above the other were four times the same
  signal), and the purse only shows the coins you actually have.
- **The seller stands with their token image in the header of the display
  view**, round, with a gold border. The token image, not the sheet image: the
  sheet often carries a portrait-format bust, the token is the head as it lies on
  the table.
- **The page number is much larger.** From two metres away it is the only
  information that says whether you have seen everything.
- **The hint "Escape closes this view" is gone.** The key stays; it is now in the
  guide instead of on the screen. The display view hangs on a wall and should look
  like a shelf, not like a program with instructions.
- **An hourglass instead of the progress bar** in the display view. The bar was
  the only place where the display looked like software rather than a stall in a
  market square. The sand runs through over the time the page stands; when the
  display is paused it fades and the thread disappears.
- **Escape closes the display view**, but only for the gamemaster. On a display
  there is no hint, nobody sits there. Whoever was looking at it was trapped
  otherwise: the layer covers the whole screen, including the shop sheet with its
  controls.
- **The settings are now also in the title bar menu**, next to the two ledgers.
  The slider in the header image stays, but it sits on the right edge of the
  banner, and there it is hardest to hit on a narrow screen, under a finger or
  next to a second window.
- **One menu per goods row** instead of five faint icons. Hidden, service and
  purchase remain visible as small marks after the name; only the actions moved
  into the menu.
- **"Visitors" now stands above the list of names.** Before, there was a name
  without a heading, and nobody knew what it meant.
- The seller field overlapped the hint text above it with its label.
- **Red diet.** Headings, secondary buttons and prices no longer carry red; it
  stays for the window bar, the one main action per block and warnings. Headings
  are now ordered by a thin line.
- **The ledgers are in the window menu** instead of as unlabelled icon buttons in
  the showing bar, where they wrapped and were illegible.
- **The market ledger is no longer a journal.** It read like a log: not
  filterable, not sortable, every row a snippet of text. Now the entries live as
  data in a world setting and get their own window with a filter by shop, a
  visible reason for failed attempts and a button to clear it.
- The button bar in the sheet is **grouped by task**: showing and closing on the
  left, the two ledgers set apart on the right as icon buttons.
- The header image shrank from 132 to 104 px, and the goods display grew from 275
  to 368 px. It is what you open the window for.
- **A shop ledger per shop**, open to everyone: the gamemaster sees every
  transaction in this shop, a player only their own. With direction, date, sum and
  a line below of what has flowed in total. Not to be confused with the market
  ledger, which remains the gamemaster's record across all shops and also logs
  failed attempts.
- **Selling to the shop**, in two ways. Ticked goods (`flags…ankauf` per item in
  the display) go through at once, at the shop's purchase factor. Everything else
  goes through a **sale request**: the player packs up, the gamemaster sees the
  usual value with lower and upper limit (the three numbers are removed from the
  session before sending, not merely hidden), names a price, and the player
  accepts or declines.
- `system.spielraum` per shop (default 0.25): how far the price may go up and down
  in a request. The module only calculates; the table decides.
- **`eigeneKasse` now actually limits something.** On a purchase it only filled
  up; on buying from a player it has to be enough, otherwise the shop declines.
- **Step 5: the purchase.** The player taps, the gamemaster checks everything
  again from the start and carries it out; the price is recalculated there and
  never taken from the player. Payment uses change from `kasse.js`, whose 43 tests
  thereby reach the game for the first time. Create first, then take away: if it
  breaks in between, the item exists twice rather than not at all.
- **Offers by the gamemaster**: lay an item out for someone at a special price,
  with quantity, price and a sentence. The price is stored on the user, not in
  the socket message, otherwise a player could send themselves their own price.
- **Market ledger** as a journal, gamemaster only, one page per game day. It is
  written twice per purchase: what was meant and what happened. A ledger that only
  knows successful purchases is silent exactly when you need it.
- **Confirmation before buying** with quantity, price and what remains in the
  purse afterwards. No `confirm()`.
- **Header image**: the shop's image is now the shop interior and runs as a wide
  strip across both windows, with a slider for the crop and a preview in the same
  aspect ratio. The token image stays next to it.
- **Ways to the shops**: a button in the actor directory (new shop, market ledger),
  a tool in the scene controls and a button in the bar of In-Person Tools, the
  latter without any change to that module, purely through its render hook.
- **Step 4: showing and the player window.** The gamemaster shows a shop to
  everyone or to selected users; recipients open the player window with the goods
  (without hidden ones), prices, hint line, services and their own purse. The buy
  button is a stub for step 5: no money moves.
- Socket channels `ZEIGEN`, `SCHLIESSEN`, `STAND` (and stub `KAUFEN`); an open shop
  survives a client reload in the user flag; always only one.
- Management sheet: who is looking at this shop right now, show to everyone /
  selection / close.
- Constant `OFFENER_LADEN` in `const.js`; `WARE` had been deleted by accident during
  the rebuild in step 3 and is back.
- Concept (`KONZEPT-shops.md`): market research into the five existing shop
  modules, the decision for a module of its own, the structure of a shop, the
  price and permission model, the purchase flow through the gamemaster, the display
  view, the market ledger.
- Price calculation (`scripts/preise.js`) and till (`scripts/kasse.js`) as pure
  functions without Foundry access, with 35 tests.
- Scaffold: manifest, settings, welcome window in German and English.
- **The shop as a document of its own**: actor subtype `ninjos-shops.laden` with a
  `TypeDataModel` (`laden-model.js`) and its own sheet (`laden-bogen.js`,
  `templates/laden-*.hbs`). Drag goods in, stock, fixed price per item, hint line,
  hidden goods, services.
- `alsMuenzfeld()` in `preise.js`: a copper amount as a number and coin kind, so
  nobody has to type `150000` for plate armour. Eight more tests for it, among them
  5000 values there and back.

### Added
- **A settings window per shop** (`laden-einstellungen.js`) with **shop image and
  token image** to choose, prices, purchase mode and access.
- **Access management** (`system.zugriff`): three states, nobody, selected players,
  everyone. Explicitly **not** through Foundry's permissions, because an ownership
  right would make the shop appear in the player's actor directory.
  `system.zugriff.szenen` is prepared for the later binding to the visible scene
  and is not read by anything yet.
- New shops get `ownership: { default: NONE }` set explicitly, so "a shop is
  invisible to players" is guaranteed and not true by accident.

### Changed
- **The sheet is designed like FANG**: light paper, sans-serif, red in the window
  bar rather than as a surface, white cards, thin grey borders, the same values as
  `fang.css`. The intermediate "shop ledger on parchment" stage is thereby
  superseded.
- **Shop ledger (superseded):** parchment, ink, brass lines and a money column on
  the right as in an account book. The reason was a measurement: `#8B0000` as a
  text colour on Foundry's dark window has **1.97:1** contrast, so "Show" was
  practically invisible. On parchment the same red has **7.9:1**. The house colour
  was never the problem, only its ground. Conversely, gold carries no text here any
  more (1.7:1) and becomes a line.
- A column header above the goods, fixed column widths in both windows, every
  second row slightly tinted. Fonts: Amiri and Modesto Condensed, both shipped by
  Foundry, no web font from outside.
- New shops get `icons/environment/settlement/market-stall.webp` instead of the
  hooded figure, plus a token with `actorLink: true`. Without the link every token
  on the map would have its own copy of the inventory: two market stalls of the
  same shop with separate stock.
- **No modern icons any more.** The buy button carried a shopping cart, a
  supermarket trolley from 1937 and out of place in a shop with torches and
  longswords. Now: a hand receiving something. Services carry a handshake instead
  of a donation heart, which also makes the difference visible: a hand takes goods,
  a handshake only seals an agreement. The window icon is the trader's scales
  instead of a shop awning.

### Fixed
- **The settings button could not be found on dark header images**: a dark,
  semi-transparent box with a faint border, and the only way to the settings. Now
  filled with gold in the house red.
- **The actor directory showed the header image.** A wide shop interior squeezed
  into a 32-pixel square is a patch of colour; the token image stands there now.
  Only the display is swapped; `img` stays the header image.
- **The header image could not be chosen.** The preview was a `<div>` with a
  background image, and Foundry's `editImage` action throws on anything that is not
  an `<img>`, so the click simply did nothing. Now an image element, with the crop
  coming from `object-position`.
- **An empty image field discarded the whole form.** `FormDataExtended` collects
  every `img[data-edit]`; without a source the browser resolves it to the page
  address, and Foundry rejected the change with "does not have a valid file
  extension", together with markup, purchase mode and access.
- **The shop type carried dnd5e's hooded figure.** dnd5e draws the types in the
  create dialog from `CONFIG.DND5E.defaultArtwork.Actor`, not from
  `CONFIG.Actor.typeIcons`. Plus the same scales as SVG (`assets/laden.svg`) that
  the window bar carries, the path from Font Awesome Free under CC BY 4.0, because
  Foundry's bundled Pro version may not be redistributed.
- **The player view had no column headers.** Which number was the stock and which
  the price had to be guessed. Both views now carry the header **inside** the list,
  where header and cards share the same padding and scrollbar calculation, and it
  stays in place while scrolling.
- **The window bar buttons showed empty boxes.** Foundry puts their icon class
  directly on the button; our font rule for `button` thereby overrode the icon
  font. It now only applies inside `.window-content` and never to an element with an
  `fa-` class.
- **The sheet did not scroll.** `overflow: hidden` with 767 px of content in a
  582 px window: with the settings expanded the goods could not be reached.
- **Every `PART` needs a single root element.** `laden-kopf.hbs`,
  `laden-vorzeigen.hbs` and `spieler-fenster.hbs` had several side by side and kept
  the sheet from opening at all with "must render a single HTML element".
- **The selection dialog showed nothing.** Its content was a `<form>` inside the
  form of the `DialogV2`; the HTML parser discards that, the callback did not find
  its checkboxes and returned an empty list.

### Changed
- **A shop is no longer a flag on an NPC.** The first draft of the concept hung it
  as `flags` on an existing actor; that would have let a trader run exactly one
  shop, a market stall would carry hit points, and an `aufschlag: "1,2"` with a
  comma would have been accepted without complaint and silently miscalculated. The
  link to an NPC, token or scene note remains as an additional feature, as a list,
  so a trader can run two stalls. The reasoning is in KONZEPT-shops.md, section 4.
- Decided: displays that are not display users get the display view too, as a
  choice when showing. A projector is not a display user and still looks exactly
  like one.
