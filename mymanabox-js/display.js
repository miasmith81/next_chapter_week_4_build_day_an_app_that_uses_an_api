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

/**
 * Print one card as an aligned, labeled block.
 *
 * @param {object} summary Object from cardData.extractCardSummary().
 */
export function printCardDetail(summary) {
  const name = getKey(summary, "name", "Unknown");
  const bar = "-".repeat(Math.max(name.length + 4, 40));

  // padEnd(14) pads every label to 14 characters so the values line up.
  print();
  print(`  ${name}`);
  print(`  ${bar}`);
  print(`  ${"Mana Cost".padEnd(14)} ${formatField(getKey(summary, "mana_cost"))}`);
  print(`  ${"Type".padEnd(14)} ${formatField(getKey(summary, "type_line"))}`);
  print(`  ${"Rarity".padEnd(14)} ${formatField(getKey(summary, "rarity"))}`);
  print(`  ${"Set".padEnd(14)} ${formatField(getKey(summary, "set_name"))}`);
  print(`  ${"Released".padEnd(14)} ${formatField(getKey(summary, "released_at"))}`);
  print(`  ${"Price (USD)".padEnd(14)} ${formatPrice(getKey(summary, "price_usd"))}`);

  // Creatures only: the P/T row appears when both keys exist.
  if (Object.hasOwn(summary, "power") && Object.hasOwn(summary, "toughness")) {
    print(`  ${"P/T".padEnd(14)} ${summary["power"]}/${summary["toughness"]}`);
  }

  const oracle = getKey(summary, "oracle_text", "");
  if (oracle) {
    print();
    for (const line of wrapText(oracle)) {
      print(`  ${line}`);
    }
  }

  print(`\n  ${"Artist".padEnd(14)} ${formatField(getKey(summary, "artist"))}`);
  print();
}

/**
 * Print two cards in aligned side-by-side columns.
 *
 * @param {object} comparison { a, b } from cardData.compareCards().
 */
export function printComparison(comparison) {
  const a = getKey(comparison, "a", {});
  const b = getKey(comparison, "b", {});

  const divider = `  ${"-".repeat(COLUMN_WIDTH + 3 + COLUMN_WIDTH)}`;
  const header = `  ${"CARD A".padEnd(COLUMN_WIDTH)} | CARD B`;
  print();
  print(header);
  print(divider);

  // [label, data key, formatter] for each row
  const fields = [
    ["Name",        "name",      formatField],
    ["Mana Cost",   "mana_cost", formatField],
    ["Type",        "type_line", formatField],
    ["Rarity",      "rarity",    formatField],
    ["Set",         "set_name",  formatField],
    ["Price (USD)", "price_usd", formatPrice],
  ];

  for (const [label, key, format] of fields) {
    const valueA = format(getKey(a, key));
    const valueB = format(getKey(b, key));
    const cellA = `${label}: ${valueA}`;
    const cellB = `${label}: ${valueB}`;
    print(`  ${cellA.padEnd(COLUMN_WIDTH)} | ${cellB}`);
  }

  // P/T row: shown when either card has power or toughness
  if ([a, b].some((card) => ["power", "toughness"].some((key) => Object.hasOwn(card, key)))) {
    const ptA = formatPowerToughness(a);
    const ptB = formatPowerToughness(b);
    const cellA = `P/T: ${ptA}`;
    const cellB = `P/T: ${ptB}`;
    print(`  ${cellA.padEnd(COLUMN_WIDTH)} | ${cellB}`);
  }

  print();
}
