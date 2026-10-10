// SPDX-License-Identifier: GPL-3.0-or-later

// Settings lists can be reordered by dragging a row from anywhere on it, not
// only by a handle. The dragged row lifts and follows the pointer while the
// others make room. A drop goes through the list's own controls: the library
// takes the drop it already understands, and the other lists press their own
// move buttons, so every list keeps its one save path. The buttons stay for
// the keyboard.

const LISTS = [
  {
    list: "#dict-list",
    row: "li.dict-row",
    canMove: row => row.querySelector(".dict-drag")?.draggable === true,
    drop(row, target) {
      const options = { bubbles: true, cancelable: true };
      row.querySelector(".dict-drag").dispatchEvent(new Event("dragstart", options));
      target.dispatchEvent(new Event("drop", options));
    },
  },
  // Group commits are queued by ID, so one button pressed again moves on.
  { list: "#dict-group-list", row: "li.dict-group", up: ".dict-group-up", down: ".dict-group-down" },
  { list: ".dict-group-members", row: "li", up: ".dict-group-member-up", down: ".dict-group-member-down" },
  // These lists rebuild at once, so each step presses the moved row's new button.
  { list: "#audio-source-list", row: "li", up: ".audio-up", down: ".audio-down", rebuilds: true },
  { list: "#custom-button-list", row: "li", up: '[data-action="up"]', down: '[data-action="down"]', rebuilds: true },
];
const IGNORED = "input, select, textarea, button, a, summary, label, [contenteditable], .dict-footer";
const THRESHOLD = 5;
const EDGE = 56;

export function createListReorder(document) {
  const window = document.defaultView;
  let press = null;
  let drag = null;

  const rowsOf = (list, spec) => [...list.children].filter(row => row.matches(spec.row) && !row.hidden);

  function specFor(target) {
    for (let node = target; node && node !== document.body; node = node.parentElement) {
      const spec = LISTS.find(candidate => node.matches(candidate.list));
      if (spec) return { spec, list: node };
    }
    return null;
  }

  function begin() {
    const { spec, list, row } = press;
    const rows = rowsOf(list, spec);
    const from = rows.indexOf(row);
    if (from < 0 || rows.length < 2) return false;
    const rects = rows.map(item => item.getBoundingClientRect());
    const scroll = window.scrollY;
    drag = {
      spec, list, row, rows, from, to: from,
      tops: rects.map(rect => rect.top + scroll),
      heights: rects.map(rect => rect.height),
      startY: press.startY + scroll,
      pointerY: press.startY,
      frame: 0,
    };
    window.getSelection()?.removeAllRanges();
    document.documentElement.classList.add("is-reordering");
    row.classList.add("is-reorder-lifted");
    for (const item of rows) if (item !== row) item.classList.add("is-reorder-shifting");
    autoScroll();
    return true;
  }

  function slot(index) {
    const next = drag.tops[index + 1];
    return next === undefined ? drag.heights[index] : next - drag.tops[index];
  }

  function layout() {
    const { rows, from, row } = drag;
    const offset = drag.pointerY + window.scrollY - drag.startY;
    row.style.transform = `translateY(${offset}px)`;
    const centre = drag.tops[from] + offset + drag.heights[from] / 2;
    let to = from;
    for (let index = from + 1; index < rows.length; index++) {
      if (centre > drag.tops[index] + drag.heights[index] / 2) to = index;
    }
    for (let index = from - 1; index >= 0; index--) {
      if (centre < drag.tops[index] + drag.heights[index] / 2) to = index;
    }
    drag.to = to;
    const step = slot(from);
    rows.forEach((item, index) => {
      if (item === row) return;
      let shift = 0;
      if (index > from && index <= to) shift = -step;
      else if (index < from && index >= to) shift = step;
      item.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  }

  // Near the window's top or bottom edge the page scrolls under the row.
  function autoScroll() {
    if (!drag) return;
    const y = drag.pointerY;
    const speed = y < EDGE ? -(EDGE - y) / 3 : y > window.innerHeight - EDGE ? (y - window.innerHeight + EDGE) / 3 : 0;
    if (speed) {
      window.scrollBy(0, speed);
      layout();
    }
    drag.frame = window.requestAnimationFrame(autoScroll);
  }

  function finish(commit) {
    const current = drag;
    drag = null;
    window.cancelAnimationFrame(current.frame);
    document.documentElement.classList.remove("is-reordering");
    for (const item of current.rows) {
      item.style.transform = "";
      item.classList.remove("is-reorder-lifted", "is-reorder-shifting");
    }
    if (!commit || current.to === current.from) return;
    move(current);
    // The click that ends a drag is not a click on the row.
    const swallow = event => {
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => document.removeEventListener("click", swallow, true), 0);
  }

  function move({ spec, list, row, rows, from, to }) {
    if (spec.drop) {
      spec.drop(row, rows[to]);
      return;
    }
    const down = to > from;
    const selector = down ? spec.down : spec.up;
    let index = from;
    let button = row.querySelector(selector);
    for (let step = 0; step < Math.abs(to - from); step++) {
      if (!button || button.disabled) return;
      button.click();
      index += down ? 1 : -1;
      if (spec.rebuilds) button = rowsOf(list, spec)[index]?.querySelector(selector);
    }
  }

  document.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.pointerType === "touch" || drag) return;
    if (event.target.closest(IGNORED) && !event.target.closest(".dict-drag")) return;
    const found = specFor(event.target);
    if (!found) return;
    const row = event.target.closest(found.spec.row);
    if (!row || row.parentElement !== found.list || found.spec.canMove?.(row) === false) return;
    press = { ...found, row, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
  });
  document.addEventListener("pointermove", event => {
    if (drag) {
      drag.pointerY = event.clientY;
      layout();
      return;
    }
    if (!press || event.pointerId !== press.pointerId) return;
    if (Math.hypot(event.clientX - press.startX, event.clientY - press.startY) < THRESHOLD) return;
    if (begin()) {
      drag.pointerY = event.clientY;
      layout();
    }
    press = null;
  });
  document.addEventListener("pointerup", () => {
    press = null;
    if (drag) finish(true);
  });
  document.addEventListener("pointercancel", () => {
    press = null;
    if (drag) finish(false);
  });
  document.addEventListener("keydown", event => {
    if (drag && event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  // The library's handle starts a browser drag of its own; a press already
  // being followed here keeps the one drag.
  document.addEventListener("dragstart", event => {
    if (press || drag) event.preventDefault();
  }, true);
}

if (typeof document !== "undefined") createListReorder(document);
