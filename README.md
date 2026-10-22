# next_chapter_week_4_build_day_an_app_that_uses_an_api

- Build your API app with Claude/Claude Code under control 
- Review every diff and commit each working piece 
- Handle the error case and push to GitHub

**MyManaBox** looks up Magic: The Gathering cards with the free [Scryfall API](https://scryfall.com/docs/api). It is written in JavaScript only (Node 20.12 or newer, no packages to install) and has two ways to use it: a command-line app and a web app.

For Week 6, the local web app also includes **ManaGuide**, a reliable Gemini-powered helper. It can answer a short Magic question and, while a card page is open, use that card's current Scryfall details as context. The browser never receives the Gemini API key.

- **Presentation notes:** [presentation.md](presentation.md)
- **Prompt Log:** [prompt_log.md](prompt_log.md) (every prompt, logged as the build happened)
- **Build summary:** [BUILD_SUMMARY.md](BUILD_SUMMARY.md)

## MyManaBox command-line app

```bash
cd mymanabox-js
node main.js lookup "lightning bolt"            # one card
node main.js compare "black lotus" "mox pearl"  # two cards side by side
node main.js search "t:goblin c:r"              # Scryfall search syntax
node main.js --help
```

### Error cases it handles

| What goes wrong | What you see | Exit code |
|---|---|---|
| Blank name, e.g. `lookup "   "` | `Error: Card name cannot be empty.` (no request is sent) | 1 |
| No such card, e.g. `lookup "zzzzzzzz"` | `Error: No card found for "zzzzzzzz".` | 1 |
| Name matches several cards, e.g. `lookup "bolt"` | `Error: "bolt" matched several cards. Try a more specific name ...` | 1 |
| Search with no results | `Error: No cards found for query: "..."` | 1 |
| No internet, timeout, or a server error | A plain-language message instead of a crash | 1 |
| Missing command or wrong arguments | Usage help | 2 |
| Card has no price, e.g. `lookup "black lotus"` | Shows `n/a` instead of `null` | 0 |
| Card has no power/toughness, e.g. `lookup "sol ring"` | `lookup` leaves out the P/T row. `compare` shows `P/T: n/a` for that card when the other card has power/toughness. | 0 |

### Settings and secrets (`.env`)

API keys and settings belong in a `.env` or `.env.gemini` file, never in the code. Both patterns are listed in `mymanabox-js/.gitignore`, so Git never commits them. `.env.example` is committed instead, to show which settings exist without any real values.

```bash
cd mymanabox-js
cp .env.example .env    # then edit .env with your own values
chmod 600 .env          # only your account can read it
```

`main.js` loads `.env` for the command-line app. The local web server loads both `.env` and `.env.gemini`, using Node's built-in `process.loadEnvFile` (Node 20.12 or newer), so there are no packages to install. Scryfall is free and needs no API key. ManaGuide requires `GEMINI_API_KEY`; `GEMINI_APP_MODEL` and `GEMINI_APP_FALLBACK_MODELS` are optional.

The browser calls `POST /api/chat` on the local Node server. That server adds the secret key, calls Gemini, validates the response, and returns only the answer and model name. The key never appears in the URL, browser JavaScript, response, or Git history.

The existing GitHub Pages demo remains the static Scryfall app. GitHub Pages cannot run the secret-holding backend, so ManaGuide must be demonstrated through `npm run web` unless the project is later deployed to a backend-capable host.

### Tests

```bash
cd mymanabox-js
npm test        # 46 tests, all offline (Scryfall is faked)
```

## MyManaBox web app

**Live demo:** https://miasmith81.github.io/next_chapter_week_4_build_day_an_app_that_uses_an_api/

A browser version of the `mymanabox-js` command-line app. It reuses the same JavaScript modules (`apiClient.js`, `cardData.js`, `display.js`) and talks to the live Scryfall API. There is no Python and no build step.

### Run it on your computer

```bash
cd mymanabox-js
npm run web        # then open http://localhost:5173/web/
npm test           # 60 tests, including the AI guardrails and backend route
```

### What it does

- **Search** with any Scryfall query (`t:dragon r:mythic`, `o:"draw a card" c:u`), then sort by name, price or mana value.
- **Card page** with the full-size Scryfall image, mana symbols, prices, set details and legality in 12 formats.
- **Double-faced cards** (try `delver of secrets`) flip over in 3D.
- **Compare** two cards side by side. Rows that differ are highlighted and the cheaper card gets a badge.
- **Micro-interactions:** card tilt and foil shine that follow the mouse, loading shimmer, smooth page transitions, and toasts. Motion is turned off for people who ask their system for reduced motion.
- **Keyboard:** press `/` to jump to the search box.
- **ManaGuide:** ask a short Magic question from any view; on a card page it receives a small, whitelisted set of that card's Scryfall fields.

## ManaGuide reliability and cost controls

- **System prompt:** fixes the role to a beginner-friendly Magic helper, treats card context as untrusted data, refuses secret/system-prompt requests, and forbids invented card text, prices, rulings, or legality.
- **Bad input guardrail:** requires JSON text, trims whitespace, rejects blank questions, caps questions at 500 characters, caps the whole request at 16 KB, and whitelists/caps card fields again on the server.
- **Bad output guardrail:** requires nonblank Gemini text, rejects answers over 2,000 characters, ignores thought parts, and renders the answer with text nodes rather than HTML.
- **Failure guardrail:** uses a 12-second timeout, falls back from temporary/model-availability failures, hides provider details, and gives the user a safe retry message.
- **Cost cap:** sends one question with no conversation history, uses minimal/low thinking, and caps total model output (including thinking) at 400 tokens.

At Google's standard paid pricing through December 31, 2026 ($0.75 per million input tokens and $3.75 per million output tokens for Gemini 3.6/3.8 Flash), a deliberately conservative 575-token input plus the full 400-token output cap is about **$0.00194 per call**—less than two-tenths of a cent. Free-tier calls are free. See [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).

The full Week 6 acceptance checklist, break tests, data flow and demo outline are in [WEEK6_AI_BUILD.md](WEEK6_AI_BUILD.md). The Week 6 prompts are logged separately in [WEEK6_PROMPT_LOG.md](WEEK6_PROMPT_LOG.md), leaving the completed Week 4 log unchanged.

### How GitHub Pages serves it

Pages publishes the `main` branch from the repository root. The root `index.html` sends visitors on to `mymanabox-js/web/`, and the empty `.nojekyll` file tells Pages to serve the files exactly as they are.
