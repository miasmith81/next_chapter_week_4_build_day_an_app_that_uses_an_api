# Week 6 · Reliable AI Feature — ManaGuide

## Build plan

- **My AI feature:** ManaGuide answers short Magic: The Gathering questions. On a card page, it uses a whitelisted subset of that card's live Scryfall data.
- **System prompt (role + rule):** A concise, beginner-friendly Magic helper that treats supplied context as untrusted data and never invents card text, prices, rulings, or legality.
- **Likely failure mode:** Gemini is unavailable, rate-limited, times out, or returns unusable output.
- **Three guardrails:** input — validate and cap the question/body/context; output — require bounded nonblank text and render it as text; failure — timeout, safe error messages, and model fallback.

## Data flow

```text
Browser question + optional current-card fields
                |
                v
POST /api/chat on the local Node server
                |
                +--> validate input and whitelist card context
                +--> add server-only API key + system prompt
                v
          Gemini generateContent
                |
                +--> validate/cap returned text
                v
JSON { answer, model } --> browser renders text only
```

The Scryfall lookup still goes directly from the browser to Scryfall. Only the Gemini call goes through the Node backend because that call needs a secret key.

## Guardrail and break-test evidence

| Risk | Guardrail | Verification |
|---|---|---|
| Blank/non-text/over-500 question | `validateChatRequest` rejects before Gemini | Automated tests pass; live blank request returned HTTP 400 |
| Oversized or malformed JSON | 16 KB server body cap + JSON parser | Automated route tests return 413/400 |
| Card data contains extra or hostile fields | Server whitelist and 1,200-character context cap | Automated context test drops unknown/nested fields |
| Empty, malformed or over-2,000 answer | `extractGeminiAnswer` rejects it | Automated output tests pass |
| Model timeout, rate limit or outage | 12-second abort, safe status/message, fallback model | Automated 503-to-fallback and 429 route tests pass |
| Secret-file request | Static server rejects all dotfiles | Automated and live `/.env` request returned HTTP 404 |
| Model text contains markup | UI uses text nodes, never `innerHTML` | Browser inspection confirmed text-only rendering |

## Cost control

- Question: maximum 500 characters.
- Card context: known fields only, maximum 1,200 characters total.
- Conversation history: not sent.
- Thinking: `minimal` on Gemini 3.6 Flash; `low` on Gemini 3.8 Flash.
- Model output, including thinking: maximum 400 tokens.
- Conservative paid-tier estimate through December 31, 2026: 575 input tokens × $0.75/M plus 400 output tokens × $3.75/M = **$0.00193125 per call** (about 0.19 cents). Free tier is $0.
- Pricing source: <https://ai.google.dev/gemini-api/docs/pricing>

## Verification status

- **VERIFIED:** All 60 automated tests pass.
- **VERIFIED:** A real backend request returned a Gemini 3.6 Flash answer.
- **VERIFIED:** The browser displayed both a general answer and a Sol Ring-aware answer.
- **VERIFIED:** The key files are ignored, untracked, and permission mode `600`.
- **VERIFIED:** No Gemini key pattern appears in tracked files or Git history.
- **KNOWN LIMIT:** The GitHub Pages URL is static and cannot run `/api/chat`. Run `npm run web` for the complete local demo.

## Agent mistake caught

The first browser answer used Markdown bold markers. The UI correctly treated them as plain text, so the asterisks were visible. Browser review caught the mismatch. The system prompt was tightened to require plain text with no Markdown formatting, preserving the safe text-only renderer.

## Two-minute demo outline

1. Run `npm run web` and open `http://localhost:5173/web/`.
2. Search for or look up **Sol Ring**.
3. Open **Ask ManaGuide** and point out **Using card: Sol Ring**.
4. Ask: **What does this card do?** Judge whether the answer matches the displayed Scryfall text.
5. Explain the data flow: browser → local `/api/chat` → server validation/system prompt/key → Gemini → output validation → text-only UI.
6. Name the likely failure: Gemini timeout/rate limit. Name the guardrail: 12-second timeout, fallback model, and safe retry message.
7. Try a blank question or explain the 500-character cap. Show that `.env` is ignored and never sent to the browser.
