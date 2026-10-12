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

/** Return the standard request headers, including the User-Agent. */
export function buildHeaders() {
  return { "User-Agent": USER_AGENT, Accept: "application/json" };
}

/**
 * Fetch one card by name using Scryfall's fuzzy matching.
 *
 * @param {string} name Card name; small misspellings are fine.
 * @returns {Promise<object>} The raw Scryfall card object.
 * @throws {CardNotFoundError} On 404 (no match or an ambiguous match).
 * @throws {http.errors.RequestTimeoutError} When Scryfall does not answer in time.
 * @throws {http.errors.ConnectionError} When Scryfall cannot be reached.
 * @throws {http.errors.HttpError} On other 4xx and 5xx responses.
 * @throws {http.errors.RequestError} On any other network failure.
 */
export async function fetchCardByName(name) {
  await timer.sleep(100); // 100 ms pause: respects Scryfall's rate limit
  try {
    const response = await http.get(`${BASE_URL}/cards/named`, {
      params: { fuzzy: name },
      headers: buildHeaders(),
      timeout: TIMEOUT,
    });
    if (response.statusCode === 404) {
      // A proxy or CDN can replace Scryfall's JSON error with an HTML or
      // plain-text page. A 404 is still a normal "not found", so a body that
      // is not JSON must not skip the friendly error below.
      let body;
      try {
        body = response.json();
      } catch (err) {
        if (err instanceof http.errors.JsonParseError || err instanceof TypeError) {
          body = {};
        } else {
          throw err;
        }
      }
      // Only a plain object can carry a "details" message.
      const isObject = typeof body === "object" && body !== null && !Array.isArray(body);
      let details = isObject ? getKey(body, "details", "") : "";
      if (typeof details !== "string") {
        details = "";
      }
      // Scryfall says "too many cards" when the fuzzy name is ambiguous.
      const ambiguous =
        details.toLowerCase().includes("too many") || details.toLowerCase().includes("ambiguous");
      throw new CardNotFoundError(details || `No card found: ${name}`, ambiguous);
    }
    response.raiseForStatus(); // throws HttpError for any other 4xx or 5xx
    return response.json();
  } catch (exc) {
    // Our own "not found" error passes straight through.
    if (exc instanceof CardNotFoundError) {
      throw exc;
    }
    // Replace low-level messages with plain-language ones the CLI can print.
    // Order matters: RequestError is the parent of the other three classes.
    if (exc instanceof http.errors.RequestTimeoutError) {
      throw new http.errors.RequestTimeoutError(
        `Scryfall did not respond within ${TIMEOUT}s. Check your connection.`
      );
    }
    if (exc instanceof http.errors.ConnectionError) {
      throw new http.errors.ConnectionError(
        "Could not reach Scryfall. Check your internet connection."
      );
    }
    if (exc instanceof http.errors.HttpError) {
      throw new http.errors.HttpError(`Scryfall returned an error: ${exc.message}`, {
        cause: exc,
      });
    }
    if (exc instanceof http.errors.RequestError) {
      throw new http.errors.RequestError(`Unexpected network error: ${exc.message}`, {
        cause: exc,
      });
    }
    throw exc; // anything else is a real bug: let it crash loudly
  }
}

/**
 * Search for cards matching a Scryfall query string.
 *
 * Returns the first page of results (up to 175 cards per page).
 *
 * @param {string} query Full Scryfall search syntax, e.g. "t:goblin c:r".
 * @returns {Promise<object[]>} Array of raw Scryfall card objects.
 * @throws {CardNotFoundError} When the query matches nothing.
 * @throws {http.errors.RequestTimeoutError} When Scryfall does not answer in time.
 * @throws {http.errors.ConnectionError} When Scryfall cannot be reached.
 * @throws {http.errors.HttpError} On other 4xx and 5xx responses.
 * @throws {http.errors.RequestError} On any other network failure.
 */
export async function searchCards(query) {
  await timer.sleep(100); // 100 ms pause: respects Scryfall's rate limit
  try {
    const response = await http.get(`${BASE_URL}/cards/search`, {
      params: { q: query },
      headers: buildHeaders(),
      timeout: TIMEOUT,
    });
    if (response.statusCode === 404) {
      throw new CardNotFoundError(`No cards found for query: ${query}`);
    }
    response.raiseForStatus();
    const data = response.json();
    // TODO: pagination via data["has_more"] and data["next_page"]
    return getKey(data, "data", []);
  } catch (exc) {
    // Same error translation as fetchCardByName.
    if (exc instanceof CardNotFoundError) {
      throw exc;
    }
    if (exc instanceof http.errors.RequestTimeoutError) {
      throw new http.errors.RequestTimeoutError(
        `Scryfall did not respond within ${TIMEOUT}s. Check your connection.`
      );
    }
    if (exc instanceof http.errors.ConnectionError) {
      throw new http.errors.ConnectionError(
        "Could not reach Scryfall. Check your internet connection."
      );
    }
    if (exc instanceof http.errors.HttpError) {
      throw new http.errors.HttpError(`Scryfall returned an error: ${exc.message}`, {
        cause: exc,
      });
    }
    if (exc instanceof http.errors.RequestError) {
      throw new http.errors.RequestError(`Unexpected network error: ${exc.message}`, {
        cause: exc,
      });
    }
    throw exc;
  }
}
