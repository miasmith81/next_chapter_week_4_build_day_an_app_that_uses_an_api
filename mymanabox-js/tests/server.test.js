import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import { AiProviderError } from "../aiHelper.js";
import { createMyManaBoxServer } from "../web/server.js";

const servers = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise((resolve) => server.close(resolve))
    )
  );
});

async function startServer(ask) {
  const server = createMyManaBoxServer({ ask });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test("POST /api/chat returns the validated assistant result", async () => {
  let received;
  const baseUrl = await startServer(async (body) => {
    received = body;
    return { answer: "A concise answer.", model: "gemini-3.6-flash" };
  });

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "What is vigilance?" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { question: "What is vigilance?" });
  assert.deepEqual(await response.json(), {
    answer: "A concise answer.",
    model: "gemini-3.6-flash",
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("POST /api/chat rejects malformed and oversized input before Gemini", async () => {
  const baseUrl = await startServer(async () => assert.fail("must not call Gemini"));

  const malformed = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad json",
  });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /valid JSON/);

  const oversized = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "x".repeat(17_000) }),
  });
  assert.equal(oversized.status, 413);
});

test("POST /api/chat hides provider details behind a retryable message", async () => {
  const baseUrl = await startServer(async () => {
    throw new AiProviderError("secret provider detail", { status: 429 });
  });

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "What is trample?" }),
  });
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.match(body.error, /busy right now/);
  assert.doesNotMatch(body.error, /secret provider detail/);
});

test("GET /api/chat is rejected and hidden files stay private", async () => {
  const baseUrl = await startServer(async () => ({ answer: "unused" }));

  const wrongMethod = await fetch(`${baseUrl}/api/chat`);
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("allow"), "POST");

  const hiddenFile = await fetch(`${baseUrl}/.env`);
  assert.equal(hiddenFile.status, 404);
});
