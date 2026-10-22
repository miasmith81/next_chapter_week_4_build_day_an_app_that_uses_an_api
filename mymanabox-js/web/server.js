/**
 * A tiny static file server for the MyManaBox web UI.
 *
 *   npm run web     then open http://localhost:5173
 *
 * Browsers only load ES modules over http:// (not file://), so this serves
 * the mymanabox-js folder. That lets web/app.js import ../apiClient.js,
 * ../cardData.js and ../display.js unchanged: the CLI and the web page share
 * the same code. Nothing to install.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AiConfigurationError,
  AiInputError,
  AiOutputError,
  AiProviderError,
  askGemini,
} from "../aiHelper.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url))); // the mymanabox-js folder
const PORT = Number(process.env.PORT) || 5173;
const MAX_JSON_BYTES = 16_000;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/** Send a short plain-text response, e.g. 404 Not found. */
function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

class JsonRequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "JsonRequestError";
    this.status = status;
  }
}

/** Read a deliberately small JSON body so one request cannot consume the server. */
async function readJson(req) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new JsonRequestError("Content-Type must be application/json.", 415);
  }

  const declaredLength = Number(req.headers["content-length"] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new JsonRequestError("Request body is too large.", 413);
  }

  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) {
      throw new JsonRequestError("Request body is too large.", 413);
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new JsonRequestError("Request body must be valid JSON.");
  }
}

function publicAiError(error) {
  if (error instanceof JsonRequestError || error instanceof AiInputError) {
    return { status: error.status || 400, message: error.message };
  }
  if (error instanceof AiConfigurationError) {
    return { status: 503, message: "ManaGuide is not configured on this server." };
  }
  if (error instanceof AiOutputError) {
    return { status: 502, message: "ManaGuide received an unusable answer. Please try again." };
  }
  if (error instanceof AiProviderError) {
    if (error.status === 429) {
      return { status: 429, message: "ManaGuide is busy right now. Please wait a moment and retry." };
    }
    if (error.status === 504) {
      return { status: 504, message: "ManaGuide took too long to answer. Please retry." };
    }
    return { status: 502, message: "ManaGuide could not reach Gemini. Please try again." };
  }
  return { status: 500, message: "ManaGuide hit an unexpected error." };
}

async function handleChat(req, res, ask) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const body = await readJson(req);
    const result = await ask(body);
    return sendJson(res, 200, result);
  } catch (error) {
    const { status, message } = publicAiError(error);
    return sendJson(res, status, { error: message });
  }
}

export function createMyManaBoxServer({ ask = askGemini } = {}) {
  return createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      return sendText(res, 400, "Bad request");
    }

    if (url.pathname === "/api/chat") {
      return handleChat(req, res, ask);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendText(res, 405, "Method not allowed");
    }

    let pathname;
  try {
      pathname = decodeURIComponent(url.pathname);
  } catch {
      return sendText(res, 400, "Bad request"); // malformed %-encoding
  }

  // The page lives in /web/; send the bare address there.
  if (pathname === "/" || pathname === "/web") {
    res.writeHead(302, { Location: "/web/" });
    return res.end();
  }

  // Never serve hidden files such as .env (settings and keys) or .gitignore.
  // .gitignore only keeps .env out of Git; this check keeps it off the server.
  // Any part of the path that starts with "." counts, e.g. /.env or /web/.env.
  if (pathname.split("/").some((part) => part.startsWith("."))) {
    return sendText(res, 404, "Not found");
  }

  // Resolve the path inside ROOT only, so "/../something" can't escape the folder.
  const filePath = resolve(ROOT, "." + pathname + (pathname.endsWith("/") ? "index.html" : ""));
  if (!filePath.startsWith(ROOT + sep)) {
    return sendText(res, 403, "Forbidden");
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-cache", // always load your latest edits
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    sendText(res, 404, "Not found");
  }
  });
}

export function loadServerEnv() {
  for (const name of [".env", ".env.gemini"]) {
    try {
      process.loadEnvFile(resolve(ROOT, name));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  loadServerEnv();
  const server = createMyManaBoxServer();
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`MyManaBox web UI running at http://localhost:${PORT}/web/  (Ctrl+C to stop)`);
    console.log("ManaGuide backend ready at POST /api/chat");
  });
}
