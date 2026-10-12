/**
 * Scryfall API client for MyManaBox.
 *
 * Every network call in the application goes through this module.
 * Scryfall is free and needs no API key.
 *
 * Base URL:   https://api.scryfall.com
 * Rate limit: about 10 requests per second; we wait 100 ms before each request to stay polite.
 * Timeout:    10 seconds per request. fetch has no default timeout, so without
 *             one a hung connection would freeze the CLI forever.
 */

import { timer, getKey } from "./utils.js";
import { http } from "./http.js";

// Scryfall asks every client to identify itself with a User-Agent header.
export const USER_AGENT = "MyManaBox/1.0 (github.com/StrayDogSyn/scryfall-cli)";
export const BASE_URL = "https://api.scryfall.com";
export const TIMEOUT = 10; // seconds; http.get turns this into milliseconds

/**
 * Thrown when Scryfall returns 404 for a card lookup.
 *
 * Scryfall uses 404 for two different cases:
 *   - No card matched the name at all.
 *   - The fuzzy name matched several cards (ambiguous).
 * The `ambiguous` property lets the caller print a targeted message.
 */
export class CardNotFoundError extends Error {
  constructor(message, ambiguous = false) {
    super(message);
    this.name = "CardNotFoundError";
    this.ambiguous = ambiguous;
  }
}
