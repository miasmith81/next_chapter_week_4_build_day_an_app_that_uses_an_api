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
