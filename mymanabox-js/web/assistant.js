/** Browser-side client for the ManaGuide backend. No API key exists here. */

import { getKey } from "../utils.js";

export const ASSISTANT_QUESTION_LIMIT = 500;

export class AssistantRequestError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "AssistantRequestError";
    this.status = status;
  }
}

/** Build the smallest useful card context from the card already loaded by Scryfall. */
export function buildCardContext(card) {
  if (!card || typeof card !== "object") return null;

  const faces = Array.isArray(card.card_faces) ? card.card_faces : [];
  const faceText = faces
    .map((face) => getKey(face, "oracle_text", ""))
    .filter(Boolean)
    .join(" / ");
  const prices = getKey(card, "prices", null) || {};

  return {
    name: getKey(card, "name", ""),
    manaCost: getKey(card, "mana_cost", "") || faces.map((face) => getKey(face, "mana_cost", "")).filter(Boolean).join(" / "),
    typeLine: getKey(card, "type_line", ""),
    oracleText: getKey(card, "oracle_text", "") || faceText,
    rarity: getKey(card, "rarity", ""),
    setName: getKey(card, "set_name", ""),
    priceUsd: getKey(prices, "usd", ""),
  };
}

export async function askManaGuide(question, context, fetchImpl = fetch) {
  const response = await fetchImpl("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new AssistantRequestError(
      response.status === 404
        ? "ManaGuide needs the local MyManaBox server. Run npm run web, then open its local address."
        : "ManaGuide received an unreadable response.",
      response.status
    );
  }

  if (!response.ok) {
    throw new AssistantRequestError(payload?.error || "ManaGuide could not answer. Please try again.", response.status);
  }
  if (typeof payload?.answer !== "string" || !payload.answer.trim()) {
    throw new AssistantRequestError("ManaGuide returned an empty answer.", 502);
  }

  return { answer: payload.answer.trim(), model: payload.model || "Gemini" };
}
