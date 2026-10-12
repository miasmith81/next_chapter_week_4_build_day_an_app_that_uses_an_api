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
