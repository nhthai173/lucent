# Architecture

How Lucent gets into Zalo, what runs where, and where state lives. Read this before adding a module or changing `install.mjs`.

## Injection pipeline

`install.mjs` builds two renderer bundles and two main-process prefixes, then patches the asar with `patchAsar(backupAsar, targetAsar, edits)`.

| Edited file inside `app.asar` | Content |
|---|---|
| `pc-dist/zalo-glass-theme.css` (new) | `dark("dark-base.css")` + `dark("glass.css")` + `glass-light.css` (+ `transparent.css` when `GLASS_TRANSPARENT=1` on macOS). `templates.js` sets `disabled` on its `<link>` when the selected theme has `native: true` ("Zalo mặc định"), which restores Zalo's own look |
| `pc-dist/zalo-glass.css` (new) | `blur.css` + `album.css` + `ocr.css` + `pet.css` + `translate.css` (features, always on) |
| `pc-dist/zalo-glass.js` (new) | `templates.js` first, then each name in `GLASS_JS` as `theme/<name>.js`, concatenated |
| `pc-dist/index.html`, `pc-dist/popup-viewer.html` | `</head>` replaced to link the two files above; CSP `connect-src 'self'` widened with `http://127.0.0.1:47831` (OCR/config server) |
| `bootstrap.js` | `opts-main.js` + `translate-main.js` + `ocr-main.js` + `drag-main.js` (+ `vibrancy.js`) **prepended** to Zalo's own code |
| `pc-dist/lazy/*.js` | Any chunk containing `enable_fps_monitor` has the flag names renamed so Zalo's FPS monitor (a ~100/s `requestAnimationFrame` loop that keeps the GPU awake) is permanently off |

`dark(f)` rewrites lines that start with `body {` into `body.dark {`. So **in `dark-base.css` and `glass.css` a top-level `body {` block applies in dark mode only**. Selectors other than a line-initial `body {` (for example `:root {`, `html {`, `body::before`) are left untouched and therefore apply in both modes. `glass-light.css` is not rewritten; it uses `body:not(.dark)`.

`asar.mjs` (`patchAsar`) does not repack the archive. It appends new file bytes to the end, rewrites the JSON header (offsets, sizes, sha256 integrity per 4 MiB block), and returns the sha256 of the header JSON. Keys in `edits` containing `*` are matched as a glob on the file name within that directory. An edit callback receives the old content (`Buffer` or `null`) and returns the new content, or a falsy value to skip (this is how files absent in some Zalo versions are tolerated).

## Two worlds: renderer vs main process

- **Renderer** (everything in `theme/*.js` except the files below): runs in each Zalo window's page. Regular DOM, `localStorage`, no Node APIs. Two kinds of window receive it: the main window (and small popup chat windows) and the image viewer `popup-viewer.html`.
- **Main process** (`opts-main.js`, `ocr-main.js`, `vibrancy.js`): prepended to `bootstrap.js`. Node + Electron APIs, no DOM. Each file is wrapped in `try { … } catch` that appends the stack to `<tmpdir>/zalo-glass.log`; keep that so a bug here can never prevent Zalo from starting.
- The two worlds talk through an HTTP server on `127.0.0.1:47831` created in `ocr-main.js`: `/ocr?p=<path>` (OCR) and `/config` (read/write `~/.zalo-glass/config.json` via `globalThis.__zgCfg`, defined in `opts-main.js`). It must stay bound to loopback only and only read files under Zalo's media directory.

## JS module conventions

- Every file is one IIFE: `(() => { … })();`. All files are concatenated into one script, so a top-level `const` would collide across modules. Do not add top-level declarations.
- Shared state: only `globalThis.__zg` created by `templates.js` (`THEMES`, `PETS`, `get()`, `set(k, v)`, `pet()`). Modules that need it must be loaded after `templates.js` (guaranteed by `install.mjs`).
- Modules that are not meant for the viewer begin with `if (location.pathname.endsWith("popup-viewer.html")) return;`. Modules for the viewer only do the opposite (see `ocr.js`).
- Everything must fail soft: if a Zalo element is not found, do nothing. Never throw from an observer callback.

## Module map

| Module | Window | Purpose |
|---|---|---|
| `templates.js` | all | `THEMES`, `PETS`, apply theme variables, `__zg` API |
| `blur.js` (+`blur.css`) | all | Eye button in sidebar and its menu: hide/blur options, album mode, theme and pet card pickers, perf options |
| `pet.js` (+`pet.css`) | main/popup | The pet |
| `album.js` (+`album.css`) | main/popup | Horizontal album carousel (active when body has `zg-album`) |
| `keys.js` | main/popup | Keyboard shortcuts for conversations/messages |
| `meet.js` | main/popup | Adds "Tạo cuộc họp Google Meet" to the chat toolbar "…" menu |
| `translate.js` (+`translate.css`) | main/popup | Message translation (macOS only): action-row button, context-menu item, stored results in `~/.zalo-glass/translations/` (`/translate`, `/translations` routes in `ocr-main.js`, `translate.swift` helper) |
| `ocr.js` (+`ocr.css`) | viewer | Live-Text-style OCR overlay on images |
| `opts-main.js` | main process | Perf options from `~/.zalo-glass/config.json` (RAM flags, no auto-update, throttling, lazy notification window, fake ZaloCap/ZaloCall) |
| `translate-main.js` | main process | Keeps the `translate` helper (Swift, Apple Translation) running; `globalThis.__zgTr(to, text, cb)`; exits after `trKeep` minutes idle (config.json, default 30) |
| `ocr-main.js` | main process | Local HTTP server (OCR + config) |
| `vibrancy.js`, `transparent.css` | main process / CSS | macOS experimental transparent window |

## CSS layers and how Zalo's look is overridden

Zalo styles itself with CSS custom properties (`--surface-background`, `--layer-background-*`, `--blue-message`, `--button-primary-normal`, …). Lucent overrides those tokens on `body` with `!important`:

- `dark-base.css`: base tokens for dark mode (wrapped to `body.dark`).
- `glass.css`: translucent surfaces for dark mode, the `:root { --zg-* }` palette defaults, and the ambient gradient `body::before` (static; animated ambient was removed for CPU reasons).
- `glass-light.css`: the same for light mode under `body:not(.dark)`; it has its own `body::before` gradient using `--zg-l1…l4`.
- Theme colours reach the CSS **only through `--zg-*` variables** (see `add-theme.md`). Components should use `rgb(var(--zg-primary) / .2)`, `rgb(var(--zg-accent) / .3)`, `rgb(var(--zg-ink) / .16)`; never hardcode a hue.

## State and persistence

| What | Where | Key / format |
|---|---|---|
| Selected theme and pet | `localStorage` | `zg-tpl` → `{"theme":"glass","pet":"mochi"}` |
| Eye-menu options (hide message, album, pet on/off, pet big) | `localStorage` | `zg-hide` → `{cmsg:true, pet:false, …}` |
| Perf options (ram, noUpdate, throttle, lazyNoti, noCap, noCall) | `~/.zalo-glass/config.json` | Applied only at Zalo start (needs restart) |
| Original asar backup | `~/.zalo-glass-backup/<version>/` | `app.asar` (+ `Info.plist` on macOS) |
| Native helpers | `~/.zalo-glass/` | `ocr` binary (macOS), `ocr.ps1` (Windows) |

Cross-window sync: `localStorage` writes fire the `storage` event in other windows (`templates.js` listens for the `zg-tpl` key). Same-window changes dispatch a custom `zg-tpl` event, which `pet.js` and `blur.js` listen for to re-render. **Never rename a stored key or an id inside it**: it silently resets every user's choice.

## Body classes that other code reads

Set by `blur.js render()` on `document.body`:

| Class | Meaning | Read by |
|---|---|---|
| `zg-hide-<opt>` | Option `<opt>` (msg, name, avatar, cmsg, cimg, cname, view) is on | `blur.css`, `pet.js hiding()` |
| `zg-album` | Album carousel on | `album.js`, `album.css` |
| `zg-pet-off` | Pet hidden | `pet.js tick()` |
| `zg-pet-big` | "Enlarge pet while content is hidden" on | `pet.js hiding()` |
| `dark` | Zalo is in dark mode (set by Zalo itself) | all CSS |
| `zg-mac` on `<html>` | Mac platform (shortcut hints show ⌘) | `blur.css` |

## Zalo DOM facts used in this repo

These class names come from Zalo and can change in an update; if one breaks, fix the selector, do not add a fallback layer.
`.chat-box-bar` (compose toolbar), `.rich-input` (message editor), `#chatViewContainer`, `[id^="bb_msg_id"]` (message rows), `.conv-item` (conversation row), `.msg-filters-bar`, `.conv-tab`, `.dd-lbl`, `.zmenu-item` (menu entries), `.album` / `.album__item`, `.imageShowMainImage img.zimg-el` (viewer image), `.message-quote-fragment__*`.
