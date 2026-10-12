// ES module imports can't be swapped from outside, so these tests replace
// one level lower (http.get and timer.sleep) and check the same behavior.

import { test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import * as main from "../main.js";
import { BASE_URL, buildHeaders, TIMEOUT } from "../apiClient.js";
import { timer } from "../utils.js";
import { http } from "../http.js";
import { capture, fakeResponse } from "./helpers.js";

let mockGet;

beforeEach(() => {
  mock.method(timer, "sleep", async () => {});
  mockGet = mock.method(http, "get");
});

afterEach(() => {
  mock.restoreAll();
});

test("lookup success", async () => {
  mockGet.mock.mockImplementation(async () =>
    fakeResponse(200, { json: { name: "Lightning Bolt", prices: { usd: "0.79" } } })
  );

  const { result, output } = await capture(main.cmdLookup, { name: "lightning bolt" });

  assert.equal(result, 0);
  assert.equal(mockGet.mock.callCount(), 1);
  assert.deepEqual(mockGet.mock.calls[0].arguments, [
    `${BASE_URL}/cards/named`,
    { params: { fuzzy: "lightning bolt" }, headers: buildHeaders(), timeout: TIMEOUT },
  ]);
  assert.ok(output.includes("Lightning Bolt"));
  assert.ok(output.includes("$0.79"));
});

test("lookup rejects blank input without network call", async () => {
  const { result, output } = await capture(main.cmdLookup, { name: "   " });

  assert.equal(result, 1);
  assert.ok(output.includes("Card name cannot be empty"));
  assert.equal(mockGet.mock.callCount(), 0);
});

test("lookup reports not found and ambiguous errors", async (t) => {
  const cases = [
    [false, "No card found", "No cards found matching that"],
    [true, '"jace" matched several cards. Try a more specific name, such as the full card name.', "Too many cards match"],
  ];
  for (const [ambiguous, expected, details] of cases) {
    await t.test(`ambiguous=${ambiguous}`, async () => {
      mockGet.mock.mockImplementation(async () => fakeResponse(404, { json: { details } }));
      const { result, output } = await capture(main.cmdLookup, { name: "jace" });
      assert.equal(result, 1);
      assert.ok(output.includes(expected));
    });
  }
});

test("lookup reports request errors", async () => {
  mockGet.mock.mockImplementation(async () => {
    throw new http.errors.RequestTimeoutError("timed out");
  });

  const { result, output } = await capture(main.cmdLookup, { name: "lightning bolt" });

  assert.equal(result, 1);
  assert.ok(output.includes("did not respond within 10s"));
});

test("compare success", async () => {
  const responses = [fakeResponse(200, { json: { name: "A" } }), fakeResponse(200, { json: { name: "B" } })];
  mockGet.mock.mockImplementation(async () => responses.shift());

  const { result, output } = await capture(main.cmdCompare, { name_a: "A", name_b: "B" });

  assert.equal(result, 0);
  assert.equal(mockGet.mock.callCount(), 2);
  assert.ok(output.includes("Name: A"));
  assert.ok(output.includes("Name: B"));
});

test("search success", async () => {
  mockGet.mock.mockImplementation(async () =>
    fakeResponse(200, { json: { data: [{ name: "Goblin Guide" }] } })
  );

  const { result, output } = await capture(main.cmdSearch, { query: "t:goblin" });

  assert.equal(result, 0);
  assert.deepEqual(mockGet.mock.calls[0].arguments[1].params, { q: "t:goblin" });
  assert.ok(output.includes("Goblin Guide"));
});

test("parser dispatches supported commands", () => {
  const parser = main.buildParser();

  const lookup = parser.parseArgs(["lookup", "sol ring"]);
  const compare = parser.parseArgs(["compare", "black lotus", "mox pearl"]);
  const search = parser.parseArgs(["search", "t:goblin"]);

  assert.deepEqual([lookup.command, lookup.name], ["lookup", "sol ring"]);
  assert.equal(compare.command, "compare");
  assert.deepEqual([compare.name_a, compare.name_b], ["black lotus", "mox pearl"]);
  assert.deepEqual([search.command, search.query], ["search", "t:goblin"]);
});

test("loadEnv reads a .env file, and is fine when there is none", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const folder = await mkdtemp(join(tmpdir(), "mymanabox-"));
  try {
    await writeFile(join(folder, ".env"), "MYMANABOX_TEST_SETTING=hello\n");

    assert.equal(main.loadEnv(join(folder, ".env")), true);
    assert.equal(process.env.MYMANABOX_TEST_SETTING, "hello");
    assert.equal(main.loadEnv(join(folder, "missing.env")), false);
  } finally {
    delete process.env.MYMANABOX_TEST_SETTING;
    await rm(folder, { recursive: true });
  }
});
