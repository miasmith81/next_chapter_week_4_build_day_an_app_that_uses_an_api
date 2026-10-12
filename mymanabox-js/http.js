/**
 * A tiny HTTP layer on top of Node's built-in fetch: http.get(url, options),
 * a response object (statusCode, json(), raiseForStatus()) and one error
 * class per failure type. Nothing to install.
 */

/** Base class for every HTTP failure, so callers can catch them all at once. */
class RequestError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
}

/** The server did not answer within the timeout. */
class RequestTimeoutError extends RequestError {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestTimeoutError";
  }
}

/** The host could not be reached (no internet, DNS failure, connection refused or reset). */
class ConnectionError extends RequestError {
  constructor(message, options) {
    super(message, options);
    this.name = "ConnectionError";
  }
}

/** The server answered with a 4xx or 5xx status. */
class HttpError extends RequestError {
  constructor(message, options) {
    super(message, options);
    this.name = "HttpError";
  }
}

/** The response body was not valid JSON. */
class JsonParseError extends RequestError {
  constructor(message, options) {
    super(message, options);
    this.name = "JsonParseError";
  }
}

/** The result of http.get. The body is already downloaded, so json() is synchronous. */
class Response {
  constructor(statusCode, reason, url, text) {
    this.statusCode = statusCode;
    this.reason = reason;
    this.url = url;
    this.text = text;
  }

  /** Parse the body as JSON, or throw JsonParseError. */
  json() {
    try {
      return JSON.parse(this.text);
    } catch (err) {
      throw new JsonParseError(err.message);
    }
  }

  /** Throw HttpError for 4xx and 5xx statuses; do nothing otherwise. */
  raiseForStatus() {
    let httpErrorMsg = "";
    if (this.statusCode >= 400 && this.statusCode < 500) {
      httpErrorMsg = `${this.statusCode} Client Error: ${this.reason} for url: ${this.url}`;
    } else if (this.statusCode >= 500 && this.statusCode < 600) {
      httpErrorMsg = `${this.statusCode} Server Error: ${this.reason} for url: ${this.url}`;
    }
    if (httpErrorMsg) {
      throw new HttpError(httpErrorMsg);
    }
  }
}

/**
 * GET a URL. `params` become the query string, `timeout` is in seconds.
 * fetch failures are turned into the matching error class above.
 */
async function get(url, { params = {}, headers = {}, timeout = null } = {}) {
  const fullUrl = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    fullUrl.searchParams.append(key, value); // spaces become "+", ":" becomes "%3A"
  }

  try {
    const res = await fetch(fullUrl, {
      headers,
      signal: timeout === null ? undefined : AbortSignal.timeout(timeout * 1000),
    });
    const text = await res.text(); // download the whole body now
    return new Response(res.status, res.statusText, res.url, text);
  } catch (err) {
    if (err.name === "TimeoutError") {
      throw new RequestTimeoutError(err.message);
    }
    if (err instanceof TypeError) {
      // fetch() reports DNS failures, refused connections and resets as TypeError("fetch failed")
      throw new ConnectionError(err.cause?.message ?? err.message);
    }
    throw new RequestError(err.message);
  }
}

/** One object so callers write http.get(...) and http.errors.HttpError, and tests can replace get. */
export const http = {
  get,
  errors: { RequestError, RequestTimeoutError, ConnectionError, HttpError, JsonParseError },
};
