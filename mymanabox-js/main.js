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
