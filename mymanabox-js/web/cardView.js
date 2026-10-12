/**
 * Pure helpers for the web UI.
 *
 * They turn raw Scryfall card objects into the small pieces the page shows
 * (pictures, card faces, mana symbols, legality rows, error messages).
 * No DOM code here, so the same functions run in the browser and in
 * `npm test` (see tests/cardView.test.js).
 */

import { getKey } from "../utils.js";
import { CardNotFoundError } from "../apiClient.js";
import { getLegality, getPrice } from "../cardData.js";
import { http } from "../http.js";

// Scryfall hosts an SVG for every symbol: {R} -> R.svg, {W/U} -> WU.svg, {T} -> T.svg
export const SYMBOL_BASE = "https://svgs.scryfall.io/card-symbols/";
const SPECIAL_SYMBOL_FILES = { "½": "HALF", "∞": "INFINITY" };

/**
 * Split text such as "{T}: Add {C}{C}." into plain-text and symbol parts:
 * [{ type: "symbol", value: "{T}", url }, { type: "text", value: ": Add " }, ...]
 */
export function parseSymbols(text) {
  const source = String(text ?? "");
  const parts = [];
  let last = 0;
  for (const match of source.matchAll(/\{([^}]+)\}/g)) {
    if (match.index > last) {
      parts.push({ type: "text", value: source.slice(last, match.index) });
    }
    const code = SPECIAL_SYMBOL_FILES[match[1]] ?? match[1].replaceAll("/", "");
    parts.push({ type: "symbol", value: match[0], url: `${SYMBOL_BASE}${encodeURIComponent(code)}.svg` });
    last = match.index + match[0].length;
  }
  if (last < source.length) {
    parts.push({ type: "text", value: source.slice(last) });
  }
  return parts;
}

/**
 * The faces of a card. Double-faced cards (Delver of Secrets) and flip cards
 * keep their text in card_faces; every other card is its own single face.
 */
export function cardFaces(card) {
  const faces = getKey(card, "card_faces", null);
  return Array.isArray(faces) && faces.length > 0 ? faces : [card];
}

/**
 * Picture URL for one face of a card. Sizes: "normal" (488x680), "large"
 * (672x936) and "art_crop" (just the artwork). Returns null when Scryfall has none.
 */
export function cardImage(card, size = "normal", faceIndex = 0) {
  const faces = cardFaces(card);
  const face = faces[faceIndex] ?? faces[0];
  // Transform cards keep a picture per face; flip and split cards keep one on the card.
  const uris = getKey(face, "image_uris", null) || getKey(card, "image_uris", null) || {};
  return getKey(uris, size, null);
}

/** True when each side has its own picture, so the page can offer a "flip" button. */
export function hasBackFace(card) {
  return cardFaces(card).filter((face) => getKey(face, "image_uris", null)).length > 1;
}

/** Text fields of one face, with "" for anything missing, ready to display. */
export function faceDetails(face) {
  const text = (key) => {
    const value = getKey(face, key, null);
    return value === null ? "" : String(value);
  };
  return {
    name: text("name"),
    manaCost: text("mana_cost"),
    typeLine: text("type_line"),
    oracleText: text("oracle_text"),
    flavorText: text("flavor_text"),
    power: text("power"),
    toughness: text("toughness"),
    loyalty: text("loyalty"),
  };
}

// The formats shown on the card page, in the order players usually look for them.
export const FORMATS = [
  ["standard", "Standard"],
  ["pioneer", "Pioneer"],
  ["modern", "Modern"],
  ["legacy", "Legacy"],
  ["vintage", "Vintage"],
  ["commander", "Commander"],
  ["pauper", "Pauper"],
  ["historic", "Historic"],
  ["timeless", "Timeless"],
  ["brawl", "Brawl"],
  ["oathbreaker", "Oathbreaker"],
  ["penny", "Penny"],
];

const LEGALITY_TEXT = {
  legal: "Legal",
  not_legal: "Not legal",
  banned: "Banned",
  restricted: "Restricted",
  unknown: "Unknown",
};

/** One row per format: { key, label, status, text }, using cardData.getLegality. */
export function legalityRows(card) {
  return FORMATS.map(([key, label]) => {
    const status = getLegality(card, key);
    return { key, label, status, text: LEGALITY_TEXT[status] ?? status };
  });
}

/**
 * Sort a copy of the search results. "relevance" keeps Scryfall's order;
 * cards without a price go last when sorting by price.
 */
export function sortCards(cards, mode) {
  const priced = (card) => getPrice(card);
  const sorted = [...cards];
  if (mode === "price-desc") {
    sorted.sort((a, b) => (priced(b) ?? -1) - (priced(a) ?? -1));
  } else if (mode === "price-asc") {
    sorted.sort((a, b) => (priced(a) ?? Infinity) - (priced(b) ?? Infinity));
  } else if (mode === "cmc") {
    sorted.sort((a, b) => getKey(a, "cmc", 0) - getKey(b, "cmc", 0));
  } else if (mode === "name") {
    sorted.sort((a, b) => getKey(a, "name", "").localeCompare(getKey(b, "name", "")));
  }
  return sorted;
}

/**
 * The plain-language message for a failed lookup, compare or search.
 * Same wording as main.js, so the CLI and the web page say the same thing.
 */
export function errorMessage(exc, command, input = "") {
  if (exc instanceof CardNotFoundError) {
    if (command === "lookup") {
      return exc.ambiguous
        ? `"${input}" matched several cards. Try a more specific name ` +
            `or add a set code (e.g. "lightning bolt" -> "lightning bolt lea").`
        : `No card found for "${input}".`;
    }
    if (command === "compare") {
      return exc.ambiguous
        ? "One of those names matched several cards. Be more specific."
        : "One or both cards were not found.";
    }
    return `No cards found for query: "${input}".`;
  }
  // Network problems already carry a friendly message from apiClient.js.
  if (exc instanceof http.errors.RequestError) {
    return exc.message;
  }
  return "Something unexpected went wrong. Please try again.";
}
