import { test } from "node:test";
import assert from "node:assert/strict";

import * as display from "../display.js";
import { capture } from "./helpers.js";

test("card detail formats optional values", async () => {
  const summary = {
    name: "Grizzly Bears",
    mana_cost: "{1}{G}",
    type_line: "Creature — Bear",
    rarity: "Common",
    set_name: "Tenth Edition",
    released_at: "2007-07-13",
    price_usd: 0.15,
    power: "2",
    toughness: "2",
    oracle_text: "A simple creature.",
    artist: "D. J. Cleland-Hura",
  };

  const { output } = await capture(display.printCardDetail, summary);

  assert.ok(output.includes("Grizzly Bears"));
  assert.ok(output.includes("$0.15"));
  assert.ok(output.includes("2/2"));
  assert.ok(output.includes("A simple creature."));
});

test("card detail uses fallbacks and omits P/T", async () => {
  const { output } = await capture(display.printCardDetail, {
    name: "Sol Ring",
    mana_cost: "",
    price_usd: null,
  });

  assert.ok(output.includes("Mana Cost      n/a"));
  assert.ok(output.includes("Price (USD)    n/a"));
  assert.ok(!output.includes("P/T"));
});

test("comparison formats both columns", async () => {
  const comparison = {
    a: { name: "Bear", price_usd: 1.0, power: "2", toughness: "2" },
    b: { name: "Ring", price_usd: null },
  };

  const { output } = await capture(display.printComparison, comparison);

  assert.ok(output.includes("Name: Bear"));
  assert.ok(output.includes("Name: Ring"));
  assert.ok(output.includes("Price (USD): $1.00"));
  assert.ok(output.includes("P/T: 2/2"));
  assert.ok(output.includes("P/T: n/a"));
});

test("comparison handles half a power/toughness pair", async () => {
  const comparison = {
    a: { name: "Partial", power: "2" },
    b: { name: "Also Partial", toughness: "3" },
  };

  const { output } = await capture(display.printComparison, comparison);

  assert.equal(output.split("P/T: n/a").length - 1, 2);
});

test("card list handles results and empty list", async () => {
  const cards = [
    { name: "Lightning Bolt", type_line: "Instant", rarity: "uncommon", prices: { usd: "0.79" } },
  ];

  const { output } = await capture(display.printCardList, cards);
  const { output: emptyOutput } = await capture(display.printCardList, []);

  assert.ok(output.includes("Lightning Bolt"));
  assert.ok(output.includes("$0.79"));
  assert.ok(output.includes("1 result(s) returned."));
  assert.ok(emptyOutput.includes("No cards to display."));
});

test("card list handles invalid usd price", async () => {
  const cards = [{ name: "Mystery Card", prices: { usd: "unknown" } }];

  const { output } = await capture(display.printCardList, cards);

  assert.ok(output.includes("Mystery Card"));
  assert.ok(output.includes("n/a"));
});

test("error message uses consistent prefix", async () => {
  const { output } = await capture(display.printError, "Something went wrong.");

  assert.ok(output.includes("Error: Something went wrong."));
});
