# Wildsea Charsmith - Polish Translation

A local browser extension that overlays a custom Polish translation onto:

`https://wildsea.charsmith.com/*`

The original website is not modified. The extension translates visible DOM text and selected UI attributes in the browser.
The extension code was written with assistance from ChatGPT.

## Features

- Manifest V3 extension for Chromium browsers and Firefox-compatible MV3 implementations.
- Local `translations.json` dictionary; no translation API or network service is used.
- Exact text matching.
- Phrase replacement, with longer phrases applied first.
- `title`, `aria-label`, and `placeholder` attribute translation.
- Dynamic UI translation using `MutationObserver`.
- Popup switch to enable/disable translation.
- Debug mode that outlines elements where translations were applied.
- Translation statistics shown in the popup.

## Install in Chrome / Edge / Brave

1. Extract this folder somewhere permanent.
2. Open the browser's extensions page (`chrome://extensions`, `edge://extensions`, etc.).
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select this extension folder.
6. Open or reload `https://wildsea.charsmith.com/`.

## Install in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `manifest.json` in this folder.
4. Open or reload `https://wildsea.charsmith.com/`.

Firefox temporary extensions are removed when the browser restarts unless installed through a signed/distributed package.

## Editing translations

The main dictionary is `translations.json`.

### Exact matches

Use `exact` when the whole visible text should be replaced:

```json
"Character": "Postać",
"Crew": "Załoga"
```

### Phrases

Use `phrases` for longer pieces of text that may appear inside a larger text node:

```json
"Create a new character": "Utwórz nową postać",
"Save Character": "Zapisz postać"
```

Longer phrases are applied before shorter ones.


## Important behavior when disabling translation

Disabling the extension stops future translations. It deliberately does not attempt to reverse already-translated DOM nodes. Reversing arbitrary React/Vue-rendered DOM changes can interfere with application state. Reload the Wildsea page after disabling if you need the original English text back immediately.

## Notes

- `script`, `style`, `noscript`, `template`, and `textarea` elements are excluded.
- `contenteditable` areas are excluded to avoid changing user-entered text.
- The extension only runs on `wildsea.charsmith.com`.
- The initial dictionary is deliberately editable: expand it as you encounter new Wildsea/Charsmith labels.
