# MyManaBox: An App That Uses an API

**Next Chapter, Week 4 Build Day**, presented by Mausi

- **Live demo:** https://miasmith81.github.io/next_chapter_week_4_build_day_an_app_that_uses_an_api/
- **Repository:** https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api
- **Prompt Log:** [prompt_log.md](prompt_log.md), 14 entries

---

## 1. The app in one sentence

MyManaBox lets you look up, search and compare Magic: The Gathering cards using live data from the free Scryfall API. It is written only in JavaScript and comes in two forms: a command-line app (`node main.js`) and a web app on GitHub Pages.

---

## 2. Rubric checklist

These requirements come from the assignment's three goals at the top of the README and from the program's "Build Day: The Controlled Build" guide (its four graded constraints and its end-of-day check).

| Requirement | Status | Evidence |
|---|---|---|
| **Build an app that uses an API** | ✅ | Every card comes from `https://api.scryfall.com`. `mymanabox-js/apiClient.js` makes the requests for both the CLI and the web app. |
| **Build with Claude / Claude Code under control** | ✅ | Every piece followed the loop "ask, review the diff, accept, test, verify the data, commit". The loop is written down in prompt_log Entry 2. |
| **Review every diff and commit each working piece** | ✅ | 50 one-piece commits for the CLI (BUILD_SUMMARY.md, section 1), then 10 commits for the web app (Web UI 1 to 10). `git log -p` shows them one at a time. |
| **Handle the error case** | ✅ | Blank input, unknown card, ambiguous name, empty search, no internet, timeout and server errors each print a clear message. See section 5 below. |
| **Push to GitHub** | ✅ | Everything is on `main` and is live on GitHub Pages. |
| **Stay in scope** | ✅ | The CLI has exactly three commands (lookup, compare, search) and no extra features. Search pagination was deliberately left as a `TODO`. The web app was a separate, logged request (Entry 12). |
| **Explain every part** | ✅ | Section 4 below has one plain-language line per file. Each piece has short comments in the code. |
| **Log every prompt as you go** | ✅ | prompt_log.md has Entries 1 to 14, each quoting the prompt word for word with what was done, checks and commits. |
| **Catch at least one mistake** | ✅ | Five mistakes were caught and fixed. See section 6 below. |
| **Tested, including edge cases** | ✅ | `npm test` runs 44 tests and all pass, with no internet needed. Live checks against Scryfall matched the API data (BUILD_SUMMARY.md, section 4). |
| **Demo ready** | ✅ | See the two-minute demo script in section 3. |

---

## 3. Two-minute demo script

**0:00 to 0:20, the pitch.** "MyManaBox looks up Magic cards using the Scryfall API. I first built it as a Python command-line tool, then rebuilt it piece by piece in JavaScript with Claude Code, and finally added a web app."

**0:20 to 0:50, the command line.** Run these in the terminal from the `mymanabox-js` folder:

```bash
node main.js lookup "lightning bolt"
node main.js compare "black lotus" "mox pearl"
node main.js lookup "bolt"
```

The last one shows the error case: `Error: "bolt" matched several cards. Try a more specific name ...`

**0:50 to 1:40, the web app.** Open the live demo link.

1. Search `t:dragon r:mythic` and sort by price. Hover over a card to show the tilt and foil shine.
2. Open a card to show its price, mana symbols and format legality.
3. Look up `delver of secrets` and press **Flip** to turn the double-faced card over.
4. Add two cards with **＋** and press **Compare**. Rows that differ light up, and the cheaper card gets a "Lower price" badge.
5. Search `zzzzzzzz` to show the friendly "No card found" message.

**1:40 to 2:00, the process.** Open prompt_log.md and the commit history. "Every prompt is logged, and every piece was reviewed, tested and committed on its own. Here is a mistake the AI made and how I caught it." Point to section 6.

**Backup plan if the Wi‑Fi blocks GitHub Pages:** `cd mymanabox-js`, then `npm run web`, then open http://localhost:5173/web/.

---

## 4. How it is built: every part explained

The app is split so each file has one job. The web app reuses the CLI's files without changing them.

```
apiClient.js  ->  cardData.js  ->  display.js         (CLI output)
 (fetch)          (clean up)       web/app.js         (web output)
```

| File | Its job, in plain words |
|---|---|
| `mymanabox-js/main.js` | Reads the command (lookup, compare or search), calls the other files in order, and sets the exit code: 0 worked, 1 failed, 2 used wrong. |
| `mymanabox-js/cliParser.js` | Turns the words typed after `node main.js` into an object like `{ command: "lookup", name: "sol ring" }` and prints help text. |
| `mymanabox-js/apiClient.js` | The only file that talks to Scryfall. It waits 100 ms between requests, sends a User-Agent header, and turns failures into clear messages. |
| `mymanabox-js/http.js` | A small wrapper around `fetch` that adds a 10-second timeout and gives each kind of failure its own error class. |
| `mymanabox-js/cardData.js` | Picks the fields we need out of Scryfall's large JSON object (name, cost, type, rarity, set, price, power and toughness). It never prints anything. |
| `mymanabox-js/display.js` | Prints the results in lined-up columns. Missing values become `n/a`, never `null`. |
| `mymanabox-js/utils.js` | Small helpers: `getKey` (read a key that might be missing), `capitalize`, number formatting. |
| `mymanabox-js/tests/` | 44 tests that use a fake Scryfall, so they run offline and always give the same result. |
| `mymanabox-js/web/index.html` | The page shell: header, the Search / Card / Compare tabs, and the footer that credits Scryfall. |
| `mymanabox-js/web/styles.css` | The look: dark theme, card tilt and foil shine, loading shimmer, and layouts for phone and desktop. |
| `mymanabox-js/web/app.js` | The web app's logic: reads the address bar (`#/card/sol ring`), fetches the card and builds the page. |
| `mymanabox-js/web/cardView.js` | Pure helpers the page uses, such as turning `{T}` into Scryfall's mana-symbol pictures and sorting results. These are tested. |
| `mymanabox-js/web/server.js` | `npm run web` serves the folder at http://localhost:5173 for running it on your own computer. |
| `index.html` (repo root) | Sends GitHub Pages visitors straight to the web app. |

### One piece up close: how `lookup` handles errors

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
      // ambiguous -> "matched several cards", otherwise -> "No card found"
      ...
      return 1;
    }
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

## 5. Error cases (live output)

These were run against live Scryfall on 2026-10-12.

```text
$ node main.js lookup "   "
  Error: Card name cannot be empty.                     (exit 1, no request sent)

$ node main.js lookup "zzzzzzzz"
  Error: No card found for "zzzzzzzz".                  (exit 1)

$ node main.js lookup "bolt"
  Error: "bolt" matched several cards. Try a more specific name or add a set code
  (e.g. "lightning bolt" -> "lightning bolt lea").      (exit 1)

$ node main.js
  usage: mymanabox [-h] <command> ...
  mymanabox: error: the following arguments are required: <command>   (exit 2)
```

These are also handled:

- **No internet:** "Could not reach Scryfall. Check your internet connection."
- **Too slow:** "Scryfall did not respond within 10s. Check your connection."
- **Server error:** "Scryfall returned an error: ..."
- **Missing data:** Sol Ring has no power or toughness, and Black Lotus has no price. Both show `n/a` instead of crashing.

The web app shows the same messages in a red notice box, using the same wording as the CLI.

---

## 6. Mistakes caught and fixed

| # | What went wrong | How it was caught | The fix |
|---|---|---|---|
| 1 | Adding `npm run web` deleted the `version` and `description` lines from `package.json`. | A Claude Code review compared the file with Step 0.1. | Put the lines back (Web UI 10, prompt_log Entry 13). |
| 2 | Node 26 prints test results in a new format, so the build script couldn't read the pass and fail counts. | The script stopped after Step 8.2 instead of committing blindly. | Asked Node for the older TAP format with `--test-reporter=tap` (Entry 11). |
| 3 | On a phone, the card page scrolled sideways by 39 pixels. | A test that measures page width at phone size. | Kept the blurred background inside the screen (Web UI 7). |
| 4 | The blurred card art sat in a box in the middle instead of filling the screen. | Looking at a screenshot from the live site. | The page's fade-in animation left a CSS `transform` behind, which traps `position: fixed` elements. Removed the leftover transform (Web UI 9). |
| 5 | The handoff said `lookup "jace"` should fail as ambiguous, but it now finds a card. | Checking the CLI against live Scryfall data (Step 9). | Not a code bug: Scryfall added a "Jace" token card on 2026-10-02. The demo uses `bolt` as the ambiguous example instead. |

---

## 7. Testing

- `cd mymanabox-js && npm test` gives **44 tests, 44 pass, 0 fail**.
- **Unit tests** cover the request shape, 404 handling, error messages, data clean-up, every print function, the command parser and the web helpers.
- **Live data check:** CLI output was compared field by field with Scryfall's own JSON for lightning bolt, sol ring, black lotus vs mox pearl, and `t:goblin c:r`. They all matched.
- **Web app** was tested in Chrome against live Scryfall: search returned "122 result(s) returned." for `t:dragon r:mythic`, and there was no sideways scrolling at phone width.

---

## 8. What I learned

- **Splitting the work into one-job files** (fetch, clean up, print) made each piece small enough to review and test on its own.
- **Real API data is messy.** Some cards have no price, some have two faces, and names can match many cards, so every field needs a fallback.
- **`async` / `await` and `fetch`** for calling an API, and **custom error classes** with `instanceof` for telling failures apart.
- **Testing with a fake API** keeps tests fast and repeatable, while a separate live check proves the real data matches.
- **Staying in control of AI:** read every diff, test it, verify the data, then commit. The AI made real mistakes (section 6), and this loop is how they were caught.
