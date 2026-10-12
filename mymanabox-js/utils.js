/**
 * Small helpers the app relies on.
 *
 * Each one fills a gap in JavaScript's built-ins. Nothing here adds a feature.
 */

/** The program's output streams. Tests swap stdout.write to capture output. */
export const streams = {
  stdout: { write: (text) => process.stdout.write(text) },
  stderr: { write: (text) => process.stderr.write(text) },
};

/** Join the arguments with a space, add a newline, and write them to stdout. */
export function print(...args) {
  streams.stdout.write(args.map(String).join(" ") + "\n");
}

/** Pause for ms milliseconds: await timer.sleep(100). An object so tests can replace it. */
export const timer = {
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Thrown when a value has the right type but is not usable, e.g. toNumber("abc"). */
export class InvalidValueError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidValueError";
  }
}

/** Thrown by the command-line parser to end the program; main.js turns it into the exit code. */
export class CliExit extends Error {
  constructor(code) {
    super(`CliExit: ${code}`);
    this.name = "CliExit";
    this.code = code;
  }
}

/**
 * Read obj[key], or return fallback when the key is ABSENT.
 * A key that is present with the value null comes back as null, so this
 * cannot be written as obj[key] ?? fallback (?? would also replace null).
 */
export function getKey(obj, key, fallback = null) {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    throw new TypeError(`Cannot read key "${key}" from a non-object value`);
  }
  return Object.hasOwn(obj, key) ? obj[key] : fallback;
}

/** First character upper case, the rest lower case: "mYTHIC" -> "Mythic". */
export function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Accepts "1.25", " 2.5 ", "1e3", ".5", "5." and "1_000.5" (underscore digit groups).
const NUMBER_PATTERN =
  /^[+-]?(\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?$/;

/**
 * Strictly convert a price value to a number.
 * Number() is too forgiving (Number("") is 0 and Number("abc") is NaN), so
 * this throws instead: InvalidValueError for text that is not a number and
 * TypeError for null, objects and arrays. Callers catch both and show "n/a".
 */
export function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value !== "string") {
    throw new TypeError(`toNumber() expects a string or a number, not ${value === null ? "null" : typeof value}`);
  }
  const trimmed = value.trim();
  if (!NUMBER_PATTERN.test(trimmed)) {
    throw new InvalidValueError(`Not a number: '${value}'`);
  }
  return Number(trimmed.replaceAll("_", ""));
}

/**
 * Format a number with a fixed number of decimals, rounding exact ties to
 * the even digit: formatFixed(0.125, 2) is "0.12" (toFixed alone gives "0.13").
 */
export function formatFixed(value, digits) {
  const rounded = value.toFixed(digits);
  const exact = Math.abs(value).toFixed(100); // the number's full decimal expansion
  const point = exact.indexOf(".");
  const rest = exact.slice(point + 1 + digits);
  const isTie = rest[0] === "5" && /^0*$/.test(rest.slice(1));
  if (!isTie) return rounded;
  const truncated = exact.slice(0, digits === 0 ? point : point + 1 + digits);
  const lastDigit = Number(truncated[truncated.length - 1]);
  if (lastDigit % 2 === 1) return rounded; // odd: rounding up makes it even
  return (value < 0 ? "-" : "") + truncated; // even: keep it
}
