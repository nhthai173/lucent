# Performance rules

Zalo runs with a translucent, blurred "glass" window. Anything that causes a repaint repaints the whole window on the GPU, so small decorations can cost real CPU/GPU even when the user is not doing anything. Every rule below came from a measurement in this repo's history. Do not undo them.

## Hard rules

1. **No infinite animation that runs while idle.** CSS `animation: … infinite` on an always-matching selector keeps the compositor at 60 fps. The pet's breathing, tail wag and blink are `animation-play-state: paused` unless `#zg-pet:hover`. Walk and gag animations are attached only under their state class (`.zp-walk …`, `#zg-pet.zp-g-<name> …`). The static ambient background replaced an animated one that used ~50 % CPU.
2. **No `requestAnimationFrame` loops.** Zalo's own FPS monitor (a double rAF loop at ~100/s) is disabled in `install.mjs` for this reason. Never introduce your own.
3. **Hide with `visibility: hidden` (or `display: none`), not only `opacity: 0`**, for any element with `backdrop-filter`. A fully transparent element with a backdrop filter is still composited (`.zp-bubble` is the example).
4. **Timers are coarse.** Pet `tick()` runs every 1 s plus throttled `mousemove` (≥ 100 ms apart). The behaviour loop waits 6–18 s and does nothing when the window is not focused. Luffy's 10-second form deadline reuses the existing tick. A 200 ms tick measured ~13 % renderer CPU. `tick()` calls layout reads and `elementFromPoint`, which are not free.
5. **Coalesce observers.** `MutationObserver` callbacks schedule one `requestAnimationFrame` and run there (`album.js`, `meet.js`). Do not write to the DOM with a value that is already set (e.g. re-assigning identical `textContent` fires the observer again → infinite loop; `album.js` checks before writing).
6. **Animate `transform` and `opacity` only.** No animated blur, box-shadow, filter, width/height on large elements. `will-change: transform` only on `#zg-pet`, and `will-change: auto` in big mode (otherwise the scaled pet is blurry because it stays rasterised at small size).
7. **Do not use Chromium `enable-low-end-device-mode`.** Measured 50–120 % CPU. The RAM option uses a V8 heap cap and fewer raster threads instead (`opts-main.js`).
8. **Main-process wrappers must be cheap.** `opts-main.js` proxies `BrowserWindow`, `child_process.spawn`, `autoUpdater`; keep per-call overhead trivial and always call through to the original when no option applies.

## Self-check before finishing a UI or animation change

- With Zalo idle (no hover, no gag running) the page should have **no running animations**. In DevTools Animations panel (if available) or by reading your CSS: every `animation` declaration must be inside a hover/state selector.
- Leave Zalo untouched for 30 s; CPU of the Zalo renderer processes should sit near 0 %. Compare with before your change when in doubt (Activity Monitor / Task Manager).
- New `setInterval`/`setTimeout`: what is the period, what happens when the window is hidden (`document.hidden`) or not focused? Add the guard.
- New `MutationObserver` on `document.body` with `subtree: true`: is it throttled and idempotent?
- Any new `backdrop-filter`: could the element be invisible but still present?

## Where the justification comments are

Search for `ponytail:` in `theme/*.css`, `theme/*.js`, `install.mjs` and `asar.mjs`. These comments record each deliberate shortcut or measured trade-off, with its ceiling and upgrade path. Read the one next to the code you are changing, and write one when you add a new shortcut:

```js
// ponytail: global lock, per-account locks if throughput matters
```
