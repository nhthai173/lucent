# Add or change a feature module

A module is a self-contained renderer script (and optional CSS, optional main-process script) that `install.mjs` bundles into Zalo. Examples: `album`, `keys`, `meet`, `ocr`, `pet`. Read `architecture.md` first (bundling, worlds, state).

## Decide the shape

| Need | Files |
|---|---|
| Change how something looks | CSS only. Add rules to an existing CSS file, or a new `theme/<name>.css` |
| Add behaviour to Zalo's UI | `theme/<name>.js` (+ optional `theme/<name>.css`) |
| Need Node/Electron (files, processes, ports, Electron flags) | also `theme/<name>-main.js` (main process) |
| User can switch it on/off | also an option in the eye menu (`blur.js`) |

## Steps for a renderer module

1. **Create `theme/<name>.js`** as a single IIFE. Template:
   ```js
   // One or two Vietnamese comment lines: what it does, which window it runs in.
   (() => {
     if (location.pathname.endsWith("popup-viewer.html")) return; // only if NOT for the image viewer
     let raf = 0;
     const scan = () => {
       raf = 0;
       // find elements; do nothing when absent; be idempotent (check a marker before inserting)
     };
     const init = () => {
       new MutationObserver(() => raf || (raf = requestAnimationFrame(scan))).observe(document.body, { childList: true, subtree: true });
       scan();
     };
     document.body ? init() : addEventListener("DOMContentLoaded", init);
   })();
   ```
   - The script is injected with `defer`, but `document.body` can still be unavailable in the viewer; the guard above handles both.
   - Zalo is a React app that re-renders DOM freely: anything you insert can be deleted. Insert with a marker class (e.g. `zg-meet`) and re-check on every scan (see `meet.js`). Prefer not touching React-owned nodes at all (the pet is a separate fixed layer on `<html>` for this reason).
   - Do not leak globals. Share data only via `__zg` (from `templates.js`).
2. **Register the JS** in `install.mjs`: the default list is in the string `process.env.GLASS_JS || "blur album keys ocr pet meet drag"`. Add `<name>`. Order = execution order (all modules are concatenated; `templates` is prepended automatically). Also update the same default in the header comment of `install.mjs` and in the env table of `README.md`.
3. **Register the CSS** (if any) in `install.mjs`: the array `["glass-light", "blur", "album", "ocr", "pet"]` inside the `css` constant. Add `<name>` in the position where it should win cascade order (later wins at equal specificity). Dark-only token files would instead go through `dark("…css")` (only lines starting with `body {` are rewritten).
4. **Syntax check and install** (see `build-and-verify.md`), then verify in both the main window and the image viewer.

## Making it toggleable from the eye menu

The menu is built in `theme/blur.js` from the `GROUPS` array:

```js
["Title shown in menu", I.icon, [["key", "Label"], ["key2", "Label 2"]]],
```

- Every `["key", "Label"]` becomes a checkbox. State is stored in `localStorage["zg-hide"]` as `{ key: true/false }`.
- By default a key is treated as a **hide option**: `render()` sets `document.body.classList.toggle("zg-hide-" + key, …)` and the eye button lights up when any hide option is on. Write your CSS as `body.zg-hide-<key> …`.
- For options that are **not** "hide" options (pet, petbig, album), the key must be listed in the `PET` array (`PET = ["pet", "petbig", "album"]`) so it is excluded from that generic loop, and `render()` must set its body class by hand (compare the lines for `zg-album`, `zg-pet-big`, `zg-pet-off`). Default-on options need special handling in `isOn()` (only `pet` is default-on; others default off).
- To add a new icon, add an entry to the `I` object (24×24 viewBox, stroke icons, `ICON('<path d="…"/>')`).
- Put your behaviour behind the body class and make the module a no-op when the class is absent. Do not read `localStorage` directly from another module; use the body class.
- Menu strings are Vietnamese.

## Steps for a main-process script

1. Create `theme/<name>-main.js`. Wrap everything:
   ```js
   try {
     // Node/Electron code (require is available)
   } catch (e) { try { require("fs").appendFileSync(require("os").tmpdir() + "/zalo-glass.log", "<name>-main: " + e.stack + "\n"); } catch {} }
   ```
   A throw here would stop Zalo from starting, so the `try/catch` is mandatory.
2. Register it in `install.mjs`: the `pre` string is `read("opts-main.js") + … + read("ocr-main.js") + …`. Add `read("<name>-main.js")` there. These files are **prepended to `bootstrap.js`**, so they run before Zalo's own code and share the same module scope as `bootstrap.js` (use unique names; keep your code inside the try block).
3. If it exposes a local server, bind `127.0.0.1` only, accept only the minimum inputs, validate paths (see `inMedia()` in `ocr-main.js`), and if the renderer calls it, make sure the CSP allows it: `install.mjs` replaces `connect-src 'self'` with `connect-src 'self' http://127.0.0.1:47831`. Reuse the existing server (add a route in `ocr-main.js`) instead of opening another port when possible.
4. Options for main-process behaviour: add a key to `DEF` in `opts-main.js` (default value), read it from `cfg`, and expose a checkbox in `PERF` in `blur.js`. Changes only apply after Zalo restarts (the UI tells the user).
5. Native helpers per OS (like OCR): `install.mjs` compiles/copies them into `~/.zalo-glass/` (macOS `swiftc`, Windows copy `ocr.ps1`). Add your helper there with a graceful message instead of failing the install.

## Robustness rules

- Find elements by stable parts: class prefixes, text content (`textContent.trim()`), `[id^="…"]`; not by DOM position. Zalo changes class names between releases.
- When the target element is missing, do nothing and stay silent.
- Always make DOM insertion idempotent (marker class + existence check).
- Do not intercept or block Zalo's own events (`stopPropagation`, capture handlers) unless the feature needs it, and then only on the elements you own.
- Never send message content, contact names or file paths anywhere. All servers are localhost. Only exception: the opt-in Google translate engine (`translate-main.js`), which the user must enable and which the menu labels as online.
- Follow `performance.md` for observers, timers and animation.

## Checklist

- [ ] IIFE, no globals, guarded for the right window(s)
- [ ] Registered in `install.mjs` (JS list and/or CSS list and/or `pre`), plus the header comment and `README.md` env/option table
- [ ] Idempotent DOM insertion with a marker; missing element = silent no-op
- [ ] Observer throttled with `requestAnimationFrame`; no unconditional DOM writes
- [ ] Toggle wired through `blur.js` if user-optional; works with the option on and off
- [ ] Verified in main window **and** image viewer; persists after restart
- [ ] `node --check` passes; install log shows no new errors
- [ ] README (Vietnamese) updated for any user-visible feature or option
