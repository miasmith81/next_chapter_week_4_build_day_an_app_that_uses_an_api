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
