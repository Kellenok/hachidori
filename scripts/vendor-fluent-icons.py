# SPDX-License-Identifier: GPL-3.0-or-later
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import urlopen
import json

ROOT = Path(__file__).resolve().parents[1]
REVISION = "9cf8af0f95a555918a60b8147a2f33a6a1248442"
NAMES = ["add", "document-add", "document-edit", "book-search", "speaker-2", "edit", "checkmark", "error-circle", "more-horizontal", "arrow-clockwise", "arrow-sync", "subtract", "dismiss", "open", "arrow-up", "arrow-down", "arrow-right", "star", "reorder", "settings", "desktop", "prohibited", "book", "cursor-hover", "paint-brush", "layer-diagonal", "keyboard", "share", "history", "wrench", "chevron-down"]
BASE = f"https://raw.githubusercontent.com/microsoft/fluentui-system-icons/{REVISION}/"
DEST = ROOT / "extension/icons/fluent"
FILLED_DEST = DEST / "filled"
DEST.mkdir(parents=True, exist_ok=True)
FILLED_DEST.mkdir(parents=True, exist_ok=True)
for directory in (DEST, FILLED_DEST):
    for path in directory.glob("*.svg"):
        if path.stem not in NAMES:
            path.unlink()

# Outlines use the 16px drawings shown at 20px: their strokes are a little
# heavier than the 20px set and match the weight of the text beside them. An
# icon without a 16px drawing keeps its 20px one. The filled 20px drawing marks
# the current or pressed state (the current Settings section, a pressed button).
OUTLINE_SIZES = ("16", "20")


def fetch(name, style, sizes):
    title = " ".join(word.capitalize() for word in name.split("-"))
    for size in sizes:
        path = f"assets/{title}/SVG/ic_fluent_{name.replace('-', '_')}_{size}_{style}.svg"
        try:
            return path, urlopen(BASE + quote(path), timeout=30).read().decode().strip()
        except HTTPError as error:
            if error.code != 404 or size == sizes[-1]:
                raise
    raise AssertionError(name)


def download(name):
    path, svg = fetch(name, "regular", OUTLINE_SIZES)
    filled_path, filled = fetch(name, "filled", ("20",))
    (DEST / f"{name}.svg").write_text(svg + "\n", newline="\n")
    (FILLED_DEST / f"{name}.svg").write_text(filled + "\n", newline="\n")
    return name, path, svg, filled_path, filled


icons = list(ThreadPoolExecutor(max_workers=8).map(download, NAMES))
ALIASES = {
    "speaker-2": ['.gsm-hoshidicts-audio-button::before'],
    "more-horizontal": ['.gsm-hoshidicts-audio-button[data-state="loading"]::before', '.operational-status.is-working::before'],
    "error-circle": ['.operational-status.is-error::before'],
    "checkmark": ['.operational-status.is-ready::before'],
    "subtract": ['.operational-status:not(.is-working):not(.is-ready):not(.is-error)::before'],
    "dismiss": ['.gsm-hoshidicts-popup-close::before'],
    "open": ['.gloss-link-external-icon'],
    "chevron-down": ['.settings-disclosure > summary::before', '.format-help > summary::before', '.dict-details-toggle::before'],
}
(DEST / "LICENSE").write_bytes(urlopen(BASE + "LICENSE").read())
(DEST / "sources.json").write_text(json.dumps({
    "repository": "microsoft/fluentui-system-icons",
    "revision": REVISION,
    "icons": {name: path for name, path, _svg, _filled_path, _filled in icons},
    "filled": {name: filled_path for name, _path, _svg, filled_path, _filled in icons},
}, indent=2) + "\n", newline="\n")
ICON_SELECTORS = ['.hd-icon', '.gsm-hoshidicts-audio-button::before', '.gsm-hoshidicts-popup-close::before', '.gloss-link-external-icon', '.operational-status::before']
css = '/* SPDX-License-Identifier: GPL-3.0-or-later */\n'
css += ',\n'.join(ICON_SELECTORS) + ' {\n  content: "";\n  display: inline-block;\n  flex: 0 0 auto;\n  width: 20px;\n  height: 20px;\n  vertical-align: middle;\n  background: currentColor;\n  mask: var(--hd-icon) center / contain no-repeat;\n}\n.hd-icon[hidden] { display: none; }\n'
css += '@media (forced-colors: active) {\n  ' + ',\n  '.join(ICON_SELECTORS) + ' { forced-color-adjust: none; background: CanvasText; }\n}\n'


def uri(svg):
    return 'url("data:image/svg+xml,' + quote(svg, safe='') + '")'


for name, _path, svg, _filled_path, filled in icons:
    selectors = ',\n'.join([f'.hd-icon[data-icon="{name}"]'] + ALIASES.get(name, []))
    css += f'{selectors} {{ --hd-icon: {uri(svg)}; --hd-icon-filled: {uri(filled)}; }}\n'
(ROOT / "extension/icons.css").write_text(css, newline="\n")
