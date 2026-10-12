import { test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import * as apiClient from "../apiClient.js";
import { timer } from "../utils.js";
import { http } from "../http.js";
import { fakeResponse } from "./helpers.js";

let mockGet;
let mockSleep;

beforeEach(() => {
  // Replace the pause and the network call with fakes so tests are fast and offline.
  mockSleep = mock.method(timer, "sleep", async () => {});
  mockGet = mock.method(http, "get");
});

afterEach(() => {
  mock.restoreAll();
});

test("fetch card sends expected request", async () => {
  const response = fakeResponse(200, { json: { name: "Lightning Bolt" } });
  mockGet.mock.mockImplementation(async () => response);

  const result = await apiClient.fetchCardByName("lightning bolt");

  assert.equal(result["name"], "Lightning Bolt");
  assert.equal(mockSleep.mock.callCount(), 1);
  assert.deepEqual(mockSleep.mock.calls[0].arguments, [100]);
  assert.equal(mockGet.mock.callCount(), 1);
  assert.deepEqual(mockGet.mock.calls[0].arguments, [
    `${apiClient.BASE_URL}/cards/named`,
    { params: { fuzzy: "lightning bolt" }, headers: apiClient.buildHeaders(), timeout: apiClient.TIMEOUT },
  ]);
  assert.equal(response.raiseForStatusCalls, 1);
});

test("fetch card distinguishes ambiguous 404", async () => {
  mockGet.mock.mockImplementation(async () =>
    fakeResponse(404, { json: { details: "Too many cards matched that query." } })
  );

  await assert.rejects(apiClient.fetchCardByName("jace"), (err) => {
    assert.ok(err instanceof apiClient.CardNotFoundError);
    assert.equal(err.ambiguous, true);
    return true;
  });
});

test("fetch card handles non-JSON 404", async () => {
  mockGet.mock.mockImplementation(async () =>
    fakeResponse(404, { jsonError: new http.errors.JsonParseError("invalid JSON") })
  );

  await assert.rejects(apiClient.fetchCardByName("missing"), (err) => {
    assert.ok(err instanceof apiClient.CardNotFoundError);
    assert.equal(err.message, "No card found: missing");
    assert.equal(err.ambiguous, false);
    return true;
  });
});

test("fetch card translates network errors", async (t) => {
  const cases = [
    [new http.errors.RequestTimeoutError("raw"), http.errors.RequestTimeoutError, "did not respond within 10s"],
    [new http.errors.ConnectionError("raw"), http.errors.ConnectionError, "Could not reach Scryfall"],
    [new http.errors.RequestError("raw"), http.errors.RequestError, "Unexpected network error"],
  ];

  for (const [source, expectedType, expectedMessage] of cases) {
    await t.test(source.name, async () => {
      mockGet.mock.mockImplementation(async () => {
        throw source;
      });
      await assert.rejects(apiClient.fetchCardByName("bolt"), (err) => {
        assert.ok(err instanceof expectedType);
        assert.ok(err.message.includes(expectedMessage));
        return true;
      });
    });
  }
});

test("search returns first page data", async () => {
  mockGet.mock.mockImplementation(async () =>
    fakeResponse(200, { json: { data: [{ name: "Goblin Guide" }], has_more: true } })
  );

  const result = await apiClient.searchCards("t:goblin");

  assert.deepEqual(result, [{ name: "Goblin Guide" }]);
  assert.equal(mockGet.mock.callCount(), 1);
  assert.deepEqual(mockGet.mock.calls[0].arguments, [
    `${apiClient.BASE_URL}/cards/search`,
    { params: { q: "t:goblin" }, headers: apiClient.buildHeaders(), timeout: apiClient.TIMEOUT },
  ]);
});

test("search 404 raises not found", async () => {
  mockGet.mock.mockImplementation(async () => fakeResponse(404));

  await assert.rejects(apiClient.searchCards("no:matches"), apiClient.CardNotFoundError);
});

test("the User-Agent comes from .env when it is set", () => {
  const saved = process.env.SCRYFALL_USER_AGENT;
  try {
    delete process.env.SCRYFALL_USER_AGENT;
    assert.equal(apiClient.buildHeaders()["User-Agent"], apiClient.USER_AGENT);

    process.env.SCRYFALL_USER_AGENT = "MyManaBox/1.0 (test)";
    assert.equal(apiClient.buildHeaders()["User-Agent"], "MyManaBox/1.0 (test)");
  } finally {
    if (saved === undefined) delete process.env.SCRYFALL_USER_AGENT;
    else process.env.SCRYFALL_USER_AGENT = saved;
  }
});
