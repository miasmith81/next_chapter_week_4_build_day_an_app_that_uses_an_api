/**
 * Output formatting for the MyManaBox CLI.
 *
 * No network calls. No user input. No business logic.
 * Every function takes data and prints formatted text, with no libraries.
 *
 * null and empty values from cardData.js are handled here:
 *   - price_usd of null        -> prints as "n/a"
 *   - mana_cost of ""          -> prints as "n/a"
 *   - missing power/toughness  -> the row is left out
 */

import { print, getKey, capitalize, toNumber, formatFixed, InvalidValueError } from "./utils.js";

const COLUMN_WIDTH = 38; // width of each column in the side-by-side view
const WRAP_WIDTH = 62; // oracle text wraps at this many characters

/** Format a price for display: 0.79 -> "$0.79", missing or invalid -> "n/a". */
export function formatPrice(price) {
  if (price === null || price === "") {
    return "n/a";
  }
  try {
    return `$${formatFixed(toNumber(price), 2)}`;
  } catch (err) {
    if (err instanceof InvalidValueError || err instanceof TypeError) {
      return "n/a";
    }
    throw err;
  }
}

/** Return value as text when it has content, otherwise the fallback. */
export function formatField(value, fallback = "n/a") {
  if (value === null || String(value).trim() === "") {
    return fallback;
  }
  return String(value);
}

/** Format power/toughness as "2/2", or "n/a" unless both halves exist. */
export function formatPowerToughness(card) {
  const power = getKey(card, "power");
  const toughness = getKey(card, "toughness");
  if (power === null || toughness === null) {
    return "n/a";
  }
  return `${power}/${toughness}`;
}

/** Split text into lines of at most `width` characters, breaking between words. */
export function wrapText(text, width = WRAP_WIDTH) {
  const words = text.split(/\s+/).filter((word) => word !== ""); // any run of spaces/newlines splits
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > width) {
      // This word would overflow: finish the current line and start a new one.
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}
