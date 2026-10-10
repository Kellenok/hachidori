// SPDX-License-Identifier: GPL-3.0-or-later

// Settings dropdowns open a menu drawn by the page instead of the browser's
// own list, so options can carry a second line and match the page. The
// native <select> stays the control: it keeps its value, its options, its
// label, its focus and its change events, and every settings controller keeps
// writing to it as before. Only the open list is replaced.

// The keys that open a native select; Enter does not, so it still reaches the
// select (or its form) as it would without this menu.
const OPEN_KEYS = new Set([" ", "F4"]);
const DASH = " — ";
const TRAILING_NOTE = /^(.*\S) \(([^()]+)\)$/u;

// "Ascending — lowest number first" and "Same as page delay (200 ms)" read as
// a title over a quieter note. An explicit data-hint wins over the text.
export function optionParts(option) {
  const text = option.textContent.trim();
  if (option.dataset.hint) return { label: text, hint: option.dataset.hint };
  const dash = text.indexOf(DASH);
  if (dash > 0) return { label: text.slice(0, dash), hint: text.slice(dash + DASH.length) };
  const note = text.match(TRAILING_NOTE);
  return note ? { label: note[1], hint: note[2] } : { label: text, hint: "" };
}

// A closed dropdown shows only an option's title; its note moves to data-hint
// for the open menu. The import dialog keeps whole names, where two revisions
// of one dictionary may differ only in the note.
const WHOLE_TEXT = "#import-decision-target";

function splitOptions(root) {
  for (const option of root.querySelectorAll?.("select option:not([data-hint])") ?? []) {
    if (option.closest(WHOLE_TEXT)) continue;
    const { label, hint } = optionParts(option);
    if (!hint) continue;
    option.dataset.hint = hint;
    option.textContent = label;
  }
}

export function createSelectMenus(document) {
  const window = document.defaultView;
  splitOptions(document);
  // Controllers rebuild and relabel options as settings change.
  new window.MutationObserver(() => splitOptions(document))
    .observe(document.body, { childList: true, subtree: true, characterData: true });
  let menu = null;
  let typed = "";
  let typedAt = 0;

  const usable = select => select instanceof window.HTMLSelectElement && !select.multiple && select.size <= 1
    && !select.disabled;

  function close({ restoreFocus = true } = {}) {
    if (!menu) return;
    const { select, root } = menu;
    menu = null;
    root.remove();
    select.removeAttribute("aria-expanded");
    window.removeEventListener("resize", onViewportChange);
    document.removeEventListener("scroll", onViewportChange, true);
    document.removeEventListener("pointerdown", onOutsidePointer, true);
    if (restoreFocus) select.focus({ preventScroll: true });
  }

  function onViewportChange(event) {
    if (menu && event.type === "scroll" && menu.root.contains(event.target)) return;
    close({ restoreFocus: false });
  }

  function onOutsidePointer(event) {
    if (menu && !menu.root.contains(event.target) && event.target !== menu.select) close({ restoreFocus: false });
  }

  function items() {
    return menu ? [...menu.root.querySelectorAll('[role="option"]:not([aria-disabled="true"])')] : [];
  }

  function activate(item, { scroll = true } = {}) {
    if (!menu || !item) return;
    for (const node of menu.root.querySelectorAll("[data-active]")) node.removeAttribute("data-active");
    item.setAttribute("data-active", "");
    menu.root.setAttribute("aria-activedescendant", item.id);
    if (scroll) item.scrollIntoView({ block: "nearest" });
  }

  function choose(item) {
    if (!menu || !item) return;
    const { select } = menu;
    const option = menu.options.get(item.id);
    close();
    if (!option || option.selected) return;
    select.value = option.value;
    select.dispatchEvent(new window.Event("input", { bubbles: true }));
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  }

  function place(select, root) {
    const anchor = select.getBoundingClientRect();
    const gap = 4;
    const margin = 8;
    root.style.minWidth = `${Math.max(anchor.width, 160)}px`;
    const width = root.offsetWidth;
    const below = window.innerHeight - anchor.bottom - gap - margin;
    const above = anchor.top - gap - margin;
    const upward = root.scrollHeight > below && above > below;
    root.style.maxHeight = `${Math.max(Math.min(upward ? above : below, 360), 120)}px`;
    // Controls sit at the right of their rows, so the menu grows leftwards from the control's right edge.
    root.style.left = `${Math.max(margin, Math.min(anchor.right - width, window.innerWidth - width - margin))}px`;
    if (upward) root.style.bottom = `${window.innerHeight - anchor.top + gap}px`;
    else root.style.top = `${anchor.bottom + gap}px`;
  }

  function open(select) {
    close({ restoreFocus: false });
    const root = document.createElement("div");
    root.className = "select-menu";
    root.setAttribute("role", "listbox");
    root.tabIndex = -1;
    // A label that wraps its select would read out every option as well.
    const label = select.labels?.[0];
    const named = label?.querySelector(".field-label") ?? (label && !label.contains(select) ? label : null);
    const name = named?.textContent.trim() || select.getAttribute("aria-label") || "";
    if (name) root.setAttribute("aria-label", name);
    const options = new Map();
    let index = 0;
    let selected = null;
    const addOption = (option, parent) => {
      if (option.hidden) return;
      const item = document.createElement("div");
      item.className = "select-menu-option";
      item.id = `select-menu-option-${index++}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));
      if (option.disabled) item.setAttribute("aria-disabled", "true");
      const check = document.createElement("span");
      check.className = "select-menu-check";
      check.setAttribute("aria-hidden", "true");
      const { label, hint } = optionParts(option);
      const title = document.createElement("span");
      title.className = "select-menu-label";
      title.textContent = label;
      item.append(check, title);
      if (hint) {
        const note = document.createElement("span");
        note.className = "select-menu-hint";
        note.textContent = hint;
        item.append(note);
      }
      options.set(item.id, option);
      if (option.selected) selected = item;
      parent.append(item);
    };
    for (const child of select.children) {
      if (child instanceof window.HTMLOptGroupElement) {
        if (child.hidden || !child.querySelector("option:not([hidden])")) continue;
        const group = document.createElement("div");
        group.className = "select-menu-group";
        group.setAttribute("role", "group");
        const heading = document.createElement("div");
        heading.className = "select-menu-heading";
        heading.id = `select-menu-group-${index++}`;
        heading.textContent = child.label;
        group.setAttribute("aria-labelledby", heading.id);
        group.append(heading);
        for (const option of child.children) addOption(option, group);
        root.append(group);
      } else if (child instanceof window.HTMLOptionElement) {
        addOption(child, root);
      }
    }
    menu = { select, root, options };
    select.setAttribute("aria-expanded", "true");
    // A modal dialog draws above the page, so a menu for a control in one opens inside it.
    (select.closest("dialog[open]") ?? document.body).append(root);
    place(select, root);
    activate(selected ?? items()[0], { scroll: false });
    selected?.scrollIntoView({ block: "center" });
    root.focus({ preventScroll: true });

    root.addEventListener("pointerdown", event => event.preventDefault());
    root.addEventListener("pointermove", event => {
      const item = event.target.closest('[role="option"]:not([aria-disabled="true"])');
      if (item && !item.hasAttribute("data-active")) activate(item, { scroll: false });
    });
    root.addEventListener("click", event => {
      const item = event.target.closest('[role="option"]:not([aria-disabled="true"])');
      if (item) choose(item);
    });
    root.addEventListener("keydown", onMenuKey);
    root.addEventListener("focusout", event => {
      if (menu?.root === root && !root.contains(event.relatedTarget)) close({ restoreFocus: false });
    });
    window.addEventListener("resize", onViewportChange);
    document.addEventListener("scroll", onViewportChange, true);
    document.addEventListener("pointerdown", onOutsidePointer, true);
  }

  function onMenuKey(event) {
    const list = items();
    const current = list.findIndex(item => item.hasAttribute("data-active"));
    const step = offset => activate(list[Math.max(0, Math.min(list.length - 1, current + offset))]);
    switch (event.key) {
      case "ArrowDown": step(1); break;
      case "ArrowUp": step(-1); break;
      case "PageDown": step(8); break;
      case "PageUp": step(-8); break;
      case "Home": activate(list[0]); break;
      case "End": activate(list.at(-1)); break;
      case "Enter":
      case " ": choose(list[current]); break;
      case "Escape": close(); break;
      // Back on the trigger, Tab then moves on as it would from a native select.
      case "Tab": close(); return;
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        const now = Date.now();
        typed = now - typedAt > 600 ? event.key.toLowerCase() : typed + event.key.toLowerCase();
        typedAt = now;
        const ordered = [...list.slice(current + (typed.length === 1 ? 1 : 0)), ...list];
        activate(ordered.find(item => item.textContent.trim().toLowerCase().startsWith(typed)));
      }
    }
    event.preventDefault();
    event.stopPropagation();
  }

  document.addEventListener("mousedown", event => {
    const select = event.target.closest?.("select");
    if (event.button !== 0 || !usable(select)) return;
    event.preventDefault();
    if (menu?.select === select) {
      close();
      return;
    }
    select.focus({ preventScroll: true });
    open(select);
  });
  document.addEventListener("keydown", event => {
    const select = event.target;
    if (!usable(select) || menu) return;
    const altArrow = event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp");
    if (!altArrow && !OPEN_KEYS.has(event.key)) return;
    event.preventDefault();
    open(select);
  });

  return { close };
}

// Settings loads this file as its own module; it serves the page it is on.
// Menus and marker lists scroll with a thin bar drawn over their content,
// shown only while they scroll, so it takes no room from the options.
const OVERLAY_SCROLLERS = ".select-menu, .anki-marker-listbox, .theme-gallery-body";

export function createOverlayScrollbars(document) {
  const window = document.defaultView;
  const thumbs = new WeakMap();
  const timers = new WeakMap();
  document.addEventListener("scroll", event => {
    const scroller = event.target;
    if (!(scroller instanceof window.Element) || !scroller.matches(OVERLAY_SCROLLERS)) return;
    let thumb = thumbs.get(scroller);
    if (!thumb?.isConnected) {
      thumb = document.createElement("span");
      thumb.className = "overlay-scrollbar";
      thumb.setAttribute("aria-hidden", "true");
      scroller.append(thumb);
      thumbs.set(scroller, thumb);
    }
    const { scrollTop, scrollHeight, clientHeight } = scroller;
    const range = scrollHeight - clientHeight;
    if (range <= 0) return;
    const height = Math.max(24, clientHeight * clientHeight / scrollHeight);
    if (thumb.style.height !== `${height}px`) thumb.style.height = `${height}px`;
    thumb.style.transform = `translateY(${scrollTop + (clientHeight - height) * scrollTop / range}px)`;
    scroller.classList.add("is-scrolling");
    window.clearTimeout(timers.get(scroller));
    timers.set(scroller, window.setTimeout(() => scroller.classList.remove("is-scrolling"), 700));
  }, true);
}

if (typeof document !== "undefined") {
  createSelectMenus(document);
  createOverlayScrollbars(document);
}
