/**
 * MyManaBox CLI: Magic: The Gathering card lookup via Scryfall.
 *
 * Orchestration only. This file calls apiClient.js, cardData.js and
 * display.js. It has no request logic, no data parsing and no formatting.
 *
 * Commands:
 *   lookup <name>             Look up one card by name (fuzzy matching)
 *   compare <name_a> <name_b> Compare two cards side by side
 *   search <query>            Search cards using Scryfall syntax
 *
 * Examples:
 *   node main.js lookup "lightning bolt"
 *   node main.js lookup "sol ring"
 *   node main.js compare "black lotus" "mox pearl"
 *   node main.js search "t:goblin c:r"
 */

import { pathToFileURL } from "node:url";

import { CliParser } from "./cliParser.js";
import { CliExit, getKey } from "./utils.js";
import { http } from "./http.js";

import * as display from "./display.js";
import { CardNotFoundError, fetchCardByName, searchCards } from "./apiClient.js";
import { compareCards, extractCardSummary } from "./cardData.js";

/** Return true when value has text; otherwise print an error and return false. */
export function validateNonEmpty(value, label) {
  if (!value || !value.trim()) {
    display.printError(`${label} cannot be empty.`);
    return false;
  }
  return true;
}

/** Fetch one card by name and print its detail block. Returns the exit code. */
export async function cmdLookup(args) {
  const name = args.name;
  if (!validateNonEmpty(name, "Card name")) {
    return 1; // stop before any network call
  }

  try {
    const card = await fetchCardByName(name);
    const summary = extractCardSummary(card);
    display.printCardDetail(summary);
    return 0;
  } catch (exc) {
    if (exc instanceof CardNotFoundError) {
      if (exc.ambiguous) {
        display.printError(
          `"${name}" matched several cards. Try a more specific name ` +
            `or add a set code (e.g. "lightning bolt" -> "lightning bolt lea").`
        );
      } else {
        display.printError(`No card found for "${name}".`);
      }
      return 1;
    }
    // Network problems already carry a plain-language message from apiClient.js.
    if (exc instanceof http.errors.RequestError) {
      display.printError(exc.message);
      return 1;
    }
    throw exc;
  }
}

/** Fetch two cards by name and print them side by side. Returns the exit code. */
export async function cmdCompare(args) {
  const [nameA, nameB] = [args.name_a, args.name_b];
  if (!validateNonEmpty(nameA, "First card name")) {
    return 1;
  }
  if (!validateNonEmpty(nameB, "Second card name")) {
    return 1;
  }

  try {
    // One after the other (not Promise.all) so the 100 ms rate-limit pause holds.
    const cardA = await fetchCardByName(nameA);
    const cardB = await fetchCardByName(nameB);
    const comparison = compareCards(cardA, cardB);
    display.printComparison(comparison);
    return 0;
  } catch (exc) {
    if (exc instanceof CardNotFoundError) {
      if (exc.ambiguous) {
        display.printError("One of those names matched several cards. Be more specific.");
      } else {
        display.printError("One or both cards were not found.");
      }
      return 1;
    }
    if (exc instanceof http.errors.RequestError) {
      display.printError(exc.message);
      return 1;
    }
    throw exc;
  }
}

/** Search for cards and print the result list. Returns the exit code. */
export async function cmdSearch(args) {
  const query = args.query;
  if (!validateNonEmpty(query, "Search query")) {
    return 1;
  }

  try {
    const cards = await searchCards(query);
    display.printCardList(cards);
    return 0;
  } catch (exc) {
    if (exc instanceof CardNotFoundError) {
      display.printError(`No cards found for query: "${query}".`);
      return 1;
    }
    if (exc instanceof http.errors.RequestError) {
      display.printError(exc.message);
      return 1;
    }
    throw exc;
  }
}

/** Build and return the command-line parser. */
export function buildParser() {
  const parser = new CliParser({
    prog: "mymanabox",
    description: "MyManaBox: Magic: The Gathering card lookup via Scryfall",
    epilog:
      "Examples:\n" +
      '  node main.js lookup "lightning bolt"\n' +
      '  node main.js compare "black lotus" "mox pearl"\n' +
      '  node main.js search "t:goblin c:r"\n',
  });
  // The chosen command is stored as args.command; help shows it as <command>.
  const commands = parser.addCommands({ dest: "command", metavar: "<command>" });
  commands.required = true; // running with no command is a usage error (exit 2)

  const lookupParser = commands.addCommand("lookup", {
    help: "Look up a card by name (fuzzy matching supported)",
  });
  lookupParser.addArgument("name", { help: 'Card name, e.g. "lightning bolt"' });

  const compareParser = commands.addCommand("compare", {
    help: "Compare two cards side by side",
  });
  compareParser.addArgument("name_a", { help: "First card name" });
  compareParser.addArgument("name_b", { help: "Second card name" });

  const searchParser = commands.addCommand("search", {
    help: "Search cards using Scryfall syntax",
  });
  searchParser.addArgument("query", {
    help: 'Scryfall query, e.g. "t:goblin c:r" or "set:lea"',
  });

  return parser;
}

/**
 * Parse the arguments and run the matching command.
 *
 * Returns 0 on success and 1 on any error. The exit code reaches the shell,
 * so scripts can detect failures without reading the output.
 */
export async function main() {
  const parser = buildParser();
  const args = parser.parseArgs();

  // Command name -> the function that handles it
  const handlers = {
    lookup: cmdLookup,
    compare: cmdCompare,
    search: cmdSearch,
  };

  const handler = getKey(handlers, args.command);
  if (handler === null) {
    parser.printHelp();
    return 1;
  }

  return await handler(args);
}
