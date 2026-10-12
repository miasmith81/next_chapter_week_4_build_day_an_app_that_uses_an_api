/**
 * MyManaBox web UI.
 *
 * Three views, picked by the address bar's #hash so Back/Forward work:
 *   #/search?q=t:goblin      search results as a grid of card pictures
 *   #/card/Sol Ring          one card in detail
 *   #/compare/Sol Ring/Mox   two cards side by side
 *
 * All Scryfall calls go through the same apiClient.js the CLI uses, and the
 * card data goes through cardData.js and display.js, so both share one source
 * of truth.
 */

import { fetchCardByName, searchCards } from "../apiClient.js";
import { compareCards, extractCardSummary, getPrice } from "../cardData.js";
import { formatField, formatPrice } from "../display.js";
import { getKey } from "../utils.js";
import {
  cardFaces,
  cardImage,
  errorMessage,
  faceDetails,
  hasBackFace,
  legalityRows,
  parseSymbols,
  sortCards,
} from "./cardView.js";

// ---------------------------------------------------------------------------
// Small DOM helpers
// ---------------------------------------------------------------------------

/**
 * Build an element: h("a", { href: "#", class: "tile" }, "text", childNode).
 * Text always goes in as text nodes (never innerHTML), so card text from the
 * API can't inject HTML into the page.
 */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (key === "style") Object.assign(el.style, value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** Text with {R}-style mana symbols turned into Scryfall's symbol pictures. */
function symbolText(text, className = "") {
  const span = h("span", { class: `symbols ${className}`.trim() });
  for (const part of parseSymbols(text)) {
    span.append(
      part.type === "symbol"
        ? h("img", { class: "mana", src: part.url, alt: part.value, title: part.value, loading: "lazy" })
        : document.createTextNode(part.value)
    );
  }
  return span;
}

/** A card picture that fades in when loaded and shows a placeholder if it fails. */
function cardPicture(card, { size = "normal", faceIndex = 0, eager = false, className = "" } = {}) {
  const src = cardImage(card, size, faceIndex);
  const name = getKey(card, "name", "Card");
  const frame = h("div", { class: `card-frame ${className}`.trim() });
  if (!src) {
    frame.append(h("div", { class: "card-missing" }, name));
    return frame;
  }
  const img = h("img", {
    src,
    alt: name,
    width: 488,
    height: 680,
    loading: eager ? "eager" : "lazy",
    decoding: "async",
  });
  img.addEventListener("load", () => frame.classList.add("is-loaded"));
  img.addEventListener("error", () => frame.replaceChildren(h("div", { class: "card-missing" }, name)));
  frame.append(img);
  return frame;
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

/**
 * The premium "hold the card" effect: the card tilts toward the pointer and
 * a foil-like light follows it. CSS does the drawing; this only feeds it
 * the pointer position as --rx, --ry, --mx and --my.
 */
function addTilt(el, strength = 10) {
  if (!canHover.matches || prefersReducedMotion.matches) return;
  let frame = 0;
  el.addEventListener("pointermove", (event) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const box = el.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width; // 0 (left) .. 1 (right)
      const y = (event.clientY - box.top) / box.height; // 0 (top) .. 1 (bottom)
      el.style.setProperty("--rx", `${(0.5 - y) * strength}deg`);
      el.style.setProperty("--ry", `${(x - 0.5) * strength}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
  });
  el.addEventListener("pointerleave", () => {
    cancelAnimationFrame(frame);
    for (const prop of ["--rx", "--ry", "--mx", "--my"]) el.style.removeProperty(prop);
  });
}

/** Show a short message in the corner. kind: "info" or "error". */
function toast(message, kind = "info") {
  const box = document.querySelector(".toasts");
  const item = h("div", { class: `toast toast-${kind}` }, message);
  box.append(item);
  setTimeout(() => {
    item.classList.add("is-leaving");
    item.addEventListener("animationend", () => item.remove(), { once: true });
  }, 4200);
}

/** A friendly full-width message, used for empty results and errors. */
function notice(title, body, kind = "empty") {
  return h(
    "div",
    { class: `notice notice-${kind}` },
    h("div", { class: "notice-icon", "aria-hidden": "true" }, kind === "error" ? "!" : "✦"),
    h("h2", {}, title),
    body ? h("p", {}, body) : null
  );
}

/** Grey shimmering placeholders shown while Scryfall answers. */
function skeletonGrid(count = 12) {
  return h(
    "div",
    { class: "grid", "aria-hidden": "true" },
    Array.from({ length: count }, () => h("div", { class: "tile skeleton" }, h("div", { class: "card-frame" })))
  );
}

/**
 * Go to a #hash address. Submitting the same address again doesn't fire
 * "hashchange", so re-run the route by hand; that lets a failed request be retried.
 */
function go(hash) {
  if (location.hash === hash) navigate();
  else location.hash = hash;
}

/** Build a #hash address from parts, encoding each one. */
function hashFor(view, ...parts) {
  return `#/${[view, ...parts.map((part) => encodeURIComponent(part))].join("/")}`;
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

const state = {
  cards: new Map(), // lower-case name -> raw Scryfall card, so revisits are instant
  compare: [], // up to two raw cards collected for the compare view
  lastSearch: "",
  lastCard: "",
};

/** Remember a card under its own name and under the name that was typed. */
function remember(card, typedName = "") {
  state.cards.set(getKey(card, "name", "").toLowerCase(), card);
  if (typedName) state.cards.set(typedName.toLowerCase(), card);
  return card;
}

/** Use the cached card when we have it; otherwise ask Scryfall (fuzzy match). */
async function loadCard(name) {
  const cached = state.cards.get(name.toLowerCase());
  return cached ?? remember(await fetchCardByName(name), name);
}

// ---------------------------------------------------------------------------
// Compare tray
// ---------------------------------------------------------------------------

function isInCompare(card) {
  return state.compare.some((item) => item.name === card.name);
}

/** Add or remove a card from the tray; the tray holds the two most recent. */
function toggleCompare(card) {
  if (isInCompare(card)) {
    state.compare = state.compare.filter((item) => item.name !== card.name);
  } else {
    state.compare = [...state.compare, card].slice(-2);
    toast(`${card.name} added to compare`);
  }
  renderTray();
  document.querySelectorAll(`[data-compare-name]`).forEach((button) => {
    const active = state.compare.some((item) => item.name === button.dataset.compareName);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderTray() {
  const tray = document.querySelector(".compare-tray");
  // The tray is a shortcut to the compare page, so it hides while you're on it.
  tray.hidden = state.compare.length === 0 || activeName === "compare";
  const slots = [0, 1].map((index) => {
    const card = state.compare[index];
    if (!card) return h("div", { class: "tray-slot is-empty" }, "Pick a card");
    return h(
      "div",
      { class: "tray-slot" },
      h("img", { src: cardImage(card, "art_crop"), alt: "" }),
      h("span", {}, card.name),
      h("button", { class: "tray-remove", "aria-label": `Remove ${card.name}`, onclick: () => toggleCompare(card) }, "×")
    );
  });
  const ready = state.compare.length === 2;
  tray.replaceChildren(
    ...slots,
    h(
      "a",
      {
        class: `button button-primary ${ready ? "" : "is-disabled"}`,
        href: ready ? hashFor("compare", state.compare[0].name, state.compare[1].name) : null,
        "aria-disabled": ready ? null : "true",
      },
      "Compare"
    )
  );
}

/** The round "+" button on tiles and the compare button on the card page. */
function compareButton(card, label = null) {
  const active = isInCompare(card);
  return h(
    "button",
    {
      class: `${label ? "button button-ghost" : "tile-add"} ${active ? "is-active" : ""}`,
      type: "button",
      "data-compare-name": card.name,
      "aria-pressed": String(active),
      "aria-label": `Add ${card.name} to compare`,
      title: "Add to compare",
      onclick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleCompare(card);
      },
    },
    label ?? "+"
  );
}

// ---------------------------------------------------------------------------
// Search view
// ---------------------------------------------------------------------------

const EXAMPLE_QUERIES = ["t:goblin c:r", "t:dragon r:mythic", "o:\"draw a card\" c:u", "set:lea", "t:legendary t:elf"];

const searchView = {
  mount(root) {
    this.input = h("input", {
      id: "search-input",
      class: "search-input",
      type: "search",
      name: "q",
      placeholder: 'Search cards, e.g. t:goblin c:r',
      autocomplete: "off",
      spellcheck: "false",
      "aria-label": "Scryfall search",
    });
    this.form = h(
      "form",
      { class: "search-box", role: "search", onsubmit: (event) => this.submit(event) },
      h("span", { class: "search-icon", "aria-hidden": "true" }),
      this.input,
      h("span", { class: "spinner", "aria-hidden": "true" }),
      h("button", { class: "button button-primary", type: "submit" }, "Search")
    );
    this.sort = h(
      "select",
      { class: "select", "aria-label": "Sort results", onchange: () => this.renderResults() },
      h("option", { value: "relevance" }, "Scryfall order"),
      h("option", { value: "name" }, "Name A–Z"),
      h("option", { value: "price-desc" }, "Price: high to low"),
      h("option", { value: "price-asc" }, "Price: low to high"),
      h("option", { value: "cmc" }, "Mana value")
    );
    this.count = h("p", { class: "result-count", "aria-live": "polite" });
    this.results = h("div", { class: "results" });

    root.append(
      h(
        "section",
        { class: "hero" },
        h("h1", {}, "Find any ", h("span", { class: "gradient-text" }, "Magic"), " card"),
        h("p", { class: "lede" }, "Live prices, legality and art from Scryfall. Use plain names or full Scryfall syntax."),
        this.form,
        h(
          "div",
          { class: "chips", "aria-label": "Example searches" },
          EXAMPLE_QUERIES.map((query) => h("a", { class: "chip", href: `#/search?q=${encodeURIComponent(query)}` }, query))
        )
      ),
      (this.toolbar = h("div", { class: "toolbar", hidden: true }, this.count, this.sort)),
      this.results
    );
  },

  submit(event) {
    event.preventDefault();
    const query = this.input.value.trim();
    if (!query) {
      // Same rule as the CLI: blank input never reaches the network.
      toast("Search query cannot be empty.", "error");
      this.input.focus();
      return;
    }
    go(`#/search?q=${encodeURIComponent(query)}`);
  },

  async update(route) {
    const query = (route.params.get("q") ?? "").trim();
    this.input.value = query;
    if (!query) {
      this.cards = [];
      this.toolbar.hidden = true;
      this.results.replaceChildren(
        notice("Start with a search", "Try one of the examples above, or type a card name and press Enter.")
      );
      return;
    }
    if (query === state.lastSearch && this.cards?.length) {
      // Already loaded (e.g. coming back from a card page): just redraw it.
      if (!this.results.hasChildNodes()) this.renderResults();
      return;
    }
    state.lastSearch = query;

    const requestId = (this.requestId = (this.requestId ?? 0) + 1);
    this.form.classList.add("is-loading");
    this.toolbar.hidden = false;
    this.count.textContent = "Searching…";
    this.results.replaceChildren(skeletonGrid());
    try {
      const cards = await searchCards(query);
      if (requestId !== this.requestId) return; // a newer search started meanwhile
      cards.forEach((card) => remember(card));
      this.cards = cards;
      this.renderResults();
    } catch (exc) {
      if (requestId !== this.requestId) return;
      this.cards = [];
      this.toolbar.hidden = true;
      state.lastSearch = ""; // allow retrying the same query
      this.results.replaceChildren(notice("No results", errorMessage(exc, "search", query), "error"));
    } finally {
      if (requestId === this.requestId) this.form.classList.remove("is-loading");
    }
  },

  renderResults() {
    const cards = sortCards(this.cards ?? [], this.sort.value);
    if (cards.length === 0) {
      this.toolbar.hidden = true;
      this.results.replaceChildren(notice("No cards to display.", "Scryfall returned an empty list for this search."));
      return;
    }
    // Scryfall returns up to 175 cards per page; later pages aren't loaded yet.
    this.count.textContent = `${cards.length} result(s) returned.`;
    this.toolbar.hidden = false;
    this.results.replaceChildren(h("div", { class: "grid" }, cards.map((card, index) => cardTile(card, index))));
  },

  focus() {
    this.input.focus();
    this.input.select();
  },
};

/** One card in the results grid: picture, name, price and a compare button. */
function cardTile(card, index) {
  const rarity = getKey(card, "rarity", "common");
  const media = h(
    "div",
    { class: "tile-media" },
    cardPicture(card),
    h("span", { class: "sheen", "aria-hidden": "true" })
  );
  addTilt(media);
  return h(
    "div",
    { class: "tile", "data-rarity": rarity, style: { "--i": String(Math.min(index, 24)) } },
    h(
      "a",
      {
        class: "tile-link",
        href: hashFor("card", card.name),
        onclick: () => {
          // Lets the browser morph this picture into the big one on the card page.
          media.style.viewTransitionName = "hero-card";
        },
      },
      media,
      h(
        "div",
        { class: "tile-meta" },
        h("span", { class: "tile-name" }, card.name),
        h("span", { class: "price" }, formatPrice(getPrice(card)))
      )
    ),
    compareButton(card)
  );
}

// ---------------------------------------------------------------------------
// Card view
// ---------------------------------------------------------------------------

const cardView = {
  mount(root) {
    this.input = h("input", {
      class: "search-input",
      type: "search",
      placeholder: "Card name, e.g. lightning bolt",
      autocomplete: "off",
      spellcheck: "false",
      "aria-label": "Card name",
    });
    this.form = h(
      "form",
      { class: "search-box search-box-compact", onsubmit: (event) => this.submit(event) },
      h("span", { class: "search-icon", "aria-hidden": "true" }),
      this.input,
      h("span", { class: "spinner", "aria-hidden": "true" }),
      h("button", { class: "button button-primary", type: "submit" }, "Look up")
    );
    this.body = h("div", { class: "card-page" });
    root.append(this.form, this.body);
  },

  submit(event) {
    event.preventDefault();
    const name = this.input.value.trim();
    if (!name) {
      toast("Card name cannot be empty.", "error");
      this.input.focus();
      return;
    }
    go(hashFor("card", name));
  },

  async update(route) {
    const name = (route.args[0] ?? "").trim();
    if (!name) {
      this.body.replaceChildren(notice("Look up a card", "Type a card name above. Small spelling mistakes are fine."));
      return;
    }
    state.lastCard = name;
    this.input.value = name;
    const requestId = (this.requestId = (this.requestId ?? 0) + 1);
    this.form.classList.add("is-loading");
    if (!state.cards.has(name.toLowerCase())) {
      this.body.replaceChildren(h("div", { class: "detail-skeleton" }, h("div", { class: "tile skeleton" }, h("div", { class: "card-frame" }))));
    }
    try {
      const card = await loadCard(name);
      if (requestId !== this.requestId) return;
      this.body.replaceChildren(cardDetail(card));
      document.title = `${card.name} · MyManaBox`;
    } catch (exc) {
      if (requestId !== this.requestId) return;
      this.body.replaceChildren(notice("Card not found", errorMessage(exc, "lookup", name), "error"));
    } finally {
      if (requestId === this.requestId) this.form.classList.remove("is-loading");
    }
  },

  focus() {
    this.input.focus();
    this.input.select();
  },
};

/** The big card page: picture (with flip), text, details, prices, legality. */
function cardDetail(card) {
  const summary = extractCardSummary(card); // the same fields the CLI prints
  const faces = cardFaces(card);

  // Picture, with a 3D flip for cards that have a back side.
  const flipper = h(
    "div",
    { class: "flipper" },
    cardPicture(card, { size: "large", faceIndex: 0, eager: true, className: "face face-front" })
  );
  const media = h("div", { class: "detail-media" }, h("div", { class: "tilt-wrap" }, flipper, h("span", { class: "sheen", "aria-hidden": "true" })));
  media.style.viewTransitionName = "hero-card";
  addTilt(media.firstChild, 8);
  if (hasBackFace(card)) {
    flipper.append(cardPicture(card, { size: "large", faceIndex: 1, eager: true, className: "face face-back" }));
    media.append(
      h(
        "button",
        {
          class: "button button-ghost flip-button",
          type: "button",
          onclick: (event) => {
            const flipped = flipper.classList.toggle("is-flipped");
            event.currentTarget.setAttribute("aria-pressed", String(flipped));
          },
          "aria-pressed": "false",
        },
        "↻ Flip card"
      )
    );
  }

  // Rules text for each face (one face for most cards).
  const faceBlocks = faces.map((face) => {
    const details = faceDetails(face);
    const stat =
      details.power || details.toughness
        ? `${details.power}/${details.toughness}`
        : details.loyalty
          ? `Loyalty ${details.loyalty}`
          : "";
    return h(
      "section",
      { class: "face-block" },
      h("div", { class: "face-title" }, h("h2", {}, details.name || summary.name), details.manaCost ? symbolText(details.manaCost, "cost") : null),
      h("p", { class: "type-line" }, details.typeLine),
      details.oracleText
        ? h("div", { class: "oracle" }, details.oracleText.split("\n").map((line) => h("p", {}, symbolText(line))))
        : null,
      details.flavorText ? h("p", { class: "flavor" }, details.flavorText) : null,
      stat ? h("span", { class: "stat-badge" }, stat) : null
    );
  });

  const rarity = getKey(card, "rarity", "common");
  const setCode = String(getKey(card, "set", "")).toUpperCase();
  const prices = getKey(card, "prices", null) || {};

  const facts = h(
    "dl",
    { class: "facts" },
    fact("Set", `${formatField(summary.set_name)}${setCode ? ` · ${setCode}` : ""}`),
    fact("Rarity", h("span", { class: `rarity rarity-${rarity}` }, formatField(summary.rarity))),
    fact("Released", formatField(summary.released_at)),
    fact("Artist", formatField(summary.artist)),
    fact("Collector #", formatField(getKey(card, "collector_number", null)))
  );

  const priceRow = h(
    "div",
    { class: "prices" },
    h("div", { class: "price-card" }, h("span", {}, "USD"), h("strong", {}, formatPrice(summary.price_usd))),
    h("div", { class: "price-card foil" }, h("span", {}, "USD Foil"), h("strong", {}, formatPrice(getKey(prices, "usd_foil", null))))
  );

  const legal = h(
    "ul",
    { class: "legalities" },
    legalityRows(card).map((row) =>
      h("li", { class: `legality legality-${row.status}` }, h("span", { class: "format" }, row.label), h("span", { class: "status" }, row.text))
    )
  );

  const scryfallUrl = getKey(card, "scryfall_uri", null);
  const actions = h(
    "div",
    { class: "actions" },
    compareButton(card, "+ Add to compare"),
    scryfallUrl ? h("a", { class: "button button-ghost", href: scryfallUrl, target: "_blank", rel: "noopener" }, "View on Scryfall ↗") : null
  );

  // A soft, blurred copy of the artwork fills the background behind the page.
  const art = cardImage(card, "art_crop");
  const backdrop = art
    ? h("div", { class: "backdrop", "aria-hidden": "true" }, h("div", { class: "backdrop-art", style: { backgroundImage: `url("${art}")` } }))
    : null;

  return h(
    "article",
    { class: "detail" },
    backdrop,
    media,
    h("div", { class: "detail-info" }, faceBlocks, priceRow, facts, h("h3", { class: "section-title" }, "Format legality"), legal, actions)
  );
}

function fact(label, value) {
  return h("div", { class: "fact" }, h("dt", {}, label), h("dd", {}, value));
}

// ---------------------------------------------------------------------------
// Compare view
// ---------------------------------------------------------------------------

const compareView = {
  mount(root) {
    const field = (label, placeholder) =>
      h("input", { class: "search-input", type: "search", placeholder, autocomplete: "off", spellcheck: "false", "aria-label": label });
    this.inputA = field("First card name", "First card, e.g. black lotus");
    this.inputB = field("Second card name", "Second card, e.g. mox pearl");
    this.form = h(
      "form",
      { class: "compare-form", onsubmit: (event) => this.submit(event) },
      h("div", { class: "search-box search-box-compact" }, h("span", { class: "search-icon", "aria-hidden": "true" }), this.inputA),
      h(
        "button",
        {
          class: "swap",
          type: "button",
          "aria-label": "Swap the two cards",
          onclick: () => {
            [this.inputA.value, this.inputB.value] = [this.inputB.value, this.inputA.value];
          },
        },
        "⇄"
      ),
      h("div", { class: "search-box search-box-compact" }, h("span", { class: "search-icon", "aria-hidden": "true" }), this.inputB),
      h("button", { class: "button button-primary", type: "submit" }, h("span", { class: "spinner", "aria-hidden": "true" }), "Compare")
    );
    this.body = h("div", { class: "compare-body" });
    root.append(h("h1", { class: "page-title" }, "Compare two cards"), this.form, this.body);
  },

  submit(event) {
    event.preventDefault();
    const nameA = this.inputA.value.trim();
    const nameB = this.inputB.value.trim();
    // Same checks and wording as the CLI's compare command.
    if (!nameA) return toast("First card name cannot be empty.", "error");
    if (!nameB) return toast("Second card name cannot be empty.", "error");
    go(hashFor("compare", nameA, nameB));
  },

  async update(route) {
    const [nameA = "", nameB = ""] = route.args;
    this.inputA.value = nameA;
    this.inputB.value = nameB;
    if (!nameA.trim() || !nameB.trim()) {
      this.body.replaceChildren(
        notice("Pick two cards", "Type two names above, or use the + button on any card to collect them in the tray.")
      );
      return;
    }
    const requestId = (this.requestId = (this.requestId ?? 0) + 1);
    this.form.classList.add("is-loading");
    try {
      // One after the other, like the CLI, so the rate-limit pause holds.
      const cardA = await loadCard(nameA);
      const cardB = await loadCard(nameB);
      if (requestId !== this.requestId) return;
      this.body.replaceChildren(comparison(cardA, cardB));
    } catch (exc) {
      if (requestId !== this.requestId) return;
      this.body.replaceChildren(notice("Couldn't compare", errorMessage(exc, "compare"), "error"));
    } finally {
      if (requestId === this.requestId) this.form.classList.remove("is-loading");
    }
  },

  focus() {
    this.inputA.focus();
  },
};

/** Two pictures on top, then one row per field; differences are highlighted. */
function comparison(cardA, cardB) {
  const { a, b } = compareCards(cardA, cardB); // same summaries as the CLI's compare
  const pt = (summary) => (Object.hasOwn(summary, "power") ? `${summary.power}/${summary.toughness}` : "n/a");

  // [label, value for A, value for B, how to show a value]
  const rows = [
    ["Mana cost", formatField(a.mana_cost), formatField(b.mana_cost), (value) => (value === "n/a" ? value : symbolText(value))],
    ["Mana value", String(a.cmc), String(b.cmc)],
    ["Type", formatField(a.type_line), formatField(b.type_line)],
    ["Rarity", formatField(a.rarity), formatField(b.rarity)],
    ["Set", formatField(a.set_name), formatField(b.set_name)],
    ["Price (USD)", formatPrice(a.price_usd), formatPrice(b.price_usd)],
    ["P/T", pt(a), pt(b)],
  ];

  // Mark the cheaper card when both have a price.
  const cheaper =
    a.price_usd !== null && b.price_usd !== null && a.price_usd !== b.price_usd ? (a.price_usd < b.price_usd ? "a" : "b") : null;

  const column = (card, side) =>
    h(
      "a",
      { class: "compare-card", href: hashFor("card", card.name) },
      h("div", { class: "tile-media" }, cardPicture(card), h("span", { class: "sheen", "aria-hidden": "true" })),
      h("span", { class: "compare-name" }, card.name),
      cheaper === side ? h("span", { class: "badge" }, "Lower price") : null
    );

  const heads = [column(cardA, "a"), column(cardB, "b")];
  heads.forEach((head) => addTilt(head.firstChild));

  return h(
    "div",
    { class: "comparison" },
    h("div", { class: "compare-heads" }, heads[0], h("span", { class: "versus", "aria-hidden": "true" }, "VS"), heads[1]),
    h(
      "table",
      { class: "compare-table" },
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, ""), h("th", { scope: "col" }, a.name), h("th", { scope: "col" }, b.name))),
      h(
        "tbody",
        {},
        rows.map(([label, valueA, valueB, show = (value) => value]) =>
          h(
            "tr",
            { class: valueA !== valueB ? "is-different" : "" },
            h("th", { scope: "row" }, label),
            h("td", {}, show(valueA)),
            h("td", {}, show(valueB))
          )
        )
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Router: show the view named in the #hash
// ---------------------------------------------------------------------------

const views = { search: searchView, card: cardView, compare: compareView };
let activeName = null;

/** "#/card/Sol%20Ring" -> { view: "card", args: ["Sol Ring"], params } */
function parseRoute() {
  const [path, query = ""] = location.hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part; // a hand-typed "%" that isn't valid encoding
    }
  });
  const view = Object.hasOwn(views, parts[0] ?? "") ? parts[0] : "search";
  return { view, args: parts.slice(1), params: new URLSearchParams(query) };
}

function showRoute() {
  const route = parseRoute();
  const root = document.getElementById("view");
  if (route.view !== activeName) {
    // Build the new view's page once; later visits only update its content.
    activeName = route.view;
    root.replaceChildren();
    root.dataset.view = route.view;
    views[route.view].mount(root);
    document.title = "MyManaBox · Magic card lookup";
    window.scrollTo({ top: 0 });
  }
  updateTabs(route.view);
  renderTray();
  return views[route.view].update(route);
}

/** Move the sliding pill under the active tab and keep tab links current. */
function updateTabs(viewName) {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    const active = tab.dataset.view === viewName;
    tab.classList.toggle("is-active", active);
    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
    if (tab.dataset.view === "search" && state.lastSearch) tab.href = `#/search?q=${encodeURIComponent(state.lastSearch)}`;
    if (tab.dataset.view === "card" && state.lastCard) tab.href = hashFor("card", state.lastCard);
  });
  const active = document.querySelector(".tab.is-active");
  const indicator = document.querySelector(".tab-indicator");
  if (active) {
    indicator.style.setProperty("--x", `${active.offsetLeft}px`);
    indicator.style.setProperty("--w", `${active.offsetWidth}px`);
  }
}

/** Use the View Transitions API (when the browser has it) for smooth page changes. */
function navigate() {
  if (!document.startViewTransition || prefersReducedMotion.matches) {
    showRoute();
    return;
  }
  const transition = document.startViewTransition(async () => {
    // Wait (briefly) for cached content so the picture can morph into place.
    await Promise.race([showRoute(), new Promise((resolve) => setTimeout(resolve, 250))]);
  });
  // A quick second click skips the running animation; that is fine, so ignore it.
  for (const step of [transition.ready, transition.finished, transition.updateCallbackDone]) {
    step.catch(() => {});
  }
}

window.addEventListener("hashchange", navigate);
window.addEventListener("resize", () => updateTabs(activeName));

// Press "/" anywhere (outside a text box) to jump to the main input.
document.addEventListener("keydown", (event) => {
  const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
  if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    views[activeName]?.focus();
  }
});

showRoute();
