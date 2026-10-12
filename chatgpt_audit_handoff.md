# Handoff: Cross-Reference Audit of MyManaBox

**For:** ChatGPT (or any reviewer who didn't build this project)
**From:** Mausi (GitHub `miasmith81`), with notes prepared by Claude
**Date:** 2026-10-12

---

## 1. Your job

You are an independent auditor. Check that what this project **says** matches what it **is**: the code, the git history, the documentation, the live site and the live Scryfall API.

- **Read only.** Do not rewrite code or documents. Report findings, and suggest a fix for each one.
- **Evidence for every finding.** Name the file and line (or commit hash or URL) on both sides of each mismatch.
- **Say what you could not check.** If you can't open a link or run a command, list it under "Not verified" with the exact command for Mausi to run, instead of guessing.
- **Explain in plain words.** Mausi is learning to code and knows JavaScript, so explain any finding a beginner might not follow.

---

## 2. The project in brief

MyManaBox looks up Magic: The Gathering cards using the free [Scryfall API](https://scryfall.com/docs/api). It started as a Python command-line tool and was rebuilt, piece by piece, in **JavaScript only** with the coding agent Claude Code. A web app was added later and deployed to GitHub Pages.

- **Course:** Next Chapter, Week 4 (AI Engineering, Phase 2). The assignment was "Build Day: An App That Uses an API", and the presentation was "Demo Day: Show Your API App".
- **Runtime:** Node 20.12 or newer, ES modules, no npm packages.

---

## 3. Sources to cross-reference

The repository is public. If you can't browse, ask Mausi to paste the files in the priority order below.

| # | Source | Link |
|---|---|---|
| 1 | Repository (branch `main`) | https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api |
| 2 | Prompt Log: every prompt, word for word, with what was done | https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api/blob/main/prompt_log.md |
| 3 | Presentation notes and rubric self-check | https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api/blob/main/presentation.md |
| 4 | Build summary for the 50 CLI pieces | https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api/blob/main/BUILD_SUMMARY.md |
| 5 | README | https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api/blob/main/README.md |
| 6 | The JavaScript app | `mymanabox-js/`: `main.js`, `apiClient.js`, `http.js`, `cardData.js`, `display.js`, `cliParser.js`, `utils.js`, `.env.example`, `.gitignore`, `package.json`, `tests/`, `web/` |
| 7 | Commit history | https://github.com/miasmith81/next_chapter_week_4_build_day_an_app_that_uses_an_api/commits/main |
| 8 | Live web app | https://miasmith81.github.io/next_chapter_week_4_build_day_an_app_that_uses_an_api/ |
| 9 | Original Python program (source of truth for behavior) | https://github.com/miasmith81/scryfall-cli (branch `master`) |
| 10 | Scryfall API | e.g. https://api.scryfall.com/cards/named?fuzzy=lightning+bolt |

---

## 4. The rubric (from the course's Demo Day page)

> **Self-Check Before You Demo. Against the rubric:**
> - Meets-the-spec: calls an API, handles errors, on GitHub.
> - Build skill: it runs and shows real data (you verified it).
> - Control: reviewed diffs, small commits, Prompt Log complete, caught a mistake, can explain any part.
> - Demo: you can run it + explain one agent change in 2 minutes.
>
> **Submission:** your GitHub repo link; your Prompt Log for the week; one line: the change you'll explain + the mistake you caught.

Mausi also says protecting keys with a `.env` file was a primary focus of the assignment.

### Mausi's standing rules for the build (from the Prompt Log)

- "I don't want any python in this whole build. This is only javaScript."
- "Do not create any extra code."
- "update my prompt_log.md for every prompt I give you."
- "If you do not understand I want you to stop and tell me the road block."
- The build loop for every piece: ask → review the diff → accept → test → verify the data → commit.

---

## 5. Audit checklist

Work through each cross-check and mark it **Pass**, **Fail** or **Not verified**.

### A. Rubric ↔ evidence

1. For each rubric line, find the evidence that presentation.md section 3 points to, and confirm it exists and says what is claimed.
2. Check the submission line in presentation.md section 4 against the code it describes (`cmdLookup` in `main.js`, commit `598657f`) and against the mistake it names (prompt_log Entry 13, commit `bfc4542`).

### B. Prompt Log ↔ git history

1. Every commit hash in prompt_log.md and BUILD_SUMMARY.md exists on `main`, and its message matches the step it is listed for.
2. Every prompt seems to have an entry (Entries 1 to 17), and entries are in time order.
3. Each claimed check (test counts, live results) is consistent with the code at that commit.

### C. Documentation ↔ code

1. Every error message and exit code in the README table, in presentation.md sections 2 and 7, and in BUILD_SUMMARY.md section 4 appears in the code exactly as written (`main.js`, `apiClient.js`).
2. The test count claimed (46 tests, 46 pass) matches the tests in `mymanabox-js/tests/`. There are 34 top-level `test(...)` calls, and Node also counts the `t.test(...)` sub-tests inside four of them. Confirm the total comes to 46.
3. The one-line file descriptions in presentation.md section 6 match what each file actually does.
4. The `cmdLookup` code shown in presentation.md matches `main.js`.

### D. Python original ↔ JavaScript translation

1. For `lookup`, `compare` and `search`, check that the JavaScript prints the same text, uses the same Scryfall fields and returns the same exit codes as the Python (`main.py`, `api_client.py`, `card_data.py`, `display.py`).
2. List every behavior difference. Expected ones are listed in BUILD_SUMMARY.md section 5, so only flag differences that aren't explained there.
3. Confirm there is no Python anywhere in `mymanabox-js/`.

### E. `.env` and protected keys

1. `mymanabox-js/.gitignore` lists `.env`.
2. `.env.example` is committed and contains no real secrets.
3. No `.env` file, API key, token or password appears anywhere in the repository **or its git history**. Command for Mausi: `git log --all --full-history -- "*.env"` should show nothing, and `git grep -n -i -E "api[_-]?key|secret|token|password" $(git rev-list --all)` should show only comments and docs.
4. `loadEnv()` in `main.js` and `buildHeaders()` in `apiClient.js` work as presentation.md section 7a describes.
5. Is the explanation honest and correct? Scryfall needs no key, and a static GitHub Pages site can't hide one.

### F. Web app ↔ CLI

1. The web app reuses the CLI modules (`apiClient.js`, `cardData.js`, `display.js`) without changing them for the browser.
2. The web app builds the page with text nodes, never `innerHTML`, so card text from Scryfall can't inject HTML. Search `web/app.js` for `innerHTML`: the only match should be the comment that says it is never used.
3. The live site loads, its root link redirects to `mymanabox-js/web/`, and a search returns real cards.

### G. Live data spot-check

Compare these commands with the Scryfall URLs (Mausi runs them from `mymanabox-js/`):

| Command | Compare with |
|---|---|
| `node main.js lookup "lightning bolt"` | https://api.scryfall.com/cards/named?fuzzy=lightning+bolt |
| `node main.js compare "black lotus" "mox pearl"` | the two `cards/named?fuzzy=` URLs |
| `node main.js search "t:goblin c:r"` | https://api.scryfall.com/cards/search?q=t%3Agoblin+c%3Ar |
| `node main.js lookup "bolt"` | https://api.scryfall.com/cards/named?fuzzy=bolt (404, ambiguous) |

Prices change daily, so a difference of a few cents is expected.

### H. Code quality (light pass)

Point out any real bug, missing error case or misleading comment you notice along the way. Don't suggest new features or style rewrites, because the rule is "no extra code".

---

## 6. Known items: don't report these as new findings

You may confirm or challenge them, but they are already documented.

1. **`lookup "jace"` exits 0, not 1.** Scryfall added a "Jace" token card on 2026-10-02, so the name is no longer ambiguous. The demo uses `bolt` instead. Early Prompt Log text still shows the old "jace" example.
2. **The top of prompt_log.md shows the original plan** (snake_case names, `py_compat.js`, `requests_compat.js`, `argparse_compat.js`). Entries 5 and 6 replaced it with "JavaScript only" names (`utils.js`, `http.js`, `cliParser.js`, camelCase).
3. **Search shows only the first page** (up to 175 cards). Pagination is a deliberate `TODO` in `searchCards`.
4. **Scryfall caches `fuzzy=sol+ring` and `fuzzy=sol%20ring` separately**, so prices can differ by a few cents between the two URLs.
5. **Entry 15's prompt is partly summarized** (it was a long paste of the course page), and its heading says so.
6. **The web app goes beyond the CLI scope.** Mausi asked for it separately (Entry 12).
7. **Piping output to `head` can print an `EPIPE` error**, for example `node main.js search "t:goblin c:r" | head`. Node does this when the reader closes early. It doesn't happen in normal use, and it is not handled on purpose ("no extra code").

---

## 7. What to send back

Use this structure:

1. **Summary:** three to five sentences. Is the project ready to submit? What are the biggest risks?
2. **Rubric verdict:** a table with one row per rubric line: Pass / Fail / Not verified, plus one line of evidence.
3. **Findings:** a table sorted by severity (High = wrong or missing for grading, Medium = inaccurate docs or a real bug, Low = wording or tidy-up):

   | # | Severity | Where (file:line, commit or URL) | What it claims | What is actually true | Suggested fix |
   |---|---|---|---|---|---|

4. **Not verified:** each item you couldn't check, and the exact command or link for Mausi to check it.
5. **Questions for Mausi:** anything only Mausi can answer.

Please don't change any files. Mausi will bring your findings back to Claude Code to fix them one at a time, using the build loop.
