# next_chapter_week_4_build_day_an_app_that_uses_an_api

- Build your API app with Claude/Claude Code under control 
- Review every diff and commit each working piece 
- Handle the error case and push to GitHub

## MyManaBox web app

**Live demo:** https://miasmith81.github.io/next_chapter_week_4_build_day_an_app_that_uses_an_api/

A browser version of the `mymanabox-js` command-line app. It reuses the same JavaScript modules (`apiClient.js`, `cardData.js`, `display.js`) and talks to the live Scryfall API. There is no Python and no build step.

### Run it on your computer

```bash
cd mymanabox-js
npm run web        # then open http://localhost:5173/web/
npm test           # 44 tests, including the web helpers
```

### What it does

- **Search** with any Scryfall query (`t:dragon r:mythic`, `o:"draw a card" c:u`), then sort by name, price or mana value.
- **Card page** with the full-size Scryfall image, mana symbols, prices, set details and legality in 12 formats.
- **Double-faced cards** (try `delver of secrets`) flip over in 3D.
- **Compare** two cards side by side. Rows that differ are highlighted and the cheaper card gets a badge.
- **Micro-interactions:** card tilt and foil shine that follow the mouse, loading shimmer, smooth page transitions, and toasts. Motion is turned off for people who ask their system for reduced motion.
- **Keyboard:** press `/` to jump to the search box.

### How GitHub Pages serves it

Pages publishes the `main` branch from the repository root. The root `index.html` sends visitors on to `mymanabox-js/web/`, and the empty `.nojekyll` file tells Pages to serve the files exactly as they are.
