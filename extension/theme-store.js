// SPDX-License-Identifier: GPL-3.0-or-later

// Shows the Design controls a theme declares. Untagged controls are core and
// always show; "all", a missing entry or a missing declaration shows them all.
export function applyDesignSettings(section, theme) {
  const declared = Array.isArray(theme?.designSettings) ? theme.designSettings : null;
  for (const control of section.querySelectorAll("[data-design-setting]")) {
    control.hidden = declared !== null && !declared.includes(control.dataset.designSetting);
  }
  for (const group of section.querySelectorAll("[data-design-group]")) {
    group.hidden = [...group.querySelectorAll("[data-design-setting]")].every(control => control.hidden);
  }
  const hint = section.querySelector("#popup-theme-hint");
  hint.hidden = declared === null;
  hint.textContent = declared === null ? ""
    : `${theme.name} uses only the settings shown here. Your other Design settings are kept for Default.`;
}

// Every theme tile is a small popup drawn the same way, in that theme's
// colours: a palette tile shows the standard popup, and each Advanced theme
// shows its own arrangement (tabs, an inline reading, text only, a list).
// Automatic passes two palettes and shows the second across the right side.
const SVG = "http://www.w3.org/2000/svg";
const ARRANGEMENTS = {
  // [x, y, width, height, colour role, opacity]
  default: [
    [8, 8, 144, 20, "base-200", 1, 6], [14, 15, 24, 6, "primary"], [42, 15, 18, 6, "secondary"], [128, 15, 18, 6, "accent"],
    [12, 37, 58, 11, "base-content", 0.95],
    [12, 57, 128, 5, "base-content", 0.5], [12, 67, 110, 5, "base-content", 0.5], [12, 80, 120, 5, "base-content", 0.5]],
  nazeka: [
    [10, 12, 40, 11, "base-content", 0.95], [54, 13, 34, 9, "primary"], [132, 14, 7, 7, "secondary"], [143, 14, 7, 7, "secondary"],
    [10, 33, 24, 4, "secondary"], [37, 33, 80, 4, "base-content", 0.55], [10, 42, 120, 4, "base-content", 0.55],
    [10, 54, 34, 9, "base-content", 0.95], [48, 55, 28, 7, "primary"],
    [10, 71, 24, 4, "secondary"], [37, 71, 90, 4, "base-content", 0.55]],
  plain: [
    [12, 14, 112, 5, "base-content", 0.7], [12, 25, 130, 5, "base-content", 0.7], [12, 36, 96, 5, "base-content", 0.7],
    [12, 51, 124, 5, "base-content", 0.7], [12, 62, 104, 5, "base-content", 0.7], [12, 77, 118, 5, "base-content", 0.7]],
  jl: [
    [8, 8, 16, 9, "primary", 1, 3], [27, 8, 40, 9, "base-200", 1, 3],
    [10, 26, 30, 10, "base-content", 0.95], [44, 27, 22, 8, "base-content", 0.95], [120, 28, 20, 6, "accent"],
    [10, 41, 40, 5, "secondary"], [10, 51, 110, 5, "base-content", 0.5],
    [8, 62, 144, 1, "base-content", 0.35, 0],
    [10, 69, 12, 9, "base-content", 0.95], [26, 70, 26, 7, "base-content", 0.95], [56, 71, 40, 5, "secondary"],
    [10, 84, 100, 5, "base-content", 0.5]],
  bee: [
    [6, 6, 18, 9, "primary", 1, 3], [27, 6, 30, 9, "base-200", 1, 3], [60, 6, 24, 9, "base-200", 1, 3],
    [10, 23, 30, 10, "base-content", 0.95], [44, 24, 24, 8, "secondary"], [120, 25, 22, 6, "accent"],
    [10, 39, 44, 5, "secondary"],
    [11, 50, 4, 4, "base-content", 0.8, 2], [19, 50, 60, 4, "base-content", 0.5],
    [11, 59, 4, 4, "base-content", 0.8, 2], [19, 59, 92, 4, "base-content", 0.5],
    [10, 70, 112, 4, "base-content", 0.5], [10, 81, 70, 4, "base-content", 0.5]],
};

export function themePreview(document, palette, second = null, arrangement = "default") {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 160 100");
  svg.setAttribute("aria-hidden", "true");
  const shapes = ARRANGEMENTS[arrangement] ?? ARRANGEMENTS.default;
  const draw = (colours, clip) => {
    if (!colours) return;
    const group = document.createElementNS(SVG, "g");
    if (clip) group.setAttribute("clip-path", clip);
    const shape = (x, y, width, height, fill, opacity = 1, radius = 3) => {
      const rect = document.createElementNS(SVG, "rect");
      for (const [name, value] of Object.entries({ x, y, width, height, rx: radius, fill, opacity })) {
        rect.setAttribute(name, String(value));
      }
      group.append(rect);
    };
    shape(0, 0, 160, 100, colours["base-100"], 1, 0);
    for (const [x, y, width, height, role, opacity, radius] of shapes) {
      shape(x, y, width, height, colours[role], opacity, radius);
    }
    svg.append(group);
  };
  draw(palette);
  if (second) {
    const clip = document.createElementNS(SVG, "clipPath");
    clip.id = "theme-preview-second-half";
    const half = document.createElementNS(SVG, "polygon");
    half.setAttribute("points", "100,0 160,0 160,100 60,100");
    clip.append(half);
    svg.append(clip);
    draw(second, "url(#theme-preview-second-half)");
  }
  return svg;
}

// Each Advanced theme's own colours, taken from its screenshot.
const LAYOUT_COLOURS = {
  default: { "base-100": "#2b2a33", "base-200": "#35343f", "base-content": "#ececf0",
    primary: "#a89ce4", secondary: "#6fa898", accent: "#8f8d9a" },
  nazeka: { "base-100": "#191919", "base-200": "#262626", "base-content": "#8cc4f0",
    primary: "#8fe08f", secondary: "#8a8a8a", accent: "#6fb3e8" },
  plain: { "base-100": "#ffffff", "base-200": "#f1f1f1", "base-content": "#222222",
    primary: "#bdbdbd", secondary: "#d6d6d6", accent: "#d6d6d6" },
  jl: { "base-100": "#262626", "base-200": "#3a3a3a", "base-content": "#e8913a",
    primary: "#2196f3", secondary: "#8ecae6", accent: "#e8e83a" },
  bee: { "base-100": "#fdf6fb", "base-200": "#f3d6e8", "base-content": "#8e1f5e",
    primary: "#8e1f5e", secondary: "#6a4fb3", accent: "#e9cf9e" },
};

export function layoutPreview(document, slug) {
  return themePreview(document, LAYOUT_COLOURS[slug] ?? LAYOUT_COLOURS.plain, null, slug);
}

export function createThemeStore({ root, design, onSelect }) {
  const document = root.ownerDocument;
  const cards = new Map();
  let options;
  let loading;
  let catalogue;
  let designTheme;

  // The Store cards and the Design declarations share one catalogue read.
  function loadCatalogue() {
    catalogue ??= (async () => {
      const response = await fetch(new URL("vendor/themes/index.json", document.baseURI));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()).themes;
    })();
    return catalogue;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function updateSelection() {
    for (const [slug, button] of cards) {
      const selected = slug === globalThis.HDReaderOptions.popupRenderer(options.popupTheme);
      button.textContent = selected ? "Current theme" : "Use";
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  async function load() {
    try {
      const themes = await loadCatalogue();
      const grid = root.querySelector(".theme-store-grid");
      for (const theme of themes) {
        const card = element("article", "theme-store-card");
        card.dataset.theme = theme.slug;
        const image = element("div", "theme-store-preview");
        image.append(layoutPreview(document, theme.slug));
        const heading = element("h3", "", theme.name);
        const description = element("p", "hint", theme.description);
        const benchmark = element("a", "theme-store-benchmark", theme.benchmark);
        benchmark.href = theme.benchmarkUrl;
        benchmark.target = "_blank";
        benchmark.rel = "noopener noreferrer";
        const button = element("button", "ghost");
        button.type = "button";
        button.addEventListener("click", () => onSelect(theme.slug));
        card.append(image, heading, description, benchmark, button);
        cards.set(theme.slug, button);
        grid.append(card);
      }
      updateSelection();
      // The row only shows two or three cards, so Previous and Next themes
      // page it. Each disables (which hides it) at its end, the last pixel
      // counting as the end for fractional widths, and hands keyboard focus
      // to the other rather than dropping it.
      const previousButton = root.querySelector("#theme-store-previous");
      const nextButton = root.querySelector("#theme-store-next");
      const updateScrollButtons = () => {
        const focused = document.activeElement;
        previousButton.disabled = grid.scrollLeft <= 0;
        nextButton.disabled = grid.scrollLeft >= grid.scrollWidth - grid.clientWidth - 1;
        if (focused === nextButton && nextButton.disabled) previousButton.focus();
        else if (focused === previousButton && previousButton.disabled) nextButton.focus();
      };
      previousButton.addEventListener("click", () => grid.scrollBy({ left: -grid.clientWidth }));
      nextButton.addEventListener("click", () => grid.scrollBy({ left: grid.clientWidth }));
      grid.addEventListener("scroll", updateScrollButtons, { passive: true });
      // Also runs once the row first has a size (the store can load while
      // Design is hidden) and whenever it resizes.
      new ResizeObserver(updateScrollButtons).observe(grid);
    } catch (error) {
      root.querySelector(".theme-store-status").textContent = `Could not load bundled themes: ${error.message}`;
    }
  }

  // Every selection waits for the same catalogue read, so selections apply in
  // order and the latest wins. The flag only hides the Store: a theme still in
  // use keeps filtering Design.
  function updateDesign() {
    const slug = globalThis.HDReaderOptions.popupRenderer(options.popupTheme);
    if (slug === designTheme) return;
    designTheme = slug;
    void loadCatalogue().then(themes => themes.find(theme => theme.slug === slug)).catch(() => undefined)
      .then(theme => applyDesignSettings(design, theme));
  }

  return { render(next) {
    options = next;
    root.hidden = !options.experimental.themeStore;
    if (!root.hidden) loading ??= load();
    updateSelection();
    updateDesign();
  } };
}
