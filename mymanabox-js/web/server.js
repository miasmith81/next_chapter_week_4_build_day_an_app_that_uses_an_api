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

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url))); // the mymanabox-js folder
const PORT = Number(process.env.PORT) || 5173;

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

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendText(res, 405, "Method not allowed");
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return sendText(res, 400, "Bad request"); // malformed %-encoding
  }

  // The page lives in /web/; send the bare address there.
  if (pathname === "/" || pathname === "/web") {
    res.writeHead(302, { Location: "/web/" });
    return res.end();
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

server.listen(PORT, "127.0.0.1", () => {
  console.log(`MyManaBox web UI running at http://localhost:${PORT}/web/  (Ctrl+C to stop)`);
});
