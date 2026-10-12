import { test } from "node:test";
import assert from "node:assert/strict";

import { compareCards, extractCardSummary, getLegality, getPrice } from "../cardData.js";

test("card summary normalizes fields", () => {
  const card = {
    name: "Grizzly Bears",
    mana_cost: "{1}{G}",
    cmc: 2,
    type_line: "Creature — Bear",
    rarity: "common",
    set_name: "Tenth Edition",
    oracle_text: "",
    artist: "D. J. Cleland-Hura",
    released_at: "2007-07-13",
    prices: { usd: "0.15" },
    power: "2",
    toughness: "2",
  };

  const summary = extractCardSummary(card);

  assert.equal(summary["rarity"], "Common");
  assert.equal(summary["price_usd"], 0.15);
  assert.equal(summary["power"], "2");
  assert.equal(summary["toughness"], "2");
});

test("card summary omits missing power and toughness", () => {
  const summary = extractCardSummary({ name: "Sol Ring" });

  assert.ok(!("power" in summary));
  assert.ok(!("toughness" in summary));
  assert.equal(summary["price_usd"], null);
});

test("card summary omits half a power/toughness pair", async (t) => {
  for (const card of [{ power: "2" }, { toughness: "2" }]) {
    await t.test(JSON.stringify(card), () => {
      const summary = extractCardSummary(card);
      assert.ok(!("power" in summary));
      assert.ok(!("toughness" in summary));
    });
  }
});

test("price handles missing, null and invalid values", async (t) => {
  const cases = [
    [{}, null],
    [{ prices: null }, null],
    [{ prices: { usd: null } }, null],
    [{ prices: { usd: "not-a-price" } }, null],
    [{ prices: { usd: "1.25" } }, 1.25],
  ];

  for (const [card, expected] of cases) {
    await t.test(JSON.stringify(card), () => {
      assert.equal(getPrice(card), expected);
    });
  }
});

test("legality returns status or unknown", () => {
  const card = { legalities: { modern: "legal", legacy: "banned" } };

  assert.equal(getLegality(card, "modern"), "legal");
  assert.equal(getLegality(card, "legacy"), "banned");
  assert.equal(getLegality(card, "standard"), "unknown");
  assert.equal(getLegality({}, "standard"), "unknown");
});

test("compare builds two summaries", () => {
  const result = compareCards(
    { name: "Black Lotus", prices: { usd: null } },
    { name: "Mox Pearl", prices: { usd: "100.00" } }
  );

  assert.equal(result["a"]["name"], "Black Lotus");
  assert.equal(result["b"]["name"], "Mox Pearl");
  assert.equal(result["b"]["price_usd"], 100.0);
});
