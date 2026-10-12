import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SYMBOL_BASE,
  cardFaces,
  cardImage,
  errorMessage,
  faceDetails,
  hasBackFace,
  legalityRows,
  parseSymbols,
  sortCards,
} from "../web/cardView.js";
import { CardNotFoundError } from "../apiClient.js";
import { http } from "../http.js";

// A double-faced card shaped like Scryfall's Delver of Secrets
const delver = {
  name: "Delver of Secrets // Insectile Aberration",
  card_faces: [
    { name: "Delver of Secrets", mana_cost: "{U}", power: "1", toughness: "1", image_uris: { normal: "front.jpg" } },
    { name: "Insectile Aberration", mana_cost: "", power: "3", toughness: "2", image_uris: { normal: "back.jpg" } },
  ],
};

test("symbols are split out of rules text", () => {
  assert.deepEqual(parseSymbols("{T}: Add {C}{C}."), [
    { type: "symbol", value: "{T}", url: `${SYMBOL_BASE}T.svg` },
    { type: "text", value: ": Add " },
    { type: "symbol", value: "{C}", url: `${SYMBOL_BASE}C.svg` },
    { type: "symbol", value: "{C}", url: `${SYMBOL_BASE}C.svg` },
    { type: "text", value: "." },
  ]);
  assert.equal(parseSymbols("{W/U}")[0].url, `${SYMBOL_BASE}WU.svg`);
  assert.deepEqual(parseSymbols("Flying"), [{ type: "text", value: "Flying" }]);
  assert.deepEqual(parseSymbols(null), []);
});

test("faces and pictures for single and double-faced cards", () => {
  const solRing = { name: "Sol Ring", image_uris: { normal: "sol.jpg", large: "sol-large.jpg" } };

  assert.deepEqual(cardFaces(solRing), [solRing]);
  assert.equal(cardImage(solRing), "sol.jpg");
  assert.equal(cardImage(solRing, "large"), "sol-large.jpg");
  assert.equal(cardImage(solRing, "art_crop"), null);
  assert.equal(hasBackFace(solRing), false);

  assert.equal(cardFaces(delver).length, 2);
  assert.equal(cardImage(delver, "normal", 1), "back.jpg");
  assert.equal(hasBackFace(delver), true);
  assert.equal(cardImage({ name: "No picture" }), null);
});

test("face details fill missing fields with empty text", () => {
  const details = faceDetails(delver.card_faces[1]);

  assert.equal(details.name, "Insectile Aberration");
  assert.equal(details.manaCost, "");
  assert.equal(details.oracleText, "");
  assert.equal(`${details.power}/${details.toughness}`, "3/2");
});

test("legality rows cover every shown format", () => {
  const rows = legalityRows({ legalities: { modern: "legal", vintage: "restricted" } });

  assert.equal(rows.length, 12);
  assert.deepEqual(rows.find((row) => row.key === "modern"), {
    key: "modern",
    label: "Modern",
    status: "legal",
    text: "Legal",
  });
  assert.equal(rows.find((row) => row.key === "vintage").text, "Restricted");
  assert.equal(rows.find((row) => row.key === "standard").status, "unknown");
});

test("sorting by price puts cards without a price last", () => {
  const cards = [
    { name: "B", cmc: 3, prices: { usd: "0.50" } },
    { name: "A", cmc: 1, prices: { usd: null } },
    { name: "C", cmc: 2, prices: { usd: "5.00" } },
  ];
  const names = (list) => list.map((card) => card.name).join("");

  assert.equal(names(sortCards(cards, "relevance")), "BAC");
  assert.equal(names(sortCards(cards, "name")), "ABC");
  assert.equal(names(sortCards(cards, "price-desc")), "CBA");
  assert.equal(names(sortCards(cards, "price-asc")), "BCA");
  assert.equal(names(sortCards(cards, "cmc")), "ACB");
  assert.equal(names(cards), "BAC"); // the original list is not changed
});

test("error messages match the CLI wording", () => {
  const ambiguous = new CardNotFoundError("Too many cards", true);
  const missing = new CardNotFoundError("No card found");

  assert.equal(
    errorMessage(ambiguous, "lookup", "bolt"),
    '"bolt" matched several cards. Try a more specific name, such as the full card name.'
  );
  assert.equal(errorMessage(missing, "lookup", "zzzz"), 'No card found for "zzzz".');
  assert.equal(errorMessage(missing, "compare"), "One or both cards were not found.");
  assert.equal(errorMessage(missing, "search", "t:nothing"), 'No cards found for query: "t:nothing".');
  assert.equal(errorMessage(new http.errors.ConnectionError("Could not reach Scryfall."), "search"), "Could not reach Scryfall.");
});
