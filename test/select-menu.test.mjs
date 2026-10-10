import assert from "node:assert/strict";
import test from "node:test";
import { optionParts } from "../extension/select-menu.js";

const option = (text, hint) => ({ textContent: text, dataset: hint ? { hint } : {} });

test("an open dropdown shows a long option as a title over a quieter note", () => {
  assert.deepEqual(optionParts(option("Automatic — use every kanji dictionary")),
    { label: "Automatic", hint: "use every kanji dictionary" });
  assert.deepEqual(optionParts(option("Same as page delay (200 ms)")), { label: "Same as page delay", hint: "200 ms" });
  assert.deepEqual(optionParts(option("Ascending", "Lowest number first")),
    { label: "Ascending", hint: "Lowest number first" });
  assert.deepEqual(optionParts(option("Close")), { label: "Close", hint: "" });
});
