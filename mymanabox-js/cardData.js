/**
 * Card data processing for MyManaBox.
 *
 * Turns raw Scryfall objects into clean, flat JavaScript objects.
 * No network calls. No printing. Pure data transformation.
 *
 * Every field read uses getKey() with an explicit fallback because Scryfall
 * really does leave fields out, not just set them to null:
 *   - Creatures have "power" and "toughness"; Sol Ring does not.
 *   - Arena-only cards often have no "usd" price at all.
 *   - "mana_cost" is an empty string (not null) on lands and some artifacts.
 */

import { getKey, capitalize, toNumber, InvalidValueError } from "./utils.js";

/**
 * Pick the display-ready fields out of a raw Scryfall card object.
 *
 * Always included: name, mana_cost, cmc, type_line, rarity, set_name,
 *                  oracle_text, artist, released_at, price_usd.
 * Only sometimes:  power and toughness (creature cards only).
 *
 * @param {object} card Raw Scryfall card object.
 * @returns {object} Flat object ready for the display layer.
 */
export function extractCardSummary(card) {
  const summary = {
    name: getKey(card, "name", "Unknown"),
    mana_cost: getKey(card, "mana_cost", ""), // "" on Sol Ring and lands
    cmc: getKey(card, "cmc", 0),
    type_line: getKey(card, "type_line", "Unknown"),
    rarity: capitalize(getKey(card, "rarity") || "unknown"),
    set_name: getKey(card, "set_name", "Unknown"),
    oracle_text: getKey(card, "oracle_text", ""),
    artist: getKey(card, "artist", "Unknown"),
    released_at: getKey(card, "released_at", "Unknown"),
    price_usd: getPrice(card),
  };

  // power and toughness are missing on non-creatures. Don't fill in a
  // placeholder: their absence tells the display layer to skip the P/T row.
  // They count as one field: if only one half exists the data is broken,
  // so leave both out rather than show half a value.
  if (getKey(card, "power") !== null && getKey(card, "toughness") !== null) {
    summary["power"] = card["power"];
    summary["toughness"] = card["toughness"];
  }

  return summary;
}

/**
 * Return the USD market price as a number, or null when there isn't one.
 *
 * Scryfall sends prices as strings ("0.79") or null; converting here means
 * the display layer always gets the same type.
 *
 * @param {object} card Raw Scryfall card object.
 * @returns {number|null} Price in USD, or null when missing or invalid.
 */
export function getPrice(card) {
  const prices = getKey(card, "prices") || {}; // "prices" can be missing or null
  const usd = getKey(prices, "usd");
  if (usd === null) {
    return null;
  }
  try {
    return toNumber(usd);
  } catch (err) {
    // "not-a-price" -> InvalidValueError; an object or array -> TypeError
    if (err instanceof InvalidValueError || err instanceof TypeError) {
      return null;
    }
    throw err;
  }
}

/**
 * Return the card's legality in one format.
 *
 * @param {object} card Raw Scryfall card object.
 * @param {string} fmt Format name, e.g. "standard", "commander", "modern".
 * @returns {string} "legal", "not_legal", "banned", "restricted",
 *   or "unknown" when the format isn't listed.
 */
export function getLegality(card, fmt) {
  const legalities = getKey(card, "legalities") || {};
  return getKey(legalities, fmt, "unknown");
}
