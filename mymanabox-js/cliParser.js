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

export class CliParser {
  constructor({ prog, description = null, epilog = null } = {}) {
    this.prog = prog;
    this.description = description;
    this.epilog = epilog;
    this.positionals = []; // [{ name, help }]
    this.commands = null;
  }

  /** Add a required positional argument, e.g. "name". */
  addArgument(name, { help = null } = {}) {
    this.positionals.push({ name, help });
  }

  /** Give this parser sub-commands; returns the Commands object to add them to. */
  addCommands({ dest, metavar }) {
    this.commands = new Commands(this, dest, metavar);
    return this.commands;
  }

  formatUsage() {
    const parts = [this.prog, "[-h]", ...this.positionals.map((p) => p.name)];
    if (this.commands) parts.push(`${this.commands.metavar} ...`);
    return `usage: ${parts.join(" ")}\n`;
  }

  formatHelp() {
    const sections = [this.formatUsage().trimEnd()];
    if (this.description) sections.push(this.description);

    const positionalRows = this.positionals.map((p) => [2, p.name, p.help]);
    if (this.commands) {
      positionalRows.push([2, this.commands.metavar, null]);
      for (const [name, { help }] of this.commands.choices) {
        positionalRows.push([4, name, help]);
      }
    }
    const optionRows = [[2, HELP_INVOCATION, HELP_TEXT]];

    // Every help text lines up in one column, so measure both groups together
    const allLines = formatRows([...positionalRows, ...optionRows]);
    const positionalLines = allLines.slice(0, positionalRows.length);
    const optionLines = allLines.slice(positionalRows.length);

    if (positionalLines.length) {
      sections.push(["positional arguments:", ...positionalLines].join("\n"));
    }
    sections.push(["options:", ...optionLines].join("\n"));
    if (this.epilog) sections.push(this.epilog.trimEnd());
    return sections.join("\n\n") + "\n";
  }

  printHelp() {
    streams.stdout.write(this.formatHelp());
  }

  /** Print usage and the error to stderr, then exit with status 2. */
  error(message) {
    streams.stderr.write(this.formatUsage());
    streams.stderr.write(`${this.prog}: error: ${message}\n`);
    throw new CliExit(2);
  }
  /**
   * Parse the command line into a plain object,
   * e.g. { command: "lookup", name: "sol ring" }.
   */
  parseArgs(args = process.argv.slice(2)) {
    const extras = []; // unknown options and extra values, reported together
    let i = 0;

    // Options that come before the command name
    while (i < args.length) {
      const arg = args[i];
      if (isHelp(arg)) {
        this.printHelp();
        throw new CliExit(0);
      }
      if (arg === "--") {
        i += 1;
        break;
      }
      if (!isOption(arg)) break;
      extras.push(arg);
      i += 1;
    }

    if (i >= args.length) {
      if (this.commands.required) {
        this.error(`the following arguments are required: ${this.commands.metavar}`);
      }
      return { [this.commands.dest]: null };
    }

    const command = args[i];
    const choice = this.commands.choices.get(command);
    if (!choice) {
      const options = [...this.commands.choices.keys()].map((name) => `'${name}'`).join(", ");
      this.error(`argument ${this.commands.metavar}: invalid choice: '${command}' (choose from ${options})`);
    }

    // Everything after the command name belongs to that command's parser
    const sub = choice.parser;
    const values = [];
    let onlyValues = false; // true after "--": everything is a value
    for (const arg of args.slice(i + 1)) {
      if (!onlyValues && arg === "--") {
        onlyValues = true;
      } else if (!onlyValues && isHelp(arg)) {
        sub.printHelp();
        throw new CliExit(0);
      } else if (!onlyValues && isOption(arg)) {
        extras.push(arg);
      } else if (values.length < sub.positionals.length) {
        values.push(arg);
      } else {
        extras.push(arg);
      }
    }

    if (values.length < sub.positionals.length) {
      const missing = sub.positionals.slice(values.length).map((p) => p.name);
      sub.error(`the following arguments are required: ${missing.join(", ")}`);
    }
    if (extras.length) {
      this.error(`unrecognized arguments: ${extras.join(" ")}`);
    }

    const result = { [this.commands.dest]: command };
    sub.positionals.forEach((p, index) => {
      result[p.name] = values[index];
    });
    return result;
  }
}
