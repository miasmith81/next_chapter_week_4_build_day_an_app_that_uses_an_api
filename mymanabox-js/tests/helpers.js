/** Test helpers shared by the test files. */

import { streams } from "../utils.js";

/** Run fn(...args) (sync or async) and return its result plus everything it printed. */
export async function capture(fn, ...args) {
  let output = "";
  const original = streams.stdout.write;
  streams.stdout.write = (text) => {
    output += text;
  };
  try {
    const result = await fn(...args);
    return { result, output };
  } finally {
    streams.stdout.write = original; // always restore, even when fn throws
  }
}

/** A fake http.get response: a status code, a JSON body (or a JSON error), and a call counter. */
export function fakeResponse(statusCode, { json = undefined, jsonError = null } = {}) {
  let raiseForStatusCalls = 0;
  return {
    statusCode,
    json() {
      if (jsonError) throw jsonError;
      return json;
    },
    raiseForStatus() {
      raiseForStatusCalls += 1;
    },
    get raiseForStatusCalls() {
      return raiseForStatusCalls;
    },
  };
}
