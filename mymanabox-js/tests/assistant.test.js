import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AssistantRequestError,
  askManaGuide,
  buildCardContext,
} from "../web/assistant.js";

test("browser sends only a small whitelisted card context", () => {
  const context = buildCardContext({
    name: "Delver of Secrets // Insectile Aberration",
    type_line: "Creature — Human Wizard // Creature — Human Insect",
    rarity: "uncommon",
    set_name: "Innistrad",
    prices: { usd: "1.25", usd_foil: "9.99" },
    card_faces: [
      { mana_cost: "{U}", oracle_text: "At the beginning of your upkeep, look at the top card." },
      { mana_cost: "", oracle_text: "Flying" },
    ],
    image_uris: { large: "should-not-be-sent.jpg" },
  });

  assert.equal(context.name, "Delver of Secrets // Insectile Aberration");
  assert.equal(context.manaCost, "{U}");
  assert.match(context.oracleText, /Flying/);
  assert.equal(context.priceUsd, "1.25");
  assert.ok(!("image_uris" in context));
  assert.ok(!("usd_foil" in context));
  assert.equal(buildCardContext(null), null);
});

test("browser client posts the question and returns a valid answer", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return { answer: "  A helpful answer.  ", model: "gemini-3.6-flash" };
      },
    };
  };

  const result = await askManaGuide("What is flying?", { name: "Serra Angel" }, fetchImpl);

  assert.equal(request.url, "/api/chat");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), {
    question: "What is flying?",
    context: { name: "Serra Angel" },
  });
  assert.deepEqual(result, { answer: "A helpful answer.", model: "gemini-3.6-flash" });
});

test("browser client shows the backend's safe failure message", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 429,
    async json() {
      return { error: "ManaGuide is busy right now. Please wait a moment and retry." };
    },
  });

  await assert.rejects(
    askManaGuide("What is trample?", null, fetchImpl),
    (error) => error instanceof AssistantRequestError && error.status === 429 && /busy right now/.test(error.message)
  );
});
