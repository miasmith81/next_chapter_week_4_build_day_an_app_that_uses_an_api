# MyManaBox JavaScript Build Summary (2026-10-12)

**Repo:** `miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api`, folder `mymanabox-js/`, branch `main`
**Result:** all **50 of 50** code pieces are built, tested, committed one by one and pushed. Step 9 (the live Scryfall check) is done. The JavaScript CLI behaves like the original program.

---

## 1. What was accomplished

Before this session, Steps 0.1–1.3 were done (5 pieces). This session added 45 pieces: one commit each, with a push after the last piece of each Step.

| Step | File | Piece | What it does | Commit |
|---|---|---|---|---|
| 1.4 | utils.js | `getKey` | Read a key, falling back only when the key is missing | `e6e3792` |
| 1.5 | utils.js | `capitalize` | `"mYTHIC"` → `"Mythic"` | `7e206b8` |
| 1.6 | utils.js | `toNumber` | Strict text-to-number conversion that throws on bad input | `d601bd8` |
| 1.7 | utils.js | `formatFixed` | Fixed decimals with ties rounded to even (`0.125` → `"0.12"`) | `508c8cb` ⬆ |
| 2.1 | http.js | error classes | `RequestError`, `RequestTimeoutError`, `ConnectionError`, `HttpError`, `JsonParseError` | `c193e19` |
| 2.2 | http.js | `Response` | `statusCode`, `json()`, `raiseForStatus()` | `da0c913` |
| 2.3 | http.js | `http.get` | `fetch` with query params and a timeout; each failure becomes the matching error class | `8a595bb` ⬆ |
| 3.1 | cliParser.js | helpers | Detect help flags and options; line up the help columns | `7b4f425` |
| 3.2 | cliParser.js | `Commands` | The lookup / compare / search sub-commands | `6ddf952` |
| 3.3 | cliParser.js | `CliParser` | Help text, usage line, error with exit 2 | `7a3337c` |
| 3.4 | cliParser.js | `parseArgs` | Turn the command line into `{ command, name, ... }` | `39c4a02` ⬆ |
| 4.1 | apiClient.js | header | Imports, `USER_AGENT`, `BASE_URL`, `TIMEOUT = 10` | `e6a1026` |
| 4.2 | apiClient.js | `CardNotFoundError` | The "not found" error, with an `ambiguous` flag | `af19600` |
| 4.3 | apiClient.js | `buildHeaders` | User-Agent and Accept headers | `a191ce6` |
| 4.4 | apiClient.js | `fetchCardByName` 1 | Wait 100 ms, then send the request | `3da4a70` |
| 4.5 | apiClient.js | `fetchCardByName` 2 | The 404 branch: no match or ambiguous | `36859e9` |
| 4.6 | apiClient.js | `fetchCardByName` 3 | Success path; rewrite network errors as plain-language messages | `2932f63` |
| 4.7 | apiClient.js | `searchCards` | First page of search results (pagination left as a TODO) | `2424ae6` ⬆ |
| 5.1 | cardData.js | header | Imports | `a5cfc46` |
| 5.2 | cardData.js | `extractCardSummary` | Flat, display-ready card object | `d9cdf33` |
| 5.3 | cardData.js | `getPrice` | USD price as a number, or `null` | `816941c` |
| 5.4 | cardData.js | `getLegality` | Legality in one format, or `"unknown"` | `ee0c81c` |
| 5.5 | cardData.js | `compareCards` | `{ a, b }` summaries | `0cbf00d` ⬆ |
| 6.1 | display.js | header | Imports, column width 38, wrap width 62 | `9d64fe6` |
| 6.2 | display.js | `formatPrice` | `$0.79` or `n/a` | `97566c2` |
| 6.3 | display.js | `formatField` | Value, or `n/a` when it's empty | `9e2ad51` |
| 6.4 | display.js | `formatPowerToughness` | `2/2` or `n/a` | `0b1bbf5` |
| 6.5 | display.js | `wrapText` | Word-wrap oracle text | `5aafda5` |
| 6.6 | display.js | `printCardDetail` | One card as a labeled block | `998fb9c` |
| 6.7 | display.js | `printComparison` | Two cards side by side | `d9b4068` |
| 6.8 | display.js | `printCardList` | Numbered search results | `e06dbca` |
| 6.9 | display.js | `printError` | `Error: ...` in one style | `ad576b6` ⬆ |
| 7.1 | main.js | header | Imports | `ca3db82` |
| 7.2 | main.js | `validateNonEmpty` | Reject blank input before any network call | `c880001` |
| 7.3 | main.js | `cmdLookup` | The lookup command | `598657f` |
| 7.4 | main.js | `cmdCompare` | The compare command (card A, then card B) | `7b30838` |
| 7.5 | main.js | `cmdSearch` | The search command | `cc98bf1` |
| 7.6 | main.js | `buildParser` | Commands, arguments, `node main.js` examples | `c177e79` |
| 7.7 | main.js | `main` | Parse, then dispatch to the right command | `04dab9b` |
| 7.8 | main.js | entry point | Run only when started directly; set the exit code | `c2a0058` ⬆ |
| 8.1 | tests/helpers.js | helpers | `capture()` for printed output, `fakeResponse()` | `2bc8ce0` |
| 8.2 | tests/apiClient.test.js | 6 tests (9 with sub-tests) | Request shape, 404 handling, error messages | `825338b` |
| 8.3 | tests/cardData.test.js | 6 tests (13) | Summaries, prices, legality | `ff0f677` |
| 8.4 | tests/display.test.js | 7 tests | Every print function | `68eff7f` |
| 8.5 | tests/main.test.js | 7 tests (9) | Commands and the parser | `abf93eb` ⬆ |

⬆ = `git push` ran after this commit.

**Progress:** 50 / 50 pieces (100%). Step 9 is done.

## 2. Current state of each file

| File | State |
|---|---|
| `utils.js` | Complete (1.1–1.7) |
| `http.js` | Complete (2.1–2.3) |
| `cliParser.js` | Complete (3.1–3.4) |
| `apiClient.js` | Complete (4.1–4.7) |
| `cardData.js` | Complete (5.1–5.5) |
| `display.js` | Complete (6.1–6.9) |
| `main.js` | Complete (7.1–7.8) |
| `tests/` | Complete: helpers plus 4 test files (8.1–8.5) |

## 3. Test results

`npm test` on the Mac (Node v26.0.0): **`# tests 38`, `# pass 38`, `# fail 0`.**

Each test file also passed on its own when its piece was added: 9, 13, 7 and 9 tests. There were no failures.

## 4. Data verification (live Scryfall, 2026-10-12)

| Command | Exit | URL compared | Fields checked | Result |
|---|---|---|---|---|
| `lookup "lightning bolt"` | 0 | `/cards/named?fuzzy=lightning+bolt` | name, mana cost, type, rarity, set, released, price, oracle text, artist | Match ({R}, Instant, Uncommon, Marvel Super Heroes Commander, 2026-06-26, $0.88, Milivoj Ćeran) |
| `lookup "sol ring"` | 0 | `/cards/named?fuzzy=sol+ring` | same | Match ({1}, Artifact, Uncommon, Reality Fracture Commander, 2026-10-02, $1.48, Titus Lunter) |
| `compare "black lotus" "mox pearl"` | 0 | both `/cards/named` URLs | name, mana cost, type, rarity, set, price | Match (both {0}, Artifact, Bonus, Vintage Masters, price null → `n/a`) |
| `search "t:goblin c:r"` | 0 | `/cards/search?q=t:goblin c:r` | count, first 5 names, types, rarities, prices | Match (175 on page 1 of 495; Adder-Staff Boggart $0.18, Akki Avalanchers $0.08, ...) |
| `lookup "jace"` | **0** (handoff expected 1) | `/cards/named?fuzzy=jace` | same as lookup | Match: Scryfall now returns the token "Jace" (Reality Fracture Tokens). See section 6. |
| `lookup "zzzzzzzz"` | 1 | `/cards/named?fuzzy=zzzzzzzz` | 404 | Match: `Error: No card found for "zzzzzzzz".` |
| `--help` | 0 | — | help text and `node main.js` examples | As expected |
| *(no arguments)* | 2 | — | usage error | As expected |
| `lookup "   "` | 1 | — | `Error: Card name cannot be empty.` | As expected |

Before anything was committed, the same build was also run against a fake Scryfall server on 43 command lines and compared with the original program. The output, errors and exit codes matched. The only differences were in crash messages and the JSON parser's error wording, which naturally differ between languages.

## 5. Deviations from the handoff, and why

- **Names:** every file, function, class and property uses the Entry 6 JavaScript name (`getKey`, `http.get`, `statusCode`, `CliParser`, `fetchCardByName`, ...). Printed text, Scryfall keys and CLI argument names were not changed.
- **Sleep in milliseconds:** `timer.sleep(100)` in 4.4 and 4.7, and the 8.2 test expects `[100]`. `TIMEOUT` stays 10 seconds, and `http.get` multiplies it by 1000.
- **Unusual price text shows `n/a`:** Python's `float()` also accepts "NaN", "Infinity", "-Infinity" and digits from other writing systems such as "١.٢٥", and prints `$nan`, `$inf`, `$-inf` or `$1.25`. The JavaScript `toNumber` in `utils.js` accepts only plain number text, so all of these show `n/a`. Scryfall sends prices like "1.25", so live output is the same. This was left as is, because matching Python would mean new code.
- **Ambiguous-name message:** since audit finding 3 (`172352c`), it reads `"<name>" matched several cards. Try a more specific name, such as the full card name.` The set-code tip was dropped because `lookup` can't choose a set.
- **`AttributeError` dropped:** `getKey` throws a `TypeError` on non-object data. Behavior is unchanged, because a `TypeError` from bad data is never caught on the way.
- **Comments:** each piece has short JavaScript comments that explain the non-obvious parts, such as why `getKey` can't use `??` and why compare doesn't use `Promise.all`. No Python comments remain.
- **Test descriptions** are plain English without function names. Every assertion is the same as in the handoff.
- **No extra code:** no new features, libraries or retries. Pagination is still a `TODO`.

## 6. Problems found and how they were resolved

1. **Node 26 test output format.** Node 26 prints a new test report format by default, so the build script couldn't read the counts after Step 8.2. The tests themselves passed (9 of 9), and nothing was committed until the script was fixed to ask for the TAP format. *Resolved.*
2. **`lookup "jace"` is no longer ambiguous.** On 2026-10-02 Scryfall added a token card named exactly "Jace", so the fuzzy lookup now finds it. The program correctly prints that card and exits 0. The README and handoff example that says "jace exits 1" is out of date. *Open: your decision (section 7).*
3. **Price differs by URL spelling.** Scryfall caches `fuzzy=sol+ring` and `fuzzy=sol%20ring` separately (the same card, but $1.48 vs $1.34 today). The program sends `+`, the same as the original. When you verify, open the `+` URL. *Not a bug; noted for verification.*
4. **The 3.3, 4.4 and 4.5 pieces can't load on their own**, because each leaves a class or function open. Each one was checked together with the next piece (3.4 or 4.6). *As designed.*

## 7. Recommended next steps

1. **Pull and look:** in VS Code run `git pull`, then open `mymanabox-js/` and skim each file with this summary. Every commit is one piece, so `git log -p` shows them one at a time.
2. **Tell Claude Code the build is finished**, so it doesn't start Step 1.4 again. Paste: "The build is complete through Step 9 (see BUILD_SUMMARY.md and prompt_log Entry 11). Don't redo any pieces."
3. **Decide on "jace":** either change the README and handoff example to another ambiguous name (try `lookup "bolt"` first to confirm it is ambiguous), or keep "jace" and note that it now finds the token.
4. **Optional later:** search pagination (the `TODO` in `searchCards`), as its own small piece and only if you want it.

## 8. What I learned (JavaScript concepts that came up)

- **Rest parameters (`...args`):** collect any number of arguments into an array.
- **ES modules (`import` / `export`):** each file shares only what it exports; `"type": "module"` turns this on.
- **Promises and `await`:** `await http.get(...)` pauses the function until the network answers, without freezing Node.
- **Custom error classes (`class X extends Error`):** let `catch` blocks tell failures apart with `instanceof`.
- **`Object.hasOwn(obj, key)`:** checks that a key exists, which is different from checking that its value isn't `null`.
- **`??` vs `||`:** `??` replaces only `null` / `undefined`, and `||` replaces any falsy value. Neither one can tell "missing" from "null", which is why `getKey` exists.
- **`padEnd(n)`:** pads text with spaces to a fixed width so columns line up.
- **`AbortSignal.timeout(ms)`:** cancels a `fetch` that takes too long.
- **`URL` and `searchParams`:** build a safe query string (spaces become `+`).
- **`node:test` and `mock.method`:** run tests with no libraries, and swap `http.get` / `timer.sleep` for fakes.
- **`import.meta.url`:** lets `main.js` run only when started directly, not when a test imports it.
- **`process.exitCode`:** tells the shell whether the command worked (0), failed (1) or was used wrong (2).
