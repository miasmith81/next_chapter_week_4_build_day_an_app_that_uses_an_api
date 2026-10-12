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
