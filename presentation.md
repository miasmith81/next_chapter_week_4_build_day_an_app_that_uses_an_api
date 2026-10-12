# MyManaBox: An App That Uses an API

**Next Chapter, Week 4 Day 5: Demo Day**, presented by Mausi

- **Live demo:** https://miasmith81.github.io/next_chapter_week_4_build_day_an_app_that_uses_an_api/
- **Repository:** https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api
- **Prompt Log:** [prompt_log.md](prompt_log.md)

---

## 1. The app in one sentence

MyManaBox lets you look up, search and compare Magic: The Gathering cards using live data from the free Scryfall API. It is written only in JavaScript and comes in two forms: a command-line app (`node main.js`) and a web app on GitHub Pages.

---

## 2. Your 2-minute demo (Demo Day format)

### 1. What it does and which API (20 seconds)

> "MyManaBox pulls **Magic: The Gathering card data and images** from the **Scryfall API** and shows **card details, prices, legality and side-by-side comparisons**, in the terminal and in a web app."

### 2. Run it live (40 seconds)

In the terminal, from the `mymanabox-js` folder:

```bash
node main.js lookup "lightning bolt"     # real data: {R}, Instant, current price
node main.js lookup "bolt"               # the error case
```

The second command prints: `Error: "bolt" matched several cards. Try a more specific name ...`

Then open the live web app and search `t:dragon r:mythic`. Open a card to show its real price and legality, and hover to show the foil shine.

### 3. The control moment (45 seconds)

**The change the agent made.** Open `mymanabox-js/main.js` at `cmdLookup` (commit `598657f`, Step 7.3). See section 6 below for the code.

> "This is the lookup command the agent wrote. First it checks that the name isn't blank, and if it is, it stops **before** sending any request to Scryfall. Then it asks Scryfall for the card inside a `try`. If Scryfall says 404, the `catch` uses `instanceof CardNotFoundError` to tell 'no such card' apart from 'matched several cards', so the user gets the right message. Network problems get a plain-language message, and the function returns 1 so the terminal knows it failed. I accepted it because I read the diff, ran it with a real card, a blank name, `zzzzzzzz` and `bolt`, and compared the output with Scryfall's JSON."

**One thing the agent got wrong.**

> "When the agent added the `npm run web` command to `package.json`, it also deleted the `version` and `description` lines, which I never asked for. I caught it by reviewing the diff against the original file, and I had them put back in a separate, logged commit (prompt_log Entry 13)."

### 4. One thing I'd add next (15 seconds)

> "Search only shows the first page of results, up to 175 cards. There's already a `TODO` in `searchCards` for it, so next I'd add pagination to load the rest."

**Two questions after.** Honest answers win. "Let me open the code and check" is a strong move, and section 6 has a one-line answer for every file.

**Backup plan if the Wi‑Fi blocks GitHub Pages:** `cd mymanabox-js`, then `npm run web`, then open http://localhost:5173/web/.

---

## 3. Self-check against the rubric

| Rubric line | Status | Evidence |
|---|---|---|
| **Meets the spec:** calls an API | ✅ | Every card comes from `https://api.scryfall.com`. `mymanabox-js/apiClient.js` makes the requests for both the CLI and the web app. |
| **Meets the spec:** handles errors | ✅ | Blank input, unknown card, ambiguous name, empty search, no internet, timeout and server errors each print a clear message (section 7). |
| **Protected keys:** `.env` file | ✅ | `main.js` loads settings from `mymanabox-js/.env`, which `.gitignore` keeps out of GitHub. `.env.example` shows the settings with no real values (section 7a). |
| **Meets the spec:** on GitHub | ✅ | Everything is on `main`, and the web app is live on GitHub Pages. |
| **Build skill:** it runs and shows real data, verified | ✅ | CLI output was compared field by field with Scryfall's JSON (BUILD_SUMMARY.md, section 4). The live site was checked in Chrome on 2026-10-12. |
| **Control:** reviewed diffs, small commits | ✅ | Each piece followed "ask, review the diff, accept, test, verify the data, commit" (prompt_log Entry 2). `main` has more than 60 commits, and most add one piece: 46 "Step" commits for the CLI and 11 "Web UI" commits. |
| **Control:** Prompt Log complete | ✅ | prompt_log.md has an entry for every prompt, each quoting it word for word. Entry 15 quotes the first three lines of a long course-page paste and summarizes the rest, as its heading says. |
| **Control:** caught a mistake | ✅ | Five mistakes were caught and fixed (section 8). |
| **Control:** can explain any part | ✅ | Section 6 has one plain-language line per file. |
| **Demo:** run it and explain one agent change in 2 minutes | ✅ | The script above. |

---

## 4. Submission (LMS, by end of day)

- **GitHub repo:** https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api
- **Prompt Log:** https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api/blob/main/prompt_log.md
- **One line:** I'll explain the agent's `cmdLookup` in `main.js`, which rejects a blank name before any request and uses `instanceof CardNotFoundError` to tell "no card found" from "matched several cards". The mistake I caught: when the agent added `npm run web` to `package.json`, it also deleted the `version` and `description` lines, and I spotted it in the diff and had them restored.

---

## 5. Standup and retro notes (your words, edit before class)

- **Standup:** finished the JavaScript CLI and a web app on GitHub Pages; nothing left; proud of catching the agent's mistakes by reviewing every diff.
- **Coding agent vs chat AI:** answer in your own words.
- **Best control moment:** the `package.json` diff, or stopping the build when Node 26's new test output couldn't be read, instead of committing blindly.
- **Still fuzzy:** answer in your own words.
- **One thing I can do now that I couldn't Monday:** answer in your own words.

---

## 6. How it is built: every part explained

The app is split so each file has one job. The web app reuses the CLI's files without changing them.

```
apiClient.js  ->  cardData.js  ->  display.js         (CLI output)
 (fetch)          (clean up)       web/app.js         (web output)
```

| File | Its job, in plain words |
|---|---|
| `mymanabox-js/main.js` | Loads `.env`, reads the command (lookup, compare or search), calls the other files in order, and sets the exit code: 0 worked, 1 failed, 2 used wrong. |
| `mymanabox-js/cliParser.js` | Turns the words typed after `node main.js` into an object like `{ command: "lookup", name: "sol ring" }` and prints help text. |
| `mymanabox-js/apiClient.js` | The only file that talks to Scryfall. It waits 100 ms between requests, sends a User-Agent header, and turns failures into clear messages. |
| `mymanabox-js/http.js` | A small wrapper around `fetch` that adds a 10-second timeout and gives each kind of failure its own error class. |
| `mymanabox-js/cardData.js` | Picks the fields we need out of Scryfall's large JSON object (name, cost, type, rarity, set, price, power and toughness). It never prints anything. |
| `mymanabox-js/display.js` | Prints the results in lined-up columns. Missing values become `n/a`, never `null`. |
| `mymanabox-js/.env.example` | The template for `.env`: setting names with placeholder values. The real `.env` is git-ignored (section 7a). |
| `mymanabox-js/utils.js` | Small helpers: `getKey` (read a key that might be missing), `capitalize`, number formatting. |
| `mymanabox-js/tests/` | 46 tests that use a fake Scryfall, so they run offline and always give the same result. |
| `mymanabox-js/web/index.html` | The page shell: header, the Search / Card / Compare tabs, and the footer that credits Scryfall. |
| `mymanabox-js/web/styles.css` | The look: dark theme, card tilt and foil shine, loading shimmer, and layouts for phone and desktop. |
| `mymanabox-js/web/app.js` | The web app's logic: reads the address bar (`#/card/sol ring`), fetches the card and builds the page. |
| `mymanabox-js/web/cardView.js` | Pure helpers the page uses, such as turning `{T}` into Scryfall's mana-symbol pictures and sorting results. These are tested. |
| `mymanabox-js/web/server.js` | `npm run web` serves the folder at http://localhost:5173 for running it on your own computer. |
| `index.html` (repo root) | Sends GitHub Pages visitors straight to the web app. |

### One piece up close: how `lookup` handles errors

Copied from `mymanabox-js/main.js` (lines 56–85). The code is unchanged; only the notes after `//` on the marked lines were added here to explain them.

```js
export async function cmdLookup(args) {
  const name = args.name;
  if (!validateNonEmpty(name, "Card name")) {
    return 1; // stop before any network call
  }

  try {
    const card = await fetchCardByName(name);   // ask Scryfall
    const summary = extractCardSummary(card);   // keep only what we show
    display.printCardDetail(summary);           // print it
    return 0;
  } catch (exc) {
    if (exc instanceof CardNotFoundError) {     // Scryfall said 404
      if (exc.ambiguous) {                      // several cards match the name
        display.printError(
          `"${name}" matched several cards. Try a more specific name, such as the full card name.`
        );
      } else {                                  // no card matches the name
        display.printError(`No card found for "${name}".`);
      }
      return 1;
    }
    // Network problems already carry a plain-language message from apiClient.js.
    if (exc instanceof http.errors.RequestError) {  // network problem
      display.printError(exc.message);
      return 1;
    }
    throw exc; // anything else is a real bug, so let it crash loudly
  }
}
```

- `async` / `await` pauses this function until Scryfall answers, without freezing Node.
- `try` / `catch` catches the error if the request fails.
- `instanceof` checks which kind of error it was, so each one gets the right message.
- `return 1` becomes the exit code, which tells the terminal the command failed.

---

## 7. Error cases (live output)

These were run against live Scryfall on 2026-10-12.

```text
$ node main.js lookup "   "
  Error: Card name cannot be empty.                     (exit 1, no request sent)

$ node main.js lookup "zzzzzzzz"
  Error: No card found for "zzzzzzzz".                  (exit 1)

$ node main.js lookup "bolt"
  Error: "bolt" matched several cards. Try a more specific name, such as the full card name.
                                                        (exit 1)

$ node main.js
  usage: mymanabox [-h] <command> ...
  mymanabox: error: the following arguments are required: <command>   (exit 2)
```

These are also handled:

- **No internet:** "Could not reach Scryfall. Check your internet connection."
- **Too slow:** "Scryfall did not respond within 10s. Check your connection."
- **Server error:** "Scryfall returned an error: ..."
- **Missing data:** Black Lotus has no price, so it shows `n/a`. Sol Ring has no power or toughness, so `lookup` leaves out the P/T row, and `compare` shows `P/T: n/a` for it next to a creature. Nothing crashes.

The web app shows the same messages in a red notice box, using the same wording as the CLI.

---

## 7a. Protecting keys with `.env`

**Where things live**

| File | In GitHub? | What it holds |
|---|---|---|
| `mymanabox-js/.env` | **No**, it's listed in `.gitignore` | Your real settings and keys. It stays only on your computer. |
| `mymanabox-js/.env.example` | Yes | The same setting names with placeholder values, so others know what to fill in. |
| `mymanabox-js/.gitignore` | Yes | The line `.env` tells Git never to commit that file. |

**How the app reads it.** In `main.js`:

```js
export function loadEnv(path = fileURLToPath(new URL(".env", import.meta.url))) {
  try {
    process.loadEnvFile(path);   // copies each NAME=value line into process.env
    return true;
  } catch (exc) {
    if (exc.code === "ENOENT") { // ENOENT = "no such file": no .env, use defaults
      return false;
    }
    throw exc;
  }
}
```

Then `apiClient.js` reads the value instead of having it typed into the code:

```js
const userAgent = globalThis.process?.env.SCRYFALL_USER_AGENT || USER_AGENT;
```

**Being honest about it.** Scryfall is free and needs no API key, so the `.env` holds a setting (the contact name sent to Scryfall), not a secret. The same file is where a key would go, for example `SOME_API_KEY=...`, and the code would read it from `process.env` in the same way.

**Show it in the demo (optional, 15 seconds):**

```bash
cat .env.example            # the committed template, with no real values
git check-ignore -v .env    # proves Git ignores it: "mymanabox-js/.gitignore:2:.env  .env"
git status                  # .env does not appear
```

**Why the web app can't hide a key.** GitHub Pages only serves files to the browser, and anything the browser downloads is public. A real secret key would need a small server that adds the key and passes the request on to the API.

---

## 8. Mistakes caught and fixed

| # | What went wrong | How it was caught | The fix |
|---|---|---|---|
| 1 | Adding `npm run web` deleted the `version` and `description` lines from `package.json`. | A Claude Code review compared the file with Step 0.1. | Put the lines back (Web UI 10, prompt_log Entry 13). |
| 2 | Node 26 prints test results in a new format, so the build script couldn't read the pass and fail counts. | The script stopped after Step 8.2 instead of committing blindly. | Asked Node for the older TAP format with `--test-reporter=tap` (Entry 11). |
| 3 | On a phone, the card page scrolled sideways by 39 pixels. | A test that measures page width at phone size. | Kept the blurred background inside the screen (Web UI 7). |
| 4 | The blurred card art sat in a box in the middle instead of filling the screen. | Looking at a screenshot from the live site. | The page's fade-in animation left a CSS `transform` behind, which traps `position: fixed` elements. Removed the leftover transform (Web UI 9). |
| 5 | The handoff said `lookup "jace"` should fail as ambiguous, but it now finds a card. | Checking the CLI against live Scryfall data (Step 9). | Not a code bug: Scryfall added a "Jace" token card on 2026-10-02. The demo uses `bolt` as the ambiguous example instead. |

---

## 9. Testing

- `cd mymanabox-js && npm test` gives **46 tests, 46 pass, 0 fail**.
- **Unit tests** cover the request shape, 404 handling, error messages, data clean-up, every print function, the command parser and the web helpers.
- **Live data check:** CLI output was compared field by field with Scryfall's own JSON for lightning bolt, sol ring, black lotus vs mox pearl, and `t:goblin c:r`. They all matched.
- **Web app** was tested in Chrome against live Scryfall: search returned "122 result(s) returned." for `t:dragon r:mythic`, and there was no sideways scrolling at phone width.

---

## 10. What I learned

- **Splitting the work into one-job files** (fetch, clean up, print) made each piece small enough to review and test on its own.
- **Real API data is messy.** Some cards have no price, some have two faces, and names can match many cards, so every field needs a fallback.
- **`async` / `await` and `fetch`** for calling an API, and **custom error classes** with `instanceof` for telling failures apart.
- **Testing with a fake API** keeps tests fast and repeatable, while a separate live check proves the real data matches.
- **Staying in control of AI:** read every diff, test it, verify the data, then commit. The AI made real mistakes (section 8), and this loop is how they were caught.
