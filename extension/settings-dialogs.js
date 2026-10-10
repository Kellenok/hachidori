// SPDX-License-Identifier: GPL-3.0-or-later

import { layoutPreview, themePreview } from "./theme-store.js";

// Settings dialogs close on a click outside them, as menus do. The Theme
// chooser opens a gallery instead of a list: every popup palette drawn as a
// small popup in its own colours, then the Advanced themes. The native
// <select> stays the control and receives the choice.

const THEME_SELECT = "opt-popup-theme";
const STORE_GROUP = "Advanced themes";
const OPEN_KEYS = new Set([" ", "Enter", "F4"]);
const COLOUR = /^(#[0-9a-f]{3,8}|(rgb|hsl|oklch|oklab)a?\([\d\s.,%/a-z-]+\))$/iu;

// Each palette is read once from the popup stylesheet's own theme rules.
function readPalettes(document) {
  const palettes = new Map();
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      const selector = rule.selectorText ?? "";
      for (const match of selector.matchAll(/data-hoshidicts-theme="([\w-]+)"/gu)) {
        const read = name => rule.style.getPropertyValue(`--hoshidicts-palette-${name}`).trim();
        const palette = Object.fromEntries(["base-100", "base-200", "base-content", "primary", "secondary", "accent"]
          .map(name => [name, read(name)]));
        if (Object.values(palette).every(value => COLOUR.test(value))) palettes.set(match[1], palette);
      }
    }
  }
  return palettes;
}

function palettePreview(document, palettes, id) {
  // Automatic follows the system: the default dark palette beside a light one.
  if (id === "auto") return themePreview(document, palettes.get("default"), palettes.get("light"));
  return themePreview(document, palettes.get(id) ?? palettes.get("default"));
}

export function createSettingsDialogs(document) {
  const window = document.defaultView;
  const gallery = document.getElementById("theme-gallery");
  const select = document.getElementById(THEME_SELECT);
  const palettesRoot = document.getElementById("theme-gallery-palettes");
  const store = document.getElementById("theme-store");
  let palettes = null;

  const open = dialog => {
    if (dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  };
  const close = dialog => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  };

  // A click on the backdrop lands on the dialog itself, outside its box.
  document.addEventListener("click", event => {
    const dialog = event.target;
    if (!(dialog instanceof window.HTMLDialogElement) || !dialog.open || !dialog.classList.contains("settings-dialog")) return;
    const box = dialog.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right
      && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) close(dialog);
  });

  if (!gallery || !select) return;

  function choose(value) {
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new window.Event("input", { bubbles: true }));
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    }
    close(gallery);
  }

  function tile(option, preview) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-tile";
    button.setAttribute("aria-pressed", String(option.selected));
    button.disabled = option.disabled;
    const frame = document.createElement("span");
    frame.className = "theme-tile-preview";
    frame.append(preview);
    const name = document.createElement("span");
    name.className = "theme-tile-name";
    name.textContent = option.textContent;
    button.append(frame, name);
    button.addEventListener("click", () => choose(option.value));
    return button;
  }

  function render() {
    palettes ??= readPalettes(document);
    const sections = [];
    for (const group of select.children) {
      if (!(group instanceof window.HTMLOptGroupElement) || group.hidden) continue;
      // The Store's own cards describe its layouts when the Store is on.
      if (group.label === STORE_GROUP && !store?.hidden) continue;
      const section = document.createElement("section");
      section.className = "theme-gallery-section";
      const heading = document.createElement("h3");
      heading.textContent = group.label;
      const grid = document.createElement("div");
      grid.className = "theme-gallery-grid";
      for (const option of group.children) {
        // Every palette already uses the standard layout, so it needs no tile of its own.
        if (option.hidden || (group.label === STORE_GROUP && option.value === "default")) continue;
        const preview = group.label === STORE_GROUP
          ? layoutPreview(document, option.value) : palettePreview(document, palettes, option.value);
        grid.append(tile(option, preview));
      }
      section.append(heading, grid);
      sections.push(section);
    }
    palettesRoot.replaceChildren(...sections);
  }

  function show() {
    render();
    open(gallery);
    (gallery.querySelector('.theme-tile[aria-pressed="true"]') ?? gallery.querySelector(".theme-tile"))
      ?.focus({ preventScroll: false });
  }

  // The Theme chooser opens the gallery; this runs before the list menus.
  document.addEventListener("mousedown", event => {
    if (event.target !== select || event.button !== 0 || select.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    select.focus({ preventScroll: true });
    show();
  }, true);
  document.addEventListener("keydown", event => {
    if (event.target !== select) return;
    const altArrow = event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp");
    if (!altArrow && !OPEN_KEYS.has(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    show();
  }, true);
  document.getElementById("theme-gallery-close")?.addEventListener("click", () => close(gallery));
  gallery.addEventListener("close", () => select.focus({ preventScroll: true }));
  // A Store card's own Use button applies its layout; the gallery then closes.
  store?.addEventListener("click", event => {
    if (event.target.closest(".theme-store-card button")) window.setTimeout(() => close(gallery), 0);
  });
}

if (typeof document !== "undefined") createSettingsDialogs(document);
