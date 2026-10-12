/**
 * A small command-line parser for this app: a program with sub-commands
 * (lookup, compare, search), each with positional arguments.
 *
 * Help (-h / --help) prints to stdout and exits 0. Mistakes print a usage
 * line and an error to stderr and exit 2 (by throwing CliExit, which
 * main.js turns into the exit code).
 */

import { streams, CliExit } from "./utils.js";

const HELP_INVOCATION = "-h, --help";
const HELP_TEXT = "show this help message and exit";
const MAX_HELP_POSITION = 24;

/** True for -h, --help, or an abbreviation of --help such as --he. */
function isHelp(arg) {
  return arg === "-h" || (arg.length >= 3 && "--help".startsWith(arg));
}

/**
 * True when arg looks like an option rather than a value.
 * Negative numbers, a lone "-", and strings with a space stay values.
 */
function isOption(arg) {
  if (!arg.startsWith("-") || arg === "-") return false;
  if (/^-\d+$|^-\d*\.\d+$/.test(arg)) return false;
  if (arg.includes(" ")) return false;
  return true;
}

/** Lay out [indent, invocation, help] rows with every help text in one column. */
function formatRows(rows) {
  const longest = Math.max(...rows.map(([indent, invocation]) => indent + invocation.length));
  const helpPosition = Math.min(longest + 2, MAX_HELP_POSITION);
  return rows.map(([indent, invocation, help]) => {
    const left = " ".repeat(indent) + invocation;
    if (help === null) return left;
    if (left.length + 2 > helpPosition) {
      return left + "\n" + " ".repeat(helpPosition) + help;
    }
    return left.padEnd(helpPosition) + help;
  });
}

/** The set of sub-commands (lookup, compare, search) that belongs to one parser. */
class Commands {
  constructor(parent, dest, metavar) {
    this.parent = parent;
    this.dest = dest; // the key the chosen command is stored under, e.g. "command"
    this.metavar = metavar; // how the command slot is shown in help, e.g. "<command>"
    this.required = false;
    this.choices = new Map(); // name -> { parser, help }
  }

  /** Add a sub-command and return its own parser, for adding its arguments. */
  addCommand(name, { help = null } = {}) {
    const parser = new CliParser({ prog: `${this.parent.prog} ${name}` });
    this.choices.set(name, { parser, help });
    return parser;
  }
}
